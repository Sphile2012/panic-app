/**
 * Emergency Session Management
 * Coordinates all emergency features: GPS, camera, live tracking, notifications
 */

import { getLocation } from './alertService.js';
import { startTracking, stopTracking, isTracking, getLast, trackUrl, mapsUrl, getToken } from './tracking.js';
import { startEvidenceCapture, requestCameraAccess, evidenceEnabled, listPhotos } from './evidence.js';
import { store } from './state.js';
import { DB_CONFIGURED, getClient } from './db.js';

export interface EmergencySession {
    id: string;
    dbId?: string;
    startedAt: number;
    status: 'active' | 'completed' | 'cancelled';
    gpsStatus: 'acquiring' | 'active' | 'failed' | 'denied' | 'unavailable';
    cameraStatus: 'ready' | 'capturing' | 'completed' | 'failed' | 'denied' | 'unavailable';
    trackingStatus: 'inactive' | 'active' | 'paused' | 'failed';
    notificationStatus: 'pending' | 'sent' | 'failed';
    uploadStatus: 'idle' | 'uploading' | 'uploaded' | 'failed';
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    locationText: string | null;
    photoCaptured: boolean;
    photoCount: number;
    photoUrls: string[];
    errors: string[];
}

let currentSession: EmergencySession | null = null;
let listeners: Set<(session: EmergencySession) => void> = new Set();
let emergencyPhotoStartedAt = 0;

function emit() {
    if (currentSession) {
        listeners.forEach(fn => fn(currentSession!));
    }
}

export function onSessionChange(callback: (session: EmergencySession) => void): () => void {
    listeners.add(callback);
    return () => listeners.delete(callback);
}

export function getCurrentSession(): EmergencySession | null {
    return currentSession;
}

export function isEmergencyActive(): boolean {
    return currentSession !== null && currentSession.status === 'active';
}

function updateSession(updates: Partial<EmergencySession>) {
    if (currentSession) {
        currentSession = { ...currentSession, ...updates };
        emit();
        
        // Update database if configured
        if (DB_CONFIGURED && currentSession.dbId) {
            void updateSessionInDatabase(currentSession);
        }
    }
}

async function createSessionInDatabase(): Promise<string | null> {
    if (!DB_CONFIGURED || !currentSession) return null;
    
    try {
        const client = getClient();
        const { data, error } = await client
            .from('emergency_sessions')
            .insert({
                status: currentSession.status,
                gps_status: currentSession.gpsStatus,
                camera_status: currentSession.cameraStatus,
                tracking_status: currentSession.trackingStatus,
                notification_status: currentSession.notificationStatus,
                tracking_token: getToken(),
                photo_count: 0,
                errors: currentSession.errors,
            })
            .select('id')
            .single();
        
        if (error) {
            console.warn('[Emergency] Failed to create session in database:', error);
            return null;
        }
        
        return data.id;
    } catch (error) {
        console.warn('[Emergency] Database error:', error);
        return null;
    }
}

async function updateSessionInDatabase(session: EmergencySession): Promise<void> {
    if (!DB_CONFIGURED || !session.dbId) return;
    
    try {
        const client = getClient();
        await client
            .from('emergency_sessions')
            .update({
                status: session.status,
                gps_status: session.gpsStatus,
                latitude: session.latitude,
                longitude: session.longitude,
                accuracy: session.accuracy,
                location_text: session.locationText,
                camera_status: session.cameraStatus,
                photo_count: session.photoCount,
                tracking_status: session.trackingStatus,
                notification_status: session.notificationStatus,
                errors: session.errors,
                ended_at: session.status !== 'active' ? new Date().toISOString() : null,
            })
            .eq('id', session.dbId);
    } catch (error) {
        console.warn('[Emergency] Failed to update session:', error);
    }
}

async function requestLocation(): Promise<void> {
    if (!currentSession) return;
    
    updateSession({ gpsStatus: 'acquiring' });
    
    try {
        const result = await getLocation(15000);
        
        if (result.ok) {
            updateSession({
                gpsStatus: 'active',
                latitude: result.coords.latitude,
                longitude: result.coords.longitude,
                accuracy: result.accuracy,
                locationText: result.text,
            });
        } else {
            const reason = 'reason' in result ? result.reason : 'Location unavailable';
            updateSession({
                gpsStatus: reason.includes('denied') ? 'denied' : 
                          reason.includes('unavailable') ? 'unavailable' : 'failed',
            });
            currentSession?.errors.push(`GPS: ${reason}`);
            emit();
        }
    } catch (error) {
        updateSession({ gpsStatus: 'failed' });
        currentSession?.errors.push(`GPS error: ${error instanceof Error ? error.message : 'Unknown'}`);
        emit();
    }
}

// Export function to retry location from UI
export async function retryLocationRequest(): Promise<void> {
    if (currentSession) {
        await requestLocation();
    }
}

async function startEmergencyTracking(): Promise<void> {
    if (!currentSession) return;
    
    updateSession({ trackingStatus: 'active' });
    
    try {
        await startTracking();
        if (!isTracking()) {
            updateSession({ trackingStatus: 'failed' });
            currentSession?.errors.push('Live tracking could not start');
            emit();
        }
    } catch (error) {
        updateSession({ trackingStatus: 'failed' });
        currentSession?.errors.push(`Tracking error: ${error instanceof Error ? error.message : 'Unknown'}`);
        emit();
    }
}

async function startEmergencyCamera(): Promise<void> {
    if (!currentSession) return;
    
    // Check if evidence capture is enabled
    if (!evidenceEnabled()) {
        updateSession({ cameraStatus: 'unavailable' });
        currentSession?.errors.push('Emergency camera is disabled in settings');
        emit();
        return;
    }
    
    // Request camera permission first
    const hasAccess = await requestCameraAccess();
    if (!hasAccess) {
        updateSession({ cameraStatus: 'denied' });
        currentSession?.errors.push('Camera permission denied');
        emit();
        return;
    }
    
    updateSession({ cameraStatus: 'capturing' });
    
    try {
        emergencyPhotoStartedAt = Date.now();
        await startEvidenceCapture(3);
        const photos = (await listPhotos()).filter(photo => photo.at >= emergencyPhotoStartedAt);
        updateSession({
            cameraStatus: photos.length > 0 ? 'completed' : 'failed',
            photoCaptured: photos.length > 0,
            photoCount: photos.length,
        });
        if (photos.length === 0) {
            currentSession?.errors.push('No emergency photos were captured');
            emit();
        }
    } catch (error) {
        updateSession({ cameraStatus: 'failed' });
        currentSession?.errors.push(`Camera error: ${error instanceof Error ? error.message : 'Unknown'}`);
        emit();
    }
}

// Export function to retry camera from UI
export async function retryCameraRequest(): Promise<void> {
    if (currentSession) {
        await startEmergencyCamera();
    }
}

async function logEmergencyToDatabase(): Promise<void> {
    if (!DB_CONFIGURED || !currentSession) return;
    
    try {
        const client = getClient();
        const { error } = await client.from('alert_logs').insert({
            lat: currentSession.latitude,
            lng: currentSession.longitude,
            accuracy: currentSession.accuracy,
            method: 'panic-button',
            notes: `Emergency SOS - Session ${currentSession.id}`,
        });
        
        if (error) {
            console.warn('[Emergency] Failed to log alert:', error);
            currentSession?.errors.push('Failed to log emergency');
            emit();
        }
    } catch (error) {
        console.warn('[Emergency] Database logging error:', error);
    }
}

export async function uploadEmergencyPhotos(): Promise<string[]> {
    if (!currentSession || !DB_CONFIGURED) return [];
    
    updateSession({ uploadStatus: 'uploading' });
    
    try {
        const photos = (await listPhotos())
            .filter(photo => photo.at >= emergencyPhotoStartedAt)
            .slice(0, 3);
        const uploadedUrls: string[] = [];
        const client = getClient();
        
        for (const photo of photos) {
            try {
                const fileName = `${currentSession.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
                const filePath = `emergency-photos/${fileName}`;
                
                // Upload to Supabase Storage
                const { data, error } = await client.storage
                    .from('emergency-photos')
                    .upload(filePath, photo.blob, {
                        contentType: 'image/jpeg',
                        cacheControl: '3600',
                    });
                
                if (error) {
                    console.warn('[Emergency] Photo upload failed:', error);
                    continue;
                }
                
                // Get public URL (will be private, only accessible with signed URL)
                const { data: urlData } = client.storage
                    .from('emergency-photos')
                    .getPublicUrl(filePath);
                
                if (urlData.publicUrl) {
                    uploadedUrls.push(urlData.publicUrl);
                    
                    // Save photo metadata to database
                    await client.from('emergency_photos').insert({
                        session_id: currentSession.dbId,
                        storage_path: filePath,
                        file_size: photo.blob.size,
                        captured_at: new Date(photo.at).toISOString(),
                        upload_status: 'uploaded',
                    });
                }
            } catch (error) {
                console.warn('[Emergency] Photo upload error:', error);
            }
        }
        
        if (uploadedUrls.length > 0) {
            updateSession({ 
                uploadStatus: 'uploaded',
                photoUrls: uploadedUrls,
                photoCount: uploadedUrls.length
            });
        } else {
            updateSession({ uploadStatus: 'failed' });
            currentSession?.errors.push('Photo upload failed');
            emit();
        }
        
        return uploadedUrls;
    } catch (error) {
        updateSession({ uploadStatus: 'failed' });
        currentSession?.errors.push(`Upload error: ${error instanceof Error ? error.message : 'Unknown'}`);
        emit();
        return [];
    }
}

export async function startEmergencySession(): Promise<EmergencySession> {
    // If there's already an active session, return it
    if (currentSession && currentSession.status === 'active') {
        return currentSession;
    }
    
    // Create new emergency session
    currentSession = {
        id: `emergency-${Date.now()}`,
        startedAt: Date.now(),
        status: 'active',
        gpsStatus: 'acquiring',
        cameraStatus: 'ready',
        trackingStatus: 'inactive',
        notificationStatus: 'pending',
        uploadStatus: 'idle',
        latitude: null,
        longitude: null,
        accuracy: null,
        locationText: null,
        photoCaptured: false,
        photoCount: 0,
        photoUrls: [],
        errors: [],
    };
    emergencyPhotoStartedAt = 0;
    
    emit();
    
    // Create session in database
    const dbId = await createSessionInDatabase();
    if (dbId) {
        currentSession.dbId = dbId;
    }
    
    // Start all emergency features in parallel (non-blocking)
    // Don't wait for them - they update the session as they progress
    void requestLocation();
    void startEmergencyTracking();
    void startEmergencyCamera();
    void logEmergencyToDatabase();
    
    return currentSession;
}

export function getEmergencyMessage(): string {
    if (!currentSession) return 'Emergency alert';
    
    const { profile, notes } = store.getState();
    const name = profile.name || 'Someone';
    const time = new Date().toLocaleString();
    
    let message = `🚨 PANIC RING EMERGENCY ALERT 🚨\n\n`;
    message += `${name} needs immediate assistance!\n`;
    message += `Time: ${time}\n\n`;
    
    if (currentSession.latitude !== null && currentSession.longitude !== null) {
        const googleMapsLink = `https://maps.google.com/?q=${currentSession.latitude},${currentSession.longitude}`;
        message += `LOCATION:\n${currentSession.locationText || 'GPS coordinates'}\n`;
        message += `Map: ${googleMapsLink}\n`;
        message += `Accuracy: ±${Math.round(currentSession.accuracy || 0)}m\n\n`;
    } else {
        message += `Location: Not available\n\n`;
    }
    
    if (isTracking() && DB_CONFIGURED) {
        message += `🔴 Live tracking active:\n${trackUrl()}\n\n`;
    }
    
    if (currentSession.photoCaptured && currentSession.photoCount > 0) {
        message += `📸 ${currentSession.photoCount} emergency photo(s) captured\n`;
        if (currentSession.photoUrls.length > 0) {
            message += `View photos:\n`;
            currentSession.photoUrls.forEach((url, i) => {
                message += `Photo ${i + 1}: ${url}\n`;
            });
            message += `\n`;
        }
    }

    if (notes.length > 0) {
        message += `SAVED NOTES:\n${notes.map(note => `${note.title}\n${note.body}`).join('\n\n')}\n\n`;
    }
    
    message += `⚠️ Please contact immediately or send help!\n`;
    message += `This is an automated emergency alert from Panic Ring app.`;
    
    return message;
}

export function getWhatsAppMessage(): string {
    return encodeURIComponent(getEmergencyMessage());
}

export async function completeEmergencySession(): Promise<void> {
    if (!currentSession) return;
    
    // Try to upload photos before completing
    if (currentSession.photoCaptured && currentSession.photoUrls.length === 0) {
        await uploadEmergencyPhotos();
    }
    
    updateSession({ 
        status: 'completed',
        notificationStatus: 'sent'
    });
    
    // Keep tracking active even after session completes
    // User can stop it manually from the live tracking screen
    
    // Clear session after a delay
    setTimeout(() => {
        currentSession = null;
        listeners.clear();
    }, 60000); // Keep session data for 1 minute
}

export function cancelEmergencySession(): void {
    if (!currentSession) return;
    
    updateSession({ status: 'cancelled' });
    
    // Stop tracking if it was started
    if (isTracking()) {
        stopTracking();
    }
    
    currentSession = null;
    listeners.clear();
}

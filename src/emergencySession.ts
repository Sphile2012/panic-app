/**
 * Emergency Session Management
 * Coordinates all emergency features: GPS, camera, live tracking, notifications
 */

import { getLocation } from './alertService.js';
import { startTracking, stopTracking, isTracking, getLast, trackUrl, mapsUrl } from './tracking.js';
import { startEvidenceCapture, requestCameraAccess, evidenceEnabled } from './evidence.js';
import { store } from './state.js';
import { DB_CONFIGURED, getClient } from './db.js';

export interface EmergencySession {
    id: string;
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
    errors: string[];
}

let currentSession: EmergencySession | null = null;
let listeners: Set<(session: EmergencySession) => void> = new Set();

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
    }
}

async function requestLocation(): Promise<void> {
    if (!currentSession) return;
    
    updateSession({ gpsStatus: 'acquiring' });
    
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
        // Start capturing evidence photos in the background
        void startEvidenceCapture(3); // Capture 3 photos over time
        
        // Mark as completed after a short delay (photos capture in background)
        setTimeout(() => {
            if (currentSession && currentSession.cameraStatus === 'capturing') {
                updateSession({ 
                    cameraStatus: 'completed',
                    photoCaptured: true,
                    photoCount: 3 
                });
            }
        }, 5000);
    } catch (error) {
        updateSession({ cameraStatus: 'failed' });
        currentSession?.errors.push(`Camera error: ${error instanceof Error ? error.message : 'Unknown'}`);
        emit();
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
            notes: `Emergency SOS - ${currentSession.photoCount} photos captured`,
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
        errors: [],
    };
    
    emit();
    
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
    
    const { contacts, profile } = store.getState();
    const name = profile.name || 'Someone';
    const time = new Date().toLocaleString();
    
    let message = `🚨 PANIC RING EMERGENCY ALERT 🚨\n\n`;
    message += `${name} needs immediate assistance!\n`;
    message += `Time: ${time}\n\n`;
    
    if (currentSession.latitude && currentSession.longitude) {
        const googleMapsLink = `https://maps.google.com/?q=${currentSession.latitude},${currentSession.longitude}`;
        message += `📍 LOCATION:\n${currentSession.locationText || 'GPS coordinates'}\n`;
        message += `Map: ${googleMapsLink}\n`;
        message += `Accuracy: ±${Math.round(currentSession.accuracy || 0)}m\n\n`;
    } else {
        message += `📍 Location: Not available\n\n`;
    }
    
    if (isTracking() && DB_CONFIGURED) {
        message += `🔴 Live tracking active:\n${trackUrl()}\n\n`;
    }
    
    if (currentSession.photoCaptured) {
        message += `📸 ${currentSession.photoCount} emergency photo(s) captured\n\n`;
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

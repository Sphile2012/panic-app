
import { store } from '../state.js';
import { getCurrentSession, onSessionChange, getEmergencyMessage, completeEmergencySession, cancelEmergencySession, uploadEmergencyPhotos, retryLocationRequest, retryCameraRequest, type EmergencySession } from '../emergencySession.js';
import { smsUri, whatsappUri } from '../storage.js';
import { isTracking, trackUrl } from '../tracking.js';

function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c] ?? c));
}

function getStatusIndicatorText(status: string): string {
    switch (status) {
        case 'active':
        case 'ready':
        case 'completed':
        case 'uploaded':
        case 'sent':
            return 'Ready';
        case 'acquiring':
        case 'capturing':
        case 'uploading':
        case 'pending':
            return 'Pending';
        case 'denied':
        case 'failed':
        case 'unavailable':
            return 'Failed';
        default:
            return 'N/A';
    }
}

function getStatusClass(status: string): string {
    switch (status) {
        case 'active':
        case 'ready':
        case 'completed':
        case 'uploaded':
        case 'sent':
            return 'emergency-status-success';
        case 'acquiring':
        case 'capturing':
        case 'uploading':
        case 'pending':
            return 'emergency-status-pending';
        case 'denied':
        case 'failed':
        case 'unavailable':
            return 'emergency-status-error';
        default:
            return 'emergency-status-inactive';
    }
}

function getStatusLabel(key: string, status: string): string {
    if (key === 'gps') {
        switch (status) {
            case 'active': return 'GPS Active';
            case 'acquiring': return 'Getting GPS...';
            case 'denied': return 'GPS Denied';
            case 'unavailable': return 'GPS Unavailable';
            case 'failed': return 'GPS Failed';
            default: return 'GPS';
        }
    }
    
    if (key === 'camera') {
        switch (status) {
            case 'ready': return 'Camera Ready';
            case 'capturing': return 'Capturing Photos...';
            case 'completed': return 'Photos Captured';
            case 'denied': return 'Camera Denied';
            case 'unavailable': return 'Camera Unavailable';
            case 'failed': return 'Camera Failed';
            default: return 'Camera';
        }
    }
    
    if (key === 'tracking') {
        switch (status) {
            case 'active': return 'Live Tracking Active';
            case 'inactive': return 'Tracking Inactive';
            case 'paused': return 'Tracking Paused';
            case 'failed': return 'Tracking Failed';
            default: return 'Live Tracking';
        }
    }
    
    if (key === 'notifications') {
        switch (status) {
            case 'sent': return 'Ready to Send';
            case 'pending': return 'Preparing Messages...';
            case 'failed': return 'Failed';
            default: return 'Notifications';
        }
    }
    
    return status;
}

export function renderEmergencyStatus(root: HTMLElement) {
    const session = getCurrentSession();
    const { contacts } = store.getState();
    
    if (!session) {
        root.innerHTML = `
            <div class="screen">
                <header class="screen-header">
                    <button class="btn-back-small" id="btn-back" aria-label="Back">←</button>
                    <h2 class="screen-title">Emergency Status</h2>
                </header>
                <div class="emergency-no-session">
                    <p>No active emergency session</p>
                    <button class="btn-secondary" id="btn-back-dash">Return to Dashboard</button>
                </div>
            </div>
        `;
        
        root.querySelector('#btn-back')?.addEventListener('click', () => store.navigateTo('app'));
        root.querySelector('#btn-back-dash')?.addEventListener('click', () => store.navigateTo('app'));
        return;
    }
    
    const paint = () => {
        const currentSession = getCurrentSession();
        if (!currentSession) {
            store.navigateTo('app');
            return;
        }
        const message = getEmergencyMessage();
        const whatsappMsg = message;
        const prioritizedContacts = contacts
            .map((contact, index) => ({ contact, index }))
            .sort((a, b) => (a.contact.priority ?? a.index + 1) - (b.contact.priority ?? b.index + 1) || a.index - b.index)
            .map(item => item.contact);
        
        root.innerHTML = `
            <div class="screen emergency-status-screen">
                <header class="screen-header">
                    <button class="btn-back-small" id="btn-back" aria-label="Back">←</button>
                    <h2 class="screen-title">Emergency Active</h2>
                </header>
                
                <div class="emergency-alert-banner">
                    <div class="emergency-pulse"></div>
                    <h3>SOS Alert Activated</h3>
                    <p>Emergency features are running</p>
                </div>
                
                <section class="emergency-status-section">
                    <h3>System Status</h3>
                    <div class="emergency-status-grid">
                        <div class="emergency-status-card ${getStatusClass(currentSession.gpsStatus)}">
                            <span class="emergency-status-label">${getStatusIndicatorText(currentSession.gpsStatus)}</span>
                            <div class="emergency-status-info">
                                <strong>${getStatusLabel('gps', currentSession.gpsStatus)}</strong>
                                ${currentSession.latitude ? `<small>${currentSession.latitude.toFixed(5)}, ${currentSession.longitude?.toFixed(5)}</small>` : '<small>Waiting for GPS fix</small>'}
                            </div>
                        </div>
                        ${currentSession.gpsStatus === 'denied' ? `
                        <div class="emergency-permission-note">
                            <p>WARNING: Location permission denied</p>
                            <button class="btn-secondary-outline btn-open-settings" id="btn-open-location-settings">Open Location Settings</button>
                            <button class="btn-secondary" id="btn-retry-location">Retry After Granting Permission</button>
                        </div>
                        ` : ''}
                        
                        <div class="emergency-status-card ${getStatusClass(currentSession.cameraStatus)}">
                            <span class="emergency-status-label">${getStatusIndicatorText(currentSession.cameraStatus)}</span>
                            <div class="emergency-status-info">
                                <strong>${getStatusLabel('camera', currentSession.cameraStatus)}</strong>
                                <small>${currentSession.photoCount > 0 ? `${currentSession.photoCount} photo(s)` : 'No photos yet'}</small>
                            </div>
                        </div>
                        ${currentSession.cameraStatus === 'denied' ? `
                        <div class="emergency-permission-note">
                            <p>WARNING: Camera permission denied</p>
                            <button class="btn-secondary-outline btn-open-settings" id="btn-open-camera-settings">Open Camera Settings</button>
                            <button class="btn-secondary" id="btn-retry-camera">Retry After Granting Permission</button>
                        </div>
                        ` : ''}
                        
                        <div class="emergency-status-card ${getStatusClass(currentSession.trackingStatus)}">
                            <span class="emergency-status-label">${getStatusIndicatorText(currentSession.trackingStatus)}</span>
                            <div class="emergency-status-info">
                                <strong>${getStatusLabel('tracking', currentSession.trackingStatus)}</strong>
                                <small>${isTracking() ? 'Broadcasting location' : 'Not active'}</small>
                            </div>
                        </div>
                        
                        <div class="emergency-status-card ${getStatusClass(currentSession.notificationStatus)}">
                            <span class="emergency-status-label">${getStatusIndicatorText(currentSession.notificationStatus)}</span>
                            <div class="emergency-status-info">
                                <strong>${getStatusLabel('notifications', currentSession.notificationStatus)}</strong>
                                <small>${contacts.length} contact(s)</small>
                            </div>
                        </div>
                    </div>
                </section>
                
                ${currentSession.errors.length > 0 ? `
                <section class="emergency-errors">
                    <h4>WARNING: Issues Detected</h4>
                    <ul>
                        ${currentSession.errors.map(err => `<li>${escapeHtml(err)}</li>`).join('')}
                    </ul>
                    <p class="emergency-errors-note">Don't worry - working features will still send alerts.</p>
                </section>
                ` : ''}
                
                <section class="emergency-location-section">
                    <h3>Your Current Location</h3>
                    ${currentSession.latitude ? `
                        <div class="emergency-location-card">
                            <p><strong>${escapeHtml(currentSession.locationText || 'GPS Coordinates')}</strong></p>
                            <p class="emergency-coords">${currentSession.latitude.toFixed(6)}, ${currentSession.longitude?.toFixed(6)}</p>
                            <p class="emergency-accuracy">Accuracy: ±${Math.round(currentSession.accuracy || 0)}m</p>
                            <a href="https://maps.google.com/?q=${currentSession.latitude},${currentSession.longitude}" 
                               target="_blank" 
                               class="btn-secondary emergency-view-map">
                                View on Google Maps →
                            </a>
                        </div>
                    ` : `
                        <div class="emergency-location-pending">
                            <div class="spinner"></div>
                            <p>Getting your location...</p>
                        </div>
                    `}
                </section>
                
                ${isTracking() ? `
                <section class="emergency-tracking-section">
                    <h3>LIVE: Tracking Active</h3>
                    <div class="emergency-tracking-card">
                        <p>Your location is being updated in real-time</p>
                        <code class="emergency-tracking-url">${trackUrl()}</code>
                        <p class="emergency-tracking-note">Share this link with your trusted contacts to let them see your live location</p>
                    </div>
                </section>
                ` : ''}
                
                ${currentSession.photoCaptured && currentSession.photoCount > 0 ? `
                <section class="emergency-photo-section">
                    <h3>Emergency Photos</h3>
                    <div class="emergency-photo-card">
                        <p><strong>${currentSession.photoCount} photo(s) captured</strong></p>
                        ${currentSession.photoUrls.length > 0 ? `
                            <p class="emergency-photo-status">Photos uploaded and ready to share</p>
                            <div class="emergency-photo-list">
                                ${currentSession.photoUrls.map((url, i) => `
                                    <a href="${url}" target="_blank" class="emergency-photo-link">
                                        Photo ${i + 1}
                                    </a>
                                `).join('')}
                            </div>
                        ` : currentSession.uploadStatus === 'uploading' ? `
                            <div class="emergency-photo-uploading">
                                <div class="spinner"></div>
                                <p>Uploading photos...</p>
                            </div>
                        ` : currentSession.uploadStatus === 'failed' ? `
                            <p class="emergency-photo-error">Photo upload failed</p>
                            <button class="btn-secondary" id="btn-retry-upload">Retry Upload</button>
                        ` : `
                            <p class="emergency-photo-note">Photos are stored locally on your device</p>
                            <button class="btn-secondary" id="btn-upload-photos">Upload Photos to Share</button>
                        `}
                    </div>
                </section>
                ` : ''}
                
                <section class="emergency-contacts-section">
                    <h3>Send Alert to Trusted Circle</h3>
                    <p class="emergency-contacts-intro">Tap a contact to open your messaging app with the emergency message ready to send.</p>
                    
                    ${contacts.length === 0 ? `
                        <p class="emergency-no-contacts">No trusted contacts configured</p>
                    ` : `
                        <div class="emergency-contacts-list">
                            ${prioritizedContacts.map(contact => `
                                <div class="emergency-contact-card">
                                    <div class="emergency-contact-info">
                                        ${contact.photo ? 
                                            `<img src="${contact.photo}" alt="${escapeHtml(contact.name)}" class="emergency-contact-avatar" />` : 
                                            `<div class="emergency-contact-avatar">${escapeHtml(contact.initials)}</div>`
                                        }
                                        <div>
                                            <strong>${escapeHtml(contact.name)}</strong>
                                            ${contact.relationship ? `<span class="emergency-contact-rel">${escapeHtml(contact.relationship)}</span>` : ''}
                                            <span class="emergency-contact-phone">${escapeHtml(contact.phone)}</span>
                                        </div>
                                    </div>
                                    <div class="emergency-contact-actions">
                                        <a href="${smsUri(contact.phone, message)}" class="btn-emergency-sms">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>
                                            </svg>
                                            SMS
                                        </a>
                                        <a href="${whatsappUri(contact.phone, whatsappMsg)}" class="btn-emergency-whatsapp">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                            </svg>
                                            WhatsApp
                                        </a>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </section>
                
                <section class="emergency-message-section">
                    <h3>Preview Message</h3>
                    <div class="emergency-message-preview">
                        <pre>${escapeHtml(message)}</pre>
                    </div>
                    <p class="emergency-message-note">This message will be pre-filled when you tap SMS or WhatsApp above. Review and tap Send in your messaging app.</p>
                </section>
                
                <section class="emergency-actions-section">
                    <button class="btn-danger emergency-complete" id="btn-complete">
                        I'm Safe - End Emergency
                    </button>
                    <button class="btn-secondary emergency-cancel" id="btn-cancel">
                        Cancel Alert
                    </button>
                </section>
                
                <div class="emergency-footer">
                    <p><strong>Emergency started:</strong> ${new Date(currentSession.startedAt).toLocaleString()}</p>
                    <p>Live tracking will continue until you manually stop it from the Live Location screen.</p>
                </div>
            </div>
        `;
        
        root.querySelector('#btn-back')?.addEventListener('click', () => store.navigateTo('app'));
        
        root.querySelector('#btn-complete')?.addEventListener('click', async () => {
            await completeEmergencySession();
            store.navigateTo('app');
        });
        
        root.querySelector('#btn-cancel')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to cancel this emergency alert? Live tracking will be stopped.')) {
                cancelEmergencySession();
                store.navigateTo('app');
            }
        });
        
        root.querySelector('#btn-upload-photos')?.addEventListener('click', async () => {
            await uploadEmergencyPhotos();
            paint();
        });
        
        root.querySelector('#btn-retry-upload')?.addEventListener('click', async () => {
            await uploadEmergencyPhotos();
            paint();
        });
        
        root.querySelector('#btn-open-location-settings')?.addEventListener('click', () => {
            if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
                alert('To enable location access:\n\n1. Click the lock icon in your address bar\n2. Select "Site settings" or "Permissions"\n3. Find "Location" and set to "Allow"\n4. Click "Retry After Granting Permission" below\n\nOR on Android:\n\n1. Open Settings app\n2. Go to Apps → Panic Ring (or your browser)\n3. Tap Permissions → Location\n4. Select "Allow" or "While using the app"\n5. Return here and click Retry');
            } else {
                alert('To enable location access:\n\n1. Open your phone Settings\n2. Go to Apps → Panic Ring (or your browser)\n3. Tap Permissions → Location\n4. Select "Allow" or "While using the app"\n5. Return here and click "Retry After Granting Permission"');
            }
        });
        
        root.querySelector('#btn-retry-location')?.addEventListener('click', async () => {
            await retryLocationRequest();
            paint();
        });
        
        root.querySelector('#btn-open-camera-settings')?.addEventListener('click', () => {
            if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
                alert('To enable camera access:\n\n1. Click the lock icon in your address bar\n2. Select "Site settings" or "Permissions"\n3. Find "Camera" and set to "Allow"\n4. Click "Retry After Granting Permission" below\n\nOR on Android:\n\n1. Open Settings app\n2. Go to Apps → Panic Ring (or your browser)\n3. Tap Permissions → Camera\n4. Select "Allow"\n5. Return here and click Retry');
            } else {
                alert('To enable camera access:\n\n1. Open your phone Settings\n2. Go to Apps → Panic Ring (or your browser)\n3. Tap Permissions → Camera\n4. Select "Allow"\n5. Return here and click "Retry After Granting Permission"');
            }
        });
        
        root.querySelector('#btn-retry-camera')?.addEventListener('click', async () => {
            await retryCameraRequest();
            paint();
        });
    };
    
    paint();
    
    const unsubscribe = onSessionChange(() => {
        if (!root.isConnected) {
            unsubscribe();
            return;
        }
        paint();
    });
    
    const unsubscribeNav = store.subscribe(state => {
        if (state.screen !== 'emergency-status') {
            unsubscribe();
            unsubscribeNav();
        }
    });
}

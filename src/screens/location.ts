import { store } from '../state.js';
import { getLocation } from '../alertService.js';
import { smsUri, whatsappUri } from '../storage.js';
function esc(value) {
    return value.replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    })[character] ?? character);
}
export function renderLocation(root) {
    const { contacts } = store.getState();
    root.innerHTML = `
    <div class="screen location-screen">

      <div class="location-icon" aria-hidden="true">GPS</div>
      <h2 class="location-title">Share your location?</h2>
      <p class="location-body">
      Choose SMS or WhatsApp to prepare a location message. Review it and tap Send in that app.
      Sharing your location helps your contacts find you faster. Saved notes are included in the alert message.
      </p>

      <section class="location-map-card" aria-label="Map preview of your current location">
        <div class="location-map-heading">
          <strong>Current location</strong>
          <span id="location-map-status" role="status">Waiting for location permission…</span>
        </div>
        <div class="location-map-frame">
          <iframe id="location-map" title="Map showing your current location" loading="lazy" hidden
            referrerpolicy="no-referrer" allowfullscreen></iframe>
          <div class="location-map-placeholder" id="location-map-placeholder">
            <span aria-hidden="true">◎</span>
            <strong>Your map will appear here</strong>
            <small>Allow location access to find your position.</small>
          </div>
        </div>
        <a class="location-map-link" id="location-google-maps" target="_blank" rel="noopener noreferrer" hidden>Open in Google Maps</a>
        <p class="location-map-details" id="location-map-details" hidden></p>
      </section>

      <div class="location-actions-modern">
        <button class="btn-share-location" id="btn-live-toggle" type="button" aria-pressed="false">Allow location</button>
        <button class="btn-skip-location" id="btn-deny-location" type="button">Deny location</button>
        <button class="btn-share-location" id="btn-share">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v8M8 12h8"/>
          </svg>
          Alert my circle with my location
        </button>
        <label class="field-label" for="location-share-contact">Send a location message to</label>
        <select class="text-input" id="location-share-contact" ${contacts.length ? '' : 'disabled'}>
          ${contacts.length
            ? contacts.map(contact => `<option value="${esc(contact.id)}">${esc(contact.name)} | ${esc(contact.phone)}</option>`).join('')
            : '<option value="">Add a trusted contact first</option>'}
        </select>
        <button class="btn-secondary" id="btn-share-sms" type="button" ${contacts.length ? '' : 'disabled'}>
          Share location via SMS
        </button>
        <button class="btn-secondary" id="btn-share-whatsapp" type="button" ${contacts.length ? '' : 'disabled'}>
          Share location via WhatsApp
        </button>
        <button class="btn-skip-location" id="btn-skip">
          Send without location
        </button>
        <button class="btn-secondary location-retry" id="btn-location-retry" type="button" hidden>Try again</button>
        <p class="location-error" id="loc-error" aria-live="assertive"></p>
        <details class="location-permission-help" id="location-permission-help" hidden>
          <summary>How to allow location</summary>
          <ol>
            <li>Open this site's permissions from the browser controls beside the address bar, and set Location to Allow.</li>
            <li>Turn on Location in your device's quick settings or system settings.</li>
            <li>Return here and tap Try again. If you changed site permissions, reload this page first.</li>
          </ol>
          <p>Camera access is not needed for location or maps. It is requested only if you choose to open the camera below.</p>
        </details>
        <details class="location-photo">
          <summary>Take and share a photo</summary>
          <p>Camera starts only when you tap Open camera. Review the photo before choosing to share it.</p>
          <button class="btn-secondary" id="btn-camera-start" type="button">Open camera</button>
          <p class="location-error" id="camera-error" aria-live="polite"></p>
          <div id="camera-panel" hidden>
            <video id="camera-video" autoplay playsinline muted aria-label="Camera preview"></video>
            <button class="btn-primary" id="btn-camera-capture" type="button">Take photo</button>
          </div>
          <div id="photo-preview-panel" hidden>
            <img id="photo-preview" alt="Preview of the photo you chose to share" />
            <div class="location-actions-modern">
              <button class="btn-secondary" id="btn-photo-retake" type="button">Retake</button>
              <button class="btn-share-location" id="btn-photo-share" type="button">Share photo</button>
              <a class="btn-secondary" id="btn-photo-download" hidden>Save photo to share manually</a>
            </div>
          </div>
          <p id="camera-status" role="status" aria-live="polite"></p>
        </details>
      </div>

      <div class="loc-accuracy-wrap" id="loc-accuracy-wrap" style="display:none">
        <div class="loc-accuracy-bar">
          <div class="loc-accuracy-fill" id="loc-accuracy-fill"></div>
        </div>
        
        <button class="location-menu-btn" id="btn-menu-location" aria-label="Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12h18M3 6h18M3 18h18"/>
          </svg>
        </button>

        <div class="location-accuracy-badge" id="location-accuracy">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          <span id="accuracy-text">Acquiring GPS...</span>
        </div>
      </div>

      <div class="location-bottom-sheet">
        <div class="location-sheet-handle"></div>
        
        <h2 class="location-sheet-title">Share your location?</h2>
        <p class="location-sheet-body">
          Your contacts will see where you are. Tap share to send GPS coordinates.
        </p>

      <details class="loc-info-details">
        <summary class="loc-info-summary">What location data is sent?</summary>
        <div class="loc-info-body">
          <p>When you tap <strong>Share</strong>, your contacts receive:</p>
          <ul>
            <li>A nearby mapped address when available; this may not identify the exact building</li>
            <li>GPS accuracy in metres</li>
            <li>A Google Maps link to the GPS coordinates, with the device-reported accuracy</li>
          </ul>
          <p>
            Tap Show my live location to display and refresh your position while this screen is open. Tap Stop live location to stop access.
            Alert my circle prepares a message for each trusted contact using that contact’s chosen app. SMS and WhatsApp buttons prepare a draft for the selected trusted contact. Review and tap Send in the messaging app; delivery is not confirmed here.
            The map sends coordinates to Google Maps to display your position.
            Your browser will ask for location permission when you tap Show my live location or Share my location. Camera permission is not needed to show a map.
            If device Location is turned off, enable it in device settings; this website cannot turn on that system setting for you.
          </p>
          <p>SMS and WhatsApp links cannot attach photo files in this browser flow.</p>
          <p>
            <strong>This browser-based app cannot access your phone's IMEI or
            locate it remotely.</strong> To locate a lost device, use its
            manufacturer's find-device service or contact your mobile network
            provider.
          </p>
        </div>

      </div>
    </div>
  `;
    const mapFrame = root.querySelector('#location-map') as HTMLIFrameElement;
    const mapPlaceholder = root.querySelector('#location-map-placeholder') as HTMLElement;
    const mapStatus = root.querySelector('#location-map-status') as HTMLElement;
    const googleMapsLink = root.querySelector('#location-google-maps') as HTMLAnchorElement;
    const mapDetails = root.querySelector('#location-map-details') as HTMLElement;
    const errorEl = root.querySelector('#loc-error') as HTMLElement;
    const shareBtn = root.querySelector('#btn-share') as HTMLButtonElement;
    const smsBtn = root.querySelector('#btn-share-sms') as HTMLButtonElement;
    const whatsappBtn = root.querySelector('#btn-share-whatsapp') as HTMLButtonElement;
    const shareContact = root.querySelector('#location-share-contact') as HTMLSelectElement;
    const skipBtn = root.querySelector('#btn-skip') as HTMLButtonElement;
    const liveToggle = root.querySelector('#btn-live-toggle') as HTMLButtonElement;
    const denyLocation = root.querySelector('#btn-deny-location') as HTMLButtonElement;
    const retryBtn = root.querySelector('#btn-location-retry') as HTMLButtonElement;
    const permissionHelp = root.querySelector('#location-permission-help') as HTMLDetailsElement;
    const photoDetails = root.querySelector('.location-photo') as HTMLDetailsElement;
    const cameraStart = root.querySelector('#btn-camera-start') as HTMLButtonElement;
    const cameraPanel = root.querySelector('#camera-panel') as HTMLElement;
    const cameraVideo = root.querySelector('#camera-video') as HTMLVideoElement;
    const cameraCapture = root.querySelector('#btn-camera-capture') as HTMLButtonElement;
    const cameraError = root.querySelector('#camera-error') as HTMLElement;
    const cameraStatus = root.querySelector('#camera-status') as HTMLElement;
    const photoPreviewPanel = root.querySelector('#photo-preview-panel') as HTMLElement;
    const photoPreview = root.querySelector('#photo-preview') as HTMLImageElement;
    const photoRetake = root.querySelector('#btn-photo-retake') as HTMLButtonElement;
    const photoShare = root.querySelector('#btn-photo-share') as HTMLButtonElement;
    const photoDownload = root.querySelector('#btn-photo-download') as HTMLAnchorElement;
    let watchId: number | null = null;
    let lastMapPosition: { lat: number; lng: number } | null = null;
    let retryAction: 'live' | 'share' | null = null;
    let locationChoice: 'undecided' | 'allowed' | 'denied' = 'undecided';
    let cameraStream: MediaStream | null = null;
    let photoBlob: Blob | null = null;
    let photoObjectUrl: string | null = null;

    function updateMap(lat: number, lng: number, accuracy: number, label: string) {
        const movedEnough = !lastMapPosition ||
            Math.abs(lastMapPosition.lat - lat) >= 0.0002 ||
            Math.abs(lastMapPosition.lng - lng) >= 0.0002;
        if (movedEnough) {
            mapFrame.src = `https://maps.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}&z=16&output=embed`;
            lastMapPosition = { lat, lng };
        }
        googleMapsLink.href = `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;
        googleMapsLink.hidden = false;
        mapFrame.title = `Map showing your current location with reported accuracy of approximately ${Math.round(accuracy)} metres`;
        mapFrame.hidden = false;
        mapPlaceholder.hidden = true;
        mapStatus.textContent = `${label} · GPS accuracy ±${Math.round(accuracy)} m`;
        mapDetails.textContent = `GPS accuracy ±${Math.round(accuracy)} m · Updated ${new Date().toLocaleTimeString()}`;
        mapDetails.hidden = false;
    }

    function showLocationError(reason: string, action: 'live' | 'share') {
        mapStatus.textContent = reason;
        errorEl.textContent = reason;
        retryAction = action;
        retryBtn.hidden = false;
        permissionHelp.hidden = false;
    }

    function stopLiveLocation() {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
        liveToggle.textContent = 'Allow location';
        liveToggle.setAttribute('aria-pressed', 'false');
    }

    function stopCamera() {
        cameraStream?.getTracks().forEach(track => track.stop());
        cameraStream = null;
        cameraVideo.pause();
        cameraVideo.srcObject = null;
        cameraPanel.hidden = true;
    }

    function clearPhoto() {
        if (photoObjectUrl) URL.revokeObjectURL(photoObjectUrl);
        photoObjectUrl = null;
        photoBlob = null;
        photoPreview.removeAttribute('src');
        photoPreviewPanel.hidden = true;
        photoDownload.hidden = true;
        photoDownload.removeAttribute('href');
        cameraStatus.textContent = '';
    }

    cameraStart.addEventListener('click', async () => {
        cameraError.textContent = '';
        cameraStatus.textContent = '';
        clearPhoto();
        if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            cameraError.textContent = 'Camera access requires a secure HTTPS connection.';
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
            cameraError.textContent = 'Camera access is not available in this browser or device.';
            return;
        }
        cameraStart.disabled = true;
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } },
                audio: false,
            });
            cameraVideo.srcObject = cameraStream;
            cameraPanel.hidden = false;
            await cameraVideo.play();
            cameraStatus.textContent = 'Camera is on. Tap Take photo when you are ready.';
        } catch (error) {
            stopCamera();
            const cameraErrorName = error instanceof DOMException ? error.name : '';
            cameraError.textContent = cameraErrorName === 'NotAllowedError' || cameraErrorName === 'PermissionDeniedError'
                ? 'Camera permission was denied. Allow Camera for this site in your browser settings, then tap Open camera again.'
                : 'Could not open the camera. Check that your device has a camera and that no other app is using it.';
            cameraStatus.textContent = cameraError.textContent;
        } finally {
            cameraStart.disabled = false;
        }
    });

    cameraCapture.addEventListener('click', () => {
        if (!cameraStream || cameraVideo.videoWidth <= 0 || cameraVideo.videoHeight <= 0) {
            cameraError.textContent = 'The camera preview is not ready yet. Wait a moment and try again.';
            return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = cameraVideo.videoWidth;
        canvas.height = cameraVideo.videoHeight;
        const context = canvas.getContext('2d');
        if (!context) {
            cameraError.textContent = 'Could not prepare the photo. Please try again.';
            return;
        }
        context.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
            if (!blob) {
                cameraError.textContent = 'Could not create the photo. Please try again.';
                return;
            }
            photoBlob = blob;
            photoObjectUrl = URL.createObjectURL(blob);
            photoPreview.src = photoObjectUrl;
            photoPreviewPanel.hidden = false;
            cameraError.textContent = '';
            cameraStatus.textContent = 'Photo captured for your review. It has not been shared.';
            photoDownload.href = photoObjectUrl;
            photoDownload.download = `panic-ring-photo-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
            stopCamera();
        }, 'image/jpeg', 0.9);
    });

    photoRetake.addEventListener('click', () => {
        clearPhoto();
        cameraStart.click();
    });

    photoShare.addEventListener('click', async () => {
        if (!photoBlob) return;
        const file = new File([photoBlob], `panic-ring-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
            photoDownload.hidden = false;
            cameraStatus.textContent = 'Photo sharing is not supported here. Save the reviewed photo, then attach it yourself in your messaging app.';
            return;
        }
        photoShare.disabled = true;
        try {
            await navigator.share({ files: [file], title: 'Share a photo', text: 'Photo shared from Panic Ring.' });
            cameraStatus.textContent = 'Share sheet opened. Choose a recipient and confirm sending there.';
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                cameraStatus.textContent = 'Sharing cancelled. The photo was not sent.';
            } else {
                cameraError.textContent = error instanceof Error ? `Could not open sharing: ${error.message}` : 'Could not open the share sheet.';
            }
        } finally {
            photoShare.disabled = false;
        }
    });

    photoDetails.addEventListener('toggle', () => {
        if (!photoDetails.open) stopCamera();
    });

    function startLiveLocation() {
        if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            showLocationError('Location requires HTTPS. Open Panic Ring using its secure HTTPS address (https://panic-ring-app.netlify.app), then try again.', 'live');
            return;
        }
        if (!('geolocation' in navigator)) {
            showLocationError('Location is not available in this browser. Try using Chrome, Edge, or Firefox.', 'live');
            return;
        }
        
        errorEl.textContent = '';
        retryBtn.hidden = true;
        permissionHelp.hidden = true;
        retryAction = null;
        locationChoice = 'allowed';
        mapStatus.textContent = 'Requesting location permission from your browser…';
        liveToggle.textContent = 'Stop live location';
        liveToggle.setAttribute('aria-pressed', 'true');
        
        try {
            watchId = navigator.geolocation.watchPosition(position => {
                const { latitude, longitude, accuracy } = position.coords;
                
                // Validate coordinates
                if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
                    latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 ||
                    !Number.isFinite(accuracy) || accuracy <= 0) {
                    showLocationError('The device returned an invalid location. Check that Location is enabled in your device settings and try again.', 'live');
                    return;
                }
                
                // Successfully got location
                retryBtn.hidden = true;
                retryAction = null;
                permissionHelp.hidden = true;
                updateMap(latitude, longitude, accuracy, 'Live location active');
            }, geoError => {
                let reason = 'Could not get your location.';
                
                if (geoError.code === geoError.PERMISSION_DENIED) {
                    reason = 'Location permission denied. Click the lock icon in your address bar, select "Site settings", and allow Location. Then click "Try again" below.';
                } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
                    reason = 'Location unavailable. Make sure Location is turned ON in your device settings (Settings → Location). Then try again.';
                } else if (geoError.code === geoError.TIMEOUT) {
                    reason = 'Location request timed out. Move to an area with better GPS signal and try again.';
                }
                
                stopLiveLocation();
                showLocationError(reason, 'live');
            }, { 
                enableHighAccuracy: true, 
                maximumAge: 0, 
                timeout: 15000 
            });
        } catch (error) {
            stopLiveLocation();
            const reason = error instanceof Error ? `Error: ${error.message}` : 'The browser could not start location tracking.';
            showLocationError(reason, 'live');
        }
    }

    liveToggle.addEventListener('click', () => {
        if (watchId !== null) {
            stopLiveLocation();
            mapStatus.textContent = 'Live location paused. Location sharing is still allowed for this screen.';
            return;
        }
        startLiveLocation();
    });

    denyLocation.addEventListener('click', () => {
        locationChoice = 'denied';
        stopLiveLocation();
        retryBtn.hidden = true;
        retryAction = null;
        errorEl.textContent = '';
        permissionHelp.hidden = false;
        mapFrame.hidden = true;
        mapFrame.removeAttribute('src');
        googleMapsLink.hidden = true;
        googleMapsLink.removeAttribute('href');
        mapPlaceholder.hidden = false;
        mapDetails.hidden = true;
        lastMapPosition = null;
        mapStatus.textContent = 'Location denied for this screen. No location will be requested or shared.';
    });

    retryBtn.addEventListener('click', () => {
        if (retryAction === 'live') {
            startLiveLocation();
            return;
        }
        if (retryAction === 'share')
            shareBtn.click();
    });

    const unsubscribeFromLocation = store.subscribe(state => {
        if (state.screen !== 'location') {
            stopLiveLocation();
            stopCamera();
            clearPhoto();
            unsubscribeFromLocation();
        }
    });

    shareBtn.addEventListener('click', async () => {
        if (locationChoice !== 'allowed') {
            const reason = locationChoice === 'denied'
                ? 'You denied location for this screen. Click "Allow location" above to enable location sharing.'
                : 'Click "Allow location" above first, then try sharing your location.';
            mapStatus.textContent = reason;
            errorEl.textContent = reason;
            retryBtn.hidden = true;
            retryAction = null;
            permissionHelp.hidden = false;
            return;
        }
        
        shareBtn.disabled = true;
        skipBtn.disabled = true;
        errorEl.textContent = '';
        retryBtn.hidden = true;
        permissionHelp.hidden = true;
        retryAction = null;
        mapStatus.textContent = 'Getting your current location…';
        
        const result = await getLocation(12000);
        
        if (result.ok === true) {
            updateMap(result.coords.latitude, result.coords.longitude, result.accuracy, 'Current location');
            store.setLocationShared(true, result.text);
            store.startSending();
        }
        else {
            shareBtn.disabled = false;
            skipBtn.disabled = false;
            let enhancedReason = result.reason;
            
            // Add helpful instructions based on the error
            if (result.reason.includes('denied')) {
                enhancedReason += '\n\nTo fix: Click the lock icon in your browser address bar → Site settings → Location → Allow';
            } else if (result.reason.includes('unavailable') || result.reason.includes('No GPS')) {
                enhancedReason += '\n\nMake sure Location is turned ON in your device settings.';
            }
            
            showLocationError(enhancedReason, 'share');
        }
    });
    async function shareDirectly(channel: 'sms' | 'whatsapp') {
        if (locationChoice !== 'allowed') {
            const reason = locationChoice === 'denied'
                ? 'You denied location for this screen. Tap Allow location before sharing coordinates.'
                : 'Tap Allow location before sharing your current coordinates.';
            mapStatus.textContent = reason;
            errorEl.textContent = reason;
            permissionHelp.hidden = false;
            return;
        }
        const contact = store.getState().contacts.find(item => item.id === shareContact.value);
        if (!contact) {
            errorEl.textContent = 'Choose a trusted contact before sharing your location.';
            return;
        }
        smsBtn.disabled = true;
        whatsappBtn.disabled = true;
        errorEl.textContent = '';
        retryBtn.hidden = true;
        permissionHelp.hidden = true;
        mapStatus.textContent = 'Getting your current location…';
        try {
            const result = await getLocation(12000);
            if (result.ok === false) {
                showLocationError(result.reason, 'share');
                return;
            }
            updateMap(result.coords.latitude, result.coords.longitude, result.accuracy, 'Current location');
            const message = `My current location: ${result.mapsUrl}\nGPS accuracy: ±${Math.round(result.accuracy)} m`;
            window.location.href = channel === 'sms'
                ? smsUri(contact.phone, message)
                : whatsappUri(contact.phone, message);
            mapStatus.textContent = `${channel === 'sms' ? 'SMS' : 'WhatsApp'} draft prepared for ${contact.name}. Review it and tap Send; delivery is not confirmed.`;
        } catch (error) {
            showLocationError(error instanceof Error ? error.message : 'Could not prepare the WhatsApp location message.', 'share');
        } finally {
            smsBtn.disabled = false;
            whatsappBtn.disabled = false;
        }
    }
    smsBtn.addEventListener('click', () => void shareDirectly('sms'));
    whatsappBtn.addEventListener('click', () => void shareDirectly('whatsapp'));
    skipBtn.addEventListener('click', () => {
        store.setLocationShared(false, 'Location not shared');
        store.startSending();
    });
}

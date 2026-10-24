import { store } from '../state.js';
import { getLocation } from '../alertService.js';
export function renderLocation(root) {
    root.innerHTML = `
    <div class="screen location-screen">

      <div class="location-icon" aria-hidden="true">GPS</div>
      <h2 class="location-title">Share your location?</h2>
      <p class="location-body">
      Your SMS app will open either way; review the message and tap Send.
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
        <p class="location-map-details" id="location-map-details" hidden></p>
      </section>

      <div class="location-actions-modern">
        <button class="btn-skip-location" id="btn-live-toggle" type="button" aria-pressed="false">Show my live location</button>
        <button class="btn-share-location" id="btn-share">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v8M8 12h8"/>
          </svg>
          Share my location
        </button>
        <button class="btn-skip-location" id="btn-skip">
          Send without location
        </button>
        <button class="btn-secondary location-retry" id="btn-location-retry" type="button" hidden>Try again</button>
        <p class="location-error" id="loc-error" aria-live="assertive"></p>
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
            Share my location sends one current fix in an SMS draft for you to review and send. Live coordinates are not sent to contacts automatically.
            The map sends coordinates to OpenStreetMap to display your position.
            Your browser will ask for location permission. If device Location is turned off, enable it in device settings; this website cannot turn on that system setting for you.
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
    const mapDetails = root.querySelector('#location-map-details') as HTMLElement;
    const errorEl = root.querySelector('#loc-error') as HTMLElement;
    const shareBtn = root.querySelector('#btn-share') as HTMLButtonElement;
    const skipBtn = root.querySelector('#btn-skip') as HTMLButtonElement;
    const liveToggle = root.querySelector('#btn-live-toggle') as HTMLButtonElement;
    const retryBtn = root.querySelector('#btn-location-retry') as HTMLButtonElement;
    let watchId: number | null = null;
    let lastMapPosition: { lat: number; lng: number } | null = null;
    let retryAction: 'live' | 'share' | null = null;

    function updateMap(lat: number, lng: number, accuracy: number, label: string) {
        const delta = 0.006;
        const movedEnough = !lastMapPosition ||
            Math.abs(lastMapPosition.lat - lat) >= 0.0002 ||
            Math.abs(lastMapPosition.lng - lng) >= 0.0002;
        if (movedEnough) {
            const bounds = `${(lng - delta).toFixed(6)}%2C${(lat - delta).toFixed(6)}%2C${(lng + delta).toFixed(6)}%2C${(lat + delta).toFixed(6)}`;
            mapFrame.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bounds}&layer=mapnik&marker=${lat.toFixed(6)}%2C${lng.toFixed(6)}`;
            lastMapPosition = { lat, lng };
        }
        mapFrame.title = `Map showing your current location with reported accuracy of approximately ${Math.round(accuracy)} metres`;
        mapFrame.hidden = false;
        mapPlaceholder.hidden = true;
        mapStatus.textContent = `${label} · GPS accuracy ±${Math.round(accuracy)} m`;
        mapDetails.textContent = `Current coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)} · Updated ${new Date().toLocaleTimeString()}`;
        mapDetails.hidden = false;
    }

    function showLocationError(reason: string, action: 'live' | 'share') {
        mapStatus.textContent = reason;
        errorEl.textContent = reason;
        retryAction = action;
        retryBtn.hidden = false;
    }

    function stopLiveLocation() {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
        liveToggle.textContent = 'Show my live location';
        liveToggle.setAttribute('aria-pressed', 'false');
    }

    function startLiveLocation() {
        if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            showLocationError('Location requires HTTPS. Open Panic Ring using its secure HTTPS address, then try again.', 'live');
            return;
        }
        if (!('geolocation' in navigator)) {
            showLocationError('Location is not available in this browser. Try a browser that supports location access.', 'live');
            return;
        }
        errorEl.textContent = '';
        retryBtn.hidden = true;
        retryAction = null;
        mapStatus.textContent = 'Requesting permission and waiting for a GPS fix…';
        liveToggle.textContent = 'Stop live location';
        liveToggle.setAttribute('aria-pressed', 'true');
        try {
            watchId = navigator.geolocation.watchPosition(position => {
                const { latitude, longitude, accuracy } = position.coords;
                if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
                    latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 ||
                    !Number.isFinite(accuracy) || accuracy <= 0) {
                    showLocationError('The device returned an invalid location. Check Location settings and try again.', 'live');
                    return;
                }
                retryBtn.hidden = true;
                retryAction = null;
                updateMap(latitude, longitude, accuracy, 'Live location active');
            }, geoError => {
                const reason = geoError.code === geoError.PERMISSION_DENIED
                    ? 'Location permission is off for this site. Allow location access in your browser settings, then try again.'
                    : geoError.code === geoError.POSITION_UNAVAILABLE
                        ? 'Your location is unavailable. Check that device Location is turned on and that this site can use it, then try again.'
                        : 'Getting your location timed out. Move to an open area and try again.';
                stopLiveLocation();
                showLocationError(reason, 'live');
            }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
        } catch (error) {
            stopLiveLocation();
            const reason = error instanceof Error ? error.message : 'The browser could not start location tracking.';
            showLocationError(reason, 'live');
        }
    }

    liveToggle.addEventListener('click', () => {
        if (watchId !== null) {
            stopLiveLocation();
            mapStatus.textContent = 'Live location stopped.';
            return;
        }
        startLiveLocation();
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
            unsubscribeFromLocation();
        }
    });

    shareBtn.addEventListener('click', async () => {
        shareBtn.disabled = true;
        skipBtn.disabled = true;
        errorEl.textContent = '';
        retryBtn.hidden = true;
        retryAction = null;
        mapStatus.textContent = 'Requesting location permission and getting your current location…';
        const result = await getLocation(12000);
        if (result.ok === true) {
            updateMap(result.coords.latitude, result.coords.longitude, result.accuracy, 'Current location');
            store.setLocationShared(true, result.text);
            store.startSending();
        }
        else {
            shareBtn.disabled = false;
            skipBtn.disabled = false;
            showLocationError(`${result.reason} If device Location is off, turn it on in your device settings before trying again.`, 'share');
        }
    });
    skipBtn.addEventListener('click', () => {
        store.setLocationShared(false, 'Location not shared');
        store.startSending();
    });
}

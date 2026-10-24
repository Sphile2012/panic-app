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
      </section>

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
            Location is captured once when you tap Share. This browser-only SMS flow cannot send automatic location updates every 10 seconds.
            Location is not stored on a Panic Ring server. The map and address lookup send coordinates to OpenStreetMap to display your position.
          </p>
          <p>SMS and WhatsApp links cannot attach photo files in this browser flow.</p>
          <p>
            <strong>This browser-based app cannot access your phone's IMEI or
            locate it remotely.</strong> To locate a lost device, use its
            manufacturer's find-device service or contact your mobile network
            provider.
          </p>
        </div>

        <div class="location-actions-modern">
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
        </div>

        <p class="location-error" id="loc-error" aria-live="assertive"></p>
      </div>
    </div>
  `;
    const accuracyWrap = root.querySelector('#loc-accuracy-wrap');
    const accuracyFill = root.querySelector('#loc-accuracy-fill');
    const accuracyText = root.querySelector('#loc-accuracy-text');
    const addressCard = root.querySelector('#loc-address-card');
    const addressLine = root.querySelector('#loc-address-line');
    const accuracyBadge = root.querySelector('#loc-accuracy-badge');
    const mapsLink = root.querySelector('#loc-maps-link');
    const mapFrame = root.querySelector('#location-map');
    const mapPlaceholder = root.querySelector('#location-map-placeholder');
    const mapStatus = root.querySelector('#location-map-status');
    const errorEl = root.querySelector('#loc-error');
    const shareBtn = root.querySelector('#btn-share');
    const skipBtn = root.querySelector('#btn-skip');
    const menuBtn = root.querySelector('#btn-menu-location');
    let watchId = null;
    let lastMappedPosition = null;
    function updateMap(lat, lng, accuracy, force = false) {
        const movedEnough = !lastMappedPosition ||
            Math.abs(lastMappedPosition.lat - lat) > 0.0008 ||
            Math.abs(lastMappedPosition.lng - lng) > 0.0008;
        if (!force && !movedEnough)
            return;
        lastMappedPosition = { lat, lng };
        const delta = 0.006;
        const bounds = `${(lng - delta).toFixed(6)}%2C${(lat - delta).toFixed(6)}%2C${(lng + delta).toFixed(6)}%2C${(lat + delta).toFixed(6)}`;
        mapFrame.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bounds}&layer=mapnik&marker=${lat.toFixed(6)}%2C${lng.toFixed(6)}`;
        mapFrame.title = `Map showing your current location with reported accuracy of approximately ${Math.round(accuracy)} metres`;
        mapFrame.hidden = false;
        mapPlaceholder.hidden = true;
        mapStatus.textContent = `GPS accuracy ±${Math.round(accuracy)} m`;
        mapsLink.href = `https://maps.google.com/?q=${lat.toFixed(7)},${lng.toFixed(7)}`;
    }
    function startWatch() {
        if (!('geolocation' in navigator))
            return;
        addressCard.style.display = 'flex';
        watchId = navigator.geolocation.watchPosition(pos => {
            const acc = Math.round(pos.coords.accuracy);
            const label = acc <= 10 ? 'Excellent' : acc <= 30 ? 'Good' : acc <= 100 ? 'Fair' : 'Poor';
            const colour = acc <= 10 ? '#1abf7a' : acc <= 30 ? '#59c93d' : acc <= 100 ? '#e09a19' : '#e0193a';
            const pct = Math.max(0, Math.min(100, 100 - (acc / 2)));
            accuracyFill.style.width = `${pct}%`;
            accuracyFill.style.background = colour;
            accuracyText.textContent = `GPS signal: ${label} (±${acc} m)`;
            updateMap(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        }, error => {
            mapStatus.textContent = error.code === 1
                ? 'Location permission is off'
                : 'Waiting for a GPS position';
        }, { enableHighAccuracy: true, maximumAge: 0 });
    }
    function stopWatch() {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
    }
    startWatch();
    let unsubscribeFromLocation = () => { };
    unsubscribeFromLocation = store.subscribe(state => {
        if (state.screen !== 'location') {
            stopWatch();
            unsubscribeFromLocation();
        }
    });
    shareBtn.addEventListener('click', async () => {
        stopWatch();
        shareBtn.disabled = true;
        skipBtn.disabled = true;
        errorEl.textContent = '';
        accuracyText.textContent = 'Getting a fresh, accurate GPS fix…';
        const result = await getLocation(12000);
        if (result.ok === true) {
            updateMap(result.coords.latitude, result.coords.longitude, result.accuracy, true);
            addressLine.textContent = `Nearby mapped address: ${result.address}`;
            accuracyBadge.textContent = `±${Math.round(result.accuracy)} m`;
            mapsLink.href = result.mapsUrl;
            accuracyWrap.style.display = 'none';
            addressCard.style.display = 'flex';
            store.setLocationShared(true, result.text);
            await new Promise(r => setTimeout(r, 1200));
            store.startSending();
        }
        else {
            shareBtn.disabled = false;
            skipBtn.disabled = false;
            errorEl.textContent = result.reason;
        }
    });
    skipBtn.addEventListener('click', () => {
        stopWatch();
        store.setLocationShared(false, 'Location not shared');
        store.startSending();
    });
}

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
        <p class="loc-accuracy-text" id="loc-accuracy-text">Acquiring GPS…</p>
      </div>

      <div class="loc-address-card" id="loc-address-card" style="display:none">
        <div class="loc-address-body">
          <span class="loc-address-line" id="loc-address-line"></span>
          <span class="loc-accuracy-badge" id="loc-accuracy-badge"></span>
        </div>
        <a class="loc-maps-link" id="loc-maps-link" target="_blank" rel="noopener">
          Open in Maps
        </a>
      </div>

      <div class="location-actions" id="location-actions">
        <button class="btn-location btn-location--share" id="btn-share">
          Share my location
        </button>
        <button class="btn-location btn-location--skip" id="btn-skip">
          Send without location
        </button>
      </div>

      <p class="loc-error" id="loc-error" aria-live="assertive"></p>

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
      </details>

    </div>
  `;
    const accuracyWrap = root.querySelector('#loc-accuracy-wrap') as HTMLElement;
    const accuracyFill = root.querySelector('#loc-accuracy-fill') as HTMLElement;
    const accuracyText = root.querySelector('#loc-accuracy-text') as HTMLElement;
    const addressCard = root.querySelector('#loc-address-card') as HTMLElement;
    const addressLine = root.querySelector('#loc-address-line') as HTMLElement;
    const accuracyBadge = root.querySelector('#loc-accuracy-badge') as HTMLElement;
    const mapsLink = root.querySelector('#loc-maps-link') as HTMLAnchorElement;
    const mapFrame = root.querySelector('#location-map') as HTMLIFrameElement;
    const mapPlaceholder = root.querySelector('#location-map-placeholder') as HTMLElement;
    const mapStatus = root.querySelector('#location-map-status') as HTMLElement;
    const errorEl = root.querySelector('#loc-error') as HTMLElement;
    const shareBtn = root.querySelector('#btn-share') as HTMLButtonElement;
    const skipBtn = root.querySelector('#btn-skip') as HTMLButtonElement;
    let watchId = null;
    let lastMappedPosition: { lat: number; lng: number } | null = null;
    function updateMap(lat: number, lng: number, accuracy: number, force = false) {
        const movedEnough = !lastMappedPosition ||
            Math.abs(lastMappedPosition.lat - lat) > 0.0008 ||
            Math.abs(lastMappedPosition.lng - lng) > 0.0008;
        if (!force && !movedEnough) return;
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
        accuracyWrap.style.display = 'block';
        watchId = navigator.geolocation.watchPosition(pos => {
            const acc = Math.round(pos.coords.accuracy);
            const pct = Math.max(10, Math.min(100, Math.round((1 - (acc / 200)) * 100)));
            const label = acc <= 10 ? 'Excellent' : acc <= 30 ? 'Good' : acc <= 100 ? 'Fair' : 'Poor';
            const colour = acc <= 10 ? '#1abf7a' : acc <= 30 ? '#59c93d' : acc <= 100 ? '#e09a19' : '#e0193a';
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
    let unsubscribeFromLocation: () => void = () => {};
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
        accuracyWrap.style.display = 'block';
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
            await new Promise<void>(r => setTimeout(r, 1200));
            store.startSending();
        }
        else {
            accuracyWrap.style.display = 'none';
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

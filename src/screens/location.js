import { store } from '../state.js';
import { getLocation } from '../alertService.js';
export function renderLocation(root) {
    root.innerHTML = `
    <div class="screen location-screen">

      <div class="location-icon" aria-hidden="true">GPS</div>
      <h2 class="location-title">Share your location?</h2>
      <p class="location-body">
        Your contacts receive the alert either way.
        Sharing your location helps them find you faster. We only share a fresh GPS fix with accuracy within 50 m.
      </p>

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
            Location is captured when you tap Share. The app rejects stale and low-accuracy fixes.
            It is not tracked continuously and is not stored on any server.
          </p>
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
    const accuracyWrap = root.querySelector('#loc-accuracy-wrap');
    const accuracyFill = root.querySelector('#loc-accuracy-fill');
    const accuracyText = root.querySelector('#loc-accuracy-text');
    const addressCard = root.querySelector('#loc-address-card');
    const addressLine = root.querySelector('#loc-address-line');
    const accuracyBadge = root.querySelector('#loc-accuracy-badge');
    const mapsLink = root.querySelector('#loc-maps-link');
    const errorEl = root.querySelector('#loc-error');
    const shareBtn = root.querySelector('#btn-share');
    const skipBtn = root.querySelector('#btn-skip');
    let watchId = null;
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
        }, () => { }, { enableHighAccuracy: true, maximumAge: 0 });
    }
    function stopWatch() {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
    }
    startWatch();
    shareBtn.addEventListener('click', async () => {
        stopWatch();
        shareBtn.disabled = true;
        skipBtn.disabled = true;
        errorEl.textContent = '';
        accuracyWrap.style.display = 'block';
        accuracyText.textContent = 'Getting a fresh, accurate GPS fix…';
        const result = await getLocation(12000);
        if (result.ok === true) {
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

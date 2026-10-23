import { store } from '../state.js';
import { getLocation } from '../alertService.js';
export function renderLocation(root) {
    root.innerHTML = `
    <div class="screen location-screen-modern">
      <div class="location-map-container" id="location-map">
        <div class="location-map-placeholder">
          <svg width="100%" height="100%" viewBox="0 0 400 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Map background -->
            <rect width="400" height="600" fill="#f5f5f5"/>
            <!-- Map streets -->
            <path d="M0 200 L400 200" stroke="#e0e0e0" stroke-width="2"/>
            <path d="M0 400 L400 400" stroke="#e0e0e0" stroke-width="2"/>
            <path d="M100 0 L100 600" stroke="#e0e0e0" stroke-width="2"/>
            <path d="M300 0 L300 600" stroke="#e0e0e0" stroke-width="2"/>
            <path d="M50 100 L350 500" stroke="#FFD700" stroke-width="8" opacity="0.8"/>
            <!-- Location marker -->
            <circle cx="200" cy="300" r="40" fill="#ec4899" opacity="0.3"/>
            <circle cx="200" cy="300" r="20" fill="#ec4899"/>
            <circle cx="200" cy="300" r="8" fill="#ffffff"/>
          </svg>
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

        <div class="location-address-display" id="location-address" style="display:none">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <div class="location-address-text">
            <span id="address-line">Getting your location...</span>
            <span id="accuracy-badge" class="location-accuracy-text"></span>
          </div>
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
    
    const accuracyText = root.querySelector('#accuracy-text') as HTMLElement;
    const addressCard = root.querySelector('#location-address') as HTMLElement;
    const addressLine = root.querySelector('#address-line') as HTMLElement;
    const accuracyBadge = root.querySelector('#accuracy-badge') as HTMLElement;
    const errorEl = root.querySelector('#loc-error') as HTMLElement;
    const shareBtn = root.querySelector('#btn-share') as HTMLButtonElement;
    const skipBtn = root.querySelector('#btn-skip') as HTMLButtonElement;
    const menuBtn = root.querySelector('#btn-menu-location') as HTMLButtonElement;
    
    let watchId = null;
    
    menuBtn?.addEventListener('click', () => {
        store.navigateTo('app');
    });
    
    function startWatch() {
        if (!('geolocation' in navigator))
            return;
        addressCard.style.display = 'flex';
        watchId = navigator.geolocation.watchPosition(pos => {
            const acc = Math.round(pos.coords.accuracy);
            const label = acc <= 10 ? 'Excellent' : acc <= 30 ? 'Good' : acc <= 100 ? 'Fair' : 'Poor';
            accuracyText.textContent = `GPS: ${label} (±${acc}m)`;
            accuracyBadge.textContent = `Accuracy: ±${acc} meters`;
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
        accuracyText.textContent = 'Getting a fresh, accurate GPS fix…';
        const result = await getLocation(12000);
        if (result.ok === true) {
            addressLine.textContent = `${result.address}`;
            accuracyBadge.textContent = `Accuracy: ±${Math.round(result.accuracy)} meters`;
            addressCard.style.display = 'flex';
            store.setLocationShared(true, result.text);
            await new Promise<void>(r => setTimeout(r, 1200));
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

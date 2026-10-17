import { store } from '../state.js';
import { getLocation } from '../alertService.js';

export function renderLocation(root: HTMLElement): void {
    root.innerHTML = `
    <div class="screen location-screen">

      <div class="location-icon" aria-hidden="true">⌖</div>
      <p class="location-eyebrow">YOUR CHOICE</p>
      <h2 class="location-title">Add your location?</h2>
      <p class="location-body">
        Add a fresh map pin and its reported accuracy to your SMS draft.
        Your messages app will open so you can review and send it.
      </p>

      <div class="loc-accuracy-wrap" id="loc-accuracy-wrap" style="display:none" aria-live="polite">
        <div class="loc-accuracy-bar">
          <div class="loc-accuracy-fill" id="loc-accuracy-fill"></div>
        </div>
        <p class="loc-accuracy-text" id="loc-accuracy-text">Getting a fresh location fix…</p>
      </div>

      <div class="loc-address-card" id="loc-address-card" style="display:none" aria-live="polite">
        <div class="loc-address-body">
          <span class="loc-address-line" id="loc-address-line"></span>
          <span class="loc-coordinates" id="loc-coordinates"></span>
          <span class="loc-accuracy-badge" id="loc-accuracy-badge"></span>
        </div>
        <a class="loc-maps-link" id="loc-maps-link" target="_blank" rel="noopener">
          Preview map ↗
        </a>
      </div>

      <div class="location-actions" id="location-actions">
        <button class="btn-location btn-location--share" id="btn-share">
          Get a fresh location
        </button>
        <button class="btn-location btn-location--skip" id="btn-skip">
          Send without location
        </button>
      </div>

      <p class="loc-error" id="loc-error" aria-live="assertive"></p>

      <details class="loc-info-details">
        <summary class="loc-info-summary">How location sharing works</summary>
        <div class="loc-info-body">
          <p>The prepared SMS draft includes:</p>
          <ul>
            <li>Coordinates from your device’s freshest available location fix</li>
            <li>The accuracy estimate reported by your device</li>
            <li>A map link centered on those coordinates</li>
          </ul>
          <p>
            Reported location accuracy varies with your device and surroundings. The pin is not
            a guarantee of your exact position. Location is only requested when
            you choose to share; Panic Ring does not store it on its own server.
          </p>
          <p>
            To show a readable address, coordinates are looked up using OpenStreetMap.
            If configured, what3words also receives them to create its address.
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
    const coordinatesLine = root.querySelector('#loc-coordinates') as HTMLElement;
    const accuracyBadge = root.querySelector('#loc-accuracy-badge') as HTMLElement;
    const mapsLink = root.querySelector('#loc-maps-link') as HTMLAnchorElement;
    const errorEl = root.querySelector('#loc-error') as HTMLElement;
    const shareBtn = root.querySelector('#btn-share') as HTMLButtonElement;
    const skipBtn = root.querySelector('#btn-skip') as HTMLButtonElement;
    let selectedLocation: string | null = null;

    function updateAccuracy(accuracy: number): void {
        const metres = Math.round(accuracy);
        const quality = accuracy <= 15 ? 'Strong' : accuracy <= 50 ? 'Fair' : 'Weak';
        accuracyText.textContent = `Location estimate: ${quality} · reported accuracy ±${metres} m`;
        accuracyFill.style.width = `${Math.max(8, Math.min(100, Math.round((1 - accuracy / 200) * 100)))}%`;
        accuracyFill.dataset['quality'] = accuracy <= 15 ? 'strong' : accuracy <= 50 ? 'fair' : 'weak';
    }

    shareBtn.addEventListener('click', async () => {
        if (selectedLocation) {
            store.setLocationShared(true, selectedLocation);
            store.startSending();
            return;
        }

        shareBtn.disabled = true;
        skipBtn.disabled = true;
        errorEl.textContent = '';
        accuracyWrap.style.display = 'block';
        accuracyText.textContent = 'Getting a fresh location fix…';
        accuracyFill.style.width = '8%';
        const result = await getLocation(15000, updateAccuracy);
        if (result.ok === true) {
            selectedLocation = result.text;
            addressLine.textContent = result.address;
            coordinatesLine.textContent = `${result.coords.latitude.toFixed(6)}, ${result.coords.longitude.toFixed(6)}`;
            updateAccuracy(result.accuracy);
            accuracyBadge.textContent = `Reported accuracy: ±${Math.round(result.accuracy)} m`;
            mapsLink.href = result.mapsUrl;
            addressCard.style.display = 'flex';
            accuracyWrap.style.display = 'block';
            shareBtn.textContent = 'Send alert with this location';
            shareBtn.disabled = false;
            skipBtn.disabled = false;
        } else {
            accuracyWrap.style.display = 'none';
            shareBtn.disabled = false;
            skipBtn.disabled = false;
            errorEl.textContent = result.reason;
        }
    });

    skipBtn.addEventListener('click', () => {
        store.setLocationShared(false, 'Location not shared');
        store.startSending();
    });
}

import '../strings/groupA.js';
import { store } from '../state.js';
import { getLocation } from '../alertService.js';
import { t } from '../i18n.js';
export function renderLocation(root) {
    root.innerHTML = `
    <div class="screen location-screen">

      <div class="location-icon" aria-hidden="true"></div>
      <h2 class="location-title">${t('loc.title')}</h2>
      <p class="location-body">
        ${t('loc.body')}
      </p>

      <!-- Live GPS accuracy bar — shown while acquiring -->
      <div class="loc-accuracy-wrap" id="loc-accuracy-wrap" style="display:none">
        <div class="loc-accuracy-bar">
          <div class="loc-accuracy-fill" id="loc-accuracy-fill"></div>
        </div>
        <p class="loc-accuracy-text" id="loc-accuracy-text">${t('loc.acquiring')}</p>
      </div>

      <!-- Address result — shown after GPS fix -->
      <div class="loc-address-card" id="loc-address-card" style="display:none">
        <div class="loc-address-body">
          <span class="loc-address-line" id="loc-address-line"></span>
          <span class="loc-accuracy-badge" id="loc-accuracy-badge"></span>
        </div>
        <a class="loc-maps-link" id="loc-maps-link" target="_blank" rel="noopener">
          ${t('a.loc.openmaps')}
        </a>
      </div>

      <div class="location-actions" id="location-actions">
        <button class="btn-location btn-location--share" id="btn-share">
          ${t('loc.share')}
        </button>
        <button class="btn-location btn-location--skip" id="btn-skip">
          ${t('loc.skip')}
        </button>
      </div>

      <!-- Error message -->
      <p class="loc-error" id="loc-error" aria-live="assertive"></p>

      <!-- What the app can and cannot do — honest note -->
      <details class="loc-info-details">
        <summary class="loc-info-summary">${t('a.loc.info.title')}</summary>
        <div class="loc-info-body">
          <p>${t('a.loc.info.p1')}</p>
          <ul>
            <li>${t('a.loc.info.l1')}</li>
            <li>${t('a.loc.info.l2')}</li>
            <li>${t('a.loc.info.l3')}</li>
          </ul>
          <p>
            ${t('a.loc.info.p2')}
          </p>
          <p>
            ${t('a.loc.info.p3')}
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
    const errorEl = root.querySelector('#loc-error') as HTMLElement;
    const shareBtn = root.querySelector('#btn-share') as HTMLButtonElement;
    const skipBtn = root.querySelector('#btn-skip') as HTMLButtonElement;
    let watchId = null;
    function startWatch() {
        if (!('geolocation' in navigator))
            return;
        accuracyWrap.style.display = 'block';
        watchId = navigator.geolocation.watchPosition(pos => {
            const acc = Math.round(pos.coords.accuracy);
            const pct = Math.max(10, Math.min(100, Math.round((1 - (acc / 200)) * 100)));
            const label = acc <= 10 ? t('a.loc.q.excellent') : acc <= 30 ? t('a.loc.q.good') : acc <= 100 ? t('a.loc.q.fair') : t('a.loc.q.poor');
            const colour = acc <= 10 ? '#1abf7a' : acc <= 30 ? '#59c93d' : acc <= 100 ? '#e09a19' : '#e0193a';
            accuracyFill.style.width = `${pct}%`;
            accuracyFill.style.background = colour;
            accuracyText.textContent = t('a.loc.signal', { label, acc });
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
        accuracyText.textContent = t('a.loc.getting');
        const result: any = await getLocation(12000);
        if (result.ok) {
            addressLine.textContent = result.address;
            accuracyBadge.textContent = `+/-${Math.round(result.accuracy)} m`;
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
        store.setLocationShared(false, t('a.loc.notshared'));
        store.startSending();
    });
}

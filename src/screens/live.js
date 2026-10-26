import '../strings/groupA.js';
import { store } from '../state.js';
import { t } from '../i18n.js';
import { smsUri, whatsappUri } from '../storage.js';
import { getLocation } from '../alertService.js';
import { DB_CONFIGURED } from '../db.js';
import { startTracking, stopTracking, isTracking, getLast, getError, getLowBattery, dismissLowBattery, onTrackChange, trackUrl, mapsUrl, } from '../tracking.js';
let unsubscribe = null;
let unsubscribeStore = null;
let mapZoom = 14;
function esc(s) {
    return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function mapEmbedUrl(lat, lng, zoom) {
    const span = 0.08 / 2 ** (zoom - 13);
    const bounds = [
        Math.max(-180, lng - span),
        Math.max(-90, lat - span),
        Math.min(180, lng + span),
        Math.min(90, lat + span),
    ].join(',');
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bounds}&layer=mapnik&marker=${lat},${lng}`;
}
export function renderLive(root) {
    if (unsubscribe)
        unsubscribe();
    if (unsubscribeStore)
        unsubscribeStore();
    const { contacts } = store.getState();
    let isAuthenticated = store.getState().isAuthenticated;
    let capturedLocation = null;
    const paint = () => {
        const on = isTracking();
        const last = on ? getLast() ?? capturedLocation : capturedLocation ?? getLast();
        const err = getError();
        const low = getLowBattery();
        const mapUrl = last ? mapsUrl(last) : null;
        const link = last
            ? DB_CONFIGURED
                ? on && err === null ? trackUrl() : mapUrl
                : mapsUrl(last)
            : null;
        const callPolice = 'Please call the police now (SAPS 10111).';
        const locationMessage = on && err === null && link
            ? t('trk.link.sms', { url: link })
            : mapUrl
                ? `My latest GPS fix is here: ${mapUrl} (not live tracking).`
                : 'No GPS fix is available yet; I cannot share a location.';
        const linkBody = `${locationMessage}\n${callPolice}`;
        const locationShareBody = last
            ? `My location is here: ${mapUrl}\nGPS accuracy: ±${Math.round(last.accuracy)} m`
            : 'Please enable location access to share your current location.';
        const lowBody = `${DB_CONFIGURED && link
            ? t('trk.low.sms', { pct: low ?? '', url: link ?? '' })
            : `My battery is low (${low ?? 'unknown'}%). ${locationMessage}`}\n${callPolice}`;
        let status = t('trk.off');
        if (err === 'pending')
            status = t('trk.requesting');
        else if (err === 'insecure')
            status = t('trk.insecure');
        else if (err === 'denied')
            status = t('trk.denied');
        else if (err === 'auth')
            status = 'GPS captured; live link sync unavailable';
        else if (err === 'unsupported')
            status = t('trk.unsupported');
        else if (err === 'unavailable')
            status = t('trk.unavailable');
        else if (err === 'network')
            status = t('trk.network');
        else if (on)
            status = t('trk.live');
        root.innerHTML = `
      <div class="screen live-location-screen">
        <div class="live-map-content">
          <button class="live-map-back" id="btn-back" type="button" aria-label="${t('common.back')}">←</button>
          <header class="live-map-heading">
            <h1>Live Map</h1>
            <p>Your location &amp; safe zones</p>
          </header>
          <div class="live-map-legend" aria-label="Map legend">
            <span><i class="live-legend-dot live-legend-dot--you"></i>You</span>
            <span><i class="live-legend-dot live-legend-dot--alert"></i>Active alert</span>
            <span><i class="live-legend-dot live-legend-dot--safe"></i>Safe zone</span>
          </div>
          <section class="live-map-panel" aria-label="Live location map">
            ${last
            ? `<iframe class="live-map-iframe" title="Map showing your live location"
                    src="${mapEmbedUrl(last.lat, last.lng, mapZoom)}"
                    loading="lazy" referrerpolicy="no-referrer"></iframe>`
            : `<div class="live-map-empty" role="status">
                    <span class="live-map-empty-pin" aria-hidden="true">⌖</span>
                    <strong>Your location will appear here</strong>
                    <span>Allow location access to see your position on the map.</span>
                  </div>`}
            <div class="live-map-zoom" aria-label="Map zoom controls">
              <button type="button" id="btn-map-zoom-in" aria-label="Zoom in">+</button>
              <button type="button" id="btn-map-zoom-out" aria-label="Zoom out">−</button>
            </div>
          </section>
          <div class="live-location-status" role="status" aria-live="polite">
            <span class="live-dot ${on ? 'live-dot--on' : ''}"></span>
            <strong>${esc(status)}</strong>
            ${last ? `<span class="live-map-updated">Accuracy ±${Math.round(last.accuracy)}m</span>` : ''}
          </div>
          ${last ? `<div class="live-map-location-meta">
            <span>Last location update: ${new Date(last.at).toLocaleTimeString()}</span>
            ${last.battery !== null ? `<span>${esc(t('trk.battery'))}: ${last.battery}%</span>` : ''}
          </div>` : ''}
        ${low !== null ? `
          <div class="live-banner live-banner--low">
            <strong>${esc(t('trk.low.title'))}</strong>
            <p>${esc(t('trk.low.body', { pct: low }))}</p>
            ${contacts.map(c => `<a class="btn-danger live-sms" href="${smsUri(c.phone, lowBody)}">${esc(t('trk.low.send'))}: ${esc(c.name)}</a>`).join('')}
            <button class="btn-secondary" id="btn-dismiss">${esc(t('common.close'))}</button>
          </div>` : ''}
          <div class="live-map-location-links">
            ${mapUrl ? `<a class="live-map-external" href="${mapUrl}" target="_blank" rel="noopener noreferrer">Open last GPS fix in Google Maps →</a>` : ''}
          </div>
          <section class="live-share-card" aria-label="Share location">
            <h2>Share your location</h2>
            ${last ? `
              <p>Choose SMS or WhatsApp for a trusted contact. Review and send the message in that app.</p>
              <div class="live-share-contacts">
                ${contacts.length ? contacts.map((contact, index) => `
                  <div class="live-share-contact">
                    <strong>${esc(contact.name)}</strong>
                    <div>
                      <a class="btn-secondary" data-share-sms="${index}" href="${smsUri(contact.phone, locationShareBody)}">SMS</a>
                      <a class="btn-secondary" data-share-whatsapp="${index}" href="${whatsappUri(contact.phone, locationShareBody)}">WhatsApp</a>
                    </div>
                  </div>
                `).join('') : `<p>Add a trusted contact before sharing from here.</p>`}
              </div>
              <p class="live-share-feedback" id="live-share-feedback" role="status" aria-live="polite"></p>
              <textarea class="live-share-copy" id="live-share-copy" aria-label="Location message" readonly hidden></textarea>
              <button class="btn-secondary" id="live-copy-message" type="button" hidden>Copy location message</button>
            ` : `
              <p>Get a current GPS fix, then choose SMS or WhatsApp for a trusted contact.</p>
              <button class="btn-primary live-location-toggle" id="btn-share-location" type="button">Get location to share</button>
              <p class="live-share-feedback" id="live-share-feedback" role="status" aria-live="polite"></p>
            `}
          </section>
          <button class="live-location-toggle-secondary" id="btn-toggle" type="button" aria-pressed="${on}">
            ${esc(on ? t('trk.stop') : t('trk.enable'))}
          </button>
          ${on ? `
            <h3 class="live-sub">${esc(t('trk.link'))}</h3>
            ${DB_CONFIGURED ? '' : `<p class="live-intro">${esc(t('trk.nolink'))}</p>`}
            ${link ? `<div class="live-links">
              ${contacts.map((c, index) => `
                <button class="btn-secondary" type="button" data-live-contact="${index}">${err === 'auth' ? 'Share GPS via SMS' : `SMS: ${esc(c.name)}`}</button>
                <a class="btn-secondary" data-live-whatsapp="${index}" href="${whatsappUri(c.phone, linkBody)}">${err === 'auth' ? 'Share GPS via WhatsApp' : `WhatsApp: ${esc(c.name)}`}</a>
              `).join('')}
            </div>` : `<p class="live-intro">${esc(err === 'network' ? t('trk.network') : err === 'pending' ? t('trk.requesting') : 'Waiting for a GPS fix before sharing a location.')}</p>`}` : ''}
          ${isAuthenticated
            ? `<section class="live-map-signin live-map-safe-zones">
                <p>Your account is signed in. Manage your saved safe zones.</p>
                <button class="btn-primary" id="btn-manage-safe-zones" type="button">Manage Safe Zones</button>
              </section>
              <nav class="live-map-tabs" aria-label="App tabs">
                <button type="button" data-live-tab="app">Home</button>
                <button type="button" data-live-tab="profile">Profile</button>
                <button type="button" data-live-tab="contacts">Circle</button>
                <button type="button" data-live-tab="emergency">Emergency</button>
                <button type="button" data-live-tab="history">History</button>
                <button type="button" data-live-tab="journey">Journey</button>
                <button type="button" data-live-tab="safety-plan">Safety Plan</button>
                <button type="button" data-live-tab="records">Records</button>
                <button type="button" data-live-tab="notes">Notes</button>
                <button type="button" data-live-tab="troubleshoot">Help</button>
                <button type="button" data-live-tab="chat">Assistant</button>
                <button type="button" data-live-tab="settings">Settings</button>
              </nav>`
            : `<section class="live-map-signin">
                <p>Sign in to save and manage your safe zones</p>
                <button class="btn-primary" id="btn-map-signin" type="button">Sign In</button>
              </section>`}
        </div>
      </div>`;
        root.querySelector('#btn-back').addEventListener('click', () => store.navigateTo('app'));
        root.querySelector('#btn-map-zoom-in').addEventListener('click', () => {
            mapZoom = Math.min(19, mapZoom + 1);
            paint();
        });
        root.querySelector('#btn-map-zoom-out').addEventListener('click', () => {
            mapZoom = Math.max(3, mapZoom - 1);
            paint();
        });
        root.querySelector('#btn-toggle').addEventListener('click', () => {
            if (isTracking())
                stopTracking();
            else {
                void startTracking();
            }
        });
        root.querySelector('#btn-share-location')?.addEventListener('click', async (event) => {
            const button = event.currentTarget;
            const feedback = root.querySelector('#live-share-feedback');
            button.disabled = true;
            if (feedback) feedback.textContent = 'Getting a current GPS fix…';
            try {
                const result = await getLocation(12000);
                if (!result.ok) {
                    if (feedback) feedback.textContent = result.reason;
                    return;
                }
                capturedLocation = {
                    lat: result.coords.latitude,
                    lng: result.coords.longitude,
                    accuracy: result.accuracy,
                    battery: null,
                    charging: false,
                    at: Date.now(),
                };
                paint();
            } catch (error) {
                if (feedback) feedback.textContent = error instanceof Error
                    ? error.message
                    : 'Could not get your current location.';
            } finally {
                button.disabled = false;
            }
        });
        root.querySelector('#btn-map-signin')?.addEventListener('click', () => store.navigateTo('welcome'));
        root.querySelector('#btn-manage-safe-zones')?.addEventListener('click', () => store.navigateTo('safety-plan'));
        root.querySelectorAll('[data-live-tab]').forEach(button => {
            button.addEventListener('click', () => store.navigateTo(button.dataset.liveTab));
        });
        root.querySelectorAll('[data-live-contact]').forEach(button => {
            button.addEventListener('click', () => {
                const contact = contacts[Number(button.dataset.liveContact)];
                if (contact) {
                    window.location.href = smsUri(contact.phone, linkBody);
                    scheduleSmsFallback(linkBody);
                }
            });
        });
        root.querySelectorAll('[data-share-sms]').forEach(link => {
            link.addEventListener('click', () => scheduleSmsFallback(locationShareBody));
        });
        root.querySelector('#live-copy-message')?.addEventListener('click', () => {
            const copyField = root.querySelector('#live-share-copy');
            const feedback = root.querySelector('#live-share-feedback');
            if (!copyField)
                return;
            copyField.focus();
            copyField.select();
            const copyPromise = navigator.clipboard?.writeText(copyField.value);
            if (!copyPromise) {
                if (feedback)
                    feedback.textContent = 'Select and copy the location message, then paste it into your SMS app.';
                return;
            }
            void copyPromise.then(() => {
                if (feedback)
                    feedback.textContent = 'Location message copied. Paste it into your SMS app.';
            }).catch(() => {
                if (feedback)
                    feedback.textContent = 'Select and copy the location message, then paste it into your SMS app.';
            });
        });
        root.querySelector('#btn-dismiss')?.addEventListener('click', () => dismissLowBattery());
    };
    function scheduleSmsFallback(body) {
        const feedback = root.querySelector('#live-share-feedback');
        if (feedback)
            feedback.textContent = 'Opening your SMS app…';
        const copyAttempt = navigator.clipboard?.writeText(body).then(() => true, () => false)
            ?? Promise.resolve(false);
        window.setTimeout(() => {
            if (document.hidden || !root.isConnected)
                return;
            const copyField = root.querySelector('#live-share-copy');
            const copyButton = root.querySelector('#live-copy-message');
            const currentFeedback = root.querySelector('#live-share-feedback');
            if (!copyField || !copyButton || !currentFeedback)
                return;
            void copyAttempt.then(copied => {
                currentFeedback.textContent = copied
                    ? 'If no SMS app opened, the location message is copied and ready to paste.'
                    : 'No SMS app opened. Copy the location message below and paste it into your SMS app.';
                if (!copied) {
                    copyField.value = body;
                    copyField.hidden = false;
                    copyButton.hidden = false;
                }
            });
        }, 1000);
    }
    paint();
    unsubscribe = onTrackChange(() => {
        if (!root.isConnected || !root.querySelector('#btn-toggle')) {
            if (unsubscribe)
                unsubscribe();
            unsubscribe = null;
            return;
        }
        paint();
    });
    unsubscribeStore = store.subscribe(state => {
        if (!root.isConnected || state.screen !== 'live') {
            if (unsubscribeStore)
                unsubscribeStore();
            unsubscribeStore = null;
            return;
        }
        if (state.isAuthenticated !== isAuthenticated) {
            isAuthenticated = state.isAuthenticated;
            paint();
        }
    });
}

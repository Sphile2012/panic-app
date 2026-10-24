import '../strings/groupA.js';
import { store } from '../state.js';
import { t } from '../i18n.js';
import { smsUri, whatsappUri } from '../storage.js';
import { DB_CONFIGURED } from '../db.js';
import { startTracking, stopTracking, isTracking, getLast, getError, getLowBattery, dismissLowBattery, onTrackChange, trackUrl, mapsUrl, } from '../tracking.js';
let unsubscribe = null;
function esc(s) {
    return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
export function renderLive(root) {
    if (unsubscribe)
        unsubscribe();
    const contacts = store.getState().contacts;
    const paint = () => {
        const on = isTracking();
        const last = getLast();
        const err = getError();
        const low = getLowBattery();
        const mapUrl = last ? mapsUrl(last) : null;
        const link = last
            ? DB_CONFIGURED
                ? err === null ? trackUrl() : null
                : mapsUrl(last)
            : null;
        const callPolice = 'Please call the police now (SAPS 10111).';
        const locationMessage = DB_CONFIGURED
            ? link
                ? t('trk.link.sms', { url: link })
                : err === 'auth'
                    ? t('trk.auth')
                    : last
                        ? 'Live updates are unavailable. Send a one-time location from the location screen.'
                        : 'No GPS fix is available yet; I cannot share a location.'
            : last
                ? `My last known location is here: ${link} (this map is not live tracking).`
                : 'No GPS fix is available yet; I cannot share a location.';
        const linkBody = `${locationMessage}\n${callPolice}`;
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
            status = t('trk.auth');
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
        <header class="screen-header">
          <button class="btn-back-small" id="btn-back" aria-label="${t('common.back')}">${t('common.back')}</button>
          <h2 class="screen-title">${esc(t('trk.title'))}</h2>
        </header>
        ${low !== null ? `
          <div class="live-banner live-banner--low">
            <strong>${esc(t('trk.low.title'))}</strong>
            <p>${esc(t('trk.low.body', { pct: low }))}</p>
            ${contacts.map(c => `<a class="btn-danger live-sms" href="${smsUri(c.phone, lowBody)}">${esc(t('trk.low.send'))}: ${esc(c.name)}</a>`).join('')}
            <button class="btn-secondary" id="btn-dismiss">${esc(t('common.close'))}</button>
          </div>` : ''}
        <p class="live-intro">${esc(t('trk.body'))}</p>
        <div class="live-card live-location-card">
          <div class="live-location-status" role="status" aria-live="polite">
            <span class="live-dot ${on ? 'live-dot--on' : ''}"></span>
            <strong>${esc(status)}</strong>
          </div>
          ${last?.battery !== null && last?.battery !== undefined
            ? `<div class="live-location-detail">${esc(t('trk.battery'))}: ${last.battery}%</div>` : ''}
          ${last ? `<div class="live-location-detail">Last location update: ${new Date(last.at).toLocaleTimeString()}</div>` : ''}
        </div>
        ${mapUrl ? `<a class="btn-secondary live-map-link" href="${mapUrl}" target="_blank" rel="noopener noreferrer">Open last GPS fix in Google Maps</a>` : ''}
        <button class="btn-primary live-location-toggle" id="btn-toggle" aria-pressed="${on}">
          ${esc(on ? t('trk.stop') : t('trk.enable'))}
        </button>
        ${err === 'auth' ? `<button class="btn-secondary" id="btn-live-login" type="button">${esc(t('trk.auth.action'))}</button>` : ''}
        ${on ? `
          <h3 class="live-sub">${esc(t('trk.link'))}</h3>
          ${DB_CONFIGURED ? '' : `<p class="live-intro">${esc(t('trk.nolink'))}</p>`}
          ${link ? `<div class="live-links">
            ${contacts.map((c, index) => `
              <button class="btn-secondary" type="button" data-live-contact="${index}">SMS: ${esc(c.name)}</button>
              <a class="btn-secondary" data-live-whatsapp="${index}" href="${whatsappUri(c.phone, linkBody)}" target="_blank" rel="noopener noreferrer">WhatsApp: ${esc(c.name)}</a>
            `).join('')}
          </div>` : `<p class="live-intro">${esc(err === 'network' ? t('trk.network') : err === 'pending' ? t('trk.requesting') : 'Waiting for a GPS fix before sharing a location.')}</p>`}` : ''}
      </div>`;
        root.querySelector('#btn-back').addEventListener('click', () => store.navigateTo('app'));
        root.querySelector('#btn-toggle').addEventListener('click', () => {
            if (isTracking())
                stopTracking();
            else {
                void startTracking();
            }
        });
        root.querySelector('#btn-live-login')?.addEventListener('click', () => store.navigateTo('login'));
        root.querySelectorAll('[data-live-contact]').forEach(button => {
            button.addEventListener('click', () => {
                const contact = contacts[Number(button.dataset.liveContact)];
                if (contact)
                    window.location.href = smsUri(contact.phone, linkBody);
            });
        });
        root.querySelector('#btn-dismiss')?.addEventListener('click', () => dismissLowBattery());
    };
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
}

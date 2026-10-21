import '../strings/groupA.js';
import { store } from '../state.js';
import { t } from '../i18n.js';
import { startEvidenceCapture } from '../evidence.js';
import { smsUri } from '../storage.js';
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
        const link = DB_CONFIGURED ? trackUrl() : mapsUrl(last);
        const linkBody = t('trk.link.sms', { url: link });
        const lowBody = t('trk.low.sms', { pct: low ?? '', url: link });
        let status = t('trk.off');
        if (err === 'denied')
            status = t('trk.denied');
        else if (err === 'unsupported')
            status = t('trk.unsupported');
        else if (err === 'unavailable')
            status = t('trk.unavailable');
        else if (err === 'network')
            status = t('trk.network');
        else if (on)
            status = t('trk.live');
        root.innerHTML = `
      <div class="screen">
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
        <div class="live-card">
          <div class="live-row"><span class="live-dot ${on ? 'live-dot--on' : ''}"></span><strong>${esc(status)}</strong></div>
          ${last ? `
            <div class="live-row"><span>${esc(t('trk.battery'))}</span><strong>${last.battery ?? '-'}%</strong></div>
            <div class="live-row"><span>GPS</span><strong>${last.lat.toFixed(5)}, ${last.lng.toFixed(5)}</strong></div>` : ''}
        </div>
        <button class="btn-primary" id="btn-toggle">${esc(on ? t('trk.stop') : t('trk.enable'))}</button>
        ${on ? `
          <h3 class="live-sub">${esc(t('trk.link'))}</h3>
          ${DB_CONFIGURED ? '' : `<p class="live-intro">${esc(t('trk.nolink'))}</p>`}
          <div class="live-links">
            ${contacts.map(c => `<a class="btn-secondary" href="${smsUri(c.phone, linkBody)}">${esc(t('trk.link.share'))}: ${esc(c.name)}</a>`).join('')}
          </div>` : ''}
      </div>`;
        root.querySelector('#btn-back').addEventListener('click', () => store.navigateTo('app'));
        root.querySelector('#btn-toggle').addEventListener('click', () => {
            if (isTracking())
                stopTracking();
            else {
                void startTracking();
                void startEvidenceCapture();
            }
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

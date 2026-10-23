import './style.css';
import { fetchTrack, isTrackToken } from './tracking.js';
import { t, languageBarHtml, bindLanguageBar } from './i18n.js';

const root = document.getElementById('app') as HTMLElement;
const token = location.hash.replace(/^#/, '').trim();
let timer: number | null = null;

function esc(s: string): string {
    return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

async function paint() {
    const validToken = isTrackToken(token);
    const data = validToken ? await fetchTrack(token) : null;
    let body: string;
    if (!token || !validToken) {
        body = `<p class="track-note">${esc(t('track.invalid'))}</p>`;
    } else if (!data) {
        body = `<p class="track-note">${esc(t('track.waiting'))}</p>`;
    } else {
        const low = data.battery !== null && data.battery <= 20 && !data.charging;
        const when = new Date(data.updated).toLocaleTimeString();
        const maps = `https://maps.google.com/?q=${data.lat},${data.lng}`;
        body = `
      ${low ? `<div class="live-banner live-banner--low">${esc(t('track.low'))}</div>` : ''}
      <div class="live-card">
        <div class="live-row"><span>${esc(t('trk.battery'))}</span><strong>${data.battery ?? '-'}%${data.charging ? ' (' + esc(t('track.charging')) + ')' : ''}</strong></div>
        <div class="live-row"><span>${esc(t('track.updated'))}</span><strong>${esc(when)}</strong></div>
        <div class="live-row"><span>GPS estimate (±${Math.round(data.accuracy)} m)</span><strong>${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}</strong></div>
      </div>
      <a class="btn-primary live-link" href="${maps}" target="_blank" rel="noopener">${esc(t('track.open'))}</a>`;
    }
    root.innerHTML = `
    <div class="screen">
      <header class="screen-header"><h2 class="screen-title">${esc(t('track.title'))}</h2></header>
      ${languageBarHtml()}
      ${body}
    </div>`;
    bindLanguageBar(root, paint);
}

paint();
timer = window.setInterval(paint, 10_000);
window.addEventListener('pagehide', () => {
    if (timer !== null) clearInterval(timer);
});

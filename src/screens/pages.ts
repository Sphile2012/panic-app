import { store } from '../state.js';
import { t } from '../i18n.js';
import { fetchRecentAlerts } from '../db.js';

function esc(s: unknown): string {
    return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

function shell(titleKey: string, body: string): string {
    return `
    <div class="screen">
      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="Back">${t('common.back')}</button>
        <h2 class="screen-title">${t(titleKey)}</h2>
      </header>
      ${body}
    </div>`;
}

function wireBack(root: HTMLElement) {
    root.querySelector('#btn-back')!.addEventListener('click', () => store.navigateTo('app'));
}

export function renderHistory(root: HTMLElement) {
    root.innerHTML = shell('menu.history', `<ul class="page-list" id="hist-list"><li class="page-item">...</li></ul>`);
    wireBack(root);
    fetchRecentAlerts(30).then((rows: any[]) => {
        const list = root.querySelector('#hist-list');
        if (!list) return;
        if (!rows.length) {
            list.innerHTML = `<li class="page-item page-muted">No alerts have been sent yet.</li>`;
            return;
        }
        list.innerHTML = rows.map(r => `
          <li class="page-item">
            <strong>${esc(new Date(r.fired_at).toLocaleString())}</strong>
            <span class="page-muted">${esc(r.contact_count)} contact(s)${r.location_shared ? ', location shared' : ''}</span>
          </li>`).join('');
    });
}

let journeyTimer: number | null = null;

export function renderJourney(root: HTMLElement) {
    if (journeyTimer) { clearInterval(journeyTimer); journeyTimer = null; }
    root.innerHTML = shell('menu.journey', `
      <div class="page-card">
        <p class="page-muted">Set how long your trip should take. If you do not confirm you arrived before the time runs out, you will be prompted to send an alert.</p>
        <label class="field-label" for="j-min">Minutes</label>
        <input class="text-input" id="j-min" type="number" min="1" max="720" value="15" />
        <button class="btn-primary" id="j-start">Start journey</button>
        <div id="j-run" hidden>
          <div class="page-timer" id="j-time">00:00</div>
          <button class="btn-primary" id="j-done">I arrived safely</button>
          <button class="btn-danger" id="j-alert">Send alert now</button>
        </div>
      </div>`);
    wireBack(root);
    const stop = () => { if (journeyTimer) { clearInterval(journeyTimer); journeyTimer = null; } };
    root.querySelector('#btn-back')!.addEventListener('click', stop);
    const run = root.querySelector('#j-run') as HTMLElement;
    const timeEl = root.querySelector('#j-time') as HTMLElement;
    root.querySelector('#j-start')!.addEventListener('click', () => {
        const mins = Math.max(1, Math.min(720, parseInt((root.querySelector('#j-min') as HTMLInputElement).value, 10) || 15));
        const end = Date.now() + mins * 60000;
        run.hidden = false;
        stop();
        journeyTimer = window.setInterval(() => {
            const left = Math.max(0, end - Date.now());
            const s = Math.ceil(left / 1000);
            timeEl.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
            if (left <= 0) {
                stop();
                if (confirm('Your journey time is over. Send an alert to your contacts?')) store.navigateTo('location');
                else store.navigateTo('app');
            }
        }, 500);
    });
    root.querySelector('#j-done')!.addEventListener('click', () => { stop(); store.navigateTo('app'); });
    root.querySelector('#j-alert')!.addEventListener('click', () => { stop(); store.navigateTo('location'); });
}

export function renderFakeCall(root: HTMLElement) {
    root.innerHTML = shell('menu.fakecall', `
      <div class="page-card">
        <label class="field-label" for="fc-name">Caller name</label>
        <input class="text-input" id="fc-name" type="text" maxlength="40" value="Mom" />
        <label class="field-label" for="fc-delay">Ring after (seconds)</label>
        <input class="text-input" id="fc-delay" type="number" min="0" max="300" value="10" />
        <button class="btn-primary" id="fc-start">Start fake call</button>
        <p class="page-muted" id="fc-msg"></p>
      </div>`);
    wireBack(root);
    root.querySelector('#fc-start')!.addEventListener('click', () => {
        const name = (root.querySelector('#fc-name') as HTMLInputElement).value.trim() || 'Unknown';
        const delay = Math.max(0, Math.min(300, parseInt((root.querySelector('#fc-delay') as HTMLInputElement).value, 10) || 0));
        (root.querySelector('#fc-msg') as HTMLElement).textContent = `Call will arrive in ${delay} seconds. You can lock the screen.`;
        window.setTimeout(() => showIncoming(name), delay * 1000);
    });
}

function showIncoming(name: string) {
    const el = document.createElement('div');
    el.className = 'fake-call';
    el.innerHTML = `
      <div class="fake-call-name">${esc(name)}</div>
      <div class="fake-call-sub" id="fc-sub">Incoming call</div>
      <div class="fake-call-actions">
        <button class="btn-danger" id="fc-decline">Decline</button>
        <button class="btn-primary" id="fc-accept">Accept</button>
      </div>`;
    document.body.appendChild(el);
    if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 400]);
    let tick: number | null = null;
    el.querySelector('#fc-decline')!.addEventListener('click', () => { if (tick) clearInterval(tick); el.remove(); });
    el.querySelector('#fc-accept')!.addEventListener('click', () => {
        (el.querySelector('.fake-call-actions') as HTMLElement).innerHTML = `<button class="btn-danger" id="fc-end">End call</button>`;
        const sub = el.querySelector('#fc-sub') as HTMLElement;
        let secs = 0;
        tick = window.setInterval(() => {
            secs++;
            sub.textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
        }, 1000);
        el.querySelector('#fc-end')!.addEventListener('click', () => { if (tick) clearInterval(tick); el.remove(); });
    });
}

export function renderWatch(root: HTMLElement) {
    root.innerHTML = shell('menu.watch', `
      <div class="page-card">
        <p>A web app cannot connect to a smartwatch directly.</p>
        <p class="page-muted">Panic Ring sends alerts from the phone it is installed on. If your watch mirrors phone notifications, you will see alert and low battery messages there. Use the Install option in Settings for the best background support.</p>
      </div>`);
    wireBack(root);
}

const GUIDE = [
    ['Set up', 'Create a PIN and add trusted contacts. Choose how each person is related to you.'],
    ['Send an alert', 'Enter your PIN on the calculator screen. Your contacts receive your location.'],
    ['Live location', 'Open Live Map and share the link. Your position updates every 10 seconds.'],
    ['Low battery', 'When your battery is low, your contacts are told so they can reach you early.'],
    ['Profile', 'Add your photo, name and phone number from the Profile page in the menu.'],
];

const FAQS = [
    ['Is my data private?', 'Your contacts, notes and profile are encrypted on your device with your PIN.'],
    ['I forgot my PIN.', 'Use the recovery option on the PIN screen with your recovery details.'],
    ['Can I change the language?', 'Yes. Open Settings and pick English, isiZulu, Sesotho or Afrikaans.'],
    ['Why does it ask for my location?', 'So your contacts can see where you are during an alert or live sharing.'],
    ['Does it work offline?', 'Alerts are queued and sent as soon as you are back online.'],
];

function qa(items: string[][]): string {
    return `<div class="page-card">${items.map(([q, a]) => `<h3 class="page-q">${esc(q)}</h3><p class="page-muted">${esc(a)}</p>`).join('')}</div>`;
}

export function renderGuide(root: HTMLElement) {
    root.innerHTML = shell('menu.guide', qa(GUIDE));
    wireBack(root);
}

export function renderFaq(root: HTMLElement) {
    root.innerHTML = shell('menu.faq', qa(FAQS));
    wireBack(root);
}

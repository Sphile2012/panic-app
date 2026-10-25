import { store } from '../state.js';
import '../strings/groupB.js';
import { t } from '../i18n.js';
import { fetchRecentAlerts } from '../db.js';
import { smsUri, whatsappUri } from '../storage.js';
import { getLast, mapsUrl } from '../tracking.js';
function esc(s) {
    return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function shell(titleKey, body) {
    return `
    <div class="screen">
      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="${t('common.back')}">${t('common.back')}</button>
        <h2 class="screen-title">${t(titleKey)}</h2>
      </header>
      ${body}
    </div>`;
}
function wireBack(root) {
    root.querySelector('#btn-back').addEventListener('click', () => store.navigateTo('app'));
}
export function renderHistory(root) {
    root.innerHTML = `
      <div class="screen history-screen">
        <header class="history-header">
          <button class="history-back" id="btn-back" type="button" aria-label="${t('common.back')}">←</button>
          <div>
            <h1>${t('menu.history')}</h1>
            <p id="history-count">Loading alert history…</p>
          </div>
        </header>
        <div class="history-content" id="hist-list" aria-live="polite">
          <p class="history-loading">Loading alert history…</p>
        </div>
      </div>`;
    root.querySelector('#btn-back').addEventListener('click', () => store.navigateTo('app'));
    fetchRecentAlerts(30).then((rows) => {
        const list = root.querySelector('#hist-list');
        const count = root.querySelector('#history-count');
        if (!list || !count)
            return;
        count.textContent = `${rows.length} ${rows.length === 1 ? 'incident' : 'incidents'} recorded`;
        if (!rows.length) {
            list.innerHTML = `
              <div class="history-empty">
                <span class="history-empty-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <circle cx="12" cy="12" r="9"></circle>
                    <path d="M12 7v5l3 2"></path>
                  </svg>
                </span>
                <strong>${t('b.pages.hist.none')}</strong>
                <span>Your incident history will appear here.</span>
              </div>`;
            return;
        }
        list.innerHTML = `<ul class="history-list">${rows.map(r => `
          <li class="history-item">
            <span class="history-item-icon" aria-hidden="true">!</span>
            <div>
              <strong>${esc(new Date(r.fired_at).toLocaleString())}</strong>
              <span>${esc(t('b.pages.hist.contacts', { n: r.contact_count }))}${r.location_shared ? esc(t('b.pages.hist.loc')) : ''}</span>
            </div>
          </li>`).join('')}</ul>`;
    });
}
let journeyTimer = null;
export function renderJourney(root) {
    if (journeyTimer) {
        clearInterval(journeyTimer);
        journeyTimer = null;
    }
    const { contacts } = store.getState();
    root.innerHTML = `
      <div class="screen journey-screen">
        <header class="journey-header">
          <button class="journey-back" id="btn-back" type="button" aria-label="${t('common.back')}">←</button>
          <div><h1>Journey Planner</h1><p>Share your route with trusted contacts</p></div>
        </header>
        <section class="journey-form" id="j-form">
          <label class="journey-label" for="j-destination">DESTINATION</label>
          <input class="journey-destination" id="j-destination" type="text" maxlength="120" autocomplete="street-address" placeholder="Where are you going?" />
          <label class="journey-label journey-duration-label" for="j-min">ESTIMATED DURATION: <strong id="j-duration-value">30 MIN</strong></label>
          <input class="journey-duration" id="j-min" type="range" min="5" max="480" step="5" value="30" />
          <div class="journey-duration-scale"><span>5 min</span><span>8 hrs</span></div>
          <fieldset class="journey-followers">
            <legend>FOLLOWER CONTACTS</legend>
            ${contacts.length ? contacts.map(contact => `
              <label class="journey-follower">
                <input type="checkbox" name="j-followers" value="${esc(contact.id)}" />
                <span>${esc(contact.name)}</span>
                <small>${contact.notificationChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}</small>
              </label>`).join('') : '<p class="journey-no-followers">No contacts added yet.</p>'}
          </fieldset>
          <p class="journey-error" id="j-error" role="status" aria-live="polite"></p>
          <button class="journey-start" id="j-start" type="button">▷&nbsp; ${t('b.pages.j.start')}</button>
        </section>
        <section class="journey-active" id="j-run" hidden aria-live="polite">
          <p class="journey-active-label">JOURNEY IN PROGRESS</p>
          <h2 id="j-active-destination"></h2>
          <div class="journey-countdown" id="j-time">00:30</div>
          <p class="journey-share-note">Choose a contact to open a message. Review it and tap Send in your SMS or WhatsApp app.</p>
          <div class="journey-share-links" id="j-share-links"></div>
          <button class="journey-arrived" id="j-done" type="button">${t('b.pages.j.done')}</button>
          <button class="journey-alert" id="j-alert" type="button">${t('b.pages.j.alert')}</button>
        </section>
      </div>`;
    const stop = () => { if (journeyTimer) {
        clearInterval(journeyTimer);
        journeyTimer = null;
    } };
    root.querySelector('#btn-back').addEventListener('click', () => { stop(); store.navigateTo('app'); });
    const durationInput = root.querySelector('#j-min');
    const durationValue = root.querySelector('#j-duration-value');
    const formatDuration = (minutes) => minutes < 60
        ? `${minutes} MIN`
        : `${Math.floor(minutes / 60)} HR${minutes >= 120 ? 'S' : ''}${minutes % 60 ? ` ${minutes % 60} MIN` : ''}`;
    durationInput.addEventListener('input', () => {
        durationValue.textContent = formatDuration(Number(durationInput.value));
    });
    const run = root.querySelector('#j-run');
    const timeEl = root.querySelector('#j-time');
    const form = root.querySelector('#j-form');
    const error = root.querySelector('#j-error');
    root.querySelector('#j-start').addEventListener('click', () => {
        const destination = root.querySelector('#j-destination').value.trim();
        if (!destination) {
            error.textContent = 'Enter a destination to start your journey.';
            root.querySelector('#j-destination').focus();
            return;
        }
        const mins = Math.max(5, Math.min(480, Number(durationInput.value) || 30));
        const followerIds = new Set(Array.from(root.querySelectorAll('input[name="j-followers"]:checked'))
            .map(input => input.value));
        const followers = contacts.filter(contact => followerIds.has(contact.id));
        const last = getLast();
        const currentMap = last ? mapsUrl(last) : null;
        const message = [
            `I started a journey to ${destination}.`,
            `Estimated duration: ${formatDuration(mins).toLowerCase()}.`,
            currentMap ? `My last known location: ${currentMap}` : '',
            'I will check in when I arrive.',
        ].filter(Boolean).join('\n');
        root.querySelector('#j-active-destination').textContent = destination;
        const shareLinks = root.querySelector('#j-share-links');
        shareLinks.innerHTML = followers.length
            ? followers.map(contact => {
                const viaWhatsApp = contact.notificationChannel === 'whatsapp';
                const href = viaWhatsApp
                    ? whatsappUri(contact.phone, message)
                    : smsUri(contact.phone, message);
                const channel = viaWhatsApp ? 'WhatsApp' : 'SMS';
                return `<a class="journey-share-link" href="${href}" ${viaWhatsApp ? 'target="_blank" rel="noopener noreferrer"' : ''}>Share with ${esc(contact.name)} via ${channel}</a>`;
            }).join('')
            : '<p class="journey-no-followers">No follower contacts selected. You can still use the journey timer.</p>';
        const end = Date.now() + mins * 60000;
        form.hidden = true;
        run.hidden = false;
        stop();
        journeyTimer = window.setInterval(() => {
            const left = Math.max(0, end - Date.now());
            const s = Math.ceil(left / 1000);
            timeEl.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
            if (left <= 0) {
                stop();
                if (confirm(t('b.pages.j.over')))
                    store.navigateTo('location');
                else
                    store.navigateTo('app');
            }
        }, 500);
    });
    root.querySelector('#j-done').addEventListener('click', () => { stop(); store.navigateTo('app'); });
    root.querySelector('#j-alert').addEventListener('click', () => { stop(); store.navigateTo('location'); });
}
export function renderFakeCall(root) {
    root.innerHTML = shell('menu.fakecall', `
      <div class="page-card">
        <label class="field-label"         for="fc-name">${t('b.pages.fc.name')}</label>
                <input class="text-input" id="fc-name" type="text" maxlength="40" value="${esc(t('b.pages.fc.defname'))}" />
                <label class="field-label" for="fc-delay">${t('b.pages.fc.delay')}</label>
        <input class="text-input" id="fc-delay" type="number" min="0" max="300" value="10" />
        <button class="btn-primary" id="fc-start">${t('b.pages.fc.start')}</button>
        <p class="page-muted" id="fc-msg"></p>
      </div>`);
    wireBack(root);
    root.querySelector('#fc-start').addEventListener('click', () => {
        const name = root.querySelector('#fc-name').value.trim() || t('b.pages.fc.unknown');
        const delay = Math.max(0, Math.min(300, parseInt(root.querySelector('#fc-delay').value, 10) || 0));
        root.querySelector('#fc-msg').textContent = t('b.pages.fc.msg', { n: delay });
        window.setTimeout(() => showIncoming(name), delay * 1000);
    });
}
function showIncoming(name) {
    const el = document.createElement('div');
    el.className = 'fake-call';
    el.innerHTML = `
      <div class="fake-call-name">${esc(name)}</div>
      <div class="fake-call-sub" id="fc-sub"      >${t('b.pages.fc.incoming')}</div>
      <div class="fake-call-actions">
              <button class="btn-danger" id="fc-decline">${t('b.pages.fc.decline')}</button>
              <button class="btn-primary" id="fc-accept">${t('b.pages.fc.accept')}</button>
      </div>`;
    document.body.appendChild(el);
    if (navigator.vibrate)
        navigator.vibrate([400, 200, 400, 200, 400]);
    let tick = null;
    el.querySelector('#fc-decline').addEventListener('click', () => { if (tick)
        clearInterval(tick); el.remove(); });
    el.querySelector('#fc-accept').addEventListener('click', () => {
        el.querySelector('.fake-call-actions').innerHTML = `<button class="btn-danger" id="fc-end">${t('b.pages.fc.end')}</button>`;
        const sub = el.querySelector('#fc-sub');
        let secs = 0;
        tick = window.setInterval(() => {
            secs++;
            sub.textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
        }, 1000);
        el.querySelector('#fc-end').addEventListener('click', () => { if (tick)
            clearInterval(tick); el.remove(); });
    });
}
export function renderWatch(root) {
    root.innerHTML = shell('menu.watch', `
      <div class="page-card">
        <p>${t('b.pages.watch.1')}</p>
                <p class="page-muted">${t('b.pages.watch.2')}</p>
      </div>`);
    wireBack(root);
}
const pairs = (p, n) => Array.from({ length: n }, (_, i) => [t(`b.pages.${p}.q${i + 1}`), t(`b.pages.${p}.a${i + 1}`)]);
function qa(items) {
    return `<div class="page-card">${items.map(([q, a]) => `<h3 class="page-q">${esc(q)}</h3><p class="page-muted">${esc(a)}</p>`).join('')}</div>`;
}
export function renderGuide(root) {
    root.innerHTML = shell('menu.guide', qa(pairs('guide', 5)));
    wireBack(root);
}
export function renderFaq(root) {
    root.innerHTML = shell('menu.faq', qa(pairs('faq', 5)));
    wireBack(root);
}

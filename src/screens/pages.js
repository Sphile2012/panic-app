import { store } from '../state.js';
import '../strings/groupB.js';
import { t } from '../i18n.js';
import { fetchRecentAlerts } from '../db.js';
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
    root.innerHTML = shell('menu.history', `<ul class="page-list" id="hist-list"><li class="page-item">...</li></ul>`);
    wireBack(root);
    fetchRecentAlerts(30).then((rows) => {
        const list = root.querySelector('#hist-list');
        if (!list)
            return;
        if (!rows.length) {
            list.innerHTML = `<li class="page-item page-muted">${t('b.pages.hist.none')}</li>`;
            return;
        }
        list.innerHTML = rows.map(r => `
          <li class="page-item">
            <strong>${esc(new Date(r.fired_at).toLocaleString())}</strong>
            <span class="page-muted">${esc(t('b.pages.hist.contacts', { n: r.contact_count }))}${r.location_shared ? esc(t('b.pages.hist.loc')) : ''}</span>
          </li>`).join('');
    });
}
let journeyTimer = null;
export function renderJourney(root) {
    if (journeyTimer) {
        clearInterval(journeyTimer);
        journeyTimer = null;
    }
    root.innerHTML = shell('menu.journey', `
      <div class="page-card">
        <p class="page-muted">        ${t('b.pages.j.intro')}</p>
                <label class="field-label" for="j-min">${t('b.pages.j.minutes')}</label>
        <input class="text-input" id="j-min" type="number" min="1" max="720" value="15" />
        <button class="btn-primary" id="j-start">${t('b.pages.j.start')}</button>
        <div id="j-run" hidden>
          <div class="page-timer" id="j-time">00:00</div>
          <button class="btn-primary" id="j-done"          >${t('b.pages.j.done')}</button>
                    <button class="btn-danger" id="j-alert">${t('b.pages.j.alert')}</button>
        </div>
      </div>`);
    wireBack(root);
    const stop = () => { if (journeyTimer) {
        clearInterval(journeyTimer);
        journeyTimer = null;
    } };
    root.querySelector('#btn-back').addEventListener('click', stop);
    const run = root.querySelector('#j-run');
    const timeEl = root.querySelector('#j-time');
    root.querySelector('#j-start').addEventListener('click', () => {
        const mins = Math.max(1, Math.min(720, parseInt(root.querySelector('#j-min').value, 10) || 15));
        const end = Date.now() + mins * 60000;
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

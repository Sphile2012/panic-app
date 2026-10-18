import '../../strings/groupC.js';
import { t } from '../../i18n.js';
import { store } from '../../state.js';

const SEED_NOTES = [
    { title: 'shopping', body: 'shoppingBody', date: 'today' },
    { title: 'work', body: 'workBody', date: 'yesterday' },
    { title: 'weekend', body: 'weekendBody', date: 'mon' },
    { title: 'ideas', body: 'ideasBody', date: 'sun' },
];

export function renderNotesPlain(root) {
    root.innerHTML = `
    <div class="screen notes-plain-screen">
      <header class="notes-plain-header">
        <span class="notes-plain-title">${t('c.notes.title')}</span>
        <button class="notes-plain-new" aria-label="${t('c.notes.newAria')}" title="${t('c.notes.newAria')}">${t('c.notes.new')}</button>
      </header>
      <div class="notes-plain-search-wrap">
        <input class="notes-plain-search" id="notes-pin-input" type="search"
          placeholder="${t('c.notes.searchPlaceholder')}" autocomplete="off" aria-label="${t('c.notes.searchAria')}" />
      </div>
      <ul class="notes-plain-list" id="notes-plain-list">
        ${SEED_NOTES.map(n => `
          <li class="notes-plain-item">
            <div class="notes-plain-item-body">
              <span class="notes-plain-item-title">${t(`c.notes.${n.title}`)}</span>
              <span class="notes-plain-item-preview">${t(`c.notes.${n.body}`)}</span>
            </div>
            <span class="notes-plain-item-date">${t(`c.notes.${n.date}`)}</span>
          </li>
        `).join('')}
      </ul>
      <p class="notes-plain-count">${t('c.notes.count', { count: SEED_NOTES.length })}</p>
    </div>`;
    const pinInput = root.querySelector('#notes-pin-input');
    let pinBuffer = '';
    pinInput.addEventListener('input', () => {
        const digits = pinInput.value.replace(/\D/g, '');
        pinBuffer = digits.slice(0, 4);
    });
    pinInput.addEventListener('keydown', async e => {
        if (e.key === 'Enter' && pinBuffer.length === 4) {
            e.preventDefault();
            for (const d of pinBuffer)
                store.appendPin(d);
            const route = await store.evaluatePin();
            if (!route) {
                store.clearPin();
                pinBuffer = '';
                pinInput.value = '';
            }
        }
        if (e.key === 'Escape') {
            store.clearPin();
            pinBuffer = '';
            pinInput.value = '';
        }
    });
}

import { store } from '../../state.js';
const SEED_NOTES = [
    { title: 'Shopping list', body: 'Bread, milk, olive oil, onions…', date: 'Today' },
    { title: 'Work reminder', body: 'Call Sipho back before 15:00', date: 'Yesterday' },
    { title: 'Weekend', body: "Braai at Zanele's place, 14:00", date: 'Mon' },
    { title: 'Ideas', body: 'Learn Zulu phrases, gym routine…', date: 'Sun' },
];
export function renderNotesPlain(root) {
    root.innerHTML = `
    <div class="screen notes-plain-screen">

      <header class="notes-plain-header">
        <span class="notes-plain-title">Notes</span>
        <button class="notes-plain-new" aria-label="New note" title="New note">New</button>
      </header>

      <!-- Search bar — doubles as hidden PIN entry -->
      <div class="notes-plain-search-wrap">
        <input
          class="notes-plain-search"
          id="notes-pin-input"
          type="search"
          placeholder="Search notes…"
          autocomplete="off"
          aria-label="Search notes"
        />
      </div>

      <ul class="notes-plain-list" id="notes-plain-list">
        ${SEED_NOTES.map(n => `
          <li class="notes-plain-item">
            <div class="notes-plain-item-body">
              <span class="notes-plain-item-title">${n.title}</span>
              <span class="notes-plain-item-preview">${n.body}</span>
            </div>
            <span class="notes-plain-item-date">${n.date}</span>
          </li>
        `).join('')}
      </ul>

      <p class="notes-plain-count">${SEED_NOTES.length} notes</p>

    </div>
  `;
    const pinInput = root.querySelector('#notes-pin-input');
    let pinBuffer = '';
    pinInput.addEventListener('input', () => {
        const digits = pinInput.value.replace(/\D/g, '');
        pinBuffer = digits.slice(0, 4);
    });
    pinInput.addEventListener('keydown', async (e) => {
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

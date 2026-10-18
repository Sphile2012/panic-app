import { store } from '../state.js';
import { t } from '../i18n.js';
import { RELATIONSHIPS } from '../storage.js';

const relOptions = (selected: string) => RELATIONSHIPS.map(r =>
  `<option value="${r}"${r === selected ? ' selected' : ''}>${t('rel.' + r)}</option>`).join('');

const esc = (v: string) => v.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));
const waLink = (phone: string) => 'https://wa.me/' + phone.replace(/\D/g, '').replace(/^0/, '27');

function avatarHtml(c: { initials: string; photo?: string }) {
  return c.photo
    ? `<img class="ct-avatar" src="${c.photo}" alt="" />`
    : `<span class="ct-avatar ct-avatar--txt">${esc(c.initials)}</span>`;
}

function groupedHtml(contacts: any[]) {
  const sorted = [...contacts].sort((a, b) => a.name.localeCompare(b.name));
  const groups: Record<string, any[]> = {};
  sorted.forEach(c => { (groups[(c.name[0] || '#').toUpperCase()] ||= []).push(c); });
  return Object.keys(groups).map(letter => `
    <div class="ct-letter">${letter}</div>
    ${groups[letter].map(c => `
      <div class="ct-row" data-id="${c.id}">
        ${avatarHtml(c)}
        <div class="ct-info">
          <span class="ct-name">${esc(c.name)}</span>
          <span class="ct-sub">${c.relationship ? esc(t('rel.' + c.relationship)) + ' · ' : ''}${esc(c.phone)}</span>
        </div>
        <a class="ct-btn" href="${waLink(c.phone)}" target="_blank" rel="noopener" aria-label="WhatsApp ${esc(c.name)}">WhatsApp</a>
        <button class="ct-btn contact-edit" data-id="${c.id}">Edit</button>
        <button class="ct-btn ct-btn--del contact-delete" data-id="${c.id}">✕</button>
      </div>`).join('')}`).join('');
}
export function renderContacts(root: HTMLElement) {
  const { contacts } = store.getState();
  const full = contacts.length >= 5;
  root.innerHTML = `
    <div class="screen contacts-screen">
      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="Back">Back</button>
        <h2 class="screen-title">Trusted circle (${contacts.length}/5)</h2>
      </header>

      <div class="ct-list" id="contact-list">
        ${contacts.length === 0 ? '<p class="empty-hint">No contacts yet.</p>' : groupedHtml(contacts)}
      </div>

      <form class="setup-form" id="contact-form" autocomplete="off" ${full ? 'hidden' : ''}>
        <h3 class="form-section-title" id="form-title">Add contact</h3>
        <input type="hidden" id="edit-id" value="" />
        <label class="field-label" for="c-name">Name</label>
        <input class="text-input" id="c-name" type="text" placeholder="Full name" required />
        <label class="field-label" for="c-phone">Phone</label>
        <input class="text-input" id="c-phone" type="tel" placeholder="+27 82 123 4567" required />
        <label class="field-label" for="c-rel">${t('rel.label')}</label>
        <select class="text-input" id="c-rel">${relOptions('other')}</select>
        <label class="field-label" for="c-photo">Photo (optional)</label>
        <input class="text-input" id="c-photo" type="file" accept="image/*" />
        <p class="setup-hint" id="c-error" aria-live="polite"></p>
        <div class="form-row">
          <button class="btn-primary" type="submit" id="btn-save">Add</button>
          <button class="btn-secondary-outline" type="button" id="btn-cancel-edit" style="display:none">Cancel</button>
        </div>
      </form>
      ${full ? '<p class="setup-hint">You have reached the limit of 5 contacts. Edit or remove one to change your circle.</p>' : ''}
    </div>
  `;
  const q = <T extends HTMLElement>(s: string) => root.querySelector(s) as T;
  q('#btn-back').addEventListener('click', () => store.navigateTo('app'));
  const form = q<HTMLFormElement>('#contact-form');
  const editIdEl = q<HTMLInputElement>('#edit-id');
  const nameEl = q<HTMLInputElement>('#c-name');
  const phoneEl = q<HTMLInputElement>('#c-phone');
  const relEl = q<HTMLSelectElement>('#c-rel');
  const errorEl = q('#c-error');
  const formTitle = q('#form-title');
  const saveBtn = q('#btn-save');
  const cancelBtn = q('#btn-cancel-edit');
  const photoEl = q<HTMLInputElement>('#c-photo');
  const readPhoto = (): Promise<string> => new Promise(resolve => {
    const file = photoEl.files?.[0];
    if (!file) return resolve('');
    const img = new Image();
    img.onload = () => {
      const size = 160, cv = document.createElement('canvas');
      cv.width = cv.height = size;
      const s = Math.min(img.width, img.height);
      cv.getContext('2d')!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      resolve(cv.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve('');
    img.src = URL.createObjectURL(file);
  });

  q('#contact-list').addEventListener('click', e => {
    const target = e.target as HTMLElement;
    const editBtn = target.closest('.contact-edit') as HTMLElement | null;
    const deleteBtn = target.closest('.contact-delete') as HTMLElement | null;
    if (editBtn) {
      const id = editBtn.dataset['id'];
      const contact = store.getState().contacts.find(c => c.id === id);
      if (!contact) return;
      form.hidden = false;
      editIdEl.value = id!;
      nameEl.value = contact.name;
      phoneEl.value = contact.phone;
      relEl.value = contact.relationship || 'other';
      formTitle.textContent = 'Edit contact';
      saveBtn.textContent = 'Save';
      cancelBtn.style.display = 'inline-flex';
      nameEl.focus();
    }
    if (deleteBtn) {
      const id = deleteBtn.dataset['id']!;
      const contact = store.getState().contacts.find(c => c.id === id);
      if (contact && confirm(`Remove ${contact.name} from your circle?`)) {
        store.deleteContact(id);
        store.navigateTo('contacts');
      }
    }
  });
  cancelBtn.addEventListener('click', () => store.navigateTo('contacts'));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = nameEl.value.trim();
    const phone = phoneEl.value.trim();
    if (!name) { errorEl.textContent = 'Enter a name.'; return; }
    if (!phone) { errorEl.textContent = 'Enter a phone number.'; return; }
    const id = editIdEl.value;
    if (id) {
      store.updateContact(id, name, phone, relEl.value);
    } else if (!store.addContact(name, phone, relEl.value)) {
      errorEl.textContent = 'You can add up to 5 contacts.';
      return;
    }
    store.navigateTo('contacts');
  });
}



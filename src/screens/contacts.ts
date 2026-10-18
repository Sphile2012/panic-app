import { store } from '../state.js';
import { t } from '../i18n.js';
import { RELATIONSHIPS } from '../storage.js';

const relOptions = (selected: string) => RELATIONSHIPS.map(r =>
  `<option value="${r}"${r === selected ? ' selected' : ''}>${t('rel.' + r)}</option>`).join('');

export function renderContacts(root: HTMLElement) {
  const { contacts } = store.getState();
  const full = contacts.length >= 5;
  root.innerHTML = `
    <div class="screen contacts-screen">
      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="Back">Back</button>
        <h2 class="screen-title">Trusted circle (${contacts.length}/5)</h2>
      </header>

      <ul class="contact-list" id="contact-list">
        ${contacts.length === 0
          ? '<li class="empty-hint">No contacts yet.</li>'
          : contacts.map(c => `
            <li class="contact-item contact-item--manage" data-id="${c.id}">
              <div class="contact-avatar">${c.initials}</div>
              <div class="contact-info">
                <span class="contact-name">${c.name}</span>
                <span class="contact-phone">${c.phone}${c.relationship ? ' - ' + t('rel.' + c.relationship) : ''}</span>
              </div>
              <div class="contact-actions">
                <button class="contact-edit" data-id="${c.id}" aria-label="Edit ${c.name}">Edit</button>
                <button class="contact-delete" data-id="${c.id}" aria-label="Remove ${c.name}">Remove</button>
              </div>
            </li>`).join('')}
      </ul>

      <form class="setup-form" id="contact-form" autocomplete="off" ${full ? 'hidden' : ''}>
        <h3 class="form-section-title" id="form-title">Add contact</h3>
        <input type="hidden" id="edit-id" value="" />
        <label class="field-label" for="c-name">Name</label>
        <input class="text-input" id="c-name" type="text" placeholder="Full name" required />
        <label class="field-label" for="c-phone">Phone</label>
        <input class="text-input" id="c-phone" type="tel" placeholder="+27 82 123 4567" required />
        <label class="field-label" for="c-rel">${t('rel.label')}</label>
        <select class="text-input" id="c-rel">${relOptions('other')}</select>
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
  form.addEventListener('submit', e => {
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

import { store } from '../state.js';
export function renderContacts(root) {
    const { contacts, authEmail } = store.getState();
    root.innerHTML = `
    <div class="screen contacts-screen">

      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="Back">←</button>
        <h2 class="screen-title">Trusted circle</h2>
      </header>

      ${authEmail ? `<ul class="contact-list" id="contact-list">
        ${contacts.length === 0
        ? '<li class="empty-hint">No contacts yet.</li>'
        : contacts.map(c => `
            <li class="contact-item contact-item--manage" data-id="${c.id}">
              <div class="contact-avatar">${c.initials}</div>
              <div class="contact-info">
                <span class="contact-name">${c.name}</span>
                <span class="contact-phone">${c.phone}</span>
              </div>
              <div class="contact-actions">
                <button class="contact-edit" data-id="${c.id}" aria-label="Edit ${c.name}">Edit</button>
                <button class="contact-delete" data-id="${c.id}" aria-label="Remove ${c.name}">✕</button>
              </div>
            </li>
          `).join('')}
      </ul>` : ''}

      ${authEmail ? `<form class="setup-form" id="contact-form" autocomplete="off">
        <h3 class="form-section-title" id="form-title">Add contact</h3>
        <input type="hidden" id="edit-id" value="" />

        <label class="field-label" for="c-name">Name</label>
        <input class="text-input" id="c-name" type="text" placeholder="Full name" required />

        <label class="field-label" for="c-phone">Phone</label>
        <input class="text-input" id="c-phone" type="tel" placeholder="+27 82 123 4567" required />

        <p class="setup-hint" id="c-error" aria-live="polite"></p>

        <div class="form-row">
          <button class="btn-primary" type="submit" id="btn-save">Add</button>
          <button class="btn-secondary-outline" type="button" id="btn-cancel-edit" style="display:none">
            Cancel
          </button>
        </div>
      </form>` : `
        <section class="settings-section">
          <h3 class="settings-section-title">Account required</h3>
          <p class="settings-section-body">Sign in or create an account before adding trusted contacts.</p>
          <div class="settings-auth-buttons">
            <button class="btn-primary" id="btn-contact-signup" type="button">Create account</button>
            <button class="btn-secondary-outline" id="btn-contact-login" type="button">Sign in</button>
          </div>
        </section>
      `}

    </div>
  `;
    const list = root.querySelector('#contact-list');
    root.querySelector('#btn-back').addEventListener('click', () => {
        store.navigateTo('app');
    });
    if (!authEmail) {
        root.querySelector('#btn-contact-signup').addEventListener('click', () => store.navigateTo('signup'));
        root.querySelector('#btn-contact-login').addEventListener('click', () => store.navigateTo('login'));
        return;
    }
    const form = root.querySelector('#contact-form');
    const editIdEl = root.querySelector('#edit-id');
    const nameEl = root.querySelector('#c-name');
    const phoneEl = root.querySelector('#c-phone');
    const errorEl = root.querySelector('#c-error');
    const formTitle = root.querySelector('#form-title');
    const saveBtn = root.querySelector('#btn-save');
    const cancelBtn = root.querySelector('#btn-cancel-edit');
    list.addEventListener('click', e => {
        const editBtn = e.target.closest('.contact-edit');
        const deleteBtn = e.target.closest('.contact-delete');
        if (editBtn) {
            const id = editBtn.dataset['id'];
            const contact = store.getState().contacts.find(c => c.id === id);
            if (!contact)
                return;
            editIdEl.value = id;
            nameEl.value = contact.name;
            phoneEl.value = contact.phone;
            formTitle.textContent = 'Edit contact';
            saveBtn.textContent = 'Save';
            cancelBtn.style.display = 'inline-flex';
            nameEl.focus();
        }
        if (deleteBtn) {
            const id = deleteBtn.dataset['id'];
            const contact = store.getState().contacts.find(c => c.id === id);
            if (!contact)
                return;
            if (confirm(`Remove ${contact.name} from your circle?`)) {
                store.deleteContact(id);
                store.navigateTo('contacts');
            }
        }
    });
    cancelBtn.addEventListener('click', () => {
        editIdEl.value = '';
        form.reset();
        formTitle.textContent = 'Add contact';
        saveBtn.textContent = 'Add';
        cancelBtn.style.display = 'none';
    });
    form.addEventListener('submit', e => {
        e.preventDefault();
        const name = nameEl.value.trim();
        const phone = phoneEl.value.trim();
        if (!name) {
            errorEl.textContent = 'Enter a name.';
            return;
        }
        if (!phone) {
            errorEl.textContent = 'Enter a phone number.';
            return;
        }
        errorEl.textContent = '';
        const id = editIdEl.value;
        if (id) {
            store.updateContact(id, name, phone);
        }
        else {
            if (!store.addContact(name, phone)) {
                store.navigateTo('signup');
                return;
            }
        }
        store.navigateTo('contacts');
    });
}

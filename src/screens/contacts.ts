import { store } from '../state.js';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

function renderContact(contact: ReturnType<typeof store.getState>['contacts'][number]): string {
  const name = escapeHtml(contact.name);
  const phone = escapeHtml(contact.phone);
  const digits = contact.phone.replace(/\D/g, '');
  const smsPhone = contact.phone.replace(/[^\d+]/g, '');
  const message = encodeURIComponent(`Hi ${contact.name}, I may need your help. Please contact me.`);

  return `
    <li class="contact-item contact-item--manage" data-search="${escapeHtml(`${contact.name} ${contact.phone}`.toLowerCase())}">
      <div class="contact-avatar" aria-hidden="true">${escapeHtml(contact.initials)}</div>
      <div class="contact-info">
        <span class="contact-name">${name}</span>
        <span class="contact-phone">${phone}</span>
        <div class="contact-manage-actions">
          <button class="contact-edit" data-id="${escapeHtml(contact.id)}" type="button">Edit</button>
          <button class="contact-delete" data-id="${escapeHtml(contact.id)}" type="button">Remove</button>
        </div>
      </div>
      <div class="contact-actions">
        <a class="contact-message contact-message--whatsapp" href="https://wa.me/${digits}?text=${message}" target="_blank" rel="noopener noreferrer" aria-label="Message ${name} on WhatsApp" title="WhatsApp">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.8a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.4-5A8.4 8.4 0 1 1 20.5 11.8Z"/><path d="M8.8 8.1c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.7c.1.2.1.4-.1.6l-.5.6c-.2.2-.2.4 0 .7.5.8 1.2 1.4 2 1.9.2.1.5.1.6-.1l.7-.8c.2-.2.4-.2.7-.1l1.6.8c.3.1.4.3.4.5 0 .3-.2 1.2-.8 1.6-.5.4-1.1.6-1.8.5-1-.1-2.2-.6-3.7-1.9-1.2-1-2-2.3-2.3-3.2-.3-.9 0-1.8.4-2.3Z"/></svg>
        </a>
        <a class="contact-message contact-message--sms" href="sms:${smsPhone}?body=${message}" aria-label="Text ${name} by SMS" title="SMS">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2 1-4.5A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01"/></svg>
        </a>
      </div>
    </li>
  `;
}

export function renderContacts(root: HTMLElement): void {
  const { contacts, authEmail } = store.getState();
  root.innerHTML = `
    <div class="screen contacts-screen">
      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="Back">←</button>
        <h2 class="screen-title">Trusted circle</h2>
        ${authEmail ? '<button class="contacts-add-shortcut" id="btn-add-contact" type="button" aria-label="Add trusted contact">＋</button>' : ''}
      </header>

      ${authEmail ? `
        <label class="contacts-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4.2 4.2"/></svg>
          <input id="contact-search" type="search" placeholder="Search trusted contacts" aria-label="Search trusted contacts" />
        </label>
        <p class="contacts-caption">People you can reach when you need support</p>
        <ul class="contact-list" id="contact-list">
          ${contacts.length === 0
            ? '<li class="empty-hint">No contacts yet. Add someone you trust.</li>'
            : contacts.map(renderContact).join('')}
          <li class="empty-hint" id="contact-no-results" hidden>No matching contacts.</li>
        </ul>

        <form class="setup-form contacts-form" id="contact-form" autocomplete="off">
          <h3 class="form-section-title" id="form-title">Add contact</h3>
          <input type="hidden" id="edit-id" value="" />
          <label class="field-label" for="c-name">Name</label>
          <input class="text-input" id="c-name" type="text" placeholder="Full name" required />
          <label class="field-label" for="c-phone">Phone</label>
          <input class="text-input" id="c-phone" type="tel" placeholder="+27 82 123 4567" required />
          <p class="setup-hint" id="c-error" aria-live="polite"></p>
          <div class="form-row">
            <button class="btn-primary" type="submit" id="btn-save">Add</button>
            <button class="btn-secondary-outline" type="button" id="btn-cancel-edit" style="display:none">Cancel</button>
          </div>
        </form>
      ` : `
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

  root.querySelector('#btn-back')?.addEventListener('click', () => store.navigateTo('app'));
  if (!authEmail) {
    root.querySelector('#btn-contact-signup')?.addEventListener('click', () => store.navigateTo('signup'));
    root.querySelector('#btn-contact-login')?.addEventListener('click', () => store.navigateTo('login'));
    return;
  }

  const list = root.querySelector<HTMLUListElement>('#contact-list');
  const form = root.querySelector<HTMLFormElement>('#contact-form');
  const editIdEl = root.querySelector<HTMLInputElement>('#edit-id');
  const nameEl = root.querySelector<HTMLInputElement>('#c-name');
  const phoneEl = root.querySelector<HTMLInputElement>('#c-phone');
  const errorEl = root.querySelector<HTMLElement>('#c-error');
  const formTitle = root.querySelector<HTMLElement>('#form-title');
  const saveBtn = root.querySelector<HTMLButtonElement>('#btn-save');
  const cancelBtn = root.querySelector<HTMLButtonElement>('#btn-cancel-edit');
  const search = root.querySelector<HTMLInputElement>('#contact-search');
  const noResults = root.querySelector<HTMLElement>('#contact-no-results');

  root.querySelector('#btn-add-contact')?.addEventListener('click', () => {
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    nameEl.focus({ preventScroll: true });
  });

  search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    const items = [...list.querySelectorAll<HTMLElement>('.contact-item')];
    let visibleCount = 0;
    for (const item of items) {
      const visible = item.dataset['search']?.includes(query) ?? false;
      item.hidden = !visible;
      if (visible) visibleCount += 1;
    }
    noResults.hidden = !query || visibleCount > 0;
  });

  list.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    const editBtn = target.closest<HTMLButtonElement>('.contact-edit');
    const deleteBtn = target.closest<HTMLButtonElement>('.contact-delete');
    if (editBtn) {
      const contact = store.getState().contacts.find(item => item.id === editBtn.dataset['id']);
      if (!contact) return;
      editIdEl.value = contact.id;
      nameEl.value = contact.name;
      phoneEl.value = contact.phone;
      formTitle.textContent = 'Edit contact';
      saveBtn.textContent = 'Save';
      cancelBtn.style.display = 'inline-flex';
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      nameEl.focus({ preventScroll: true });
    }
    if (deleteBtn) {
      const contact = store.getState().contacts.find(item => item.id === deleteBtn.dataset['id']);
      if (contact && confirm(`Remove ${contact.name} from your circle?`)) {
        store.deleteContact(contact.id);
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

  form.addEventListener('submit', event => {
    event.preventDefault();
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
    if (editIdEl.value) store.updateContact(editIdEl.value, name, phone);
    else if (!store.addContact(name, phone)) {
      store.navigateTo('signup');
      return;
    }
    store.navigateTo('contacts');
  });
}

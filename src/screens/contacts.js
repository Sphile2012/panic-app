import { store } from '../state.js';
function escapeHtml(value) {
    return value.replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    })[character] ?? character);
}
function renderContact(contact) {
    const name = escapeHtml(contact.name);
    const phone = escapeHtml(contact.phone);
    const relationship = escapeHtml(contact.relationship || 'Other');
    const digits = contact.phone.replace(/\D/g, '');
    const smsPhone = contact.phone.replace(/[^\d+]/g, '');
    const message = encodeURIComponent(`Hi ${contact.name}, I may need your help. Please contact me.`);
    return `
    <li class="contact-item contact-item--manage" data-search="${escapeHtml(`${contact.name} ${contact.phone} ${contact.email || ''} ${contact.relationship || 'Other'}`.toLowerCase())}">
      <div class="contact-avatar" aria-hidden="true">${escapeHtml(contact.initials)}</div>
      <div class="contact-info">
        <span class="contact-name">${name}</span>
        <span class="contact-phone">${phone}</span>
        <span class="contact-relationship">${relationship}</span>
        <span class="contact-relationship">Priority ${contact.priority ?? '—'} · ${contact.notificationChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}</span>
        ${contact.email ? `<span class="contact-relationship">${escapeHtml(contact.email)}</span>` : ''}
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
export function renderContacts(root, notice = '') {
    const { contacts } = store.getState();
    root.innerHTML = `
    <div class="screen contacts-screen">
      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="Back">←</button>
        <h2 class="screen-title">Trusted circle</h2>
        <button class="contacts-add-shortcut" id="btn-add-contact" type="button"
          aria-label="${contacts.length >= 5 ? 'Trusted circle is full' : 'Add trusted contact'}"
          title="${contacts.length >= 5 ? 'Circle full (5/5)' : 'Add contact'}"
          ${contacts.length >= 5 ? 'disabled' : ''}>＋</button>
      </header>

      <label class="contacts-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4.2 4.2"/></svg>
        <input id="contact-search" type="search" placeholder="Search trusted contacts" aria-label="Search trusted contacts" />
      </label>
      <section class="contacts-list-panel" aria-label="Emergency contact list">
        <div class="contacts-list-heading">
          <div>
            <h3>Emergency contact list</h3>
            <p>People you choose to contact</p>
          </div>
          <span class="contacts-count">${contacts.length}/5</span>
        </div>
        <p class="setup-hint" id="contact-action-success" role="status" aria-live="polite">${escapeHtml(notice)}</p>
        <p class="setup-hint" id="contact-action-error" role="alert" aria-live="polite"></p>
        <ul class="contact-list" id="contact-list">
          ${contacts.length === 0
        ? '<li class="empty-hint">No contacts yet. Tap + to add someone you trust.</li>'
        : contacts.map(renderContact).join('')}
          <li class="empty-hint" id="contact-no-results" hidden>No matching contacts.</li>
        </ul>
      </section>

      <div class="contact-modal-backdrop" id="contact-modal" hidden>
        <section class="contact-modal-panel" role="dialog" aria-modal="true" aria-labelledby="form-title">
          <button class="contact-modal-close" id="btn-close-contact" type="button" aria-label="Close">×</button>
          <form class="setup-form contacts-form" id="contact-form" autocomplete="off">
            <h3 class="form-section-title" id="form-title">Add Contact</h3>
            <input type="hidden" id="edit-id" value="" />
            <label class="field-label" for="c-name">Full name *</label>
            <input class="text-input" id="c-name" type="text" placeholder="Jane Doe" required />
            <label class="field-label" for="c-phone">Phone number *</label>
            <input class="text-input" id="c-phone" type="tel" placeholder="+27 82 123 4567" required />
            <label class="field-label" for="c-email">Email</label>
            <input class="text-input" id="c-email" type="email" placeholder="jane@email.com" />
            <label class="field-label" for="c-relationship">Relationship</label>
            <select class="text-input" id="c-relationship" required>
              <option value="" disabled selected>Choose a relationship</option>
              <option>Family member</option><option>Friend</option><option>Partner</option>
              <option>Caregiver</option><option>Neighbour</option><option>Colleague</option><option>Other</option>
            </select>
            <label class="field-label" for="c-priority">Priority order</label>
            <input class="text-input" id="c-priority" type="number" min="1" max="5" value="${Math.min(contacts.length + 1, 5)}" required />
            <label class="field-label" for="c-channel">Notification method</label>
            <select class="text-input" id="c-channel" required>
              <option value="sms" selected>SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
            <p class="setup-hint" id="c-error" aria-live="polite"></p>
            <div class="form-row">
              <button class="btn-primary" type="submit" id="btn-save">Add contact</button>
              <button class="btn-secondary-outline" type="button" id="btn-cancel-edit">Cancel</button>
            </div>
          </form>
        </section>
      </div>
    </div>
  `;
    root.querySelector('#btn-back')?.addEventListener('click', () => store.navigateTo('app'));
    const list = root.querySelector('#contact-list');
    const modal = root.querySelector('#contact-modal');
    const form = root.querySelector('#contact-form');
    const editIdEl = root.querySelector('#edit-id');
    const nameEl = root.querySelector('#c-name');
    const phoneEl = root.querySelector('#c-phone');
    const emailEl = root.querySelector('#c-email');
    const relationshipEl = root.querySelector('#c-relationship');
    const priorityEl = root.querySelector('#c-priority');
    const channelEl = root.querySelector('#c-channel');
    const errorEl = root.querySelector('#c-error');
    const formTitle = root.querySelector('#form-title');
    const saveBtn = root.querySelector('#btn-save');
    const cancelBtn = root.querySelector('#btn-cancel-edit');
    const search = root.querySelector('#contact-search');
    const noResults = root.querySelector('#contact-no-results');
    const actionError = root.querySelector('#contact-action-error');
    root.querySelector('#btn-add-contact')?.addEventListener('click', () => {
        if (store.getState().contacts.length >= 5)
            return;
        editIdEl.value = '';
        form.reset();
        priorityEl.value = String(Math.min(store.getState().contacts.length + 1, 5));
        formTitle.textContent = 'Add Contact';
        saveBtn.textContent = 'Add contact';
        cancelBtn.style.display = 'inline-flex';
        modal.hidden = false;
        errorEl.textContent = '';
        actionError.textContent = '';
        nameEl.focus({ preventScroll: true });
    });
    const closeModal = () => {
        modal.hidden = true;
        editIdEl.value = '';
        form.reset();
        errorEl.textContent = '';
        actionError.textContent = '';
    };
    root.querySelector('#btn-close-contact')?.addEventListener('click', closeModal);
    modal.addEventListener('click', event => {
        if (event.target === modal)
            closeModal();
    });
    modal.addEventListener('keydown', event => {
        if (event.key === 'Escape')
            closeModal();
    });
    search.addEventListener('input', () => {
        const query = search.value.trim().toLowerCase();
        const items = [...list.querySelectorAll('.contact-item')];
        let visibleCount = 0;
        for (const item of items) {
            const visible = item.dataset['search']?.includes(query) ?? false;
            item.hidden = !visible;
            if (visible)
                visibleCount += 1;
        }
        noResults.hidden = !query || visibleCount > 0;
    });
    list.addEventListener('click', event => {
        const target = event.target instanceof Element ? event.target : null;
        const editBtn = target?.closest('.contact-edit');
        const deleteBtn = target?.closest('.contact-delete');
        if (editBtn) {
            const contact = store.getState().contacts.find(item => item.id === editBtn.dataset['id']);
            if (!contact)
                return;
            actionError.textContent = '';
            errorEl.textContent = '';
            modal.hidden = false;
            editIdEl.value = contact.id;
            nameEl.value = contact.name;
            phoneEl.value = contact.phone;
            emailEl.value = contact.email ?? '';
            relationshipEl.value = contact.relationship || 'Other';
            priorityEl.value = String(contact.priority ?? store.getState().contacts.indexOf(contact) + 1);
            channelEl.value = contact.notificationChannel ?? 'sms';
            formTitle.textContent = 'Edit Contact';
            saveBtn.textContent = 'Save';
            cancelBtn.style.display = 'inline-flex';
            nameEl.focus({ preventScroll: true });
        }
        if (deleteBtn) {
            const contact = store.getState().contacts.find(item => item.id === deleteBtn.dataset['id']);
            if (contact && confirm(`Remove ${contact.name} from your circle?`)) {
                deleteBtn.disabled = true;
                actionError.textContent = '';
                void store.deleteContact(contact.id).then(saved => {
                    if (!saved)
                        throw new Error('Contact could not be removed.');
                    renderContacts(root, 'Contact removed.');
                }).catch(() => {
                    deleteBtn.disabled = false;
                    actionError.textContent = 'Could not remove this contact. Please try again.';
                });
            }
        }
    });
    cancelBtn.addEventListener('click', () => {
        closeModal();
    });
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = nameEl.value.trim();
        const phone = phoneEl.value.trim();
        const relationship = relationshipEl.value;
        const email = emailEl.value.trim();
        const priority = Number(priorityEl.value);
        const notificationChannel = channelEl.value === 'whatsapp' ? 'whatsapp' : 'sms';
        if (!name) {
            errorEl.textContent = 'Enter a name.';
            return;
        }
        if (!phone) {
            errorEl.textContent = 'Enter a phone number.';
            return;
        }
        if (!relationship) {
            errorEl.textContent = 'Choose your relationship to this contact.';
            return;
        }
        if (email && !emailEl.validity.valid) {
            errorEl.textContent = 'Enter a valid email address or leave it blank.';
            return;
        }
        if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
            errorEl.textContent = 'Choose a priority order from 1 to 5.';
            return;
        }
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 7 || digits.length > 15) {
            errorEl.textContent = 'Enter a valid phone number with 7 to 15 digits.';
            return;
        }
        errorEl.textContent = '';
        actionError.textContent = '';
        saveBtn.disabled = true;
        try {
            let saved;
            const preferences = { email, priority, notificationChannel };
            if (editIdEl.value) {
                saved = await store.updateContact(editIdEl.value, name, phone, relationship, preferences);
                if (!saved) {
                    errorEl.textContent = 'This contact could not be updated. Check the number and try again.';
                    return;
                }
            }
            else {
                saved = await store.addContact(name, phone, relationship, undefined, preferences);
                if (!saved) {
                    errorEl.textContent = store.getState().contacts.length >= 5
                        ? 'You can add up to 5 trusted contacts.'
                        : 'That phone number is already in your circle, or is not valid.';
                    return;
                }
            }
            renderContacts(root, editIdEl.value ? 'Contact successfully updated.' : 'Contact successfully added.');
        }
        catch {
            errorEl.textContent = 'Could not save this contact on this device. Please try again.';
        }
        finally {
            saveBtn.disabled = false;
        }
    });
}

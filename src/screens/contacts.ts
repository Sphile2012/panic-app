import '../strings/groupA.js';
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
        <button class="ct-btn contact-edit" data-id="${c.id}">${t('a.ct.edit')}</button>
        <button class="ct-btn ct-btn--del contact-delete" data-id="${c.id}">✕</button>
      </div>`).join('')}`).join('');
}
export function renderContacts(root: HTMLElement) {
  const { contacts } = store.getState();
  const full = contacts.length >= 5;
  root.innerHTML = `
    <div class="screen contacts-screen">
      <header class="screen-header">
        <button class="btn-back-small" id="btn-back"         aria-label="${t('common.back')}">${t('common.back')}</button>
                <h2 class="screen-title">${t('a.ct.title', { n: contacts.length })}</h2>
      </header>

      <div class="ct-list" id="contact-list">
        ${contacts.length === 0 ? '<p class="empty-hint">' + t('a.ct.empty') + '</p>' : groupedHtml(contacts)}
      </div>

      <form class="setup-form" id="contact-form" autocomplete="off" ${full ? 'hidden' : ''}>
        <h3 class="form-section-title"         id="form-title">${t('a.ct.add')}</h3>
        <input type="hidden" id="edit-id" value="" />
                <label class="field-label" for="c-name">${t('a.ct.name')}</label>
                <input class="text-input" id="c-name" type="text" placeholder="${t('prof.name')}" required />
                <label class="field-label" for="c-phone">${t('a.ct.phone')}</label>
        <input class="text-input" id="c-phone" type="tel" placeholder="+27 82 123 4567" required />
        <label class="field-label" for="c-rel">${t('rel.label')}</label>
        <select class="text-input" id="c-rel">${relOptions('other')}</select>
        <label class="field-label" for="c-photo">${t('a.ct.photo')}</label>
        <input class="text-input" id="c-photo" type="file" accept="image/*" />
        <p class="setup-hint" id="c-error" aria-live="polite"></p>
        <div class="form-row">
          <button class="btn-primary" type="submit"           id="btn-save">${t('a.ct.addbtn')}</button>
                    <button class="btn-secondary-outline" type="button" id="btn-cancel-edit" style="display:none">${t('common.cancel')}</button>
        </div>
      </form>
      ${full ? '<p class="setup-hint">' + t('a.ct.limit') + '</p>' : ''}
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
      formTitle.textContent = t('a.ct.editcontact');
            saveBtn.textContent = t('a.ct.save');
      cancelBtn.style.display = 'inline-flex';
      nameEl.focus();
    }
    if (deleteBtn) {
      const id = deleteBtn.dataset['id']!;
      const contact = store.getState().contacts.find(c => c.id === id);
      if (contact && confirm(t('a.ct.remove', { name: contact.name }))) {
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
    if (!name) {     errorEl.textContent = t('a.ct.err.name'); return; }
        if (!phone) { errorEl.textContent = t('a.ct.err.phone'); return; }
    const id = editIdEl.value;
    if (id) {
      store.updateContact(id, name, phone, relEl.value);
    } else if (!store.addContact(name, phone, relEl.value)) {
      errorEl.textContent = t('a.ct.err.max');
      return;
    }
    store.navigateTo('contacts');
  });
}



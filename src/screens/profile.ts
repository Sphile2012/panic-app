import '../strings/groupB.js';
import { store } from '../state.js';
import { t } from '../i18n.js';
import { displayIdentity } from '../db.js';

function esc(s: string): string {
    return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

function resizeImage(file: File, size = 256): Promise<string> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const side = Math.min(img.width, img.height);
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                URL.revokeObjectURL(url);
                reject(new Error('canvas'));
                return;
            }
            ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('image'));
        };
        img.src = url;
    });
}

const IC = {
    back: '<path d="M15 5l-7 7 7 7"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 00-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 00-.1-7.8z"/>',
    location: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1116 0z"/><circle cx="12" cy="10" r="2.5"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0112 0"/><path d="M16 5a3 3 0 010 6M18 20a6 6 0 00-3-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
    book: '<path d="M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3z"/><path d="M5 17a3 3 0 013-3h10"/>',
    out: '<path d="M10 4H5v16h5"/><path d="M15 8l4 4-4 4M19 12H9"/>',
    chev: '<path d="M9 5l7 7-7 7"/>',
};

function svg(p: string, cls = 'pf-ic'): string {
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}

function row(id: string, icon: string, label: string, extra = ''): string {
    return `<button class="pf-row ${extra}" id="${id}" type="button">${svg(icon)}<span>${label}</span>${svg(IC.chev, 'pf-chev')}</button>`;
}

export function renderProfile(root: HTMLElement) {
    const { profile: initial, authEmail } = store.getState();
    let photo = initial.photo;
    let editing = false;
    const identity = authEmail ? displayIdentity(authEmail) : (initial.phone || t('b.prof.user'));

    const draw = () => {
        const { profile, contacts, notes, safetyPlan } = store.getState();
        const name = profile.name || identity;
        const letter = (name || '?')[0].toUpperCase();
        const photoHtml = photo ? `<img src="${esc(photo)}" alt="" />` : `<span>${esc(letter)}</span>`;
        const planItems = Object.values(safetyPlan).filter(value => value.trim()).length;
        root.innerHTML = `
    <div class="screen profile-screen pf">
      <section class="pf-hero">
        <div class="pf-top">
          <button class="pf-icon-btn" id="btn-back" aria-label="${t('common.back')}">${svg(IC.back, 'pf-top-ic')}</button>
          <span class="pf-top-title">My profile</span>
          <button class="pf-icon-btn" id="btn-edit" aria-label="${t('b.prof.edit')}">${svg(IC.edit, 'pf-top-ic')}</button>
        </div>
        <div class="pf-head">
          <button class="pf-photo" id="profile-photo" type="button" aria-label="${t('prof.upload')}">${photoHtml}</button>
          <h2 class="pf-name">${esc(name)}</h2>
          <p class="pf-sub">${esc(profile.phone || (identity.includes('@') ? identity : 'Panic Ring member'))}</p>
          <p class="pf-bio">Your personal safety profile and trusted circle.</p>
          <div class="pf-hero-actions">
            <button class="pf-follow-btn" id="pf-edit-profile" type="button">${t('b.prof.edit')}</button>
            <button class="pf-share-btn" id="pf-open-contacts" type="button">Trusted circle</button>
          </div>
        </div>
      </section>
      <input type="file" id="photo-input" accept="image/*" hidden />

      ${editing ? `
      <form class="setup-form pf-form" id="profile-form" autocomplete="off">
        <label class="field-label" for="p-name">${t('prof.name')}</label>
        <input class="text-input" id="p-name" type="text" maxlength="60" value="${esc(profile.name)}" />
        <label class="field-label" for="p-phone">${t('prof.phone')}</label>
        <input class="text-input" id="p-phone" type="tel" maxlength="20" value="${esc(profile.phone)}" />
        <div class="pf-photo-actions">
          <button class="btn-secondary-outline" id="btn-upload" type="button">${t('prof.upload')}</button>
          <button class="btn-secondary" id="btn-remove-photo" type="button">${t('prof.remove')}</button>
        </div>
        <button class="btn-primary" type="submit">${t('prof.save')}</button>
      </form>` : ''}
      <p class="setup-hint" id="p-msg" aria-live="polite"></p>
      <section class="pf-stats" aria-label="Profile summary">
        <div><strong>${contacts.length}</strong><span>Contacts</span></div>
        <div><strong>${notes.length}</strong><span>Private notes</span></div>
        <div><strong>${planItems}/6</strong><span>Plan items</span></div>
      </section>
      <section class="pf-content-section">
        <div class="pf-section-head">
          <h3>Trusted circle</h3>
          <button id="pf-manage-contacts" type="button">Manage</button>
        </div>
        ${contacts.length
        ? `<div class="pf-contact-strip">${contacts.slice(0, 8).map(contact => `
            <button class="pf-contact" type="button" data-contact-id="${esc(contact.id)}" aria-label="${esc(contact.name)}">
              <span>${esc(contact.initials || contact.name[0] || '?')}</span>
              <small>${esc(contact.name.split(' ')[0])}</small>
            </button>`).join('')}</div>`
        : '<p class="pf-empty">Add the people you trust so they are ready when you need them.</p>'}
      </section>
      <section class="pf-content-section">
        <div class="pf-section-head">
          <h3>Private notes</h3>
          <button id="pf-add-note" type="button">View all</button>
        </div>
        ${notes.length
        ? `<div class="pf-note-grid">${notes.slice(0, 4).map(note => `
            <button class="pf-note-card" type="button" data-note-id="${esc(note.id)}">
              <span>${esc(note.title || 'Untitled note')}</span>
              <small>${new Date(note.updatedAt).toLocaleDateString()}</small>
            </button>`).join('')}</div>`
        : '<p class="pf-empty">Your saved notes will appear here.</p>'}
      </section>
      <div class="pf-list">
        ${row('pf-messages', IC.mail, t('b.prof.messages'))}
        ${row('pf-favourites', IC.heart, t('b.prof.fav'))}
        ${row('pf-location', IC.location, t('b.prof.location'))}
        ${row('pf-change-pins', IC.gear, 'Change PINs')}
        ${row('pf-settings', IC.gear, t('b.prof.settings'))}
      </div>
      <div class="pf-logout">${row('pf-logout', IC.out, t('b.prof.logout'), 'pf-danger')}</div>
    </div>`;
        bind();
    };

    const bind = () => {
        const msgEl = root.querySelector('#p-msg') as HTMLElement;
        const fileEl = root.querySelector('#photo-input') as HTMLInputElement;
        const go = (id: string, screen: Parameters<typeof store.navigateTo>[0]) =>
            root.querySelector(id)!.addEventListener('click', () => store.navigateTo(screen));

        go('#btn-back', 'app');
        go('#pf-open-contacts', 'contacts');
        go('#pf-manage-contacts', 'contacts');
        go('#pf-add-note', 'notes');
        go('#pf-messages', 'chat');
        go('#pf-favourites', 'records');
        go('#pf-location', 'live');
        go('#pf-change-pins', 'change-pins');
        go('#pf-settings', 'settings');
        root.querySelectorAll('.pf-contact').forEach(button => {
            button.addEventListener('click', () => store.navigateTo('contacts'));
        });
        root.querySelector('#pf-edit-profile')!.addEventListener('click', () => {
            editing = true;
            draw();
        });
        root.querySelectorAll<HTMLElement>('[data-note-id]').forEach(button => {
            button.addEventListener('click', () => {
                store.setEditingNote(button.dataset['noteId'] ?? null);
                store.navigateTo('note-edit');
            });
        });
        root.querySelector('#pf-logout')!.addEventListener('click', async () => {
            if (confirm(t('b.prof.logout.q')))
                await store.signOut();
        });
        root.querySelector('#btn-edit')!.addEventListener('click', () => {
            editing = !editing;
            draw();
        });
        root.querySelector('#profile-photo')!.addEventListener('click', () => fileEl.click());

        fileEl.addEventListener('change', async () => {
            const file = fileEl.files?.[0];
            if (!file)
                return;
            if (!file.type.startsWith('image/')) {
                msgEl.textContent = t('prof.badimg');
                return;
            }
            try {
                photo = await resizeImage(file);
            }
            catch {
                msgEl.textContent = t('prof.badimg');
                return;
            }
            try {
                await store.saveProfile({ ...store.getState().profile, photo });
                draw();
            }
            catch (error) {
                console.error('[profile] Could not save profile photo:', error);
                msgEl.textContent = 'Could not save your profile. Please try again.';
            }
        });

        if (!editing)
            return;
        const nameEl = root.querySelector('#p-name') as HTMLInputElement;
        const phoneEl = root.querySelector('#p-phone') as HTMLInputElement;
        root.querySelector('#btn-upload')!.addEventListener('click', () => fileEl.click());
        root.querySelector('#btn-remove-photo')!.addEventListener('click', async () => {
            photo = '';
            try {
                await store.saveProfile({ ...store.getState().profile, photo });
                draw();
            }
            catch (error) {
                console.error('[profile] Could not remove profile photo:', error);
                msgEl.textContent = 'Could not save your profile. Please try again.';
            }
        });
        root.querySelector('#profile-form')!.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await store.saveProfile({ ...store.getState().profile, name: nameEl.value.trim(), phone: phoneEl.value.trim(), photo });
                editing = false;
                draw();
                (root.querySelector('#p-msg') as HTMLElement).textContent = t('prof.saved');
            }
            catch (error) {
                console.error('[profile] Could not save profile:', error);
                msgEl.textContent = 'Could not save your profile. Please try again.';
            }
        });
    };

    draw();
}

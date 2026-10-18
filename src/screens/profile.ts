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
    const identity = authEmail ? displayIdentity(authEmail) : (initial.phone || 'Panic Ring user');

    const draw = () => {
        const profile = store.getState().profile;
        const name = profile.name || identity;
        const letter = (name || '?')[0].toUpperCase();
        const photoHtml = photo ? `<img src="${photo}" alt="" />` : `<span>${esc(letter)}</span>`;
        root.innerHTML = `
    <div class="screen profile-screen pf">
      <section class="pf-hero">
        <div class="pf-top">
        <button class="pf-icon-btn" id="btn-back" aria-label="Back">${svg(IC.menu, 'pf-top-ic')}</button>
        <button class="pf-icon-btn" id="btn-edit" aria-label="Edit">${svg(IC.edit, 'pf-top-ic')}</button>
      </div>

      <div class="pf-head">
        <button class="pf-photo" id="profile-photo" type="button" aria-label="${t('prof.upload')}">${photoHtml}</button>
        <div class="pf-who">
          <h2 class="pf-name">${esc(name)}</h2>
          <p class="pf-sub">${esc(profile.phone || (identity.includes('@') ? 'Panic Ring user' : identity))}</p>
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
      <div class="pf-list">
        ${row('pf-profile', IC.users, 'My Profile', editing ? 'pf-row--active' : '')}
        ${row('pf-messages', IC.mail, 'Messages')}
        ${row('pf-favourites', IC.heart, 'Favourites')}
        ${row('pf-location', IC.location, 'Location')}
        ${row('pf-settings', IC.gear, 'Settings')}
      </div>
      <div class="pf-logout">${row('pf-logout', IC.out, 'Log out', 'pf-danger')}</div>
    </div>`;
        bind();
    };

    const bind = () => {
        const msgEl = root.querySelector('#p-msg') as HTMLElement;
        const fileEl = root.querySelector('#photo-input') as HTMLInputElement;
        const go = (id: string, screen: Parameters<typeof store.navigateTo>[0]) =>
            root.querySelector(id)!.addEventListener('click', () => store.navigateTo(screen));

        go('#btn-back', 'app');
        go('#pf-messages', 'chat');
        go('#pf-favourites', 'records');
        go('#pf-location', 'live');
        go('#pf-settings', 'settings');
        root.querySelector('#pf-logout')!.addEventListener('click', async () => {
            if (confirm('Log out?'))
                await store.signOut();
        });
        root.querySelector('#btn-edit')!.addEventListener('click', () => {
            editing = !editing;
            draw();
        });
        root.querySelector('#pf-profile')!.addEventListener('click', () => {
            editing = true;
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
                store.saveProfile({ ...store.getState().profile, photo });
                draw();
            }
            catch {
                msgEl.textContent = t('prof.badimg');
            }
        });

        if (!editing)
            return;
        const nameEl = root.querySelector('#p-name') as HTMLInputElement;
        const phoneEl = root.querySelector('#p-phone') as HTMLInputElement;
        root.querySelector('#btn-upload')!.addEventListener('click', () => fileEl.click());
        root.querySelector('#btn-remove-photo')!.addEventListener('click', () => {
            photo = '';
            store.saveProfile({ ...store.getState().profile, photo });
            draw();
        });
        root.querySelector('#profile-form')!.addEventListener('submit', (e) => {
            e.preventDefault();
            store.saveProfile({ name: nameEl.value.trim(), phone: phoneEl.value.trim(), photo });
            editing = false;
            draw();
            (root.querySelector('#p-msg') as HTMLElement).textContent = t('prof.saved');
        });
    };

    draw();
}

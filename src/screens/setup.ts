import '../strings/groupA.js';
import { store } from '../state.js';
import { t } from '../i18n.js';
import { RELATIONSHIPS } from '../storage.js';
import { DISGUISE_OPTIONS, loadAppearance, saveAppearance, applyAppearance, disguiseLabel, disguiseDescription } from '../theme.js';

function disguisePreview(id: string): string {
    switch (id) {
        case 'calculator':
            return `<div class="dp-calc"><div class="dp-disp">0</div><div class="dp-keys">${Array.from({ length: 16 }, (_, i) => `<i class="${i % 4 === 3 ? 'op' : ''}"></i>`).join('')}</div></div>`;
        case 'budget':
            return `<div class="dp-bud"><div class="dp-bal">R 12,480</div><b></b><b></b><b></b><div class="dp-bar"><i></i></div></div>`;
        case 'weather':
            return `<div class="dp-wx"><div class="dp-sun"></div><div class="dp-temp">24°</div><div class="dp-days"><i></i><i></i><i></i><i></i></div></div>`;
        case 'notes-plain':
            return `<div class="dp-notes"><div class="dp-nt">${t('a.app.notes')}</div><b></b><b></b><b></b></div>`;
        default:
            return `<div class="dp-clock"><div class="dp-face"></div><div class="dp-tm">12:30</div></div>`;
    }
}

export function renderSetupPin(root: HTMLElement) {
    root.innerHTML = `
    <div class="screen setup-screen">
      <div class="setup-logo">○</div>
      <h1 class="setup-title">      ${t('setup.title')}</h1>
            <p class="setup-body">
              ${t('setup.body')}
            </p>

      <form class="setup-form" id="setup-pin-form" autocomplete="off">

        <label class="field-label">${t('a.setup.disguise')}</label>
        <div class="dg-grid">
          ${DISGUISE_OPTIONS.map(d => `
            <label class="dg-card"><input type="radio" name="disguise" value="${d.id}" ${d.id === loadAppearance().disguise ? 'checked' : ''}>
              <span class="dg-prev">${disguisePreview(d.id)}</span>
              <strong>${disguiseLabel(d.id)}</strong></label>`).join('')}
        </div>
        <p class="setup-body" id="dg-desc" style="margin:-4px 0 12px"></p>

        <label class="field-label" for="pin-input">${t('setup.pin')}</label>
        <input
          class="pin-input"
          id="pin-input"
          type="password"
          inputmode="numeric"
          maxlength="4"
          pattern="[0-9]{4}"
          placeholder="${t('setup.pin.ph')}"
          autocomplete="new-password"
          required />

        <label class="field-label" for="decoy-input">${t('setup.decoy')}</label>
        <input
          class="pin-input"
          id="decoy-input"
          type="password"
          inputmode="numeric"
          maxlength="4"
          pattern="[0-9]{4}"
          placeholder="${t('setup.decoy.ph')}"
          autocomplete="new-password"
          required />

        <p class="setup-hint" id="pin-error" aria-live="polite"></p>

        <button class="btn-primary" type="submit">${t('setup.continue')} →</button>
      </form>
    </div>
  `;
    const form = root.querySelector('#setup-pin-form') as HTMLFormElement;
    const pinInput = root.querySelector('#pin-input') as HTMLInputElement;
    const decoyInput = root.querySelector('#decoy-input') as HTMLInputElement;
    const errorEl = root.querySelector('#pin-error') as HTMLElement;
    const descEl = root.querySelector('#dg-desc') as HTMLElement;
    const showDesc = () => {
        const v = (root.querySelector('input[name="disguise"]:checked') as HTMLInputElement | null)?.value;
        descEl.textContent = v ? disguiseDescription(v) : '';
    };
    root.querySelectorAll('input[name="disguise"]').forEach(r => r.addEventListener('change', showDesc));
    showDesc();
    form.addEventListener('submit', async (e: SubmitEvent) => {
        e.preventDefault();
        const pin = pinInput.value.trim();
        const decoy = decoyInput.value.trim();
        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            errorEl.textContent = t('a.setup.err.pin');
            return;
        }
        if (decoy.length !== 4 || !/^\d{4}$/.test(decoy)) {
            errorEl.textContent = t('a.setup.err.decoy');
            return;
        }
        if (pin === decoy) {
            errorEl.textContent = t('a.setup.err.same');
            return;
        }
        errorEl.textContent = '';
        const chosen = (root.querySelector('input[name="disguise"]:checked') as HTMLInputElement | null)?.value;
        if (chosen) {
            const ap = { ...loadAppearance(), disguise: chosen };
            saveAppearance(ap);
            applyAppearance(ap);
        }
        await store.savePin(pin, decoy);
        store.navigateTo('setup-contacts');
    });
}

export function renderSetupContacts(root: HTMLElement) {
    const { contacts } = store.getState();
    const full = contacts.length >= 5;
    const relOptions = RELATIONSHIPS.map(r => `<option value="${r}">${t('rel.' + r)}</option>`).join('');
    root.innerHTML = `
    <div class="screen setup-screen">
      <h2 class="setup-title">${t('a.setup.addtitle')}</h2>
      <p class="setup-body">
        ${t('a.setup.addbody', { n: contacts.length })}
      </p>
      <ul class="contact-list" id="setup-contact-list">
        ${contacts.map(c => `
          <li class="contact-item">
            <div class="contact-avatar">${c.initials}</div>
            <div class="contact-info">
              <span class="contact-name">${c.name}</span>
              <span class="contact-phone">${c.phone}${c.relationship ? ' - ' + t('rel.' + c.relationship) : ''}</span>
            </div>
            <button class="contact-delete" data-id="${c.id}" aria-label="${t('a.setup.remove', { name: c.name })}">✕</button>
          </li>`).join('')}
      </ul>
      ${full ? `<p class="setup-hint">${t('a.setup.limit')}</p>` : `
      <form class="setup-form" id="add-contact-form" autocomplete="off">
        <label class="field-label"         for="contact-name">${t('a.ct.name')}</label>
                <input class="text-input" id="contact-name" type="text" placeholder="${t('prof.name')}" autocomplete="off" required />
                <label class="field-label" for="contact-phone">${t('prof.phone')}</label>
        <input class="text-input" id="contact-phone" type="tel" placeholder="+27 82 123 4567" autocomplete="off" required />
        <label class="field-label" for="contact-rel">${t('rel.label')}</label>
        <select class="text-input" id="contact-rel">${relOptions}</select>
        <p class="setup-hint" id="contact-error" aria-live="polite"></p>
        <button class="btn-secondary-outline" type="submit">${t('a.ct.add')}</button>
      </form>`}
      <button class="btn-primary" id="btn-setup-done">
        ${contacts.length ? t('a.setup.done') : t('a.setup.skip')}
      </button>
    </div>
  `;
    root.querySelector('#setup-contact-list')?.addEventListener('click', (e: MouseEvent) => {
        const btn = (e.target as Element).closest('.contact-delete') as HTMLButtonElement | null;
        if (!btn?.dataset['id'])
            return;
        store.deleteContact(btn.dataset['id']);
        store.navigateTo('setup-contacts');
    });
    const addForm = root.querySelector('#add-contact-form') as HTMLFormElement | null;
    addForm?.addEventListener('submit', (e: SubmitEvent) => {
        e.preventDefault();
        const name = (root.querySelector('#contact-name') as HTMLInputElement).value.trim();
        const phone = (root.querySelector('#contact-phone') as HTMLInputElement).value.trim();
        const rel = (root.querySelector('#contact-rel') as HTMLSelectElement).value;
        const errEl = root.querySelector('#contact-error') as HTMLElement;
        if (!name) {         errEl.textContent = t('a.ct.err.name'); return; }
                if (!phone) { errEl.textContent = t('a.ct.err.phone'); return; }
                if (!store.addContact(name, phone, rel)) { errEl.textContent = t('a.ct.err.max'); return; }
        store.navigateTo('setup-contacts');
    });
    root.querySelector('#btn-setup-done')!.addEventListener('click', () => store.navigateTo('app'));
}



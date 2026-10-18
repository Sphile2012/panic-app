import { store } from '../state.js';

export function renderSetupPin(root: HTMLElement) {
    root.innerHTML = `
    <div class="screen setup-screen">
      <div class="setup-logo">○</div>
      <h1 class="setup-title">Set up Panic Ring</h1>
      <p class="setup-body">
        Choose a 4-digit PIN to unlock the app, and a separate decoy PIN
        that opens a plain Notes screen if someone forces you to unlock.
      </p>

      <section class="ap-section">
        <h2 class="section-label">Choose your cover screen</h2>
        <div class="ap-disguise-grid">
          ${DISGUISE_OPTIONS.map(option => `
            <button type="button" class="ap-disguise-card ${selectedDisguise === option.id ? 'ap-disguise-card--active' : ''}" data-disguise-select="${option.id}">
              <span class="ap-disguise-icon">${option.preview}</span>
              <span class="ap-disguise-label">${option.label}</span>
              <span class="ap-disguise-desc">${option.description}</span>
              ${selectedDisguise === option.id ? '<span class="ap-disguise-check">✓ Active</span>' : ''}
            </button>
          `).join('')}
        </div>
      </section>

      <form class="setup-form" id="setup-pin-form" autocomplete="off">

        <label class="field-label" for="pin-input">Your secret PIN</label>
        <input
          class="pin-input"
          id="pin-input"
          type="password"
          inputmode="numeric"
          maxlength="4"
          pattern="[0-9]{4}"
          placeholder="4 digits"
          autocomplete="new-password"
          required />

        <label class="field-label" for="decoy-input">Decoy PIN (opens Notes)</label>
        <input
          class="pin-input"
          id="decoy-input"
          type="password"
          inputmode="numeric"
          maxlength="4"
          pattern="[0-9]{4}"
          placeholder="4 digits — must be different"
          autocomplete="new-password"
          required />

        <p class="setup-hint" id="pin-error" aria-live="polite"></p>

        <button class="btn-primary" type="submit">Continue →</button>
      </form>
    </div>
  `;
    const form = root.querySelector('#setup-pin-form') as HTMLFormElement;
    const pinInput = root.querySelector('#pin-input') as HTMLInputElement;
    const decoyInput = root.querySelector('#decoy-input') as HTMLInputElement;
    const errorEl = root.querySelector('#pin-error') as HTMLElement;
    form.addEventListener('submit', async (e: SubmitEvent) => {
        e.preventDefault();
        const pin = pinInput.value.trim();
        const decoy = decoyInput.value.trim();
        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            errorEl.textContent = 'PIN must be exactly 4 digits.';
            return;
        }
        if (decoy.length !== 4 || !/^\d{4}$/.test(decoy)) {
            errorEl.textContent = 'Decoy PIN must be exactly 4 digits.';
            return;
        }
        if (pin === decoy) {
            errorEl.textContent = 'Secret PIN and decoy PIN must be different.';
            return;
        }
        errorEl.textContent = '';
        await store.savePin(pin, decoy);
        store.navigateTo('setup-contacts');
    });
}

export function renderSetupContacts(root) {
    const { contacts, authEmail } = store.getState();
    root.innerHTML = `
    <div class="screen setup-screen">
      <h2 class="setup-title">Add trusted contacts</h2>
      <p class="setup-body">
        These people will receive an SMS alert when you activate the app.
        ${authEmail ? 'Add at least one person you trust completely.' : 'Sign in or create an account before adding contacts.'}
      </p>

      ${authEmail ? `<ul class="contact-list" id="setup-contact-list">
        ${contacts.map(c => `
          <li class="contact-item">
            <div class="contact-avatar">${c.initials}</div>
            <div class="contact-info">
              <span class="contact-name">${c.name}</span>
              <span class="contact-phone">${c.phone}</span>
            </div>
            <button class="contact-delete" data-id="${c.id}" aria-label="Remove ${c.name}">✕</button>
          </li>
        `).join('')}
      </ul>` : ''}

      ${authEmail ? `<form class="setup-form" id="add-contact-form" autocomplete="off">
        <label class="field-label" for="contact-name">Name</label>
        <input
          class="text-input"
          id="contact-name"
          type="text"
          placeholder="Full name"
          autocomplete="off"
          required />

        <label class="field-label" for="contact-phone">Phone number</label>
        <input
          class="text-input"
          id="contact-phone"
          type="tel"
          placeholder="+27 82 123 4567"
          autocomplete="off"
          required />

        <p class="setup-hint" id="contact-error" aria-live="polite"></p>
        <button class="btn-secondary-outline" type="submit">Add contact</button>
      </form>` : `
        <div class="settings-auth-buttons">
          <button class="btn-primary" id="btn-contact-signup" type="button">Create account</button>
          <button class="btn-secondary-outline" id="btn-contact-login" type="button">Sign in</button>
        </div>
      `}

      <button
        class="btn-primary"
        id="btn-setup-done"
        ${authEmail && contacts.length === 0 ? 'disabled' : ''}>
        ${authEmail ? 'Done — open app' : 'Continue without contacts'}
      </button>
      ${authEmail && contacts.length === 0
        ? '<p class="setup-hint">Add at least one contact to continue.</p>'
        : ''}
    </div>
  `;
    root.querySelector('#setup-contact-list')?.addEventListener('click', (e: MouseEvent) => {
        const btn = (e.target as Element).closest('.contact-delete') as HTMLButtonElement | null;
        if (!btn)
            return;
        const id = btn.dataset['id'];
        if (!id) return;
        store.deleteContact(id);
        store.navigateTo('setup-contacts');
    });
    root.querySelector('#btn-contact-signup')?.addEventListener('click', () => store.navigateTo('signup'));
    root.querySelector('#btn-contact-login')?.addEventListener('click', () => store.navigateTo('login'));
    const addForm = root.querySelector('#add-contact-form') as HTMLFormElement | null;
    if (addForm) {
      const nameInput = root.querySelector('#contact-name') as HTMLInputElement;
      const phoneInput = root.querySelector('#contact-phone') as HTMLInputElement;
      const errEl = root.querySelector('#contact-error') as HTMLElement;
      addForm.addEventListener('submit', (e: SubmitEvent) => {
        e.preventDefault();
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        if (!name) {
          errEl.textContent = 'Enter a name.';
          return;
        }
        if (!phone) {
          errEl.textContent = 'Enter a phone number.';
          return;
        }
        errEl.textContent = '';
        if (!store.addContact(name, phone)) {
          store.navigateTo('signup');
          return;
        }
        store.navigateTo('setup-contacts');
      });
    }
    root.querySelector('#btn-setup-done').addEventListener('click', () => {
      if (!store.getState().authEmail || store.getState().contacts.length > 0) {
            store.navigateTo('app');
        }
    });
}

import { store } from '../state.js';
import { getRecoveryQuestionIds, LANGUAGES } from '../storage.js';
import { isLargeControlsEnabled, setLargeControlsEnabled } from '../accessibility.js';
export function renderSettings(root: HTMLElement) {
    const { autoLockMinutes, authEmail, profileName: savedName, profilePhone: savedPhone, profileImei: savedImei, language } = store.getState();
  const hasRecovery = getRecoveryQuestionIds() !== null;
    root.innerHTML = `
    <div class="screen settings-screen">

      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="Back">←</button>
        <h2 class="screen-title">Settings</h2>
      </header>

      
      <section class="settings-section">
        <h3 class="settings-section-title">Account</h3>
        ${authEmail ? `
          <div class="settings-account-row">
            <div class="settings-avatar">${authEmail[0].toUpperCase()}</div>
            <div class="settings-account-info">
              <span class="settings-account-email">${authEmail}</span>
              <span class="settings-account-sub">Signed in</span>
            </div>
          </div>
          <button class="btn-secondary-outline" id="btn-signout" style="margin-top:10px">
            Sign out
          </button>
        ` : `
          <p class="settings-section-body">Not signed in.</p>
          <div class="settings-auth-buttons">
            <button class="btn-primary" id="btn-signin">Sign in</button>
            <button class="btn-secondary-outline" id="btn-create">Create account</button>
          </div>
        `}
      </section>

      <section class="settings-section">
        <h3 class="settings-section-title">Profile</h3>
        <form class="setup-form" id="profile-form" autocomplete="off">
          <label class="field-label" for="profile-name">Name</label>
          <input class="text-input" id="profile-name" value="${savedName}" placeholder="Your full name" />

          <label class="field-label" for="profile-phone">Mobile number</label>
          <input class="text-input" id="profile-phone" value="${savedPhone}" placeholder="+27 82 123 4567" inputmode="tel" />

          <label class="field-label" for="profile-imei">Device IMEI / ID</label>
          <input class="text-input" id="profile-imei" value="${savedImei}" placeholder="Optional device identifier" />

          <label class="field-label" for="profile-language">Language</label>
          <select class="text-input" id="profile-language">
            ${LANGUAGES.map(opt => `<option value="${opt.code}" ${language === opt.code ? 'selected' : ''}>${opt.label}</option>`).join('')}
          </select>

          <p class="setup-hint" id="profile-status" aria-live="polite"></p>
          <button class="btn-secondary-outline" type="submit">Save profile</button>
        </form>
      </section>

      <section class="settings-section">
        <h3 class="settings-section-title">Help & guidance</h3>
        <p class="settings-section-body">Get quick help for technical problems, low battery warnings, and emergency steps.</p>
        <div class="settings-auth-buttons">
          <button class="btn-secondary-outline" id="btn-chatbot">Open guidance bot</button>
          <button class="btn-secondary-outline" id="btn-report-issue">Report an issue</button>
        </div>
      </section>

      <section class="settings-section">
        <h3 class="settings-section-title">PIN recovery</h3>
        <p class="settings-section-body">${hasRecovery ? 'Recovery questions are set up.' : 'Set recovery questions to restore your encrypted data if you forget your PINs.'}</p>
        <button class="btn-secondary-outline" id="btn-recovery-settings">${hasRecovery ? 'Change recovery questions' : 'Set recovery questions'}</button>
      </section>

      
      <section class="settings-section">
        <h3 class="settings-section-title">Appearance</h3>
        <p class="settings-section-body">Theme, accent colour and disguise screen.</p>
        <button class="btn-secondary-outline" id="btn-appearance">Open appearance settings</button>
      </section>

      <section class="settings-section">
        <h3 class="settings-section-title">Accessibility</h3>
        <p class="settings-section-body">
          Panic Ring is voice-free by default. Larger controls increase text size
          and touch targets on this device.
        </p>
        <label class="radio-label">
          <input type="checkbox" id="large-controls" ${isLargeControlsEnabled() ? 'checked' : ''} />
          Use larger controls
        </label>
      </section>

      
      <section class="settings-section">
        <h3 class="settings-section-title">Auto-lock</h3>
        <p class="settings-section-body">Lock after inactivity.</p>
        <div class="settings-radio-group">
          ${[
        { val: 1, label: '1 minute' },
        { val: 5, label: '5 minutes' },
        { val: 10, label: '10 minutes' },
        { val: 0, label: 'Off' },
    ].map(opt => `
            <label class="radio-label">
              <input type="radio" name="auto-lock" value="${opt.val}"
                ${autoLockMinutes === opt.val ? 'checked' : ''} />
              ${opt.label}
            </label>
          `).join('')}
        </div>
      </section>

      
      <section class="settings-section">
        <h3 class="settings-section-title">Change PINs</h3>
        <form class="setup-form" id="change-pin-form" autocomplete="off">
          <label class="field-label" for="new-pin">New secret PIN</label>
          <input class="pin-input" id="new-pin" type="password" inputmode="numeric"
            maxlength="8" pattern="[0-9]{4,8}" placeholder="4–8 digits" autocomplete="new-password" />
          <label class="field-label" for="new-decoy">New decoy PIN</label>
          <input class="pin-input" id="new-decoy" type="password" inputmode="numeric"
            maxlength="8" pattern="[0-9]{4,8}" placeholder="4–8 digits" autocomplete="new-password" />
          <p class="setup-hint" id="pin-change-error" aria-live="polite"></p>
          <button class="btn-secondary-outline" type="submit">Update PINs</button>
        </form>
      </section>

      
      <section class="settings-section">
        <h3 class="settings-section-title">Trusted circle</h3>
        <button class="btn-secondary-outline" id="btn-contacts">Manage contacts</button>
      </section>

      
      <section class="settings-section">
        <h3 class="settings-section-title">About</h3>
        <p class="settings-section-body">Panic Ring v1.0 · Data stays encrypted on this device.</p>
        <div class="settings-auth-buttons" style="margin-top:8px">
          <button class="btn-secondary-outline" id="btn-about">About the app</button>
          <button class="btn-secondary-outline" id="btn-terms">Terms</button>
        </div>
      </section>

      
      <section class="settings-section settings-section--danger">
        <h3 class="settings-section-title">Reset app</h3>
        <p class="settings-section-body">
          Deletes all contacts, notes, your safety plan and PINs. Cannot be undone.
        </p>
        <button class="btn-danger" id="btn-reset">Delete all data</button>
      </section>

    </div>
  `;
    root.querySelector('#btn-back').addEventListener('click', () => store.navigateTo('app'));
    root.querySelector('#btn-about').addEventListener('click', () => store.navigateTo('about'));
    root.querySelector('#btn-terms').addEventListener('click', () => store.navigateTo('terms'));
    root.querySelector('#btn-signout')?.addEventListener('click', async () => {
        if (confirm('Sign out?'))
            await store.signOut();
    });
    root.querySelector('#btn-signin')?.addEventListener('click', () => store.navigateTo('login'));
    root.querySelector('#btn-create')?.addEventListener('click', () => store.navigateTo('signup'));
    root.querySelector('#btn-chatbot')?.addEventListener('click', () => store.navigateTo('chatbot'));
    root.querySelector('#btn-report-issue')?.addEventListener('click', () => {
        const profile = store.getState();
        const body = [
            'Issue report for Panic Ring',
            '',
            `Name: ${profile.profileName || 'Not provided'}`,
            `Mobile number: ${profile.profilePhone || 'Not provided'}`,
            `Device IMEI / ID: ${profile.profileImei || 'Not provided'}`,
            `Language: ${profile.language || 'en'}`,
            '',
            'Please describe the problem:',
            '--------------------------------',
        ].join('\n');
        window.location.href = `mailto:support@panicring.app?subject=${encodeURIComponent('Panic Ring support request')}&body=${encodeURIComponent(body)}`;
    });
    root.querySelector('#btn-appearance').addEventListener('click', () => store.navigateTo('appearance'));
    root.querySelector('#large-controls').addEventListener('change', (event: Event) => {
        setLargeControlsEnabled((event.currentTarget as HTMLInputElement).checked);
    });
    root.querySelector('#btn-recovery-settings').addEventListener('click', () => store.navigateTo('recovery-settings'));
    root.querySelector('#btn-contacts').addEventListener('click', () => store.navigateTo('contacts'));
    root.querySelectorAll('input[name="auto-lock"]').forEach((r: HTMLInputElement) => {
        r.addEventListener('change', () => store.setAutoLock(Number(r.value)));
    });
    const profileForm = root.querySelector('#profile-form') as HTMLFormElement;
    const profileNameEl = root.querySelector('#profile-name') as HTMLInputElement;
    const profilePhoneEl = root.querySelector('#profile-phone') as HTMLInputElement;
    const profileImeiEl = root.querySelector('#profile-imei') as HTMLInputElement;
    const profileLanguage = root.querySelector('#profile-language') as HTMLSelectElement;
    const profileStatus = root.querySelector('#profile-status') as HTMLElement;
    profileForm.addEventListener('submit', (e: SubmitEvent) => {
        e.preventDefault();
        store.saveProfile(profileNameEl.value, profilePhoneEl.value, profileImeiEl.value, profileLanguage.value);
        profileStatus.textContent = 'Profile saved locally on this device.';
    });

    const pinForm = root.querySelector('#change-pin-form') as HTMLFormElement;
    const newPin = root.querySelector('#new-pin') as HTMLInputElement;
    const newDecoy = root.querySelector('#new-decoy') as HTMLInputElement;
    const pinErr = root.querySelector('#pin-change-error') as HTMLElement;
    pinForm.addEventListener('submit', async (e: SubmitEvent) => {
        e.preventDefault();
        const p = newPin.value.trim();
        const d = newDecoy.value.trim();
        if (!/^\d{4,8}$/.test(p) || !/^\d{4,8}$/.test(d)) {
            pinErr.textContent = 'Both PINs must be between 4 and 8 digits.';
            return;
        }
        if (p === d) {
            pinErr.textContent = 'PINs must be different.';
            return;
        }
        pinErr.textContent = '';
        await store.changePins(p, d);
        pinErr.style.color = 'var(--safe)';
        pinErr.textContent = '✓ PINs updated';
        pinForm.reset();
        setTimeout(() => { pinErr.textContent = ''; pinErr.style.color = ''; }, 3000);
    });
    root.querySelector('#btn-reset').addEventListener('click', async () => {
        if (confirm('Delete ALL data? This cannot be undone.'))
            await store.factoryReset();
    });
}

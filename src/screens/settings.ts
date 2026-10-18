import { store } from '../state.js';
import { t, languageBarHtml, bindLanguageBar } from '../i18n.js';
import { displayIdentity } from '../db.js';
import { evidenceEnabled, setEvidenceEnabled, requestCameraAccess } from '../evidence.js';
export function renderSettings(root: HTMLElement) {
    const { autoLockMinutes, authEmail } = store.getState();
    const who = displayIdentity(authEmail);
    root.innerHTML = `
    <div class="screen settings-screen">

      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="Back">Back</button>
        <h2 class="screen-title">Settings</h2>
      </header>

      <section class="settings-section">
        <h3 class="settings-section-title">${t('set.language')}</h3>
        ${languageBarHtml()}
      </section>

      <!-- Account -->

      <!-- Appearance -->
      <section class="settings-section">
        <h3 class="settings-section-title">Appearance</h3>
        <p class="settings-section-body">Theme, accent colour and disguise screen.</p>
        <button class="btn-secondary-outline" id="btn-appearance">Open appearance settings</button>
      </section>

      <section class="settings-section">
        <h3 class="settings-section-title">Alert photos</h3>
        <p class="settings-section-body">When an alert starts, take a few photos at random moments and keep them in Records on this device. Your phone shows its camera indicator while this runs.</p>
        <label class="settings-radio"><input type="checkbox" id="evidence-toggle" ${evidenceEnabled() ? 'checked' : ''}> Take photos during alerts</label>
        <p class="settings-section-body" id="evidence-msg"></p>
      </section>

      <!-- Auto-lock -->
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

      <!-- Change PINs -->
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

      <!-- Trusted circle -->
      <section class="settings-section">
        <h3 class="settings-section-title">Trusted circle</h3>
        <button class="btn-secondary-outline" id="btn-contacts">Manage contacts</button>
      </section>

      <!-- About -->
      <section class="settings-section">
        <h3 class="settings-section-title">About</h3>
        <p class="settings-section-body">Panic Ring v1.0. Data stays encrypted on this device.</p>
        <div class="settings-auth-buttons" style="margin-top:8px">
          <button class="btn-secondary-outline" id="btn-about">About the app</button>
          <button class="btn-secondary-outline" id="btn-terms">Terms</button>
        </div>
      </section>

      <!-- Danger zone -->
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
    bindLanguageBar(root, () => renderSettings(root));
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
    root.querySelector('#btn-contacts').addEventListener('click', () => store.navigateTo('contacts'));
    const evToggle = root.querySelector('#evidence-toggle') as HTMLInputElement;
    evToggle.addEventListener('change', async () => {
        const msg = root.querySelector('#evidence-msg') as HTMLElement;
        if (evToggle.checked) {
            const ok = await requestCameraAccess();
            if (!ok) {
                evToggle.checked = false;
                msg.textContent = 'Camera access was not allowed, so alert photos stay off.';
                return;
            }
        }
        setEvidenceEnabled(evToggle.checked);
        msg.textContent = evToggle.checked ? 'Alert photos are on.' : 'Alert photos are off.';
    });
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
        pinErr.textContent = 'PINs updated';
        pinForm.reset();
        setTimeout(() => { pinErr.textContent = ''; pinErr.style.color = ''; }, 3000);
    });
    root.querySelector('#btn-reset').addEventListener('click', async () => {
        if (confirm('Delete ALL data? This cannot be undone.'))
            await store.factoryReset();
    });
}

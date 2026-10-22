import { store } from '../state.js';
import { getRecoveryQuestionIds } from '../storage.js';
import { changeAccountPins, sendReauthenticationLink } from '../db.js';
const PIN_QUESTIONS: Record<string, string> = {
  'first-school': 'What was the name of your first school?',
  'childhood-street': 'What street did you live on as a child?',
  'first-pet': 'What was the name of your first pet?',
  'childhood-friend': 'What was the first name of a childhood friend?',
  'special-place': 'What is the name of a special place?',
  'family-nickname': 'What nickname did your family use for you?',
};
export function renderSettings(root: HTMLElement) {
  const { autoLockMinutes, authEmail, accountPinQuestionIds } = store.getState();
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
        ${authEmail ? `
        <form class="setup-form" id="account-change-pin-form" autocomplete="off">
          <label class="field-label" for="account-change-pin-one">New secret PIN</label>
          <input class="pin-input" id="account-change-pin-one" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{4,6}" autocomplete="new-password" required />
          <label class="field-label" for="account-change-pin-one-confirm">Confirm secret PIN</label>
          <input class="pin-input" id="account-change-pin-one-confirm" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{4,6}" autocomplete="new-password" required />
          <label class="field-label" for="account-change-pin-two">New second PIN</label>
          <input class="pin-input" id="account-change-pin-two" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{4,6}" autocomplete="new-password" required />
          <label class="field-label" for="account-change-pin-two-confirm">Confirm second PIN</label>
          <input class="pin-input" id="account-change-pin-two-confirm" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{4,6}" autocomplete="new-password" required />
          <button class="btn-secondary-outline" id="account-pin-reauth" type="button">Email me a fresh verification link</button>
          <p class="settings-section-body">Follow the link, unlock with both PINs, then return here to change them.</p>
          <label class="field-label" for="account-change-answer-one">${PIN_QUESTIONS[accountPinQuestionIds[0]] ?? 'Security answer 1'}</label>
          <input class="text-input" id="account-change-answer-one" type="password" autocomplete="off" required />
          <label class="field-label" for="account-change-answer-two">${PIN_QUESTIONS[accountPinQuestionIds[1]] ?? 'Security answer 2'}</label>
          <input class="text-input" id="account-change-answer-two" type="password" autocomplete="off" required />
          <p class="setup-hint" id="account-pin-change-error" aria-live="polite"></p>
          <button class="btn-secondary-outline" type="submit">Change account PINs</button>
        </form>
        ` : `
        <form class="setup-form" id="change-pin-form" autocomplete="off">
          <label class="field-label" for="new-pin">New secret PIN</label>
          <input class="pin-input" id="new-pin" type="password" inputmode="numeric"
            maxlength="4" pattern="[0-9]{4}" placeholder="4 digits" autocomplete="new-password" />
          <label class="field-label" for="new-decoy">New decoy PIN</label>
          <input class="pin-input" id="new-decoy" type="password" inputmode="numeric"
            maxlength="4" pattern="[0-9]{4}" placeholder="4 digits" autocomplete="new-password" />
          <p class="setup-hint" id="pin-change-error" aria-live="polite"></p>
          <button class="btn-secondary-outline" type="submit">Update PINs</button>
        </form>
        `}
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
    root.querySelector('#btn-appearance').addEventListener('click', () => store.navigateTo('appearance'));
    root.querySelector('#btn-recovery-settings').addEventListener('click', () => store.navigateTo('recovery-settings'));
    root.querySelector('#btn-contacts').addEventListener('click', () => store.navigateTo('contacts'));
    root.querySelectorAll('input[name="auto-lock"]').forEach((r: HTMLInputElement) => {
        r.addEventListener('change', () => store.setAutoLock(Number(r.value)));
    });
    const pinForm = root.querySelector('#change-pin-form') as HTMLFormElement | null;
    if (pinForm) {
      const newPin = root.querySelector('#new-pin') as HTMLInputElement;
      const newDecoy = root.querySelector('#new-decoy') as HTMLInputElement;
      const pinErr = root.querySelector('#pin-change-error') as HTMLElement;
      pinForm.addEventListener('submit', async (e: SubmitEvent) => {
        e.preventDefault();
        const p = newPin.value.trim();
        const d = newDecoy.value.trim();
        if (!/^\d{4}$/.test(p) || !/^\d{4}$/.test(d)) {
          pinErr.textContent = 'Both PINs must be exactly 4 digits.';
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
    }
    const accountPinForm = root.querySelector('#account-change-pin-form') as HTMLFormElement | null;
    const reauthButton = root.querySelector<HTMLButtonElement>('#account-pin-reauth');
    reauthButton?.addEventListener('click', async () => {
      const error = root.querySelector<HTMLElement>('#account-pin-change-error')!;
      error.textContent = '';
      reauthButton.disabled = true;
      const authError = await sendReauthenticationLink();
      reauthButton.disabled = false;
      error.style.color = authError ? '' : 'var(--safe)';
      error.textContent = authError ?? 'Verification link sent. Open it in this browser, unlock with both PINs, then return to Settings.';
    });
    accountPinForm?.addEventListener('submit', async event => {
      event.preventDefault();
      const error = root.querySelector<HTMLElement>('#account-pin-change-error')!;
      const first = (root.querySelector<HTMLInputElement>('#account-change-pin-one')!).value.trim();
      const firstConfirm = (root.querySelector<HTMLInputElement>('#account-change-pin-one-confirm')!).value.trim();
      const second = (root.querySelector<HTMLInputElement>('#account-change-pin-two')!).value.trim();
      const secondConfirm = (root.querySelector<HTMLInputElement>('#account-change-pin-two-confirm')!).value.trim();
      const answer1 = (root.querySelector<HTMLInputElement>('#account-change-answer-one')!).value;
      const answer2 = (root.querySelector<HTMLInputElement>('#account-change-answer-two')!).value;
      if (!/^\d{4,6}$/.test(first) || !/^\d{4,6}$/.test(second)) {
        error.textContent = 'Each PIN must contain 4 to 6 digits.';
        return;
      }
      if (first !== firstConfirm || second !== secondConfirm) {
        error.textContent = 'PIN confirmations do not match.';
        return;
      }
      if (first === second) {
        error.textContent = 'The two PINs must be different.';
        return;
      }
      const result = await changeAccountPins({ answer1, answer2, newPin1: first, confirmPin1: firstConfirm, newPin2: second, confirmPin2: secondConfirm });
      if (!result.success) {
        const message = result.error ?? 'PINs could not be changed.';
        error.textContent = /reauth|recent authentication/i.test(message)
          ? 'Request a fresh verification link, follow it, unlock with both PINs, then try again.'
          : message;
        return;
      }
      await store.changePins(first, second);
      accountPinForm.reset();
      error.style.color = 'var(--safe)';
      error.textContent = 'PINs updated.';
    });
    root.querySelector('#btn-reset').addEventListener('click', async () => {
        if (confirm('Delete ALL data? This cannot be undone.'))
            await store.factoryReset();
    });
}

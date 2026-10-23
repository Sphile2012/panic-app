import { store } from '../state.js';
import { getRecoveryQuestionIds } from '../storage.js';
import { changeAccountPins, sendReauthenticationCode, verifyEmailOtp } from '../db.js';
import { formatAuthError } from '../authMessages.js';
const PIN_QUESTIONS = {
    'first-school': 'What was the name of your first school?',
    'childhood-street': 'What street did you live on as a child?',
    'first-pet': 'What was the name of your first pet?',
    'childhood-friend': 'What was the first name of a childhood friend?',
    'special-place': 'What is the name of a special place?',
    'family-nickname': 'What nickname did your family use for you?',
};
export function renderSettings(root) {
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
          <button class="btn-secondary-outline" id="btn-change-password" style="margin-top:10px">
            Change password
          </button>
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
        <h3 class="settings-section-title">Security</h3>
        <p class="settings-section-body">Change your PINs (requires security questions)</p>
        <button class="btn-secondary-outline" id="btn-change-pins">Change PINs</button>
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
          <button class="btn-secondary-outline" id="account-pin-reauth" type="button">Email me a verification code</button>
          <p class="settings-section-body" id="account-pin-reauth-message">Verify your email before changing account PINs.</p>
          <div id="account-pin-reauth-code-wrap" hidden>
            <label class="field-label" for="account-pin-reauth-code">Email verification code</label>
            <input class="text-input" id="account-pin-reauth-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" required />
            <button class="btn-secondary-outline" id="account-pin-verify-reauth" type="button">Verify code</button>
          </div>
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
    root.querySelector('#btn-back')?.addEventListener('click', () => store.navigateTo('app'));
    root.querySelector('#btn-about')?.addEventListener('click', () => store.navigateTo('about'));
    root.querySelector('#btn-terms')?.addEventListener('click', () => store.navigateTo('terms'));
    root.querySelector('#btn-change-password')?.addEventListener('click', () => store.navigateTo('change-password'));
    root.querySelector('#btn-change-pins')?.addEventListener('click', () => store.navigateTo('change-pins'));
    root.querySelector('#btn-signout')?.addEventListener('click', async () => {
        if (confirm('Sign out?'))
            await store.signOut();
    });
    root.querySelector('#btn-signin')?.addEventListener('click', () => store.navigateTo('login'));
    root.querySelector('#btn-create')?.addEventListener('click', () => store.navigateTo('signup'));
    root.querySelector('#btn-appearance')?.addEventListener('click', () => store.navigateTo('appearance'));
    root.querySelector('#btn-recovery-settings')?.addEventListener('click', () => store.navigateTo('recovery-settings'));
    root.querySelector('#btn-contacts')?.addEventListener('click', () => store.navigateTo('contacts'));
    root.querySelectorAll('input[name="auto-lock"]').forEach((r) => {
        r.addEventListener('change', () => store.setAutoLock(Number(r.value)));
    });
    const pinForm = root.querySelector('#change-pin-form');
    if (pinForm) {
        const newPin = root.querySelector('#new-pin');
        const newDecoy = root.querySelector('#new-decoy');
        const pinErr = root.querySelector('#pin-change-error');
        pinForm.addEventListener('submit', async (e) => {
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
    const accountPinForm = root.querySelector('#account-change-pin-form');
    const reauthButton = root.querySelector('#account-pin-reauth');
    reauthButton?.addEventListener('click', async () => {
        const error = root.querySelector('#account-pin-change-error');
        error.textContent = '';
        reauthButton.disabled = true;
        const authError = await sendReauthenticationCode();
        reauthButton.disabled = false;
        error.style.color = authError ? '' : 'var(--safe)';
        error.textContent = authError ?? 'Verification code sent. Enter it here to continue.';
        if (!authError)
            root.querySelector('#account-pin-reauth-code-wrap').hidden = false;
    });
    root.querySelector('#account-pin-verify-reauth')?.addEventListener('click', async () => {
        const email = store.getState().authEmail;
        const code = root.querySelector('#account-pin-reauth-code').value;
        const error = root.querySelector('#account-pin-change-error');
        const result = email ? await verifyEmailOtp(email, code) : { error: 'Your account session expired. Sign in again.' };
        error.style.color = result.error ? '' : 'var(--safe)';
        error.textContent = result.error ? formatAuthError(result.error, 'otp') : 'Email verified. You can now change your account PINs.';
    });
    accountPinForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const error = root.querySelector('#account-pin-change-error');
        const first = (root.querySelector('#account-change-pin-one')).value.trim();
        const firstConfirm = (root.querySelector('#account-change-pin-one-confirm')).value.trim();
        const second = (root.querySelector('#account-change-pin-two')).value.trim();
        const secondConfirm = (root.querySelector('#account-change-pin-two-confirm')).value.trim();
        const answer1 = (root.querySelector('#account-change-answer-one')).value;
        const answer2 = (root.querySelector('#account-change-answer-two')).value;
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
                ? 'Request and verify a fresh email code, then try again.'
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
// Change PIN screen with security question verification
export function renderChangePins(root) {
    const questionIds = getRecoveryQuestionIds();
    if (!questionIds || questionIds.length < 2) {
        root.innerHTML = `
      <div class="screen setup-screen">
        <h1 class="setup-title">Change PINs</h1>
        <p class="setup-body">You must set up security questions first before you can change your PINs.</p>
        <button class="btn-primary" id="btn-setup-recovery">Set up security questions</button>
        <button class="btn-secondary-outline" id="btn-back-settings">Back to Settings</button>
      </div>`;
        root.querySelector('#btn-setup-recovery')?.addEventListener('click', () => store.navigateTo('recovery-settings'));
        root.querySelector('#btn-back-settings')?.addEventListener('click', () => store.navigateTo('settings'));
        return;
    }
    const questions = questionIds.map(id => PIN_QUESTIONS[id] || id);
    root.innerHTML = `
    <div class="screen setup-screen">
      <h1 class="setup-title">Change PINs</h1>
      <p class="setup-body">Answer your security questions to change your PINs</p>

      <form class="setup-form" id="change-pins-form" autocomplete="off">
        <label class="field-label">${questions[0]}</label>
        <input class="text-input" id="answer-1" type="text" autocomplete="off" required />

        <label class="field-label">${questions[1]}</label>
        <input class="text-input" id="answer-2" type="text" autocomplete="off" required />

        <label class="field-label" for="new-pin1">New Secret PIN (4 digits)</label>
        <input class="pin-input" id="new-pin1" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" autocomplete="new-password" required />

        <label class="field-label" for="new-pin1-confirm">Confirm Secret PIN</label>
        <input class="pin-input" id="new-pin1-confirm" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" autocomplete="new-password" required />

        <label class="field-label" for="new-pin2">New Decoy PIN (4 digits)</label>
        <input class="pin-input" id="new-pin2" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" autocomplete="new-password" required />

        <label class="field-label" for="new-pin2-confirm">Confirm Decoy PIN</label>
        <input class="pin-input" id="new-pin2-confirm" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" autocomplete="new-password" required />

        <p class="setup-hint" id="change-pin-error" aria-live="polite"></p>

        <button class="btn-primary" type="submit">Change PINs</button>
        <button class="btn-secondary-outline" id="btn-cancel" type="button">Cancel</button>
      </form>
    </div>`;
    root.querySelector('#btn-cancel')?.addEventListener('click', () => store.navigateTo('settings'));
    const form = root.querySelector('#change-pins-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const answer1 = root.querySelector('#answer-1').value.trim();
        const answer2 = root.querySelector('#answer-2').value.trim();
        const newPin1 = root.querySelector('#new-pin1').value.trim();
        const newPin1Confirm = root.querySelector('#new-pin1-confirm').value.trim();
        const newPin2 = root.querySelector('#new-pin2').value.trim();
        const newPin2Confirm = root.querySelector('#new-pin2-confirm').value.trim();
        const errorEl = root.querySelector('#change-pin-error');
        if (newPin1.length !== 4 || !/^\d{4}$/.test(newPin1)) {
            errorEl.textContent = 'Secret PIN must be exactly 4 digits.';
            return;
        }
        if (newPin1 !== newPin1Confirm) {
            errorEl.textContent = 'Secret PINs do not match.';
            return;
        }
        if (newPin2.length !== 4 || !/^\d{4}$/.test(newPin2)) {
            errorEl.textContent = 'Decoy PIN must be exactly 4 digits.';
            return;
        }
        if (newPin2 !== newPin2Confirm) {
            errorEl.textContent = 'Decoy PINs do not match.';
            return;
        }
        if (newPin1 === newPin2) {
            errorEl.textContent = 'Secret PIN and Decoy PIN must be different.';
            return;
        }
        // Verify security answers and change PINs
        const success = await store.changePinsWithRecovery(answer1, answer2, newPin1, newPin2);
        if (!success) {
            errorEl.textContent = 'Security answers are incorrect. Please try again.';
            return;
        }
        errorEl.style.color = 'var(--safe)';
        errorEl.textContent = '✓ PINs changed successfully!';
        setTimeout(() => store.navigateTo('settings'), 1500);
    });
}
// PIN Recovery screen (Forgot PIN)
export function renderPinRecovery(root) {
    const questionIds = getRecoveryQuestionIds();
    if (!questionIds || questionIds.length < 2) {
        root.innerHTML = `
      <div class="screen setup-screen">
        <h1 class="setup-title">PIN Recovery</h1>
        <p class="setup-body">No security questions found. You cannot recover your PIN without them.</p>
        <button class="btn-primary" id="btn-back-calc">Back</button>
      </div>`;
        root.querySelector('#btn-back-calc')?.addEventListener('click', () => store.navigateTo('calculator'));
        return;
    }
    const questions = questionIds.map(id => PIN_QUESTIONS[id] || id);
    root.innerHTML = `
    <div class="screen setup-screen">
      <h1 class="setup-title">Forgot PIN?</h1>
      <p class="setup-body">Answer your security questions to reset your PINs</p>

      <form class="setup-form" id="pin-recovery-form" autocomplete="off">
        <label class="field-label">${questions[0]}</label>
        <input class="text-input" id="recovery-answer-1" type="text" autocomplete="off" required />

        <label class="field-label">${questions[1]}</label>
        <input class="text-input" id="recovery-answer-2" type="text" autocomplete="off" required />

        <label class="field-label" for="recovery-pin1">New Secret PIN (4 digits)</label>
        <input class="pin-input" id="recovery-pin1" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" autocomplete="new-password" required />

        <label class="field-label" for="recovery-pin1-confirm">Confirm Secret PIN</label>
        <input class="pin-input" id="recovery-pin1-confirm" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" autocomplete="new-password" required />

        <label class="field-label" for="recovery-pin2">New Decoy PIN (4 digits)</label>
        <input class="pin-input" id="recovery-pin2" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" autocomplete="new-password" required />

        <label class="field-label" for="recovery-pin2-confirm">Confirm Decoy PIN</label>
        <input class="pin-input" id="recovery-pin2-confirm" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" autocomplete="new-password" required />

        <p class="setup-hint" id="recovery-error" aria-live="polite"></p>

        <button class="btn-primary" type="submit">Reset PINs</button>
        <button class="btn-secondary-outline" id="btn-cancel-recovery" type="button">Cancel</button>
      </form>
    </div>`;
    root.querySelector('#btn-cancel-recovery')?.addEventListener('click', () => store.navigateTo('calculator'));
    const form = root.querySelector('#pin-recovery-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const answer1 = root.querySelector('#recovery-answer-1').value.trim();
        const answer2 = root.querySelector('#recovery-answer-2').value.trim();
        const newPin1 = root.querySelector('#recovery-pin1').value.trim();
        const newPin1Confirm = root.querySelector('#recovery-pin1-confirm').value.trim();
        const newPin2 = root.querySelector('#recovery-pin2').value.trim();
        const newPin2Confirm = root.querySelector('#recovery-pin2-confirm').value.trim();
        const errorEl = root.querySelector('#recovery-error');
        if (newPin1.length !== 4 || !/^\d{4}$/.test(newPin1)) {
            errorEl.textContent = 'Secret PIN must be exactly 4 digits.';
            return;
        }
        if (newPin1 !== newPin1Confirm) {
            errorEl.textContent = 'Secret PINs do not match.';
            return;
        }
        if (newPin2.length !== 4 || !/^\d{4}$/.test(newPin2)) {
            errorEl.textContent = 'Decoy PIN must be exactly 4 digits.';
            return;
        }
        if (newPin2 !== newPin2Confirm) {
            errorEl.textContent = 'Decoy PINs do not match.';
            return;
        }
        if (newPin1 === newPin2) {
            errorEl.textContent = 'Secret PIN and Decoy PIN must be different.';
            return;
        }
        // Verify security answers and reset PINs
        const success = await store.recoverPinWithAnswers(answer1, answer2, newPin1, newPin2);
        if (!success) {
            errorEl.textContent = 'Security answers are incorrect. Please try again.';
            return;
        }
        errorEl.style.color = 'var(--safe)';
        errorEl.textContent = '✓ PINs reset successfully! You can now login.';
        setTimeout(() => store.navigateTo('calculator'), 2000);
    });
}

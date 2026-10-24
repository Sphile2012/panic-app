import { hasDistinctPinDigits, store } from '../state.js';
import { getRecoveryQuestionIds } from '../storage.js';
import { RECOVERY_QUESTIONS } from './setup.js';
import { wirePasswordToggles } from '../formControls.js';
const PIN_QUESTIONS = Object.fromEntries(RECOVERY_QUESTIONS.map(question => [question.id, question.label]));
export function renderSettings(root) {
    const { autoLockMinutes } = store.getState();
    const recoveryQuestionIds = getRecoveryQuestionIds();
    const hasRecovery = recoveryQuestionIds !== null;
    const recoveryQuestionLabel = (id) => RECOVERY_QUESTIONS.find(question => question.id === id)?.label ?? 'Security question unavailable';
    root.innerHTML = `
    <div class="screen settings-screen">

      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="Back">←</button>
        <h2 class="screen-title">Settings</h2>
      </header>

      <section class="settings-section">
        <h3 class="settings-section-title">Device privacy</h3>
        <p class="settings-section-body">Your profile and safety information stay encrypted on this device and are unlocked with your PIN.</p>
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
        <form class="setup-form" id="change-pin-form" autocomplete="off">
          ${hasRecovery ? `
          <label class="field-label" for="change-answer-one">${recoveryQuestionLabel(recoveryQuestionIds[0])}</label>
          <div class="password-wrap"><input class="text-input" id="change-answer-one" type="password" autocomplete="off" required /><button class="pw-toggle" type="button" data-target="change-answer-one" data-description="first security answer" aria-label="Show first security answer">Show</button></div>
          <label class="field-label" for="change-answer-two">${recoveryQuestionLabel(recoveryQuestionIds[1])}</label>
          <div class="password-wrap"><input class="text-input" id="change-answer-two" type="password" autocomplete="off" required /><button class="pw-toggle" type="button" data-target="change-answer-two" data-description="second security answer" aria-label="Show second security answer">Show</button></div>
          <label class="field-label" for="new-pin">New secret PIN</label>
          <div class="password-wrap"><input class="pin-input" id="new-pin" type="password" inputmode="numeric"
            maxlength="4" pattern="[0-9]{4}" placeholder="4 digits" autocomplete="new-password" required /><button class="pw-toggle" type="button" data-target="new-pin" data-description="new secret PIN" aria-label="Show new secret PIN">Show</button></div>
          <label class="field-label" for="new-pin-confirm">Confirm secret PIN</label>
          <div class="password-wrap"><input class="pin-input" id="new-pin-confirm" type="password" inputmode="numeric"
            maxlength="4" pattern="[0-9]{4}" placeholder="Re-enter 4 digits" autocomplete="new-password" required /><button class="pw-toggle" type="button" data-target="new-pin-confirm" data-description="secret PIN confirmation" aria-label="Show secret PIN confirmation">Show</button></div>
          <label class="field-label" for="new-decoy">New decoy PIN</label>
          <div class="password-wrap"><input class="pin-input" id="new-decoy" type="password" inputmode="numeric"
            maxlength="4" pattern="[0-9]{4}" placeholder="4 digits" autocomplete="new-password" required /><button class="pw-toggle" type="button" data-target="new-decoy" data-description="new decoy PIN" aria-label="Show new decoy PIN">Show</button></div>
          <label class="field-label" for="new-decoy-confirm">Confirm decoy PIN</label>
          <div class="password-wrap"><input class="pin-input" id="new-decoy-confirm" type="password" inputmode="numeric"
            maxlength="4" pattern="[0-9]{4}" placeholder="Re-enter 4 digits" autocomplete="new-password" required /><button class="pw-toggle" type="button" data-target="new-decoy-confirm" data-description="decoy PIN confirmation" aria-label="Show decoy PIN confirmation">Show</button></div>
          ` : '<p class="settings-section-body">Set up security questions before you can change your PINs.</p>'}
          <p class="setup-hint" id="pin-change-error" aria-live="polite"></p>
          ${hasRecovery ? '<button class="btn-secondary-outline" type="submit">Update PINs</button>' : ''}
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
    wirePasswordToggles(root);
    root.querySelector('#btn-back').addEventListener('click', () => store.navigateTo('app'));
    root.querySelector('#btn-about').addEventListener('click', () => store.navigateTo('about'));
    root.querySelector('#btn-terms').addEventListener('click', () => store.navigateTo('terms'));
    root.querySelector('#btn-appearance').addEventListener('click', () => store.navigateTo('appearance'));
    root.querySelector('#btn-recovery-settings').addEventListener('click', () => store.navigateTo('recovery-settings'));
    root.querySelector('#btn-contacts').addEventListener('click', () => store.navigateTo('contacts'));
    root.querySelectorAll('input[name="auto-lock"]').forEach((r) => {
        r.addEventListener('change', () => store.setAutoLock(Number(r.value)));
    });
    const pinForm = root.querySelector('#change-pin-form');
    if (pinForm && hasRecovery) {
        const newPin = root.querySelector('#new-pin');
        const newDecoy = root.querySelector('#new-decoy');
        const confirmPin = root.querySelector('#new-pin-confirm');
        const confirmDecoy = root.querySelector('#new-decoy-confirm');
        const answerOne = root.querySelector('#change-answer-one');
        const answerTwo = root.querySelector('#change-answer-two');
        const pinErr = root.querySelector('#pin-change-error');
        pinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const p = newPin.value.trim();
            const d = newDecoy.value.trim();
            if (!/^\d{4}$/.test(p) || !/^\d{4}$/.test(d)) {
                pinErr.textContent = 'Both PINs must be exactly 4 digits.';
                return;
            }
            if (!hasDistinctPinDigits(p) || !hasDistinctPinDigits(d)) {
                pinErr.textContent = 'PINs cannot repeat digits. Use four different digits for each PIN.';
                return;
            }
            if (p !== confirmPin.value.trim() || d !== confirmDecoy.value.trim()) {
                pinErr.textContent = 'PIN confirmations do not match.';
                return;
            }
            if (p === d) {
                pinErr.textContent = 'PINs must be different.';
                return;
            }
            pinErr.textContent = '';
            const updated = await store.recoverPins([answerOne.value, answerTwo.value], p, d, 'settings');
            const currentError = root.querySelector('#pin-change-error');
            if (!updated) {
                if (currentError)
                    currentError.textContent = 'Security answers are incorrect. Check them and try again.';
                return;
            }
            const currentForm = root.querySelector('#change-pin-form');
            if (currentError) {
                currentError.style.color = 'var(--safe)';
                currentError.textContent = 'PINs updated.';
            }
            currentForm?.reset();
            setTimeout(() => {
                if (currentError) {
                    currentError.textContent = '';
                    currentError.style.color = '';
                }
            }, 3000);
        });
    }
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

import { changeAccountPins, getAccountPinStatus, sendEmailAuthOtp, setupAccountPins, verifyAccountPins, verifyEmailOtp } from '../db.js';
import { hasDistinctPinDigits, store } from '../state.js';
import { hashPin, loadPublicSync, setCloudBackup } from '../storage.js';
import { clearSignupDraft, getSignupDraft } from './emailAuth.js';

const QUESTIONS = [
  ['first-school', 'What was the name of your first school?'],
  ['childhood-street', 'What street did you live on as a child?'],
  ['first-pet', 'What was the name of your first pet?'],
  ['childhood-friend', 'What was the first name of a childhood friend?'],
  ['special-place', 'What is the name of a special place?'],
  ['family-nickname', 'What nickname did your family use for you?'],
] as const;

export async function renderAccountPinGate(root: HTMLElement) {
  const email = store.getState().authEmail;
  if (!email) {
    store.navigateTo('welcome');
    return;
  }
  root.innerHTML = '<div class="screen setup-screen"><p class="setup-body">Checking account PIN setup…</p></div>';
  try {
    const status = await getAccountPinStatus();
    const state = store.getState();
    if (state.authEmail !== email || !['account-pin-check', 'account-pin-setup', 'account-pin-login'].includes(state.screen))
      return;
    store.setAccountPinQuestionIds(status.questionIds);
    if (status.configured)
      renderLogin(root, status.lockedUntil);
    else
      renderSetup(root);
  } catch (error) {
    const state = store.getState();
    if (state.authEmail !== email || !['account-pin-check', 'account-pin-setup', 'account-pin-login'].includes(state.screen))
      return;
    console.error('[account-pin] Status check failed:', error instanceof Error ? error.name : 'unknown');
    root.innerHTML = `
      <div class="screen setup-screen">
        <h1 class="setup-title">Account PIN service unavailable</h1>
        <p class="setup-body">Your account is signed in, but PIN status could not be checked. Try again when online.</p>
        <button class="btn-primary" id="pin-status-retry" type="button">Retry</button>
        ${store.getState().pinHash ? '<button class="btn-secondary-outline" id="pin-status-offline" type="button">Unlock this device offline</button>' : ''}
        <button class="btn-secondary-outline" id="pin-status-signout" type="button">Sign out</button>
      </div>`;
    root.querySelector('#pin-status-retry')?.addEventListener('click', () => void renderAccountPinGate(root));
    root.querySelector('#pin-status-offline')?.addEventListener('click', () => store.navigateTo('calculator'));
    root.querySelector('#pin-status-signout')?.addEventListener('click', () => void store.signOut());
  }
}

function renderSetup(root: HTMLElement) {
  const firstRun = store.getState().isFirstRun;
  const publicData = loadPublicSync();
  const hasExistingDevicePins = Boolean(publicData.pin);
  const options = QUESTIONS.map(([id, text]) => `<option value="${id}">${text}</option>`).join('');
  root.innerHTML = `
    <div class="screen setup-screen">
      <h1 class="setup-title">${hasExistingDevicePins ? 'Connect your existing PINs' : 'Create your account PINs'}</h1>
      <p class="setup-body">${hasExistingDevicePins
        ? 'Enter the two PINs you already use on this device to connect them to your account. You will not need to create new PINs.'
        : 'Choose two different 4-digit PINs. Both are required to unlock this account.'}</p>
      <form class="setup-form" id="account-pin-setup-form" autocomplete="off">
        ${pinField('one', hasExistingDevicePins ? 'Existing first PIN' : 'First PIN', !hasExistingDevicePins)}
        ${pinField('two', hasExistingDevicePins ? 'Existing second PIN' : 'Second PIN', !hasExistingDevicePins)}
        <label class="field-label" for="pin-question-one">Security question 1</label>
        <select class="text-input" id="pin-question-one" required><option value="">Choose a question</option>${options}</select>
        <label class="field-label" for="pin-answer-one">Answer 1</label>
        <input class="text-input" id="pin-answer-one" type="password" autocomplete="off" required />
        <label class="field-label" for="pin-question-two">Security question 2</label>
        <select class="text-input" id="pin-question-two" required><option value="">Choose a different question</option>${options}</select>
        <label class="field-label" for="pin-answer-two">Answer 2</label>
        <input class="text-input" id="pin-answer-two" type="password" autocomplete="off" required />
        <p class="setup-hint" id="account-pin-error" aria-live="polite"></p>
        <button class="btn-primary" id="account-pin-submit" type="submit">${hasExistingDevicePins ? 'Connect existing PINs' : 'Save account PINs'}</button>
      </form>
      <button class="auth-back-btn" id="account-pin-signout" type="button">Sign out</button>
    </div>`;

  const form = root.querySelector<HTMLFormElement>('#account-pin-setup-form')!;
  const error = root.querySelector<HTMLElement>('#account-pin-error')!;
  const submit = root.querySelector<HTMLButtonElement>('#account-pin-submit')!;
  root.querySelector('#account-pin-signout')?.addEventListener('click', () => void store.signOut());
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const first = read(root, 'pin-one');
    const firstConfirm = hasExistingDevicePins ? first : read(root, 'pin-one-confirm');
    const second = read(root, 'pin-two');
    const secondConfirm = hasExistingDevicePins ? second : read(root, 'pin-two-confirm');
    const question1 = read(root, 'pin-question-one');
    const question2 = read(root, 'pin-question-two');
    const answer1 = read(root, 'pin-answer-one');
    const answer2 = read(root, 'pin-answer-two');
    if (!/^\d{4}$/.test(first) || !/^\d{4}$/.test(second)) {
      error.textContent = 'Each PIN must contain exactly 4 digits.';
      return;
    }
    if (!hasDistinctPinDigits(first) || !hasDistinctPinDigits(second)) {
      error.textContent = 'Each PIN must use four different digits.';
      return;
    }
    if (!hasExistingDevicePins && (first !== firstConfirm || second !== secondConfirm)) {
      error.textContent = 'PIN confirmations do not match.';
      return;
    }
    if (first === second) {
      error.textContent = 'The two PINs must be different.';
      return;
    }
    if (!question1 || question1 === question2) {
      error.textContent = 'Choose two different security questions.';
      return;
    }
    if (!answer1.trim() || !answer2.trim()) {
      error.textContent = 'Both security answers are required.';
      return;
    }
    if (hasExistingDevicePins &&
        (!publicData.decoyPin || await hashPin(first) !== publicData.pin || await hashPin(second) !== publicData.decoyPin)) {
      error.textContent = publicData.decoyPin
        ? 'Enter the two PINs already set on this device to connect them to your account.'
        : 'This device has incomplete saved PINs. Recover its existing PINs before connecting it to your account.';
      return;
    }
    const accountEmail = store.getState().authEmail;
    submit.disabled = true;
    let result;
    try {
      result = await setupAccountPins({
        pin1: first,
        confirmPin1: firstConfirm,
        pin2: second,
        confirmPin2: secondConfirm,
        question1Id: question1,
        question1Answer: answer1,
        question2Id: question2,
        question2Answer: answer2,
      });
    } catch (setupError) {
      console.error('[account-pin] PIN setup failed:', setupError);
      submit.disabled = false;
      error.textContent = 'Could not save your account PINs. Check your connection and try again.';
      return;
    }
    if (store.getState().authEmail !== accountEmail)
      return;
    if (!result.success) {
      submit.disabled = false;
      error.textContent = result.error ?? 'Could not save your PINs. Try again.';
      return;
    }
    store.setAccountPinQuestionIds([question1, question2]);
    try {
      const unlocked = await finishAccountPinUnlock(first, second, firstRun);
      if (!unlocked) {
        submit.disabled = false;
        error.textContent = 'Your account PINs were saved, but this device could not unlock its vault. Sign in again or use the device PINs you already had.';
      }
    } catch (localError) {
      console.error('[account-pin] Local vault setup failed:', localError);
      submit.disabled = false;
      error.textContent = 'Your account PINs were saved, but local setup failed. Sign in again to continue.';
    }
  });
}

function renderLogin(root: HTMLElement, lockedUntil: string | null) {
  const lockMessage = lockedUntil && new Date(lockedUntil) > new Date()
    ? `PIN attempts are temporarily locked until ${new Date(lockedUntil).toLocaleTimeString()}.`
    : 'Enter both account PINs to unlock.';
  root.innerHTML = `
    <div class="screen auth-screen auth-screen--scenic">
      <header class="auth-hero"><h1>Unlock Panic Ring</h1></header>
      <section class="auth-sheet">
        <p class="auth-subtitle">${lockMessage}</p>
        <form class="auth-form" id="account-pin-login-form" autocomplete="off">
          ${pinField('one', 'First PIN', false, 6)}
          ${pinField('two', 'Second PIN', false, 6)}
          <p class="auth-error" id="account-pin-login-error" aria-live="polite"></p>
          <button class="btn-primary auth-entry-btn" id="account-pin-login-submit" type="submit">Unlock</button>
        </form>
        <button class="auth-link-btn" id="account-pin-recover" type="button">Forgot your account PINs?</button>
        <button class="auth-back-btn" id="account-pin-signout" type="button">Sign out</button>
      </section>
    </div>`;
  const form = root.querySelector<HTMLFormElement>('#account-pin-login-form')!;
  const error = root.querySelector<HTMLElement>('#account-pin-login-error')!;
  const submit = root.querySelector<HTMLButtonElement>('#account-pin-login-submit')!;
  root.querySelector('#account-pin-signout')?.addEventListener('click', () => void store.signOut());
  root.querySelector('#account-pin-recover')?.addEventListener('click', () => store.navigateTo('account-pin-recovery'));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const first = read(root, 'pin-one');
    const second = read(root, 'pin-two');
    if (!/^\d{4,6}$/.test(first) || !/^\d{4,6}$/.test(second)) {
      error.textContent = 'Enter two 4–6 digit PINs.';
      return;
    }
    submit.disabled = true;
    const accountEmail = store.getState().authEmail;
    const firstRun = store.getState().isFirstRun;
    let result;
    try {
      result = await verifyAccountPins(first, second);
    } catch (verificationError) {
      console.error('[account-pin] PIN verification failed:', verificationError);
      submit.disabled = false;
      error.textContent = 'Could not verify your account PINs. Check your connection and try again.';
      return;
    }
    if (store.getState().authEmail !== accountEmail)
      return;
    if (!result.success) {
      submit.disabled = false;
      error.textContent = result.error ?? 'Incorrect PINs. Please try again.';
      return;
    }
    try {
      const unlocked = await finishAccountPinUnlock(first, second, firstRun);
      if (!unlocked) {
        error.textContent = 'Your device vault uses different PINs. Use its PINs to unlock this device or reset the account PINs.';
        return;
      }
    } catch (unlockError) {
      console.error('[account-pin] Local unlock failed:', unlockError);
      error.textContent = 'The account PINs were verified, but this device could not unlock its vault.';
    } finally {
      submit.disabled = false;
    }
  });
}

async function finishAccountPinUnlock(first: string, second: string, firstRun: boolean): Promise<boolean> {
  const unlocked = await store.unlockAccountWithPrimaryPin(first, second);
  if (!unlocked)
    return false;
  const signupDraft = getSignupDraft();
  if (signupDraft) {
    await store.saveProfile(signupDraft);
    clearSignupDraft();
  }
  setCloudBackup(true);
  store.markAccountPinUnlocked();
  store.navigateTo(signupDraft ? 'setup-disguise' : firstRun ? 'setup-profile' : 'app');
  return true;
}

export function renderAccountPinRecovery(root: HTMLElement) {
  const questionIds = store.getState().accountPinQuestionIds;
  const questionText = (id: string) => QUESTIONS.find(([questionId]) => questionId === id)?.[1] ?? 'Security question unavailable';
  if (questionIds.length !== 2) {
    root.innerHTML = `
      <div class="screen setup-screen">
        <h1 class="setup-title">PIN recovery unavailable</h1>
        <p class="setup-body">Your account’s recovery questions could not be loaded. Return to sign-in and try again.</p>
        <button class="btn-primary" id="account-pin-recovery-back" type="button">Back to PIN entry</button>
      </div>`;
    root.querySelector('#account-pin-recovery-back')?.addEventListener('click', () => store.navigateTo('account-pin-login'));
    return;
  }
  root.innerHTML = `
    <div class="screen setup-screen">
      <h1 class="setup-title">Reset account PINs</h1>
      <p class="setup-body">Answer both security questions, then choose new 4-digit PINs. Email verification must have happened recently.</p>
      <form class="setup-form" id="account-pin-recovery-form" autocomplete="off">
        <button class="btn-secondary-outline" id="account-pin-reauth-send" type="button">Send a fresh email verification code</button>
        <label class="field-label" for="account-pin-reauth-code">Email verification code</label>
        <input class="text-input" id="account-pin-reauth-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" />
        <button class="btn-secondary-outline" id="account-pin-reauth-verify" type="button">Verify email code</button>
        <p class="setup-hint" id="account-pin-reauth-status" aria-live="polite"></p>
        <label class="field-label" for="account-pin-answer-one">${questionText(questionIds[0])}</label>
        <input class="text-input" id="account-pin-answer-one" type="password" autocomplete="off" required />
        <label class="field-label" for="account-pin-answer-two">${questionText(questionIds[1])}</label>
        <input class="text-input" id="account-pin-answer-two" type="password" autocomplete="off" required />
        ${pinField('recovery-one', 'New first PIN')}
        ${pinField('recovery-two', 'New second PIN')}
        <p class="setup-hint" id="account-pin-recovery-error" aria-live="polite"></p>
        <button class="btn-primary" id="account-pin-recovery-submit" type="submit">Verify answers and reset PINs</button>
      </form>
      <button class="auth-back-btn" id="account-pin-recovery-back" type="button">Back to PIN entry</button>
      <button class="auth-back-btn" id="account-pin-signout" type="button">Sign out</button>
    </div>`;
  const form = root.querySelector<HTMLFormElement>('#account-pin-recovery-form')!;
  const error = root.querySelector<HTMLElement>('#account-pin-recovery-error')!;
  const submit = root.querySelector<HTMLButtonElement>('#account-pin-recovery-submit')!;
  const reauthStatus = root.querySelector<HTMLElement>('#account-pin-reauth-status')!;
  root.querySelector('#account-pin-recovery-back')?.addEventListener('click', () => store.navigateTo('account-pin-login'));
  root.querySelector('#account-pin-signout')?.addEventListener('click', () => void store.signOut());
  root.querySelector<HTMLButtonElement>('#account-pin-reauth-send')?.addEventListener('click', async event => {
    const button = event.currentTarget as HTMLButtonElement;
    const email = store.getState().authEmail;
    if (!email) {
      reauthStatus.textContent = 'Your sign-in session expired. Sign in again before resetting your PINs.';
      return;
    }
    button.disabled = true;
    const result = await sendEmailAuthOtp(email, 'reauth');
    button.disabled = false;
    reauthStatus.textContent = result.error ?? 'A fresh verification code was sent to your email.';
  });
  root.querySelector<HTMLButtonElement>('#account-pin-reauth-verify')?.addEventListener('click', async event => {
    const button = event.currentTarget as HTMLButtonElement;
    const email = store.getState().authEmail;
    const code = read(root, 'account-pin-reauth-code');
    if (!email || !code.trim()) {
      reauthStatus.textContent = 'Enter the code sent to your email.';
      return;
    }
    button.disabled = true;
    const result = await verifyEmailOtp(email, code);
    button.disabled = false;
    reauthStatus.textContent = result.error ?? 'Email verified. You can now reset your account PINs.';
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const answer1 = read(root, 'account-pin-answer-one');
    const answer2 = read(root, 'account-pin-answer-two');
    const pin1 = read(root, 'pin-recovery-one');
    const confirmPin1 = read(root, 'pin-recovery-one-confirm');
    const pin2 = read(root, 'pin-recovery-two');
    const confirmPin2 = read(root, 'pin-recovery-two-confirm');
    if (!answer1.trim() || !answer2.trim()) {
      error.textContent = 'Both security answers are required.';
      return;
    }
    if (!/^\d{4}$/.test(pin1) || !/^\d{4}$/.test(pin2) ||
        !hasDistinctPinDigits(pin1) || !hasDistinctPinDigits(pin2) || pin1 === pin2) {
      error.textContent = 'Choose two different 4-digit PINs with no repeated digits.';
      return;
    }
    if (pin1 !== confirmPin1 || pin2 !== confirmPin2) {
      error.textContent = 'PIN confirmations do not match.';
      return;
    }
    submit.disabled = true;
    let accountPinUpdated = false;
    try {
      const result = await changeAccountPins({
        answer1,
        answer2,
        newPin1: pin1,
        confirmPin1,
        newPin2: pin2,
        confirmPin2,
      });
      if (!result.success) {
        error.textContent = result.error ?? 'Could not reset the account PINs. Verify your answers and try again.';
        return;
      }
      accountPinUpdated = true;
      await store.changePins(pin1, pin2);
      setCloudBackup(true);
      store.markAccountPinUnlocked();
      store.navigateTo('app');
    } catch (recoveryError) {
      console.error('[account-pin] PIN recovery failed:', recoveryError);
      error.textContent = accountPinUpdated
        ? 'Account PINs were reset, but this device could not update its encrypted vault. Sign in again and use the new PINs.'
        : 'Account PIN recovery failed. If email verification has expired, send and verify a fresh email code, then retry.';
    } finally {
      submit.disabled = false;
    }
  });
}

function pinField(key: string, label: string, confirmation = true, maxLength = 4) {
  const pattern = maxLength === 4 ? '[0-9]{4}' : '[0-9]{4,6}';
  return `<label class="field-label" for="pin-${key}">${label}</label>
    <input class="pin-input" id="pin-${key}" type="password" inputmode="numeric" maxlength="${maxLength}" pattern="${pattern}" autocomplete="new-password" required />
    ${confirmation ? `<label class="field-label" for="pin-${key}-confirm">Confirm ${label.toLowerCase()}</label>
    <input class="pin-input" id="pin-${key}-confirm" type="password" inputmode="numeric" maxlength="${maxLength}" pattern="${pattern}" autocomplete="new-password" required />` : ''}`;
}

function read(root: HTMLElement, id: string) {
  return root.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)?.value ?? '';
}

import { getAccountPinStatus, setupAccountPins, verifyAccountPins } from '../db.js';
import { store } from '../state.js';

const QUESTIONS = [
  ['first-school', 'What was the name of your first school?'],
  ['childhood-street', 'What street did you live on as a child?'],
  ['first-pet', 'What was the name of your first pet?'],
  ['childhood-friend', 'What was the first name of a childhood friend?'],
  ['special-place', 'What is the name of a special place?'],
  ['family-nickname', 'What nickname did your family use for you?'],
] as const;

export async function renderAccountPinGate(root: HTMLElement) {
  root.innerHTML = '<div class="screen setup-screen"><p class="setup-body">Checking account PIN setup…</p></div>';
  try {
    const status = await getAccountPinStatus();
    store.setAccountPinQuestionIds(status.questionIds);
    if (status.configured)
      renderLogin(root, status.lockedUntil);
    else
      renderSetup(root);
  } catch {
    root.innerHTML = `
      <div class="screen setup-screen">
        <h1 class="setup-title">Account PIN service unavailable</h1>
        <p class="setup-body">Your account is signed in, but PIN status could not be checked. Try again when online.</p>
        <button class="btn-primary" id="pin-status-retry" type="button">Retry</button>
        <button class="btn-secondary-outline" id="pin-status-signout" type="button">Sign out</button>
      </div>`;
    root.querySelector('#pin-status-retry')?.addEventListener('click', () => void renderAccountPinGate(root));
    root.querySelector('#pin-status-signout')?.addEventListener('click', () => void store.signOut());
  }
}

function renderSetup(root: HTMLElement) {
  const options = QUESTIONS.map(([id, text]) => `<option value="${id}">${text}</option>`).join('');
  root.innerHTML = `
    <div class="screen setup-screen">
      <h1 class="setup-title">Create your account PINs</h1>
      <p class="setup-body">Choose two different 4–6 digit PINs. Both are required to unlock this account.</p>
      <form class="setup-form" id="account-pin-setup-form" autocomplete="off">
        ${pinField('one', 'First PIN')}
        ${pinField('two', 'Second PIN')}
        <label class="field-label" for="pin-question-one">Security question 1</label>
        <select class="text-input" id="pin-question-one" required><option value="">Choose a question</option>${options}</select>
        <label class="field-label" for="pin-answer-one">Answer 1</label>
        <input class="text-input" id="pin-answer-one" type="password" autocomplete="off" required />
        <label class="field-label" for="pin-question-two">Security question 2</label>
        <select class="text-input" id="pin-question-two" required><option value="">Choose a different question</option>${options}</select>
        <label class="field-label" for="pin-answer-two">Answer 2</label>
        <input class="text-input" id="pin-answer-two" type="password" autocomplete="off" required />
        <p class="setup-hint" id="account-pin-error" aria-live="polite"></p>
        <button class="btn-primary" id="account-pin-submit" type="submit">Save account PINs</button>
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
    const firstConfirm = read(root, 'pin-one-confirm');
    const second = read(root, 'pin-two');
    const secondConfirm = read(root, 'pin-two-confirm');
    const question1 = read(root, 'pin-question-one');
    const question2 = read(root, 'pin-question-two');
    const answer1 = read(root, 'pin-answer-one');
    const answer2 = read(root, 'pin-answer-two');
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
    if (!question1 || question1 === question2) {
      error.textContent = 'Choose two different security questions.';
      return;
    }
    if (!answer1.trim() || !answer2.trim()) {
      error.textContent = 'Both security answers are required.';
      return;
    }
    submit.disabled = true;
    const result = await setupAccountPins({
      pin1: first,
      confirmPin1: firstConfirm,
      pin2: second,
      confirmPin2: secondConfirm,
      question1Id: question1,
      question1Answer: answer1,
      question2Id: question2,
      question2Answer: answer2,
    });
    submit.disabled = false;
    if (!result.success) {
      error.textContent = result.error ?? 'Could not save your PINs. Try again.';
      return;
    }
    store.setAccountPinQuestionIds([question1, question2]);
    try {
      await store.savePin(first, second);
      store.markAccountPinUnlocked();
      store.navigateTo('setup-profile');
    } catch {
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
          ${pinField('one', 'First PIN', false)}
          ${pinField('two', 'Second PIN', false)}
          <p class="auth-error" id="account-pin-login-error" aria-live="polite"></p>
          <button class="btn-primary auth-entry-btn" id="account-pin-login-submit" type="submit">Unlock</button>
        </form>
        <button class="auth-back-btn" id="account-pin-signout" type="button">Sign out</button>
      </section>
    </div>`;
  const form = root.querySelector<HTMLFormElement>('#account-pin-login-form')!;
  const error = root.querySelector<HTMLElement>('#account-pin-login-error')!;
  const submit = root.querySelector<HTMLButtonElement>('#account-pin-login-submit')!;
  root.querySelector('#account-pin-signout')?.addEventListener('click', () => void store.signOut());
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const first = read(root, 'pin-one');
    const second = read(root, 'pin-two');
    if (!/^\d{4,6}$/.test(first) || !/^\d{4,6}$/.test(second)) {
      error.textContent = 'Enter two 4–6 digit PINs.';
      return;
    }
    submit.disabled = true;
    const result = await verifyAccountPins(first, second);
    if (!result.success) {
      submit.disabled = false;
      error.textContent = result.error ?? 'Incorrect PINs. Please try again.';
      return;
    }
    const unlocked = await store.unlockAccountWithPrimaryPin(first, second);
    submit.disabled = false;
    if (!unlocked) {
      error.textContent = 'Your device vault uses a different PIN. Unlock it locally before using account PIN login on this device.';
      return;
    }
    store.markAccountPinUnlocked();
    store.navigateTo('app');
  });
}

function pinField(key: string, label: string, confirmation = true) {
  return `<label class="field-label" for="pin-${key}">${label}</label>
    <input class="pin-input" id="pin-${key}" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{4,6}" autocomplete="new-password" required />
    ${confirmation ? `<label class="field-label" for="pin-${key}-confirm">Confirm ${label.toLowerCase()}</label>
    <input class="pin-input" id="pin-${key}-confirm" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{4,6}" autocomplete="new-password" required />` : ''}`;
}

function read(root: HTMLElement, id: string) {
  return root.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)?.value ?? '';
}

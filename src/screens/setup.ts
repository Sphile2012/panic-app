import { store } from '../state.js';
import { getRecoveryQuestionIds, setRecoveryQuestions, loadPublicSync } from '../storage.js';

const RECOVERY_QUESTIONS = [
  { id: 'first-school',    label: 'What was the name of your first school?' },
  { id: 'childhood-street',label: 'What street did you grow up on?' },
  { id: 'first-pet',       label: 'What was the name of your first pet?' },
  { id: 'childhood-friend', label: 'What was a childhood friend\'s first name?' },
  { id: 'special-place',   label: 'Name a place that is special to you.' },
  { id: 'family-nickname', label: 'What nickname did your family use for you?' },
];

// PIN rules: 4 to 8 digits, any combination
function validatePin(pin: string): string | null {
  if (!/^\d+$/.test(pin))   return 'PIN must contain digits only.';
  if (pin.length < 4)       return 'PIN must be at least 4 digits.';
  if (pin.length > 8)       return 'PIN can be at most 8 digits.';
  return null;
}

export function renderSetupPin(root: HTMLElement) {
  root.innerHTML = `
    <div class="screen setup-screen">
      <div class="setup-logo">○</div>
      <h1 class="setup-title">Set up Panic Ring</h1>
      <p class="setup-body">
        Create two PINs — your secret PIN that opens the real app, and a decoy PIN
        that opens a harmless notes screen if someone forces you to unlock.
        You choose both PINs right now. They can be 4 to 8 digits, any number you like.
      </p>

      <form class="setup-form" id="setup-pin-form" autocomplete="off">

        <label class="field-label" for="pin-input">
          Your secret PIN
          <span class="field-hint">4–8 digits, any combination</span>
        </label>
        <div class="password-wrap">
          <input class="pin-input pin-input--flex" id="pin-input" type="password"
            inputmode="numeric" maxlength="8" placeholder="e.g. 7391 or 48201"
            autocomplete="new-password" required />
          <button type="button" class="pw-toggle" data-for="pin-input">Show</button>
        </div>

        <label class="field-label" for="decoy-input">
          Decoy PIN (opens a fake Notes screen)
          <span class="field-hint">Must be different from your secret PIN</span>
        </label>
        <div class="password-wrap">
          <input class="pin-input pin-input--flex" id="decoy-input" type="password"
            inputmode="numeric" maxlength="8" placeholder="e.g. 1111 or 99999"
            autocomplete="new-password" required />
          <button type="button" class="pw-toggle" data-for="decoy-input">Show</button>
        </div>

        <div class="setup-tip">
          <strong>Tip:</strong> On the calculator disguise screen, type your secret PIN
          then press <strong>=</strong> to unlock. Type your decoy PIN then <strong>=</strong>
          to open the harmless notes screen.
        </div>

        <p class="setup-hint" id="pin-error" aria-live="polite"></p>
        <button class="btn-primary" type="submit">Continue →</button>
      </form>
    </div>
  `;

  // Password show/hide toggles
  root.querySelectorAll<HTMLButtonElement>('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = root.querySelector<HTMLInputElement>(`#${btn.dataset['for']}`)!;
      inp.type = inp.type === 'password' ? 'text' : 'password';
      btn.textContent = inp.type === 'password' ? 'Show' : 'Hide';
    });
  });

  const form      = root.querySelector<HTMLFormElement>('#setup-pin-form')!;
  const pinInput  = root.querySelector<HTMLInputElement>('#pin-input')!;
  const decoyInput = root.querySelector<HTMLInputElement>('#decoy-input')!;
  const errorEl   = root.querySelector<HTMLElement>('#pin-error')!;

  form.addEventListener('submit', async (e: SubmitEvent) => {
    e.preventDefault();
    const pin   = pinInput.value.trim();
    const decoy = decoyInput.value.trim();

    const pinErr   = validatePin(pin);
    const decoyErr = validatePin(decoy);

    if (pinErr)   { errorEl.textContent = 'Secret PIN: ' + pinErr; pinInput.focus(); return; }
    if (decoyErr) { errorEl.textContent = 'Decoy PIN: ' + decoyErr; decoyInput.focus(); return; }
    if (pin === decoy) {
      errorEl.textContent = 'Your secret PIN and decoy PIN must be different.';
      return;
    }

    errorEl.textContent = '';
    await store.savePin(pin, decoy);

    const pub = loadPublicSync();
    store.navigateTo(pub.recoveryQuestionIds ? 'setup-contacts' : 'recovery-setup');
  });
}

export function renderRecoverySetup(root: HTMLElement, nextScreen: string) {
  const currentQuestions = getRecoveryQuestionIds() ?? [];
  const isSettings       = nextScreen === 'settings';
  const options          = RECOVERY_QUESTIONS
    .map(q => `<option value="${q.id}">${q.label}</option>`)
    .join('');

  root.innerHTML = `
    <div class="screen setup-screen">
      ${isSettings ? `
        <header class="screen-header">
          <button class="btn-back-small" id="btn-recovery-back">←</button>
          <h2 class="screen-title">PIN recovery</h2>
        </header>
      ` : ''}

      <h1 class="setup-title">Protect your PIN</h1>
      <p class="setup-body">
        If you ever forget your PIN, you can recover it by answering two security questions.
        Choose questions only you can answer, with distinctive answers at least 8 characters long.
      </p>

      <form class="setup-form" id="recovery-setup-form" autocomplete="off">
        <label class="field-label" for="recovery-question-one">First question</label>
        <select class="text-input" id="recovery-question-one" required>
          <option value="" disabled ${currentQuestions[0] ? '' : 'selected'}>Choose a question</option>
          ${options}
        </select>
        <label class="field-label" for="recovery-answer-one">Your answer</label>
        <input class="text-input" id="recovery-answer-one" type="password"
          minlength="8" placeholder="At least 8 characters" autocomplete="off" required />

        <label class="field-label" for="recovery-question-two">Second question</label>
        <select class="text-input" id="recovery-question-two" required>
          <option value="" disabled ${currentQuestions[1] ? '' : 'selected'}>Choose a different question</option>
          ${options}
        </select>
        <label class="field-label" for="recovery-answer-two">Your answer</label>
        <input class="text-input" id="recovery-answer-two" type="password"
          minlength="8" placeholder="At least 8 characters" autocomplete="off" required />

        <p class="setup-hint" id="recovery-setup-error" aria-live="polite"></p>
        <button class="btn-primary" type="submit">Save recovery questions</button>
        <button type="button" class="btn-secondary-outline" id="btn-skip-recovery">
          Skip for now
        </button>
      </form>
    </div>
  `;

  const q1 = root.querySelector<HTMLSelectElement>('#recovery-question-one')!;
  const q2 = root.querySelector<HTMLSelectElement>('#recovery-question-two')!;
  if (currentQuestions[0]) q1.value = currentQuestions[0];
  if (currentQuestions[1]) q2.value = currentQuestions[1];

  root.querySelector('#btn-recovery-back')?.addEventListener('click', () => store.navigateTo('settings'));
  root.querySelector('#btn-skip-recovery')?.addEventListener('click', () => store.navigateTo(nextScreen));

  const form    = root.querySelector<HTMLFormElement>('#recovery-setup-form')!;
  const a1      = root.querySelector<HTMLInputElement>('#recovery-answer-one')!;
  const a2      = root.querySelector<HTMLInputElement>('#recovery-answer-two')!;
  const errEl   = root.querySelector<HTMLElement>('#recovery-setup-error')!;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (q1.value === q2.value)          { errEl.textContent = 'Choose two different questions.'; return; }
    if (a1.value.trim().length < 8 ||
        a2.value.trim().length < 8)     { errEl.textContent = 'Each answer must be at least 8 characters.'; return; }
    try {
      await setRecoveryQuestions(
        store.getState().pinHash,
        [q1.value, q2.value],
        [a1.value, a2.value],
      );
      store.markRecoveryConfigured();
      store.navigateTo(nextScreen);
    } catch {
      errEl.textContent = 'Could not save recovery questions. Try again.';
    }
  });
}

export function renderPinRecovery(root: HTMLElement) {
  const questionIds = getRecoveryQuestionIds();

  if (!questionIds) {
    root.innerHTML = `
      <div class="screen setup-screen">
        <h1 class="setup-title">PIN recovery not available</h1>
        <p class="setup-body">
          Recovery questions were not set up on this device.
          You can set them up in Settings after unlocking with your PIN.
        </p>
        <button class="btn-primary" id="btn-cancel">Back to calculator</button>
      </div>`;
    root.querySelector('#btn-cancel')!.addEventListener('click', () => store.navigateTo('calculator'));
    return;
  }

  const label = (id: string) =>
    RECOVERY_QUESTIONS.find(q => q.id === id)?.label ?? 'Recovery question';

  root.innerHTML = `
    <div class="screen setup-screen">
      <header class="screen-header">
        <button class="btn-back-small" id="btn-cancel">←</button>
        <h2 class="screen-title">Recover PINs</h2>
      </header>
      <p class="setup-body">
        Answer both security questions to recover your data and set new PINs.
        Your new PINs can be 4–8 digits.
      </p>

      <form class="setup-form" id="pin-recovery-form" autocomplete="off">
        <label class="field-label" for="ra1">${label(questionIds[0]!)}</label>
        <input class="text-input" id="ra1" type="password" autocomplete="off" required />

        <label class="field-label" for="ra2">${label(questionIds[1]!)}</label>
        <input class="text-input" id="ra2" type="password" autocomplete="off" required />

        <label class="field-label" for="new-pin">
          New secret PIN
          <span class="field-hint">4–8 digits</span>
        </label>
        <div class="password-wrap">
          <input class="pin-input pin-input--flex" id="new-pin" type="password"
            inputmode="numeric" maxlength="8" placeholder="4–8 digits" autocomplete="new-password" required />
          <button type="button" class="pw-toggle" data-for="new-pin">Show</button>
        </div>

        <label class="field-label" for="new-decoy">
          New decoy PIN
          <span class="field-hint">Must be different</span>
        </label>
        <div class="password-wrap">
          <input class="pin-input pin-input--flex" id="new-decoy" type="password"
            inputmode="numeric" maxlength="8" placeholder="4–8 digits" autocomplete="new-password" required />
          <button type="button" class="pw-toggle" data-for="new-decoy">Show</button>
        </div>

        <p class="setup-hint" id="recovery-error" aria-live="polite"></p>
        <button class="btn-primary" type="submit">Recover and set new PINs</button>
      </form>
    </div>
  `;

  root.querySelector('#btn-cancel')!.addEventListener('click', () => store.navigateTo('calculator'));

  root.querySelectorAll<HTMLButtonElement>('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = root.querySelector<HTMLInputElement>(`#${btn.dataset['for']}`)!;
      inp.type = inp.type === 'password' ? 'text' : 'password';
      btn.textContent = inp.type === 'password' ? 'Show' : 'Hide';
    });
  });

  const form   = root.querySelector<HTMLFormElement>('#pin-recovery-form')!;
  const a1     = root.querySelector<HTMLInputElement>('#ra1')!;
  const a2     = root.querySelector<HTMLInputElement>('#ra2')!;
  const newPin = root.querySelector<HTMLInputElement>('#new-pin')!;
  const newDec = root.querySelector<HTMLInputElement>('#new-decoy')!;
  const errEl  = root.querySelector<HTMLElement>('#recovery-error')!;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const pin   = newPin.value.trim();
    const decoy = newDec.value.trim();
    const pinErr   = validatePin(pin);
    const decoyErr = validatePin(decoy);
    if (pinErr)   { errEl.textContent = 'New PIN: ' + pinErr; return; }
    if (decoyErr) { errEl.textContent = 'Decoy PIN: ' + decoyErr; return; }
    if (pin === decoy) { errEl.textContent = 'PINs must be different.'; return; }

    const ok = await store.recoverPins([a1.value, a2.value], pin, decoy);
    if (!ok) errEl.textContent = 'Answers did not match. Check your spelling and try again.';
  });
}

export function renderSetupContacts(root: HTMLElement) {
  const { contacts, authEmail } = store.getState();

  root.innerHTML = `
    <div class="screen setup-screen">
      <h2 class="setup-title">Add trusted contacts</h2>
      <p class="setup-body">
        These people will receive an SMS alert when you activate the app.
        ${authEmail
          ? 'Add at least one person you trust completely.'
          : 'Sign in to add contacts, or continue and add them later.'}
      </p>

      ${authEmail ? `
        <ul class="contact-list" id="setup-contact-list">
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
        </ul>

        <form class="setup-form" id="add-contact-form" autocomplete="off">
          <label class="field-label" for="contact-name">Name</label>
          <input class="text-input" id="contact-name" type="text"
            placeholder="Full name" autocomplete="off" required />
          <label class="field-label" for="contact-phone">Phone number</label>
          <input class="text-input" id="contact-phone" type="tel"
            placeholder="+27 82 123 4567" autocomplete="off" required />
          <p class="setup-hint" id="contact-error" aria-live="polite"></p>
          <button class="btn-secondary-outline" type="submit">Add contact</button>
        </form>
      ` : `
        <div class="settings-auth-buttons">
          <button class="btn-primary"          id="btn-contact-signup">Create account</button>
          <button class="btn-secondary-outline" id="btn-contact-login">Sign in</button>
        </div>
      `}

      <button class="btn-primary" id="btn-setup-done"
        ${authEmail && contacts.length === 0 ? 'disabled' : ''}>
        ${authEmail ? 'Done — open app' : 'Continue without contacts'}
      </button>
      ${authEmail && contacts.length === 0
        ? '<p class="setup-hint">Add at least one contact to continue.</p>'
        : ''}
    </div>
  `;

  root.querySelector('#setup-contact-list')?.addEventListener('click', (e: MouseEvent) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('.contact-delete');
    if (!btn?.dataset['id']) return;
    store.deleteContact(btn.dataset['id']);
    store.navigateTo('setup-contacts');
  });

  root.querySelector('#btn-contact-signup')?.addEventListener('click', () => store.navigateTo('signup'));
  root.querySelector('#btn-contact-login')?.addEventListener('click',  () => store.navigateTo('login'));

  const addForm = root.querySelector<HTMLFormElement>('#add-contact-form');
  if (addForm) {
    const nameEl  = root.querySelector<HTMLInputElement>('#contact-name')!;
    const phoneEl = root.querySelector<HTMLInputElement>('#contact-phone')!;
    const errEl   = root.querySelector<HTMLElement>('#contact-error')!;
    addForm.addEventListener('submit', (e: SubmitEvent) => {
      e.preventDefault();
      const name  = nameEl.value.trim();
      const phone = phoneEl.value.trim();
      if (!name)  { errEl.textContent = 'Enter a name.'; return; }
      if (!phone) { errEl.textContent = 'Enter a phone number.'; return; }
      errEl.textContent = '';
      if (!store.addContact(name, phone)) { store.navigateTo('signup'); return; }
      store.navigateTo('setup-contacts');
    });
  }

  root.querySelector('#btn-setup-done')!.addEventListener('click', () => {
    if (!store.getState().authEmail || store.getState().contacts.length > 0) {
      store.navigateTo('app');
    }
  });
}

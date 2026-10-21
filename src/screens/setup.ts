import { store } from '../state.js';
import { getRecoveryQuestionIds, setRecoveryQuestions } from '../storage.js';

const RECOVERY_QUESTIONS = [
  { id: 'first-school', label: 'What was the name of your first school?' },
  { id: 'childhood-street', label: 'What street did you live on as a child?' },
  { id: 'first-pet', label: 'What was the name of your first pet?' },
  { id: 'childhood-friend', label: 'What was the first name of a childhood friend?' },
  { id: 'special-place', label: 'What is the name of a place that is special to you?' },
  { id: 'family-nickname', label: 'What nickname did your family use for you?' },
];

export function renderSetupPin(root: HTMLElement) {
    root.innerHTML = `
    <div class="screen setup-screen">
      <div class="setup-logo">○</div>
      <h1 class="setup-title">Set up Panic Ring</h1>
      <p class="setup-body">
        Choose a 4-digit PIN to unlock the app, and a separate decoy PIN
        that opens a plain Notes screen if someone forces you to unlock.
      </p>

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
        store.navigateTo('recovery-setup');
    });
}

export function renderRecoverySetup(root: HTMLElement, nextScreen: string) {
    const currentQuestions = getRecoveryQuestionIds() ?? [];
    const existing = nextScreen === 'settings';
    const options = RECOVERY_QUESTIONS.map(question =>
        `<option value="${question.id}">${question.label}</option>`).join('');
    root.innerHTML = `
    <div class="screen setup-screen">
      ${existing ? '<header class="screen-header"><button class="btn-back-small" id="btn-recovery-back" aria-label="Back">←</button><h2 class="screen-title">PIN recovery</h2></header>' : ''}
      <h1 class="setup-title">${existing ? 'Set recovery questions' : 'Protect your PIN'}</h1>
      <p class="setup-body">
        Choose two questions and distinctive private answers. You will need both to restore your encrypted data and set new PINs. Answers are case-insensitive and spaces are normalized; anyone who guesses both could recover your data.
      </p>
      <form class="setup-form" id="recovery-setup-form" autocomplete="off">
        <label class="field-label" for="recovery-question-one">First question</label>
        <select class="text-input" id="recovery-question-one" required>
          <option value="" disabled ${currentQuestions[0] ? '' : 'selected'}>Choose a question</option>
          ${options}
        </select>
        <label class="field-label" for="recovery-answer-one">Answer</label>
        <input class="text-input" id="recovery-answer-one" type="password" minlength="8" autocomplete="off" required />
        <label class="field-label" for="recovery-question-two">Second question</label>
        <select class="text-input" id="recovery-question-two" required>
          <option value="" disabled ${currentQuestions[1] ? '' : 'selected'}>Choose a different question</option>
          ${options}
        </select>
        <label class="field-label" for="recovery-answer-two">Answer</label>
        <input class="text-input" id="recovery-answer-two" type="password" minlength="8" autocomplete="off" required />
        <p class="setup-hint" id="recovery-setup-error" aria-live="polite"></p>
        <button class="btn-primary" type="submit">Save recovery questions</button>
      </form>
    </div>
  `;
    const questionOne = root.querySelector('#recovery-question-one') as HTMLSelectElement;
    const questionTwo = root.querySelector('#recovery-question-two') as HTMLSelectElement;
    if (currentQuestions[0]) questionOne.value = currentQuestions[0];
    if (currentQuestions[1]) questionTwo.value = currentQuestions[1];
    root.querySelector('#btn-recovery-back')?.addEventListener('click', () => store.navigateTo('settings'));
    const form = root.querySelector('#recovery-setup-form') as HTMLFormElement;
    const answerOne = root.querySelector('#recovery-answer-one') as HTMLInputElement;
    const answerTwo = root.querySelector('#recovery-answer-two') as HTMLInputElement;
    const error = root.querySelector('#recovery-setup-error') as HTMLElement;
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (questionOne.value === questionTwo.value) {
            error.textContent = 'Choose two different questions.';
            return;
        }
        if (answerOne.value.trim().length < 8 || answerTwo.value.trim().length < 8) {
            error.textContent = 'Each answer must be at least 8 characters.';
            return;
        }
        try {
            await setRecoveryQuestions(store.getState().pinHash, [questionOne.value, questionTwo.value], [answerOne.value, answerTwo.value]);
          store.markRecoveryConfigured();
            store.navigateTo(nextScreen);
        }
        catch {
            error.textContent = 'Recovery questions could not be saved. Try again.';
        }
    });
}

export function renderPinRecovery(root: HTMLElement) {
    const questionIds = getRecoveryQuestionIds();
    if (!questionIds) {
        root.innerHTML = `
      <div class="screen setup-screen">
        <h1 class="setup-title">PIN recovery unavailable</h1>
        <p class="setup-body">Recovery questions were not set up on this device.</p>
        <button class="btn-primary" id="btn-recovery-cancel" type="button">Back to calculator</button>
      </div>
    `;
        root.querySelector('#btn-recovery-cancel').addEventListener('click', () => store.navigateTo('calculator'));
        return;
    }
    const questionText = (id: string) => RECOVERY_QUESTIONS.find(question => question.id === id)?.label ?? 'Recovery question unavailable';
    root.innerHTML = `
    <div class="screen setup-screen">
      <header class="screen-header">
        <button class="btn-back-small" id="btn-recovery-cancel" aria-label="Back to calculator">←</button>
        <h2 class="screen-title">Recover PINs</h2>
      </header>
      <p class="setup-body">Answer both security questions, then choose a new secret PIN and decoy PIN here in the app. Your encrypted data will be restored when the answers are correct.</p>
      <form class="setup-form" id="pin-recovery-form" autocomplete="off">
        <label class="field-label" for="recovery-answer-one">${questionText(questionIds[0])}</label>
        <input class="text-input" id="recovery-answer-one" type="password" autocomplete="off" required />
        <label class="field-label" for="recovery-answer-two">${questionText(questionIds[1])}</label>
        <input class="text-input" id="recovery-answer-two" type="password" autocomplete="off" required />
        <label class="field-label" for="recovery-new-pin">New secret PIN</label>
        <input class="pin-input" id="recovery-new-pin" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="4 digits" autocomplete="new-password" required />
        <label class="field-label" for="recovery-new-decoy">New decoy PIN</label>
        <input class="pin-input" id="recovery-new-decoy" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="4 digits" autocomplete="new-password" required />
        <p class="setup-hint" id="pin-recovery-error" aria-live="polite"></p>
        <button class="btn-primary" type="submit">Verify answers and change PINs</button>
      </form>
    </div>
  `;
    root.querySelector('#btn-recovery-cancel').addEventListener('click', () => store.navigateTo('calculator'));
    const form = root.querySelector('#pin-recovery-form') as HTMLFormElement;
    const answers = [
        root.querySelector('#recovery-answer-one') as HTMLInputElement,
        root.querySelector('#recovery-answer-two') as HTMLInputElement,
    ];
    const newPin = root.querySelector('#recovery-new-pin') as HTMLInputElement;
    const newDecoy = root.querySelector('#recovery-new-decoy') as HTMLInputElement;
    const error = root.querySelector('#pin-recovery-error') as HTMLElement;
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const pin = newPin.value.trim();
        const decoy = newDecoy.value.trim();
        if (!/^\d{4}$/.test(pin) || !/^\d{4}$/.test(decoy) || pin === decoy) {
            error.textContent = 'Enter two different 4-digit PINs.';
            return;
        }
        const recovered = await store.recoverPins(answers.map(answer => answer.value), pin, decoy);
        if (!recovered)
            error.textContent = 'Answers did not match or recovery data is unavailable.';
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

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
      <h1 class="setup-title">Create your PINs</h1>
      <p class="setup-body">
        Create two 4-digit PINs to secure your app:
        <br>• A secret PIN to unlock the real app
        <br>• A decoy PIN that opens a fake Notes screen
      </p>

      <form class="setup-form" id="setup-pin-form" autocomplete="off">

        <label class="field-label" for="pin-input">Secret PIN (4 digits)</label>
        <input
          class="pin-input"
          id="pin-input"
          type="password"
          inputmode="numeric"
          maxlength="4"
          pattern="[0-9]{4}"
          placeholder="Enter 4 digits"
          autocomplete="new-password"
          required />

        <label class="field-label" for="pin-confirm">Confirm secret PIN</label>
        <input
          class="pin-input"
          id="pin-confirm"
          type="password"
          inputmode="numeric"
          maxlength="4"
          pattern="[0-9]{4}"
          placeholder="Re-enter your secret PIN"
          autocomplete="new-password"
          required />

        <label class="field-label" for="decoy-input">Decoy PIN (4 digits, must be different)</label>
        <input
          class="pin-input"
          id="decoy-input"
          type="password"
          inputmode="numeric"
          maxlength="4"
          pattern="[0-9]{4}"
          placeholder="Enter different 4 digits"
          autocomplete="new-password"
          required />

        <label class="field-label" for="decoy-confirm">Confirm decoy PIN</label>
        <input
          class="pin-input"
          id="decoy-confirm"
          type="password"
          inputmode="numeric"
          maxlength="4"
          pattern="[0-9]{4}"
          placeholder="Re-enter your decoy PIN"
          autocomplete="new-password"
          required />

        <p class="setup-hint" id="pin-error" aria-live="polite"></p>

        <button class="btn-primary" type="submit">Continue →</button>
      </form>
    </div>
  `;
    const form = root.querySelector('#setup-pin-form') as HTMLFormElement;
    const pinInput = root.querySelector('#pin-input') as HTMLInputElement;
    const pinConfirm = root.querySelector('#pin-confirm') as HTMLInputElement;
    const decoyInput = root.querySelector('#decoy-input') as HTMLInputElement;
    const decoyConfirm = root.querySelector('#decoy-confirm') as HTMLInputElement;
    const errorEl = root.querySelector('#pin-error') as HTMLElement;
    form.addEventListener('submit', async (e: SubmitEvent) => {
        e.preventDefault();
        const pin = pinInput.value.trim();
        const pinConf = pinConfirm.value.trim();
        const decoy = decoyInput.value.trim();
        const decoyConf = decoyConfirm.value.trim();
        
        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            errorEl.textContent = 'Secret PIN must be exactly 4 digits.';
            return;
        }
        if (pin !== pinConf) {
            errorEl.textContent = 'Secret PINs do not match. Please try again.';
            return;
        }
        if (decoy.length !== 4 || !/^\d{4}$/.test(decoy)) {
            errorEl.textContent = 'Decoy PIN must be exactly 4 digits.';
            return;
        }
        if (decoy !== decoyConf) {
            errorEl.textContent = 'Decoy PINs do not match. Please try again.';
            return;
        }
        if (pin === decoy) {
            errorEl.textContent = 'Secret PIN and decoy PIN must be different.';
            return;
        }
        errorEl.textContent = '';
        await store.savePin(pin, decoy);
        store.navigateTo('setup-profile');
    });
}

export function renderSetupProfile(root: HTMLElement) {
    const currentProfile = store.getState().profile;
    root.innerHTML = `
    <div class="screen setup-screen">
      <div class="setup-logo">○</div>
      <h1 class="setup-title">Update your profile</h1>
      <p class="setup-body">
        Add your name and phone number. This information will be included in emergency alerts to your contacts.
      </p>

      <form class="setup-form" id="setup-profile-form" autocomplete="on">

        <label class="field-label" for="profile-name">Your full name</label>
        <input
          class="text-input"
          id="profile-name"
          type="text"
          placeholder="Enter your full name"
          autocomplete="name"
          value="${currentProfile.name}"
          required />

        <label class="field-label" for="profile-phone">Your phone number</label>
        <input
          class="text-input"
          id="profile-phone"
          type="tel"
          placeholder="+27 82 123 4567"
          autocomplete="tel"
          value="${currentProfile.phone}"
          required />

        <p class="setup-hint" id="profile-error" aria-live="polite"></p>

        <button class="btn-primary" type="submit">Continue →</button>
      </form>
    </div>
  `;
    const form = root.querySelector('#setup-profile-form') as HTMLFormElement;
    const nameInput = root.querySelector('#profile-name') as HTMLInputElement;
    const phoneInput = root.querySelector('#profile-phone') as HTMLInputElement;
    const errorEl = root.querySelector('#profile-error') as HTMLElement;
    
    form.addEventListener('submit', (e: SubmitEvent) => {
        e.preventDefault();
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        
        if (!name) {
            errorEl.textContent = 'Please enter your full name.';
            return;
        }
        if (!phone) {
            errorEl.textContent = 'Please enter your phone number.';
            return;
        }
        
        errorEl.textContent = '';
        store.saveProfile({ name, phone, photo: currentProfile.photo });
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
      <h1 class="setup-title">${existing ? 'Update recovery questions' : 'Create your recovery questions'}</h1>
      <p class="setup-body">
        ${existing 
          ? 'Choose two questions and provide answers. You will need both to reset your PINs if you forget them.'
          : 'Choose 2 security questions to recover your PINs if you forget them. You will need both correct answers to reset your PINs later.'}
      </p>
      <form class="setup-form" id="recovery-setup-form" autocomplete="off">
        <label class="field-label" for="recovery-question-one">Security question 1</label>
        <select class="text-input" id="recovery-question-one" required>
          <option value="" disabled ${currentQuestions[0] ? '' : 'selected'}>Choose a question</option>
          ${options}
        </select>
        <label class="field-label" for="recovery-answer-one">Your answer (min 8 characters)</label>
        <input class="text-input" id="recovery-answer-one" type="password" minlength="8" placeholder="Enter a memorable answer" autocomplete="off" required />
        
        <label class="field-label" for="recovery-question-two">Security question 2</label>
        <select class="text-input" id="recovery-question-two" required>
          <option value="" disabled ${currentQuestions[1] ? '' : 'selected'}>Choose a different question</option>
          ${options}
        </select>
        <label class="field-label" for="recovery-answer-two">Your answer (min 8 characters)</label>
        <input class="text-input" id="recovery-answer-two" type="password" minlength="8" placeholder="Enter a memorable answer" autocomplete="off" required />
        
        <p class="setup-hint" id="recovery-setup-error" aria-live="polite"></p>
        <button class="btn-primary" type="submit">${existing ? 'Save security questions' : 'Continue to contacts →'}</button>
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
            error.textContent = 'You must choose two different questions.';
            return;
        }
        if (answerOne.value.trim().length < 8 || answerTwo.value.trim().length < 8) {
            error.textContent = 'Each answer must be at least 8 characters long.';
            return;
        }
        try {
            await setRecoveryQuestions(store.getState().pinHash, [questionOne.value, questionTwo.value], [answerOne.value, answerTwo.value]);
          store.markRecoveryConfigured();
            store.navigateTo(nextScreen);
        }
        catch {
            error.textContent = 'Security questions could not be saved. Please try again.';
        }
    });
}

export function renderPinRecovery(root: HTMLElement) {
    const questionIds = getRecoveryQuestionIds();
    if (!questionIds) {
        root.innerHTML = `
      <div class="screen setup-screen">
        <h1 class="setup-title">Cannot recover PIN</h1>
        <p class="setup-body">Security questions were not set up on this device. You cannot recover your PIN without them.</p>
        <button class="btn-primary" id="btn-recovery-cancel" type="button">Back to calculator</button>
      </div>
    `;
        root.querySelector('#btn-recovery-cancel').addEventListener('click', () => store.navigateTo('calculator'));
        return;
    }
    const questionText = (id: string) => RECOVERY_QUESTIONS.find(question => question.id === id)?.label ?? 'Security question unavailable';
    root.innerHTML = `
    <div class="screen setup-screen">
      <header class="screen-header">
        <button class="btn-back-small" id="btn-recovery-cancel" aria-label="Back to calculator">←</button>
        <h2 class="screen-title">Recover your PINs</h2>
      </header>
      <p class="setup-body">Answer both security questions correctly, then create new PINs. Your encrypted data will be restored when both answers are correct.</p>
      <form class="setup-form" id="pin-recovery-form" autocomplete="off">
        <label class="field-label" for="recovery-answer-one">${questionText(questionIds[0])}</label>
        <input class="text-input" id="recovery-answer-one" type="password" placeholder="Enter your answer" autocomplete="off" required />
        
        <label class="field-label" for="recovery-answer-two">${questionText(questionIds[1])}</label>
        <input class="text-input" id="recovery-answer-two" type="password" placeholder="Enter your answer" autocomplete="off" required />
        
        <label class="field-label" for="recovery-new-pin">New secret PIN (4 digits)</label>
        <input class="pin-input" id="recovery-new-pin" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="Enter 4 digits" autocomplete="new-password" required />
        
        <label class="field-label" for="recovery-new-decoy">New decoy PIN (4 digits, must be different)</label>
        <input class="pin-input" id="recovery-new-decoy" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="Enter different 4 digits" autocomplete="new-password" required />
        
        <p class="setup-hint" id="pin-recovery-error" aria-live="polite"></p>
        <button class="btn-primary" type="submit">Verify and reset PINs</button>
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
        if (!/^\d{4}$/.test(pin)) {
            error.textContent = 'Secret PIN must be exactly 4 digits.';
            return;
        }
        if (!/^\d{4}$/.test(decoy)) {
            error.textContent = 'Decoy PIN must be exactly 4 digits.';
            return;
        }
        if (pin === decoy) {
            error.textContent = 'Secret PIN and decoy PIN must be different.';
            return;
        }
        const recovered = await store.recoverPins(answers.map(answer => answer.value), pin, decoy);
        if (!recovered)
            error.textContent = 'Your answers are incorrect. Please check your answers and try again.';
    });
}

export function renderSetupContacts(root) {
    const { contacts } = store.getState();
    root.innerHTML = `
    <div class="screen setup-screen">
      <h2 class="setup-title">Add trusted contacts</h2>
      <p class="setup-body">
        Add people who will receive SMS alerts when you activate the panic button. You can add more contacts later from settings.
      </p>

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
        <label class="field-label" for="contact-name">Contact name</label>
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
      </form>

      <button
        class="btn-primary"
        id="btn-setup-done"
        ${contacts.length === 0 ? 'disabled' : ''}>
        ${contacts.length > 0 ? 'Done — start using app' : 'Add at least one contact'}
      </button>
      ${contacts.length === 0
        ? '<p class="setup-hint">You must add at least one trusted contact to continue.</p>'
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
          errEl.textContent = 'Please enter a contact name.';
          return;
        }
        if (!phone) {
          errEl.textContent = 'Please enter a phone number.';
          return;
        }
        errEl.textContent = '';
        store.addContact(name, phone);
        store.navigateTo('setup-contacts');
      });
    }
    root.querySelector('#btn-setup-done').addEventListener('click', () => {
      if (store.getState().contacts.length > 0) {
            store.navigateTo('app');
        }
    });
}

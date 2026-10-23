import { store } from '../state.js';
import { getRecoveryQuestionIds, setRecoveryQuestions, setCloudBackup, hasCloudBackup } from '../storage.js';
import { setupPinsInCloud, DB_CONFIGURED, getUser, changePinsInCloud } from '../db.js';
import { DISGUISE_OPTIONS, loadAppearance, saveAppearance, applyAppearance } from '../theme.js';
const RECOVERY_QUESTIONS = [
    { id: 'first-school', label: 'What was the name of your first school?' },
    { id: 'childhood-street', label: 'What street did you live on as a child?' },
    { id: 'first-pet', label: 'What was the name of your first pet?' },
    { id: 'childhood-friend', label: 'What was the first name of a childhood friend?' },
    { id: 'special-place', label: 'What is the name of a place that is special to you?' },
    { id: 'family-nickname', label: 'What nickname did your family use for you?' },
];
export function renderSetupPin(root) {
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
    const form = root.querySelector('#setup-pin-form');
    const pinInput = root.querySelector('#pin-input');
    const pinConfirm = root.querySelector('#pin-confirm');
    const decoyInput = root.querySelector('#decoy-input');
    const decoyConfirm = root.querySelector('#decoy-confirm');
    const errorEl = root.querySelector('#pin-error');
    form.addEventListener('submit', async (e) => {
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
        // Store PINs temporarily for cloud backup after security questions
        sessionStorage.setItem('temp_pin1', pin);
        sessionStorage.setItem('temp_pin2', decoy);
        await store.savePin(pin, decoy);
        store.navigateTo('setup-disguise');
    });
}
export function renderSetupDisguise(root) {
    const currentAppearance = loadAppearance();
    root.innerHTML = `
    <div class="screen setup-screen">
      <div class="setup-logo">○</div>
      <h1 class="setup-title">Choose your disguise</h1>
      <p class="setup-body">
        Select how the app should appear when locked. This disguise helps protect your privacy.
      </p>

      <form class="setup-form" id="setup-disguise-form">
        <div class="disguise-options">
          ${DISGUISE_OPTIONS.map(option => `
            <label class="disguise-option ${currentAppearance.disguise === option.id ? 'disguise-option--selected' : ''}">
              <input type="radio" name="disguise" value="${option.id}" ${currentAppearance.disguise === option.id ? 'checked' : ''} />
              <div class="disguise-option-preview">${option.preview}</div>
              <div class="disguise-option-label">${option.label}</div>
              <div class="disguise-option-desc">${option.description}</div>
            </label>
          `).join('')}
        </div>

        <button class="btn-primary" type="submit">Continue →</button>
      </form>
    </div>
  `;
    const form = root.querySelector('#setup-disguise-form');
    const options = root.querySelectorAll('.disguise-option');
    // Handle option selection visual feedback
    options.forEach(option => {
        option.addEventListener('click', () => {
            options.forEach(opt => opt.classList.remove('disguise-option--selected'));
            option.classList.add('disguise-option--selected');
        });
    });
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const selected = form.querySelector('input[name="disguise"]:checked');
        if (selected) {
            const appearance = loadAppearance();
            appearance.disguise = selected.value;
            saveAppearance(appearance);
            applyAppearance(appearance);
        }
        store.navigateTo('setup-profile');
    });
}
export function renderSetupProfile(root) {
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
    const form = root.querySelector('#setup-profile-form');
    const nameInput = root.querySelector('#profile-name');
    const phoneInput = root.querySelector('#profile-phone');
    const errorEl = root.querySelector('#profile-error');
    form.addEventListener('submit', (e) => {
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
export function renderRecoverySetup(root, nextScreen) {
    const currentQuestions = getRecoveryQuestionIds() ?? [];
    const existing = nextScreen === 'settings';
    const options = RECOVERY_QUESTIONS.map(question => `<option value="${question.id}">${question.label}</option>`).join('');
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
        <label class="field-label" for="recovery-answer-one">Your answer</label>
        <input class="text-input" id="recovery-answer-one" type="password" placeholder="Enter a memorable answer" autocomplete="off" required />
        
        <label class="field-label" for="recovery-question-two">Security question 2</label>
        <select class="text-input" id="recovery-question-two" required>
          <option value="" disabled ${currentQuestions[1] ? '' : 'selected'}>Choose a different question</option>
          ${options}
        </select>
        <label class="field-label" for="recovery-answer-two">Your answer</label>
        <input class="text-input" id="recovery-answer-two" type="password" placeholder="Enter a memorable answer" autocomplete="off" required />
        
        <p class="setup-hint" id="recovery-setup-error" aria-live="polite"></p>
        <button class="btn-primary" type="submit">${existing ? 'Save security questions' : 'Continue to contacts →'}</button>
      </form>
    </div>
  `;
    const questionOne = root.querySelector('#recovery-question-one');
    const questionTwo = root.querySelector('#recovery-question-two');
    if (currentQuestions[0])
        questionOne.value = currentQuestions[0];
    if (currentQuestions[1])
        questionTwo.value = currentQuestions[1];
    root.querySelector('#btn-recovery-back')?.addEventListener('click', () => store.navigateTo('settings'));
    const form = root.querySelector('#recovery-setup-form');
    const answerOne = root.querySelector('#recovery-answer-one');
    const answerTwo = root.querySelector('#recovery-answer-two');
    const error = root.querySelector('#recovery-setup-error');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (questionOne.value === questionTwo.value) {
            error.textContent = 'You must choose two different questions.';
            return;
        }
        if (!answerOne.value.trim() || !answerTwo.value.trim()) {
            error.textContent = 'Both security answers are required.';
            return;
        }
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        try {
            // Save security questions locally
            await setRecoveryQuestions(store.getState().pinHash, [questionOne.value, questionTwo.value], [answerOne.value, answerTwo.value]);
            store.markRecoveryConfigured();
            // Attempt cloud backup if user is authenticated
            if (DB_CONFIGURED && !existing) {
                const user = await getUser();
                if (user) {
                    const pin1 = sessionStorage.getItem('temp_pin1');
                    const pin2 = sessionStorage.getItem('temp_pin2');
                    if (pin1 && pin2) {
                        const { error: cloudError } = await setupPinsInCloud(pin1, pin2, questionOne.value, answerOne.value, questionTwo.value, answerTwo.value);
                        if (!cloudError) {
                            setCloudBackup(true);
                            console.log('[setup] Cloud backup enabled');
                        }
                        else {
                            console.warn('[setup] Cloud backup failed:', cloudError);
                        }
                        // Clear temporary PIN storage
                        sessionStorage.removeItem('temp_pin1');
                        sessionStorage.removeItem('temp_pin2');
                    }
                }
            }
            store.navigateTo(nextScreen);
        }
        catch (err) {
            error.textContent = 'Security questions could not be saved. Please try again.';
            console.error('[recovery-setup] Error:', err);
        }
        finally {
            submitBtn.disabled = false;
            submitBtn.textContent = existing ? 'Save security questions' : 'Continue to contacts →';
        }
    });
}
export function renderPinRecovery(root) {
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
    const questionText = (id) => RECOVERY_QUESTIONS.find(question => question.id === id)?.label ?? 'Security question unavailable';
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
    const form = root.querySelector('#pin-recovery-form');
    const answers = [
        root.querySelector('#recovery-answer-one'),
        root.querySelector('#recovery-answer-two'),
    ];
    const newPin = root.querySelector('#recovery-new-pin');
    const newDecoy = root.querySelector('#recovery-new-decoy');
    const error = root.querySelector('#pin-recovery-error');
    form.addEventListener('submit', async (event) => {
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
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';
        error.textContent = '';
        try {
            // Attempt cloud PIN change if cloud backup is enabled
            if (hasCloudBackup() && DB_CONFIGURED) {
                const user = await getUser();
                if (user) {
                    const { error: cloudError } = await changePinsInCloud(answers[0].value, answers[1].value, pin, decoy);
                    if (cloudError) {
                        error.textContent = cloudError;
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Verify and reset PINs';
                        return;
                    }
                }
            }
            // Recover local PINs
            const recovered = await store.recoverPins(answers.map(answer => answer.value), pin, decoy);
            if (!recovered) {
                error.textContent = 'Your answers are incorrect. Please check your answers and try again.';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Verify and reset PINs';
            }
        }
        catch (err) {
            error.textContent = 'Failed to reset PINs. Please try again.';
            console.error('[pin-recovery] Error:', err);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Verify and reset PINs';
        }
    });
}
export function renderSetupContacts(root) {
    const { contacts } = store.getState();
    root.innerHTML = `
    <div class="screen setup-screen setup-contacts-modern">
      <h2 class="setup-title">Add trusted contacts</h2>
      <p class="setup-body">
        Add people who will receive SMS alerts when you activate the panic button. You can add more contacts later from settings.
      </p>

      <ul class="contact-list contact-list-modern" id="setup-contact-list">
        ${contacts.map(c => `
          <li class="contact-item contact-item-modern">
            <div class="contact-avatar-wrapper">
              ${c.photo ? `<img src="${c.photo}" alt="${c.name}" class="contact-avatar-img" />` : `<div class="contact-avatar">${c.initials}</div>`}
            </div>
            <div class="contact-info">
              <span class="contact-name">${c.name}</span>
              ${c.relationship ? `<span class="contact-relationship">${c.relationship}</span>` : ''}
              <span class="contact-phone">${c.phone}</span>
            </div>
            <button class="contact-delete" data-id="${c.id}" aria-label="Remove ${c.name}">✕</button>
          </li>
        `).join('')}
      </ul>

      <form class="setup-form setup-form-modern" id="add-contact-form" autocomplete="off">
        <div class="contact-photo-upload">
          <input type="file" id="contact-photo" accept="image/*" class="photo-input" />
          <label for="contact-photo" class="photo-upload-label">
            <div class="photo-preview" id="photo-preview">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v8M8 12h8"/>
              </svg>
              <span>Add Photo</span>
            </div>
          </label>
        </div>

        <label class="field-label" for="contact-name">CONTACT NAME</label>
        <input
          class="text-input modern-input"
          id="contact-name"
          type="text"
          placeholder="Full name"
          autocomplete="off"
          required />

        <label class="field-label" for="contact-phone">PHONE NUMBER</label>
        <input
          class="text-input modern-input"
          id="contact-phone"
          type="tel"
          placeholder="+27 82 123 4567"
          autocomplete="off"
          required />

        <label class="field-label" for="contact-relationship">RELATIONSHIP (OPTIONAL)</label>
        <select class="text-input modern-input" id="contact-relationship">
          <option value="">Select relationship</option>
          <option value="Family">Family</option>
          <option value="Friend">Friend</option>
          <option value="Partner">Partner</option>
          <option value="Colleague">Colleague</option>
          <option value="Neighbor">Neighbor</option>
          <option value="Other">Other</option>
        </select>

        <p class="setup-hint" id="contact-error" aria-live="polite"></p>
        <button class="btn-add-contact" type="submit">Add contact</button>
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
    root.querySelector('#setup-contact-list')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.contact-delete');
        if (!btn)
            return;
        const id = btn.dataset['id'];
        if (!id)
            return;
        store.deleteContact(id);
        store.navigateTo('setup-contacts');
    });
    const addForm = root.querySelector('#add-contact-form');
    const photoInput = root.querySelector('#contact-photo');
    const photoPreview = root.querySelector('#photo-preview');
    let photoDataUrl;
    // Handle photo upload preview
    photoInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                photoDataUrl = event.target?.result;
                photoPreview.innerHTML = `<img src="${photoDataUrl}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`;
            };
            reader.readAsDataURL(file);
        }
    });
    if (addForm) {
        const nameInput = root.querySelector('#contact-name');
        const phoneInput = root.querySelector('#contact-phone');
        const relationshipInput = root.querySelector('#contact-relationship');
        const errEl = root.querySelector('#contact-error');
        addForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = nameInput.value.trim();
            const phone = phoneInput.value.trim();
            const relationship = relationshipInput.value.trim();
            if (!name) {
                errEl.textContent = 'Please enter a contact name.';
                return;
            }
            if (!phone) {
                errEl.textContent = 'Please enter a phone number.';
                return;
            }
            errEl.textContent = '';
            store.addContact(name, phone, relationship || undefined, photoDataUrl);
            store.navigateTo('setup-contacts');
        });
    }
    root.querySelector('#btn-setup-done').addEventListener('click', () => {
        if (store.getState().contacts.length > 0) {
            store.navigateTo('app');
        }
    });
}

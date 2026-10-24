import { store } from '../state.js';
import { sendEmailAuthOtp, sendPhoneAuthOtp, verifyPhoneOtp, setAuthenticatedPassword, signInWithGoogle, signInWithPassword, verifyEmailOtp, sendPasswordResetEmail, updatePassword } from '../db.js';
import { resolveIdentifier } from '../authConfig.mjs';
import { formatAuthError, SIGNUP_CONFIRMATION_MESSAGE } from '../authMessages.js';
import { bindLanguageBar, languageBarHtml, t } from '../i18n.js';
import type { Profile } from '../storage.js';

let pendingSignupProfile: Profile | null = null;
let signupFirstName = '';
let signupLocation: Profile['location'];
let signupTermsAccepted = false;

function escapeSignupValue(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

export function getSignupDraft(): Profile | null {
  return pendingSignupProfile;
}

export function clearSignupDraft(): void {
  pendingSignupProfile = null;
  signupFirstName = '';
  signupLocation = undefined;
  signupTermsAccepted = false;
}

function googleButtonHtml(id: string) {
  return `
    <button class="auth-google-btn" id="${id}" type="button">
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.9 6-15Z"/>
        <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.7-5.1c-1.8 1.2-4.1 2-6.8 2-5.2 0-9.6-3.5-11.2-8.2H5.9v5.2A20 20 0 0 0 24 44Z"/>
        <path fill="#FBBC05" d="M12.8 27.9a12 12 0 0 1 0-7.8v-5.2H5.9a20 20 0 0 0 0 18.2l6.9-5.2Z"/>
        <path fill="#EA4335" d="M24 11.9c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 5.8 29.5 4 24 4A20 20 0 0 0 5.9 14.9l6.9 5.2c1.6-4.7 6-8.2 11.2-8.2Z"/>
      </svg>
      <span>Continue with Google</span>
    </button>`;
}

function wireGoogleSignIn(root: HTMLElement, errorSelector: string, buttonId: string) {
  const button = root.querySelector<HTMLButtonElement>(`#${buttonId}`);
  const error = root.querySelector<HTMLElement>(errorSelector);
  button?.addEventListener('click', async () => {
    if (!error) return;
    error.textContent = '';
    button.disabled = true;
    const label = button.querySelector('span');
    if (label) label.textContent = 'Connecting to Google...';
    const { error: authError } = await signInWithGoogle();
    if (authError) {
      error.textContent = authError;
      button.disabled = false;
      if (label) label.textContent = 'Continue with Google';
      return;
    }
    // If no error and no redirect happened, it means the provider is disabled
    if (button.disabled) {
      error.textContent = 'Google Sign-In is not available. Please use email/password authentication.';
      button.disabled = false;
      if (label) label.textContent = 'Continue with Google';
    }
  });
}

function validateEmail(rawEmail: string) {
  return resolveIdentifier(rawEmail);
}

function showEmailCodeForm(form: HTMLFormElement, email: string, purpose: 'signup' | 'login', fullName = '') {
  form.innerHTML = `
    <label class="auth-visually-hidden" for="email-otp-code">Email verification code</label>
    <input class="text-input" id="email-otp-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="Enter verification code" required />
    <p class="auth-error" id="email-otp-error" aria-live="polite">Enter the code sent to your email.</p>
    <button class="btn-primary auth-entry-btn" type="submit" id="email-otp-submit">Verify code</button>
    <button class="auth-link-btn" id="email-otp-resend" type="button">Send another code</button>`;
  const error = form.querySelector<HTMLElement>('#email-otp-error')!;
  form.querySelector<HTMLButtonElement>('#email-otp-resend')?.addEventListener('click', async event => {
    const button = event.currentTarget as HTMLButtonElement;
    button.disabled = true;
    const result = await sendEmailAuthOtp(email, purpose, fullName);
    button.disabled = false;
    error.textContent = result.error ? formatAuthError(result.error) : 'A new code has been sent.';
  });
  form.querySelector<HTMLInputElement>('#email-otp-code')?.focus();
}

function showPhoneCodeForm(form: HTMLFormElement, phone: string, purpose: 'signup' | 'login') {
  form.innerHTML = `
    <label class="auth-visually-hidden" for="phone-otp-code">SMS verification code</label>
    <input class="text-input" id="phone-otp-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="Enter verification code" required />
    <p class="auth-error" id="phone-otp-error" aria-live="polite">Enter the code sent to your phone.</p>
    <button class="btn-primary auth-entry-btn" type="submit" id="phone-otp-submit">Verify code</button>
    <button class="auth-link-btn" id="phone-otp-resend" type="button">Send another code</button>`;
  const error = form.querySelector<HTMLElement>('#phone-otp-error')!;
  form.querySelector<HTMLButtonElement>('#phone-otp-resend')?.addEventListener('click', async event => {
    const button = event.currentTarget as HTMLButtonElement;
    button.disabled = true;
    const result = await sendPhoneAuthOtp(phone, purpose);
    button.disabled = false;
    error.textContent = result.error ? formatAuthError(result.error) : 'A new code has been sent.';
  });
  form.querySelector<HTMLInputElement>('#phone-otp-code')?.focus();
}

export function renderWelcome(root: HTMLElement) {
  const hasPinStored = Boolean(store.getState().pinHash);
  root.innerHTML = `
    <div class="screen splash-screen">
      <div class="splash-scene">
        <div class="splash-mini-device" aria-hidden="true">
          <div class="splash-mini-device__screen"></div>
        </div>

        <div class="splash-card">
          <div class="splash-button-shell" aria-hidden="true">
            <div class="splash-panic-button">
              <span>PANIC</span>
            </div>
          </div>

          <div class="splash-content">
            ${languageBarHtml()}
            <h1 class="splash-tagline">${t('welcome.title')}</h1>
            <p class="splash-pin-hint">${t('welcome.pinHint')}</p>
            <div class="splash-actions">
              <button class="btn-primary splash-btn" id="splash-login" type="button">${t('welcome.login')}</button>
              <p class="splash-signup-text">${t('welcome.new')} <button class="auth-link-btn" id="splash-signup" type="button">${t('welcome.signup')}</button></p>
              <button class="auth-link-btn splash-forgot-link" id="splash-forgot" type="button">${t('welcome.forgot')}</button>
              <button class="splash-install-btn" id="splash-install" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 3v12m-5-5 5 5 5-5" />
                  <path d="M5 16v4h14v-4" />
                </svg>
                <span>Click here to install</span>
              </button>
              <p class="splash-install-message" id="splash-install-message" role="status" hidden></p>
            </div>
          </div>
        </div>

        <div class="splash-map-panel" aria-hidden="true">
          <div class="splash-map-panel__inner">
            <div class="splash-map-panel__badge">Panic Ring</div>
          </div>
        </div>
      </div>
    </div>`;
  root.querySelector('#splash-login')?.addEventListener('click', () => {
    store.navigateTo(hasPinStored ? 'calculator' : 'setup-pin');
  });
  bindLanguageBar(root, () => renderWelcome(root));
  root.querySelector('#splash-signup')?.addEventListener('click', () => store.navigateTo('signup'));
  root.querySelector('#splash-forgot')?.addEventListener('click', () => store.navigateTo('pin-recovery'));
}

export function renderSignup(root: HTMLElement) {
  const draft = pendingSignupProfile;
  const firstName = signupFirstName || draft?.name.replace(new RegExp(`\\s+${draft.surname ?? ''}$`), '') || '';
  const surname = draft?.surname ?? '';
  root.innerHTML = `
    <div class="screen auth-screen auth-screen--scenic">
      <header class="auth-hero auth-hero--signup"><h1>Sign up</h1><p>Enter your details, then create and confirm your PINs.</p></header>
      <section class="auth-sheet">
        <form class="auth-form signup-details-form" id="signup-form" autocomplete="on" novalidate>
          <label class="field-label" for="su-name">First name</label>
          <input class="text-input" id="su-name" type="text" placeholder="First name" autocomplete="given-name" maxlength="60" value="${escapeSignupValue(firstName)}" required />
          <label class="field-label" for="su-surname">Surname</label>
          <input class="text-input" id="su-surname" type="text" placeholder="Surname" autocomplete="family-name" maxlength="60" value="${escapeSignupValue(surname)}" required />
          <label class="field-label" for="su-dob">Date of birth (optional)</label>
          <input class="text-input" id="su-dob" type="date" autocomplete="bday" value="${escapeSignupValue(draft?.dateOfBirth ?? '')}" />
          <label class="field-label" for="su-phone">Cellphone number</label>
          <input class="text-input" id="su-phone" type="tel" placeholder="+27 82 123 4567" autocomplete="tel" maxlength="24" value="${escapeSignupValue(draft?.phone ?? '')}" required />
          <label class="field-label" for="su-email">Email address (optional)</label>
          <input class="text-input" id="su-email" type="email" placeholder="Email address" autocomplete="email" maxlength="254" value="${escapeSignupValue(draft?.email ?? '')}" />
          <label class="field-label" for="su-province">Province (optional)</label>
          <input class="text-input" id="su-province" type="text" placeholder="Province" autocomplete="address-level1" maxlength="100" value="${escapeSignupValue(draft?.province ?? '')}" />
          <label class="field-label" for="su-country">Country (optional)</label>
          <input class="text-input" id="su-country" type="text" placeholder="Country" autocomplete="country-name" maxlength="100" value="${escapeSignupValue(draft?.country ?? '')}" />
          <label class="field-label" for="su-address">Address (optional)</label>
          <textarea class="text-input" id="su-address" placeholder="Street address" autocomplete="street-address" maxlength="300" rows="2">${escapeSignupValue(draft?.address ?? '')}</textarea>
          <button class="btn-secondary-outline" id="su-detect-location" type="button">Use my location</button>
          <p class="auth-subtitle">Location access is optional. GPS coordinates stay on this device and are saved in your encrypted profile; no address lookup service is used.</p>
          <p class="auth-subtitle" id="su-location-status" aria-live="polite">${signupLocation ? `Location detected: ${signupLocation.latitude.toFixed(5)}, ${signupLocation.longitude.toFixed(5)}. Province and country can be entered above.` : ''}</p>
          <div class="signup-terms-row">
            <input id="su-terms" type="checkbox" ${signupTermsAccepted ? 'checked' : ''} required />
            <label for="su-terms">I agree with</label>
            <button class="signup-terms-link" id="su-terms-link" type="button">Read Terms and Conditions</button>
          </div>
          <p class="auth-error" id="su-error" aria-live="polite"></p>
          <button class="btn-primary auth-entry-btn" type="submit" id="su-submit">Continue to PIN setup</button>
        </form>
        <button class="auth-back-btn" id="btn-to-welcome" type="button">Back to home</button>
      </section>
    </div>`;
  root.querySelector('#btn-to-welcome')?.addEventListener('click', () => store.navigateTo('welcome'));

  const form = root.querySelector<HTMLFormElement>('#signup-form')!;
  const nameInput = root.querySelector<HTMLInputElement>('#su-name')!;
  const surnameInput = root.querySelector<HTMLInputElement>('#su-surname')!;
  const dobInput = root.querySelector<HTMLInputElement>('#su-dob')!;
  const emailInput = root.querySelector<HTMLInputElement>('#su-email')!;
  const phoneInput = root.querySelector<HTMLInputElement>('#su-phone')!;
  const provinceInput = root.querySelector<HTMLInputElement>('#su-province')!;
  const countryInput = root.querySelector<HTMLInputElement>('#su-country')!;
  const addressInput = root.querySelector<HTMLTextAreaElement>('#su-address')!;
  const termsInput = root.querySelector<HTMLInputElement>('#su-terms')!;
  const locationStatus = root.querySelector<HTMLElement>('#su-location-status')!;
  const error = root.querySelector<HTMLElement>('#su-error')!;
  const submit = root.querySelector<HTMLButtonElement>('#su-submit')!;
  let location = signupLocation;

  const syncSignupDraft = () => {
    signupFirstName = nameInput.value.trim();
    signupTermsAccepted = termsInput.checked;
    signupLocation = location;
    pendingSignupProfile = {
      name: `${signupFirstName} ${surnameInput.value.trim()}`.trim(),
      surname: surnameInput.value.trim(),
      phone: phoneInput.value.trim(),
      dateOfBirth: dobInput.value,
      email: emailInput.value.trim(),
      province: provinceInput.value.trim(),
      country: countryInput.value.trim(),
      address: addressInput.value.trim(),
      location,
      photo: '',
    };
  };

  form.addEventListener('input', syncSignupDraft);
  form.addEventListener('change', syncSignupDraft);
  root.querySelector<HTMLButtonElement>('#su-terms-link')?.addEventListener('click', () => {
    syncSignupDraft();
    store.navigateTo('terms');
  });

  root.querySelector<HTMLButtonElement>('#su-detect-location')?.addEventListener('click', () => {
    error.textContent = '';
    locationStatus.textContent = 'Requesting location permission…';
    if (!navigator.geolocation) {
      locationStatus.textContent = 'Location is not available in this browser. You can enter your address manually.';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => {
        location = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        signupLocation = location;
        syncSignupDraft();
        locationStatus.textContent = `Location detected: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}. Province and country can be entered above.`;
      },
      geolocationError => {
        locationStatus.textContent = geolocationError.code === geolocationError.PERMISSION_DENIED
          ? 'Location permission was denied. You can enter your address manually.'
          : 'Could not detect location. You can enter your address manually.';
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.textContent = '';
    const name = nameInput.value.trim();
    const surname = surnameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const phoneDigits = phone.replace(/\D/g, '');

    if (!name || !surname) {
      error.textContent = 'Please enter your first name and surname.';
      return;
    }
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      error.textContent = 'Enter a valid cellphone number.';
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      error.textContent = 'Enter a valid email address or leave it blank.';
      return;
    }
    if (!termsInput.checked) {
      error.textContent = 'Please agree to the Terms and Conditions to continue.';
      termsInput.focus();
      return;
    }
    syncSignupDraft();
    submit.disabled = true;
    store.navigateTo('setup-pin');
  });
}

export function renderLogin(root: HTMLElement) {
  root.innerHTML = `
    <div class="screen auth-screen auth-screen--scenic">
      <header class="auth-hero"><h1>Sign In</h1></header>
      <section class="auth-sheet">
        <form class="auth-form" id="login-form" autocomplete="on" novalidate>
          <label class="auth-visually-hidden" for="li-email">Email address</label>
          <input class="text-input" id="li-email" type="email" placeholder="Email address" autocomplete="email" required />
          <p class="auth-error" id="li-error" aria-live="polite"></p>
          <button class="btn-primary auth-entry-btn" type="submit" id="li-submit">Send sign-in code</button>
        </form>
        <p class="auth-switch">Don't have an account? <button class="auth-link-btn" id="btn-to-signup" type="button">Sign up</button></p>
        <button class="auth-back-btn" id="btn-to-welcome" type="button">Back</button>
        ${store.getState().pinHash ? '<button class="auth-guest-btn" id="btn-local-pin" type="button">Unlock this device with its PIN (offline only)</button>' : ''}
        <button class="auth-guest-btn" id="btn-quick-access" type="button">Continue without an account</button>
      </section>
    </div>`;
  root.querySelector('#btn-to-signup')?.addEventListener('click', () => store.navigateTo('signup'));
  root.querySelector('#btn-to-welcome')?.addEventListener('click', () => store.navigateTo('welcome'));
  root.querySelector('#btn-local-pin')?.addEventListener('click', () => store.navigateTo('calculator'));
  root.querySelector('#btn-quick-access')?.addEventListener('click', () => store.navigateTo('setup-pin'));

  const form = root.querySelector<HTMLFormElement>('#login-form')!;
  const emailInput = root.querySelector<HTMLInputElement>('#li-email')!;
  const error = root.querySelector<HTMLElement>('#li-error')!;
  const submit = root.querySelector<HTMLButtonElement>('#li-submit')!;
  let pendingEmail = '';
  let awaitingCode = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (awaitingCode) {
      const code = form.querySelector<HTMLInputElement>('#email-otp-code')!;
      const codeError = form.querySelector<HTMLElement>('#email-otp-error')!;
      const verifyButton = form.querySelector<HTMLButtonElement>('#email-otp-submit')!;
      verifyButton.disabled = true;
      const result = await verifyEmailOtp(pendingEmail, code.value);
      verifyButton.disabled = false;
      if (result.error) codeError.textContent = formatAuthError(result.error, 'otp');
      return;
    }
    error.textContent = '';
    const email = validateEmail(emailInput.value);
    if (!email) { error.textContent = 'Enter a valid email address.'; return; }
    submit.disabled = true;
    submit.textContent = 'Sending code…';
    const result = await sendEmailAuthOtp(email, 'login');
    submit.disabled = false;
    submit.textContent = 'Send sign-in code';
    if (result.error) {
      error.textContent = formatAuthError(result.error);
      return;
    }
    pendingEmail = email;
    awaitingCode = true;
    showEmailCodeForm(form, pendingEmail, 'login');
  });
}

export function renderVerifyEmail(root: HTMLElement) {
  root.innerHTML = `
    <div class="screen auth-screen">
      <div class="auth-card">
        <h2 class="auth-title">Enter your email code</h2>
        <p class="auth-subtitle">${SIGNUP_CONFIRMATION_MESSAGE}</p>
        <button class="btn-primary" id="btn-done" style="margin-top:20px">Back to sign in</button>
      </div>
    </div>`;
  root.querySelector('#btn-done')?.addEventListener('click', () => store.navigateTo('login'));
}

export function renderForgotPassword(root: HTMLElement) {
  root.innerHTML = `
    <div class="screen auth-screen auth-screen--scenic">
      <header class="auth-hero"><h1>Reset Password</h1></header>
      <section class="auth-sheet">
        <form class="auth-form" id="forgot-password-form" autocomplete="on" novalidate>
          <p class="auth-subtitle">Enter your email address and we'll send you a link to reset your password.</p>
          <label class="auth-visually-hidden" for="fp-email">Email address</label>
          <input class="text-input" id="fp-email" type="email" placeholder="Email address" autocomplete="email" required />
          <p class="auth-error" id="fp-error" aria-live="polite"></p>
          <p class="auth-success" id="fp-success" aria-live="polite"></p>
          <button class="btn-primary auth-entry-btn" type="submit" id="fp-submit">Send reset link</button>
        </form>
        <p class="auth-switch">Remember your password? <button class="auth-link-btn" id="btn-to-login" type="button">Sign in</button></p>
        <button class="auth-back-btn" id="btn-to-welcome" type="button">Back</button>
      </section>
    </div>`;
  
  root.querySelector('#btn-to-login')?.addEventListener('click', () => store.navigateTo('login'));
  root.querySelector('#btn-to-welcome')?.addEventListener('click', () => store.navigateTo('welcome'));

  const form = root.querySelector<HTMLFormElement>('#forgot-password-form')!;
  const emailInput = root.querySelector<HTMLInputElement>('#fp-email')!;
  const error = root.querySelector<HTMLElement>('#fp-error')!;
  const success = root.querySelector<HTMLElement>('#fp-success')!;
  const submit = root.querySelector<HTMLButtonElement>('#fp-submit')!;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.textContent = '';
    success.textContent = '';
    const email = validateEmail(emailInput.value);
    if (!email) { 
      error.textContent = 'Enter a valid email address.'; 
      return; 
    }
    
    submit.disabled = true;
    submit.textContent = 'Sending...';
    const result = await sendPasswordResetEmail(email);
    submit.disabled = false;
    submit.textContent = 'Send reset link';
    
    if (result.error) {
      error.textContent = formatAuthError(result.error);
      return;
    }
    
    success.textContent = 'Password reset link sent! Check your email.';
    emailInput.value = '';
  });
}

export function renderResetPassword(root: HTMLElement) {
  root.innerHTML = `
    <div class="screen auth-screen auth-screen--scenic">
      <header class="auth-hero"><h1>Create New Password</h1></header>
      <section class="auth-sheet">
        <form class="auth-form" id="reset-password-form" autocomplete="on" novalidate>
          <p class="auth-subtitle">Enter your new password below.</p>
          <label class="auth-visually-hidden" for="rp-password">New password</label>
          <input class="text-input" id="rp-password" type="password" placeholder="New password (at least 8 characters)" autocomplete="new-password" minlength="8" required />
          <label class="auth-visually-hidden" for="rp-password-confirm">Confirm new password</label>
          <input class="text-input" id="rp-password-confirm" type="password" placeholder="Confirm new password" autocomplete="new-password" minlength="8" required />
          <p class="auth-error" id="rp-error" aria-live="polite"></p>
          <button class="btn-primary auth-entry-btn" type="submit" id="rp-submit">Update password</button>
        </form>
      </section>
    </div>`;

  const form = root.querySelector<HTMLFormElement>('#reset-password-form')!;
  const passwordInput = root.querySelector<HTMLInputElement>('#rp-password')!;
  const passwordConfirmInput = root.querySelector<HTMLInputElement>('#rp-password-confirm')!;
  const error = root.querySelector<HTMLElement>('#rp-error')!;
  const submit = root.querySelector<HTMLButtonElement>('#rp-submit')!;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.textContent = '';
    
    if (passwordInput.value.length < 8) { 
      error.textContent = 'Password must be at least 8 characters.'; 
      return; 
    }
    if (passwordInput.value !== passwordConfirmInput.value) { 
      error.textContent = 'Passwords do not match.'; 
      return; 
    }
    
    submit.disabled = true;
    submit.textContent = 'Updating...';
    const result = await updatePassword(passwordInput.value);
    submit.disabled = false;
    submit.textContent = 'Update password';
    
    if (result.error) {
      error.textContent = formatAuthError(result.error);
      return;
    }
    
    // Password updated successfully, navigate to login
    store.navigateTo('login');
  });
}

export function renderChangePassword(root: HTMLElement) {
  root.innerHTML = `
    <div class="screen auth-screen auth-screen--scenic">
      <header class="auth-hero"><h1>Change Password</h1></header>
      <section class="auth-sheet">
        <form class="auth-form" id="change-password-form" autocomplete="on" novalidate>
          <p class="auth-subtitle">Enter your current password and choose a new one.</p>
          <label class="auth-visually-hidden" for="cp-current">Current password</label>
          <input class="text-input" id="cp-current" type="password" placeholder="Current password" autocomplete="current-password" required />
          <label class="auth-visually-hidden" for="cp-new">New password</label>
          <input class="text-input" id="cp-new" type="password" placeholder="New password (at least 8 characters)" autocomplete="new-password" minlength="8" required />
          <label class="auth-visually-hidden" for="cp-new-confirm">Confirm new password</label>
          <input class="text-input" id="cp-new-confirm" type="password" placeholder="Confirm new password" autocomplete="new-password" minlength="8" required />
          <p class="auth-error" id="cp-error" aria-live="polite"></p>
          <p class="auth-success" id="cp-success" aria-live="polite"></p>
          <button class="btn-primary auth-entry-btn" type="submit" id="cp-submit">Change password</button>
        </form>
        <button class="auth-back-btn" id="btn-to-settings" type="button">Back to Settings</button>
      </section>
    </div>`;

  root.querySelector('#btn-to-settings')?.addEventListener('click', () => store.navigateTo('settings'));

  const form = root.querySelector<HTMLFormElement>('#change-password-form')!;
  const currentInput = root.querySelector<HTMLInputElement>('#cp-current')!;
  const newPasswordInput = root.querySelector<HTMLInputElement>('#cp-new')!;
  const newPasswordConfirmInput = root.querySelector<HTMLInputElement>('#cp-new-confirm')!;
  const error = root.querySelector<HTMLElement>('#cp-error')!;
  const success = root.querySelector<HTMLElement>('#cp-success')!;
  const submit = root.querySelector<HTMLButtonElement>('#cp-submit')!;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.textContent = '';
    success.textContent = '';
    
    if (!currentInput.value) {
      error.textContent = 'Please enter your current password.';
      return;
    }
    
    if (newPasswordInput.value.length < 8) { 
      error.textContent = 'New password must be at least 8 characters.'; 
      return; 
    }
    
    if (newPasswordInput.value !== newPasswordConfirmInput.value) { 
      error.textContent = 'New passwords do not match.'; 
      return; 
    }
    
    if (currentInput.value === newPasswordInput.value) {
      error.textContent = 'New password must be different from current password.';
      return;
    }
    
    submit.disabled = true;
    submit.textContent = 'Changing...';
    
    // Verify current password by attempting to reauthenticate
    const authEmail = store.getState().authEmail;
    if (!authEmail) {
      error.textContent = 'Session expired. Please sign in again.';
      submit.disabled = false;
      submit.textContent = 'Change password';
      return;
    }
    
    // Try to sign in with current password to verify it
    const verifyResult = await signInWithPassword(authEmail, currentInput.value);
    if (verifyResult.error) {
      error.textContent = 'Current password is incorrect.';
      submit.disabled = false;
      submit.textContent = 'Change password';
      return;
    }
    
    // Update to new password
    const result = await updatePassword(newPasswordInput.value);
    submit.disabled = false;
    submit.textContent = 'Change password';
    
    if (result.error) {
      error.textContent = formatAuthError(result.error);
      return;
    }
    
    success.textContent = 'Password changed successfully!';
    form.reset();
    setTimeout(() => {
      store.navigateTo('settings');
    }, 2000);
  });
}

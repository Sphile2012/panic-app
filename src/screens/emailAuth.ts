import { store } from '../state.js';
import { sendEmailAuthOtp, setAuthenticatedPassword, signInWithGoogle, signInWithPassword, verifyEmailOtp } from '../db.js';
import { resolveIdentifier } from '../authConfig.mjs';
import { formatAuthError, SIGNUP_CONFIRMATION_MESSAGE } from '../authMessages.js';

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
    if (!authError) return;
    error.textContent = authError;
    button.disabled = false;
    if (label) label.textContent = 'Continue with Google';
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

export function renderWelcome(root: HTMLElement) {
  const hasPinStored = Boolean(store.getState().pinHash);
  root.innerHTML = `
    <div class="screen splash-screen">
      <div class="splash-container">
        <div class="splash-cover-image">
          <img src="/cover-panic-ring.png" alt="Red Panic Ring emergency button" />
        </div>
        <div class="splash-content">
          <h1 class="splash-tagline">Your Safety Matters</h1>
          <span class="splash-accent-line" aria-hidden="true"></span>
          <p class="splash-pin-hint">Sign in with your 4-digit PIN. No password needed.</p>
          <div class="splash-actions">
          <button class="btn-primary splash-btn" id="splash-login" type="button">Login with PIN</button>
          <p class="splash-signup-text">No account? <button class="auth-link-btn" id="splash-signup" type="button">Sign up</button></p>
          <button class="auth-link-btn splash-forgot-link" id="splash-forgot" type="button">Forgot your PIN?</button>
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
    </div>`;
  root.querySelector('#splash-login')?.addEventListener('click', () => {
    store.navigateTo(hasPinStored ? 'calculator' : 'setup-pin');
  });
  root.querySelector('#splash-signup')?.addEventListener('click', () => store.navigateTo('setup-pin'));
  root.querySelector('#splash-forgot')?.addEventListener('click', () => store.navigateTo('pin-recovery'));
}

export function renderSignup(root: HTMLElement) {
  root.innerHTML = `
    <div class="screen auth-screen auth-screen--scenic">
      <header class="auth-hero"><h1>Create Account</h1></header>
      <section class="auth-sheet">
        <form class="auth-form" id="signup-form" autocomplete="on" novalidate>
          <label class="auth-visually-hidden" for="su-name">Full name</label>
          <input class="text-input auth-line-input" id="su-name" type="text" placeholder="Full name" autocomplete="name" maxlength="100" required />
          <label class="auth-visually-hidden" for="su-email">Email address</label>
          <input class="text-input" id="su-email" type="email" placeholder="Email address" autocomplete="email" required />
          <label class="auth-visually-hidden" for="su-password">Password</label>
          <input class="text-input" id="su-password" type="password" placeholder="Create a password (at least 8 characters)" autocomplete="new-password" minlength="8" required />
          <label class="auth-visually-hidden" for="su-password-confirm">Confirm password</label>
          <input class="text-input" id="su-password-confirm" type="password" placeholder="Confirm password" autocomplete="new-password" minlength="8" required />
          <p class="auth-subtitle">Use an inbox you can access. Verify it with the code we send to activate your account.</p>
          <p class="auth-error" id="su-error" aria-live="polite"></p>
          <button class="btn-primary auth-entry-btn" type="submit" id="su-submit">Create account</button>
        </form>
        <p class="auth-switch">Already have an account? <button class="auth-link-btn" id="btn-to-login" type="button">Sign in</button></p>
        <button class="auth-back-btn" id="btn-to-welcome" type="button">Back</button>
        <div class="auth-divider"><span>or sign up with</span></div>
        ${googleButtonHtml('signup-google')}
        <p class="auth-error auth-google-error" id="su-google-error" aria-live="polite"></p>
      </section>
    </div>`;
  wireGoogleSignIn(root, '#su-google-error', 'signup-google');
  root.querySelector('#btn-to-login')?.addEventListener('click', () => store.navigateTo('login'));
  root.querySelector('#btn-to-welcome')?.addEventListener('click', () => store.navigateTo('welcome'));

  const form = root.querySelector<HTMLFormElement>('#signup-form')!;
  const nameInput = root.querySelector<HTMLInputElement>('#su-name')!;
  const emailInput = root.querySelector<HTMLInputElement>('#su-email')!;
  const passwordInput = root.querySelector<HTMLInputElement>('#su-password')!;
  const passwordConfirmInput = root.querySelector<HTMLInputElement>('#su-password-confirm')!;
  const error = root.querySelector<HTMLElement>('#su-error')!;
  const submit = root.querySelector<HTMLButtonElement>('#su-submit')!;
  let pendingEmail = '';
  let pendingName = '';
  let pendingPassword = '';
  let awaitingCode = false;
  let emailVerified = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (awaitingCode) {
      const code = form.querySelector<HTMLInputElement>('#email-otp-code')!;
      const codeError = form.querySelector<HTMLElement>('#email-otp-error')!;
      const verifyButton = form.querySelector<HTMLButtonElement>('#email-otp-submit')!;
      verifyButton.disabled = true;
      const verificationResult = emailVerified ? { error: null } : await verifyEmailOtp(pendingEmail, code.value);
      if (!verificationResult.error)
        emailVerified = true;
      const result = verificationResult.error ? verificationResult : await setAuthenticatedPassword(pendingPassword);
      verifyButton.disabled = false;
      if (result.error) {
        codeError.textContent = formatAuthError(result.error, 'otp');
        return;
      }
      pendingPassword = '';
      return;
    }
    error.textContent = '';
    const fullName = nameInput.value.trim();
    const email = validateEmail(emailInput.value);
    if (!fullName) { error.textContent = 'Please enter your name.'; return; }
    if (!email) { error.textContent = 'Enter a valid email address.'; return; }
    if (passwordInput.value.length < 8) { error.textContent = 'Use a password with at least 8 characters.'; return; }
    if (passwordInput.value !== passwordConfirmInput.value) { error.textContent = 'Passwords do not match.'; return; }
    submit.disabled = true;
    submit.textContent = 'Sending code…';
    const result = await sendEmailAuthOtp(email, 'signup', fullName);
    submit.disabled = false;
    submit.textContent = 'Continue with email';
    if (result.error) {
      error.textContent = formatAuthError(result.error);
      return;
    }
    pendingEmail = email;
    pendingName = fullName;
    pendingPassword = passwordInput.value;
    awaitingCode = true;
    showEmailCodeForm(form, pendingEmail, 'signup', pendingName);
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
          <label class="auth-visually-hidden" for="li-password">Password</label>
          <input class="text-input" id="li-password" type="password" placeholder="Password" autocomplete="current-password" required />
          <p class="auth-error" id="li-error" aria-live="polite"></p>
          <button class="btn-primary auth-entry-btn" type="submit" id="li-submit">Sign in</button>
        </form>
        <button class="auth-link-btn" id="btn-email-code" type="button">Sign in with an email code instead</button>
        <p class="auth-switch">Don't have an account? <button class="auth-link-btn" id="btn-to-signup" type="button">Sign up</button></p>
        <button class="auth-back-btn" id="btn-to-welcome" type="button">Back</button>
        <div class="auth-divider"><span>or sign in with</span></div>
        ${googleButtonHtml('login-google')}
        <p class="auth-error auth-google-error" id="li-google-error" aria-live="polite"></p>
        ${store.getState().pinHash ? '<button class="auth-guest-btn" id="btn-local-pin" type="button">Unlock this device with its PIN (offline only)</button>' : ''}
        <button class="auth-guest-btn" id="btn-quick-access" type="button">Continue without an account</button>
      </section>
    </div>`;
  wireGoogleSignIn(root, '#li-google-error', 'login-google');
  root.querySelector('#btn-to-signup')?.addEventListener('click', () => store.navigateTo('signup'));
  root.querySelector('#btn-to-welcome')?.addEventListener('click', () => store.navigateTo('welcome'));
  root.querySelector('#btn-local-pin')?.addEventListener('click', () => store.navigateTo('calculator'));
  root.querySelector('#btn-quick-access')?.addEventListener('click', () => store.navigateTo('setup-pin'));

  const form = root.querySelector<HTMLFormElement>('#login-form')!;
  const emailInput = root.querySelector<HTMLInputElement>('#li-email')!;
  const passwordInput = root.querySelector<HTMLInputElement>('#li-password')!;
  const error = root.querySelector<HTMLElement>('#li-error')!;
  const submit = root.querySelector<HTMLButtonElement>('#li-submit')!;
  const emailCodeButton = root.querySelector<HTMLButtonElement>('#btn-email-code')!;
  let pendingEmail = '';
  let awaitingCode = false;
  emailCodeButton.addEventListener('click', async () => {
    error.textContent = '';
    const email = validateEmail(emailInput.value);
    if (!email) { error.textContent = 'Enter a valid email address.'; return; }
    emailCodeButton.disabled = true;
    const result = await sendEmailAuthOtp(email, 'login');
    emailCodeButton.disabled = false;
    if (result.error) {
      error.textContent = formatAuthError(result.error);
      return;
    }
    pendingEmail = email;
    awaitingCode = true;
    showEmailCodeForm(form, pendingEmail, 'login');
  });
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
    if (!passwordInput.value) { error.textContent = 'Enter your password.'; return; }
    submit.disabled = true;
    const result = await signInWithPassword(email, passwordInput.value);
    submit.disabled = false;
    if (result.error) {
      error.textContent = formatAuthError(result.error, 'password');
    }
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

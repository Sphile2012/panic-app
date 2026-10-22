import { store } from '../state.js';
import { sendEmailAuthLink, signInWithGoogle } from '../db.js';
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

export function renderWelcome(root: HTMLElement) {
  root.innerHTML = `
    <div class="screen auth-screen auth-screen--scenic">
      <header class="auth-hero"><h1>Welcome</h1></header>
      <section class="auth-sheet auth-sheet--welcome" aria-label="Get started">
        <button class="btn-secondary-outline auth-entry-btn" id="welcome-login" type="button">Sign in</button>
        <button class="btn-primary auth-entry-btn" id="welcome-signup" type="button">Sign up</button>
        <div class="auth-divider"><span>or continue with</span></div>
        <p class="auth-error" id="welcome-error" aria-live="polite"></p>
        ${googleButtonHtml('welcome-google')}
        <button class="auth-guest-btn" id="welcome-guest" type="button">Continue without an account</button>
      </section>
    </div>`;
  root.querySelector('#welcome-login')?.addEventListener('click', () => store.navigateTo('login'));
  root.querySelector('#welcome-signup')?.addEventListener('click', () => store.navigateTo('signup'));
  root.querySelector('#welcome-guest')?.addEventListener('click', () => store.navigateTo('setup-pin'));
  wireGoogleSignIn(root, '#welcome-error', 'welcome-google');
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
          <p class="auth-error" id="su-error" aria-live="polite"></p>
          <button class="btn-primary auth-entry-btn" type="submit" id="su-submit">Continue with email</button>
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
  const error = root.querySelector<HTMLElement>('#su-error')!;
  const submit = root.querySelector<HTMLButtonElement>('#su-submit')!;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.textContent = '';
    const fullName = nameInput.value.trim();
    const email = validateEmail(emailInput.value);
    if (!fullName) { error.textContent = 'Please enter your name.'; return; }
    if (!email) { error.textContent = 'Enter a valid email address.'; return; }
    submit.disabled = true;
    submit.textContent = 'Sending email link…';
    const result = await sendEmailAuthLink(email, 'signup', fullName);
    submit.disabled = false;
    submit.textContent = 'Continue with email';
    if (result.error) {
      error.textContent = formatAuthError(result.error);
      return;
    }
    store.navigateTo('verify-email');
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
          <button class="btn-primary auth-entry-btn" type="submit" id="li-submit">Email me a sign-in link</button>
        </form>
        <p class="auth-switch">Don't have an account? <button class="auth-link-btn" id="btn-to-signup" type="button">Sign up</button></p>
        <button class="auth-back-btn" id="btn-to-welcome" type="button">Back</button>
        <div class="auth-divider"><span>or sign in with</span></div>
        ${googleButtonHtml('login-google')}
        <p class="auth-error auth-google-error" id="li-google-error" aria-live="polite"></p>
        <button class="auth-guest-btn" id="btn-quick-access" type="button">Continue without an account</button>
      </section>
    </div>`;
  wireGoogleSignIn(root, '#li-google-error', 'login-google');
  root.querySelector('#btn-to-signup')?.addEventListener('click', () => store.navigateTo('signup'));
  root.querySelector('#btn-to-welcome')?.addEventListener('click', () => store.navigateTo('welcome'));
  root.querySelector('#btn-quick-access')?.addEventListener('click', () => store.navigateTo('setup-pin'));

  const form = root.querySelector<HTMLFormElement>('#login-form')!;
  const emailInput = root.querySelector<HTMLInputElement>('#li-email')!;
  const error = root.querySelector<HTMLElement>('#li-error')!;
  const submit = root.querySelector<HTMLButtonElement>('#li-submit')!;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.textContent = '';
    const email = validateEmail(emailInput.value);
    if (!email) { error.textContent = 'Enter a valid email address.'; return; }
    submit.disabled = true;
    submit.textContent = 'Sending email link…';
    const result = await sendEmailAuthLink(email, 'login');
    submit.disabled = false;
    submit.textContent = 'Email me a sign-in link';
    if (result.error) {
      error.textContent = formatAuthError(result.error);
      return;
    }
    store.navigateTo('verify-email');
  });
}

export function renderVerifyEmail(root: HTMLElement) {
  root.innerHTML = `
    <div class="screen auth-screen">
      <div class="auth-card">
        <h2 class="auth-title">Check your email</h2>
        <p class="auth-subtitle">${SIGNUP_CONFIRMATION_MESSAGE}</p>
        <button class="btn-primary" id="btn-done" style="margin-top:20px">Back to sign in</button>
      </div>
    </div>`;
  root.querySelector('#btn-done')?.addEventListener('click', () => store.navigateTo('login'));
}

import { store } from '../state.js';
import { signUp, signIn, signInWithGoogle, resetPasswordForEmail, updatePassword, getSession } from '../db.js';
import { formatAuthError, SIGNUP_CONFIRMATION_MESSAGE } from '../authMessages.js';
function logoHtml() {
    return `
    <div class="auth-logo">
      <div class="auth-logo-ring" aria-hidden="true">○</div>
      <h1 class="auth-logo-title">Panic Ring</h1>
    </div>
  `;
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
    </button>
  `;
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
export function renderWelcome(root: HTMLElement) {
    root.innerHTML = `
    <div class="screen auth-screen auth-screen--scenic">
      <header class="auth-hero">
        <h1>Welcome</h1>
      </header>
      <section class="auth-sheet auth-sheet--welcome" aria-label="Get started">
        <button class="btn-secondary-outline auth-entry-btn" id="welcome-login" type="button">Sign in</button>
        <button class="btn-primary auth-entry-btn" id="welcome-signup" type="button">Sign up</button>
        <div class="auth-divider"><span>or sign up with</span></div>
        <p class="auth-error" id="welcome-error" aria-live="polite"></p>
        ${googleButtonHtml('welcome-google')}
        <button class="auth-guest-btn" id="welcome-guest" type="button">Continue without an account</button>
      </section>
    </div>
  `;
    root.querySelector('#welcome-login')?.addEventListener('click', () => store.navigateTo('login'));
    root.querySelector('#welcome-signup')?.addEventListener('click', () => store.navigateTo('signup'));
    root.querySelector('#welcome-guest')?.addEventListener('click', () => store.navigateTo('setup-pin'));
    wireGoogleSignIn(root, '#welcome-error', 'welcome-google');
}
export function renderSignup(root) {
    root.innerHTML = `
    <div class="screen auth-screen auth-screen--scenic">
      <header class="auth-hero">
        <h1>Create Account</h1>
      </header>
      <section class="auth-sheet">
        <form class="auth-form" id="signup-form" autocomplete="on" novalidate>
          <label class="auth-visually-hidden" for="su-name">Full name</label>
          <input class="text-input auth-line-input" id="su-name" type="text"
            placeholder="Full Name" autocomplete="name" maxlength="100" required />

          <label class="auth-visually-hidden" for="su-email">Email address</label>
          <input class="text-input" id="su-email" type="email"
            placeholder="Email address" autocomplete="email" required />

          <label class="auth-visually-hidden" for="su-password">Password</label>
          <div class="password-wrap">
            <input class="text-input" id="su-password" type="password"
              placeholder="Password" autocomplete="new-password"
              minlength="8" required />
            <button type="button" class="pw-toggle" data-for="su-password"
              aria-label="Show password">◉</button>
          </div>

          <label class="auth-visually-hidden" for="su-confirm">Confirm password</label>
          <div class="password-wrap">
            <input class="text-input" id="su-confirm" type="password"
              placeholder="Confirm Password" autocomplete="new-password" required />
            <button type="button" class="pw-toggle" data-for="su-confirm"
              aria-label="Show password">◉</button>
          </div>

          <p class="auth-error" id="su-error" aria-live="polite"></p>
          <button class="btn-primary auth-entry-btn" type="submit" id="su-submit">Sign up</button>
        </form>
        <p class="auth-switch">Already have an account? <button class="auth-link-btn" id="btn-to-login" type="button">Sign in</button></p>
        <button class="auth-back-btn" id="btn-to-welcome" type="button">Back</button>
        <div class="auth-divider"><span>or sign up with</span></div>
        ${googleButtonHtml('signup-google')}
        <p class="auth-error auth-google-error" id="su-google-error" aria-live="polite"></p>
      </section>
    </div>
  `;
    wireGoogleSignIn(root, '#su-google-error', 'signup-google');
    root.querySelector('#btn-to-login').addEventListener('click', () => {
        store.navigateTo('login');
    });
    root.querySelector('#btn-to-welcome').addEventListener('click', () => store.navigateTo('welcome'));
    root.querySelectorAll('.pw-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const inp = root.querySelector(`#${btn.dataset['for']}`);
            inp.type = inp.type === 'password' ? 'text' : 'password';
            btn.textContent = inp.type === 'password' ? 'Show' : 'Hide';
            btn.setAttribute('aria-label', inp.type === 'password' ? 'Show password' : 'Hide password');
        });
    });
    const form = root.querySelector('#signup-form');
    const nameEl = root.querySelector('#su-name');
    const emailEl = root.querySelector('#su-email');
    const pwEl = root.querySelector('#su-password');
    const cfEl = root.querySelector('#su-confirm');
    const errEl = root.querySelector('#su-error');
    const submitBtn = root.querySelector('#su-submit');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errEl.textContent = '';
        const fullName = nameEl.value.trim();
        const email = emailEl.value.trim();
        const pw = pwEl.value;
        const cf = cfEl.value;
        if (!fullName) {
            errEl.textContent = 'Please enter your name.';
            return;
        }
        if (!email) {
            errEl.textContent = 'Please enter an email.';
            return;
        }
        if (!pw && !cf) {
            store.navigateTo('setup-pin');
            return;
        }
        if (!pw || !cf) {
            errEl.textContent = 'Choose a password or continue without one.';
            return;
        }
        if (pw.length < 8) {
            errEl.textContent = 'Password must be at least 8 characters.';
            return;
        }
        if (pw !== cf) {
            errEl.textContent = 'Passwords do not match.';
            return;
        }
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';
        const { error, session } = await signUp(email, pw, fullName);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign up';
        if (error) {
            if (error.toLowerCase().includes('continue in offline mode')) {
                store.navigateTo('setup-pin');
                return;
            }
            errEl.textContent = formatAuthError(error);
            return;
        }
        if (session) {
            store.setAuthEmail(session.user.email ?? email);
            return;
        }
        store.navigateTo('verify-email');
    });
}
export function renderLogin(root) {
    root.innerHTML = `
    <div class="screen auth-screen auth-screen--scenic">
      <header class="auth-hero">
        <h1>Sign In</h1>
      </header>
      <section class="auth-sheet">
        <form class="auth-form" id="login-form" autocomplete="on" novalidate>
          <label class="auth-visually-hidden" for="li-email">Email address</label>
          <input class="text-input" id="li-email" type="email"
            placeholder="Email address" autocomplete="email" required />

          <label class="auth-visually-hidden" for="li-password">Password</label>
          <div class="password-wrap">
            <input class="text-input" id="li-password" type="password"
              placeholder="Password" autocomplete="current-password" required />
            <button type="button" class="pw-toggle" data-for="li-password"
              aria-label="Show password">◉</button>
          </div>

          <button class="auth-forgot-btn" id="btn-forgot-password" type="button">Forgot password?</button>
          <p class="auth-error" id="li-error" aria-live="polite"></p>
          <button class="btn-primary auth-entry-btn" type="submit" id="li-submit">Sign in</button>
        </form>
        <p class="auth-switch">Don't have an account? <button class="auth-link-btn" id="btn-to-signup" type="button">Sign up</button></p>
        <button class="auth-back-btn" id="btn-to-welcome" type="button">Back</button>
        <div class="auth-divider"><span>or sign in with</span></div>
        ${googleButtonHtml('login-google')}
        <p class="auth-error auth-google-error" id="li-google-error" aria-live="polite"></p>
        <button class="auth-guest-btn" id="btn-quick-access" type="button">Continue without an account</button>
      </section>
    </div>
  `;
    wireGoogleSignIn(root, '#li-google-error', 'login-google');
    root.querySelector('#btn-to-signup').addEventListener('click', () => {
        store.navigateTo('signup');
    });
    root.querySelector('#btn-to-welcome').addEventListener('click', () => store.navigateTo('welcome'));
    root.querySelector('#btn-forgot-password').addEventListener('click', () => {
        store.navigateTo('forgot-password');
    });
    root.querySelector('#btn-quick-access').addEventListener('click', () => {
        store.navigateTo('setup-pin');
    });
    root.querySelectorAll('.pw-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const inp = root.querySelector(`#${btn.dataset['for']}`);
            inp.type = inp.type === 'password' ? 'text' : 'password';
            btn.textContent = inp.type === 'password' ? 'Show' : 'Hide';
            btn.setAttribute('aria-label', inp.type === 'password' ? 'Show password' : 'Hide password');
        });
    });
    const form = root.querySelector('#login-form');
    const emailEl = root.querySelector('#li-email');
    const pwEl = root.querySelector('#li-password');
    const errEl = root.querySelector('#li-error');
    const submitBtn = root.querySelector('#li-submit');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errEl.textContent = '';
        const email = emailEl.value.trim();
        const pw = pwEl.value;
        if (!email) {
            errEl.textContent = 'Please enter your email.';
            return;
        }
        if (!pw) {
            errEl.textContent = 'Please enter your password.';
            return;
        }
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in…';
        const { error } = await signIn(email, pw);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign in';
        if (error) {
            if (error.toLowerCase().includes('continue in offline mode')) {
                store.navigateTo('setup-pin');
                return;
            }
            if (/(email not confirmed|email_not_confirmed)/i.test(error)) {
                errEl.textContent = formatAuthError(error);
                setTimeout(() => store.navigateTo('verify-email'), 1200);
            }
            else {
                errEl.textContent = formatAuthError(error);
            }
            return;
        }
        const session = await getSession();
        if (!session) {
            errEl.textContent = 'Sign-in succeeded, but your session could not be restored. Please try again.';
            return;
        }
        store.setAuthEmail(session.user.email ?? email);
    });
}
export function renderForgotPassword(root) {
    root.innerHTML = `
    <div class="screen auth-screen">
      ${logoHtml()}
      <div class="auth-card">
        <h2 class="auth-title">Reset your password</h2>
        <p class="auth-subtitle">
          Enter the email you signed up with and we will send a secure link to choose a new password.
        </p>
        <form class="auth-form" id="forgot-form" autocomplete="on" novalidate>
          <label class="field-label" for="fp-email">Email address</label>
          <input class="text-input" id="fp-email" type="email"
            placeholder="you@example.com" autocomplete="email" required />

          <p class="auth-error" id="fp-error" aria-live="polite"></p>
          <p class="auth-success" id="fp-success" aria-live="polite"></p>
          <button class="btn-primary" type="submit" id="fp-submit">Send reset link</button>
        </form>
        <p class="auth-switch">
          <button class="auth-link-btn" id="btn-back">← Back to sign in</button>
        </p>
      </div>
    </div>
  `;
    const form = root.querySelector('#forgot-form');
    const emailEl = root.querySelector('#fp-email');
    const errEl = root.querySelector('#fp-error');
    const successEl = root.querySelector('#fp-success');
    const submitBtn = root.querySelector('#fp-submit');
    root.querySelector('#btn-back').addEventListener('click', () => {
        store.navigateTo('login');
    });
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errEl.textContent = '';
        successEl.textContent = '';
        const email = emailEl.value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errEl.textContent = 'Enter a valid email address.';
            return;
        }
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
        const redirectOrigin = import.meta.env['VITE_FRONTEND_URL']?.trim() || window.location.origin;
        const redirectUrl = new URL('/', redirectOrigin);
        redirectUrl.searchParams.set('flow', 'recovery');
        try {
            const { error } = await resetPasswordForEmail(email, redirectUrl.toString());
            if (error) {
                errEl.textContent = error;
                return;
            }
            successEl.textContent = 'Email sent. Check your inbox for a password reset link.';
        }
        catch {
            errEl.textContent = 'Could not request a password reset. Check your connection and try again.';
        }
        finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send reset link';
        }
    });
}

export async function renderResetPassword(root, recoveryLinkInvalid = false) {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const session = await getSession();
    const hasRecoveryError = recoveryLinkInvalid || hashParams.has('error') || hashParams.has('error_code');
    const hasRecoveryToken = !hasRecoveryError && (
        hashParams.get('type') === 'recovery' ||
        hashParams.has('access_token') ||
        hashParams.has('refresh_token') ||
        !!session
    );
    root.innerHTML = `
    <div class="screen auth-screen">
      ${logoHtml()}
      <div class="auth-card">
        <h2 class="auth-title">Choose a new password</h2>
        <p class="auth-subtitle">
          Use at least 8 characters for your new password.
        </p>
        ${hasRecoveryToken ? `
        <form class="auth-form" id="reset-form" autocomplete="on" novalidate>
          <label class="field-label" for="rp-password">New password</label>
          <div class="password-wrap">
            <input class="text-input" id="rp-password" type="password"
              placeholder="At least 8 characters" autocomplete="new-password" minlength="8" required />
            <button type="button" class="pw-toggle" data-for="rp-password" aria-label="Show password">Show</button>
          </div>

          <label class="field-label" for="rp-confirm">Confirm new password</label>
          <div class="password-wrap">
            <input class="text-input" id="rp-confirm" type="password"
              placeholder="Repeat password" autocomplete="new-password" required />
            <button type="button" class="pw-toggle" data-for="rp-confirm" aria-label="Show password">Show</button>
          </div>

          <p class="auth-error" id="rp-error" aria-live="polite"></p>
          <p class="auth-success" id="rp-success" aria-live="polite"></p>
          <button class="btn-primary" type="submit" id="rp-submit">Save password</button>
        </form>
        ` : `
          <p class="auth-error" aria-live="polite">This password reset link is invalid or has expired. Request a new reset link and try again.</p>
          <button class="btn-primary" id="btn-back" style="margin-top:20px">Back to sign in</button>
        `}
        <p class="auth-switch">
          <button class="auth-link-btn" id="btn-login">← Back to sign in</button>
        </p>
      </div>
    </div>
  `;

    root.querySelectorAll('.pw-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const inp = root.querySelector(`#${btn.dataset['for']}`);
            if (!(inp instanceof HTMLInputElement)) return;
            inp.type = inp.type === 'password' ? 'text' : 'password';
            btn.textContent = inp.type === 'password' ? 'Show' : 'Hide';
            btn.setAttribute('aria-label', inp.type === 'password' ? 'Show password' : 'Hide password');
        });
    });

    const backButtons = root.querySelectorAll('#btn-back, #btn-login');
    backButtons.forEach(btn => btn.addEventListener('click', () => {
        store.navigateTo('login');
    }));

    const form = root.querySelector('#reset-form');
    if (!form) return;
    const pwEl = root.querySelector('#rp-password');
    const cfEl = root.querySelector('#rp-confirm');
    const errEl = root.querySelector('#rp-error');
    const successEl = root.querySelector('#rp-success');
    const submitBtn = root.querySelector('#rp-submit');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errEl.textContent = '';
        successEl.textContent = '';
        const newPassword = pwEl.value;
        const confirmPassword = cfEl.value;
        if (!newPassword || newPassword.length < 8) {
            errEl.textContent = 'Password must be at least 8 characters.';
            return;
        }
        if (newPassword !== confirmPassword) {
            errEl.textContent = 'Passwords do not match.';
            return;
        }
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving…';
        const { error } = await updatePassword(newPassword);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save password';
        if (error) {
            errEl.textContent = error;
            return;
        }
        successEl.textContent = 'Your password has been updated. You can now sign in with your new password.';
        setTimeout(() => store.navigateTo('login'), 1800);
    });
}

export function renderVerifyEmail(root) {
    root.innerHTML = `
    <div class="screen auth-screen">
      ${logoHtml()}
      <div class="auth-card">
        <h2 class="auth-title">Check your email</h2>
        <p class="auth-subtitle">
          ${SIGNUP_CONFIRMATION_MESSAGE}
        </p>
        <button class="btn-primary" id="btn-done" style="margin-top:20px">
          I've confirmed — sign in
        </button>
        <p class="auth-switch">
          <button class="auth-link-btn" id="btn-back">← Back to sign in</button>
        </p>
      </div>
    </div>
  `;
    root.querySelector('#btn-done').addEventListener('click', () => {
        store.navigateTo('login');
    });
    root.querySelector('#btn-back').addEventListener('click', () => {
        store.navigateTo('login');
    });
}

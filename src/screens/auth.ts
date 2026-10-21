import { store } from '../state.js';
import { signUp, signIn, resetPasswordForEmail, updatePassword, getSession } from '../db.js';
import { formatAuthError, SIGNUP_CONFIRMATION_MESSAGE } from '../authMessages.js';
function logoHtml() {
    return `
    <div class="auth-logo">
      <div class="auth-logo-ring" aria-hidden="true">○</div>
      <h1 class="auth-logo-title">Panic Ring</h1>
    </div>
  `;
}
function offlineNotice(btnId) {
    return `
    <div class="auth-notice auth-notice--warn">
      <strong>Quick access</strong> — continue without a password or account when the secure service is unavailable.
      <button class="auth-skip-btn" id="${btnId}">Continue without account →</button>
    </div>
  `;
}
export function renderSignup(root) {
    root.innerHTML = `
    <div class="screen auth-screen">
      ${logoHtml()}
      <div class="auth-card">
        <h2 class="auth-title">Create account</h2>
        <p class="auth-subtitle">
          Your contacts, notes and safety plan are encrypted on this device.
          The account lets you sync settings and track alert history.
        </p>
        ${offlineNotice('btn-skip')}
        <form class="auth-form" id="signup-form" autocomplete="on" novalidate>
          <label class="field-label" for="su-email">Email address</label>
          <input class="text-input" id="su-email" type="email"
            placeholder="you@example.com" autocomplete="email" required />

          <label class="field-label" for="su-password">Password</label>
          <div class="password-wrap">
            <input class="text-input" id="su-password" type="password"
              placeholder="At least 8 characters" autocomplete="new-password"
              minlength="8" required />
            <button type="button" class="pw-toggle" data-for="su-password"
              aria-label="Show password">Show</button>
          </div>

          <label class="field-label" for="su-confirm">Confirm password</label>
          <div class="password-wrap">
            <input class="text-input" id="su-confirm" type="password"
              placeholder="Repeat password" autocomplete="new-password" required />
            <button type="button" class="pw-toggle" data-for="su-confirm"
              aria-label="Show password">Show</button>
          </div>

          <p class="auth-error" id="su-error" aria-live="polite"></p>
          <button class="btn-primary" type="submit" id="su-submit">Create account</button>
        </form>
        <p class="auth-switch">
          Already have an account?
          <button class="auth-link-btn" id="btn-to-login">Sign in</button>
        </p>
        <p class="auth-switch">
          <button class="auth-link-btn" id="btn-quick-access" type="button">Continue without password</button>
        </p>
      </div>
    </div>
  `;
    root.querySelector('#btn-skip')?.addEventListener('click', () => {
        store.navigateTo('setup-pin');
    });
    root.querySelector('#btn-to-login').addEventListener('click', () => {
        store.navigateTo('login');
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
    const form = root.querySelector('#signup-form');
    const emailEl = root.querySelector('#su-email');
    const pwEl = root.querySelector('#su-password');
    const cfEl = root.querySelector('#su-confirm');
    const errEl = root.querySelector('#su-error');
    const submitBtn = root.querySelector('#su-submit');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errEl.textContent = '';
        const email = emailEl.value.trim();
        const pw = pwEl.value;
        const cf = cfEl.value;
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
        submitBtn.textContent = 'Creating account…';
        const { error, session } = await signUp(email, pw);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create account';
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
    <div class="screen auth-screen">
      ${logoHtml()}
      <div class="auth-card">
        <h2 class="auth-title">Sign in</h2>
        ${offlineNotice('btn-skip')}
        <form class="auth-form" id="login-form" autocomplete="on" novalidate>
          <label class="field-label" for="li-email">Email address</label>
          <input class="text-input" id="li-email" type="email"
            placeholder="you@example.com" autocomplete="email" required />

          <label class="field-label" for="li-password">Password</label>
          <div class="password-wrap">
            <input class="text-input" id="li-password" type="password"
              placeholder="Your password" autocomplete="current-password" required />
            <button type="button" class="pw-toggle" data-for="li-password"
              aria-label="Show password">Show</button>
          </div>

          <p class="auth-error" id="li-error" aria-live="polite"></p>
          <button class="btn-primary" type="submit" id="li-submit">Sign in</button>
        </form>
        <p class="auth-switch">
          No account yet?
          <button class="auth-link-btn" id="btn-to-signup">Create one</button>
        </p>
        <p class="auth-switch">
          <button class="auth-link-btn" id="btn-forgot-password" type="button">Forgot password?</button>
        </p>
        <p class="auth-switch">
          <button class="auth-link-btn" id="btn-quick-access" type="button">Continue without password</button>
        </p>
      </div>
    </div>
  `;
    root.querySelector('#btn-skip')?.addEventListener('click', () => {
        store.navigateTo('setup-pin');
    });
    root.querySelector('#btn-to-signup').addEventListener('click', () => {
        store.navigateTo('signup');
    });
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

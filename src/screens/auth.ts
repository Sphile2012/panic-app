import { store } from '../state.js';
import { signUp, signIn } from '../db.js';
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
        const { error } = await signUp(email, pw);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create account';
        if (error) {
            if (error.toLowerCase().includes('continue in offline mode')) {
                store.navigateTo('setup-pin');
                return;
            }
            errEl.textContent = error;
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
            store.navigateTo('setup-pin');
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
            if (error.toLowerCase().includes('invalid login')) {
                errEl.textContent = 'Incorrect email or password.';
            }
            else if (error.toLowerCase().includes('email not confirmed')) {
                errEl.textContent = 'Please confirm your email first.';
                setTimeout(() => store.navigateTo('verify-email'), 1200);
            }
            else {
                errEl.textContent = error;
            }
            return;
        }
    });
}
export function renderVerifyEmail(root) {
    root.innerHTML = `
    <div class="screen auth-screen">
      ${logoHtml()}
      <div class="auth-card">
        <h2 class="auth-title">Check your email</h2>
        <p class="auth-subtitle">
          We sent a confirmation link to your email address.
          Tap it to activate your account, then come back and sign in.
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

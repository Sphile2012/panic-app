import { store } from '../state.js';
import { signUp, signIn, signInWithGoogle, resetPassword, DB_CONFIGURED } from '../db.js';

function logoHtml(): string {
  return `
    <div class="auth-logo">
      <div class="auth-logo-ring" aria-hidden="true">○</div>
      <h1 class="auth-logo-title">Panic Ring</h1>
    </div>`;
}

function googleBtn(): string {
  if (!DB_CONFIGURED) return '';
  return `
    <button type="button" class="btn-google" id="btn-google">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4 24 4c-7.8 0-14.5 4.3-17.7 10.7z"/>
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.2 0-9.6-3-11.3-7.3l-6.6 4.8C9.6 40 16.4 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.2-2.3 4-4.2 5.2l6.2 5.2C40.8 35.4 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"/>
      </svg>
      Continue with Google
    </button>
    <div class="auth-divider"><span>or</span></div>`;
}

// ─── Sign Up ──────────────────────────────────────────────────────────────────
export function renderSignup(root: HTMLElement): void {
  root.innerHTML = `
    <div class="screen auth-screen">
      ${logoHtml()}
      <div class="auth-card">
        <h2 class="auth-title">Create account</h2>
        <p class="auth-subtitle">Your data is encrypted on this device — the account tracks alert history.</p>

        ${googleBtn()}

        <form class="auth-form" id="signup-form" autocomplete="on" novalidate>
          <label class="field-label" for="su-email">Email address</label>
          <input class="text-input" id="su-email" type="email"
            placeholder="you@example.com" autocomplete="email" required />

          <label class="field-label" for="su-password">Password</label>
          <div class="password-wrap">
            <input class="text-input" id="su-password" type="password"
              placeholder="At least 8 characters" autocomplete="new-password" minlength="8" required />
            <button type="button" class="pw-toggle" data-for="su-password">Show</button>
          </div>

          <label class="field-label" for="su-confirm">Confirm password</label>
          <div class="password-wrap">
            <input class="text-input" id="su-confirm" type="password"
              placeholder="Repeat password" autocomplete="new-password" required />
            <button type="button" class="pw-toggle" data-for="su-confirm">Show</button>
          </div>

          <p class="auth-error" id="su-error" aria-live="polite"></p>
          <button class="btn-primary" type="submit" id="su-submit">Create account</button>
        </form>

        <p class="auth-switch">
          Already have an account?
          <button class="auth-link-btn" id="btn-to-login">Sign in</button>
        </p>
        <p class="auth-switch">
          <button class="auth-link-btn" id="btn-skip">Continue without account →</button>
        </p>
      </div>
    </div>`;

  // Google
  root.querySelector('#btn-google')?.addEventListener('click', async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      const e = root.querySelector<HTMLElement>('#su-error');
      if (e) e.textContent = error;
    }
  });

  root.querySelector('#btn-to-login')!.addEventListener('click', () => store.navigateTo('login'));
  root.querySelector('#btn-skip')!.addEventListener('click', () => store.navigateTo('setup-pin'));

  // Password toggles
  root.querySelectorAll<HTMLButtonElement>('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = root.querySelector<HTMLInputElement>(`#${btn.dataset['for']}`)!;
      inp.type = inp.type === 'password' ? 'text' : 'password';
      btn.textContent = inp.type === 'password' ? 'Show' : 'Hide';
    });
  });

  const form      = root.querySelector<HTMLFormElement>('#signup-form')!;
  const emailEl   = root.querySelector<HTMLInputElement>('#su-email')!;
  const pwEl      = root.querySelector<HTMLInputElement>('#su-password')!;
  const cfEl      = root.querySelector<HTMLInputElement>('#su-confirm')!;
  const errEl     = root.querySelector<HTMLElement>('#su-error')!;
  const submitBtn = root.querySelector<HTMLButtonElement>('#su-submit')!;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errEl.textContent = '';
    const email = emailEl.value.trim();
    const pw    = pwEl.value;
    const cf    = cfEl.value;
    if (!email)        { errEl.textContent = 'Please enter an email.'; return; }
    if (pw.length < 8) { errEl.textContent = 'Password must be at least 8 characters.'; return; }
    if (pw !== cf)     { errEl.textContent = 'Passwords do not match.'; return; }

    submitBtn.disabled    = true;
    submitBtn.textContent = 'Creating account…';
    const { error } = await signUp(email, pw);
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Create account';

    if (error) {
      if (error.toLowerCase().includes('offline mode')) { store.navigateTo('setup-pin'); return; }
      if (error.toLowerCase().includes('already registered') || error.toLowerCase().includes('already exists')) {
        errEl.textContent = 'An account with this email already exists. Sign in instead.';
        return;
      }
      errEl.textContent = error;
      return;
    }

    // New account — go to PIN setup then recovery questions
    store.navigateTo('verify-email');
  });
}

// ─── Sign In ──────────────────────────────────────────────────────────────────
export function renderLogin(root: HTMLElement): void {
  root.innerHTML = `
    <div class="screen auth-screen">
      ${logoHtml()}
      <div class="auth-card">
        <h2 class="auth-title">Sign in</h2>

        ${googleBtn()}

        <form class="auth-form" id="login-form" autocomplete="on" novalidate>
          <label class="field-label" for="li-email">Email address</label>
          <input class="text-input" id="li-email" type="email"
            placeholder="you@example.com" autocomplete="email" required />

          <label class="field-label" for="li-password">Password</label>
          <div class="password-wrap">
            <input class="text-input" id="li-password" type="password"
              placeholder="Your password" autocomplete="current-password" required />
            <button type="button" class="pw-toggle" data-for="li-password">Show</button>
          </div>

          <p class="auth-error" id="li-error" aria-live="polite"></p>

          <button class="btn-primary" type="submit" id="li-submit">Sign in</button>

          <button type="button" class="auth-forgot-btn" id="btn-forgot">
            Forgot password?
          </button>
        </form>

        <p class="auth-switch">
          No account yet?
          <button class="auth-link-btn" id="btn-to-signup">Create one</button>
        </p>
        <p class="auth-switch">
          <button class="auth-link-btn" id="btn-skip">Continue without account →</button>
        </p>
      </div>
    </div>`;

  // Google
  root.querySelector('#btn-google')?.addEventListener('click', async () => {
    const { error } = await signInWithGoogle();
    const errEl = root.querySelector<HTMLElement>('#li-error')!;
    if (error) errEl.textContent = error;
  });

  root.querySelector('#btn-to-signup')!.addEventListener('click', () => store.navigateTo('signup'));
  root.querySelector('#btn-skip')!.addEventListener('click', () => store.navigateTo('setup-pin'));
  root.querySelector('#btn-forgot')!.addEventListener('click', () => store.navigateTo('forgot-password'));

  root.querySelectorAll<HTMLButtonElement>('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = root.querySelector<HTMLInputElement>(`#${btn.dataset['for']}`)!;
      inp.type = inp.type === 'password' ? 'text' : 'password';
      btn.textContent = inp.type === 'password' ? 'Show' : 'Hide';
    });
  });

  const form      = root.querySelector<HTMLFormElement>('#login-form')!;
  const emailEl   = root.querySelector<HTMLInputElement>('#li-email')!;
  const pwEl      = root.querySelector<HTMLInputElement>('#li-password')!;
  const errEl     = root.querySelector<HTMLElement>('#li-error')!;
  const submitBtn = root.querySelector<HTMLButtonElement>('#li-submit')!;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errEl.textContent = '';
    const email = emailEl.value.trim();
    const pw    = pwEl.value;
    if (!email) { errEl.textContent = 'Please enter your email.'; return; }
    if (!pw)    { errEl.textContent = 'Please enter your password.'; return; }

    submitBtn.disabled    = true;
    submitBtn.textContent = 'Signing in…';
    const { error } = await signIn(email, pw);
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Sign in';

    if (error) {
      if (error.toLowerCase().includes('offline mode')) { store.navigateTo('setup-pin'); return; }
      if (error.toLowerCase().includes('invalid login') || error.toLowerCase().includes('invalid credentials')) {
        errEl.textContent = 'Incorrect email or password.';
      } else if (error.toLowerCase().includes('email not confirmed')) {
        errEl.textContent = 'Please confirm your email first.';
        setTimeout(() => store.navigateTo('verify-email'), 1200);
      } else {
        errEl.textContent = error;
      }
    }
    // On success, onAuthStateChange in state.ts navigates automatically
  });
}

// ─── Forgot Password ─────────────────────────────────────────────────────────
export function renderForgotPassword(root: HTMLElement): void {
  root.innerHTML = `
    <div class="screen auth-screen">
      ${logoHtml()}
      <div class="auth-card">
        <h2 class="auth-title">Reset password</h2>
        <p class="auth-subtitle">
          Enter your email address and we will send you a link to reset your password.
        </p>

        <form class="auth-form" id="forgot-form" novalidate>
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
    </div>`;

  root.querySelector('#btn-back')!.addEventListener('click', () => store.navigateTo('login'));

  const form      = root.querySelector<HTMLFormElement>('#forgot-form')!;
  const emailEl   = root.querySelector<HTMLInputElement>('#fp-email')!;
  const errEl     = root.querySelector<HTMLElement>('#fp-error')!;
  const successEl = root.querySelector<HTMLElement>('#fp-success')!;
  const submitBtn = root.querySelector<HTMLButtonElement>('#fp-submit')!;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errEl.textContent    = '';
    successEl.textContent = '';
    const email = emailEl.value.trim();
    if (!email) { errEl.textContent = 'Please enter your email.'; return; }

    submitBtn.disabled    = true;
    submitBtn.textContent = 'Sending…';
    const { error } = await resetPassword(email);
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Send reset link';

    if (error) {
      errEl.textContent = error;
    } else {
      successEl.textContent = '✓ Reset link sent — check your email.';
      emailEl.value = '';
      setTimeout(() => store.navigateTo('login'), 3000);
    }
  });
}

// ─── Verify Email ─────────────────────────────────────────────────────────────
export function renderVerifyEmail(root: HTMLElement): void {
  root.innerHTML = `
    <div class="screen auth-screen">
      ${logoHtml()}
      <div class="auth-card">
        <div class="verify-icon" aria-hidden="true">📧</div>
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
    </div>`;

  root.querySelector('#btn-done')!.addEventListener('click', () => store.navigateTo('login'));
  root.querySelector('#btn-back')!.addEventListener('click', () => store.navigateTo('login'));
}

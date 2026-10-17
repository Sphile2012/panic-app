import { store } from '../state.js';
import { signUp, signIn, signInWithGoogle, resetPassword, verifyPasswordResetOtp, DB_CONFIGURED } from '../db.js';


function logo(): string {
  return `
    <div class="auth-logo">
      <div class="auth-logo-ring" aria-hidden="true">○</div>
      <h1 class="auth-logo-title">Panic Ring</h1>
      <p class="auth-logo-tagline">Your safety, your control</p>
    </div>`;
}

function googleBtn(errorId: string): string {
  if (!DB_CONFIGURED) return '';
  return `
    <button type="button" class="btn-google" id="btn-google">
      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4 24 4c-7.8 0-14.5 4.3-17.7 10.7z"/>
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.2 0-9.6-3-11.3-7.3l-6.6 4.8C9.6 40 16.4 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.2-2.3 4-4.2 5.2l6.2 5.2C40.8 35.4 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"/>
      </svg>
      Continue with Google
    </button>
    <p class="auth-error" id="${errorId}-google" aria-live="polite"></p>
    <div class="auth-divider"><span>or continue with email</span></div>`;
}

function pwToggle(forId: string): string {
  return `<button type="button" class="pw-toggle" data-for="${forId}" aria-label="Show password">Show</button>`;
}

function wireToggles(root: HTMLElement): void {
  root.querySelectorAll<HTMLButtonElement>('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = root.querySelector<HTMLInputElement>(`#${btn.dataset['for']}`)!;
      inp.type = inp.type === 'password' ? 'text' : 'password';
      btn.textContent = inp.type === 'password' ? 'Show' : 'Hide';
      btn.setAttribute('aria-label', inp.type === 'password' ? 'Show password' : 'Hide password');
    });
  });
}

const LOCAL_ACCOUNT_KEY = 'pr_local_accounts';
function normalizeAccountId(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9+]/g, '');
}
function readLocalAccounts(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNT_KEY);
    return raw ? JSON.parse(raw) : {};
  }
  catch {
    return {};
  }
}
function writeLocalAccounts(accounts: Record<string, string>): void {
  localStorage.setItem(LOCAL_ACCOUNT_KEY, JSON.stringify(accounts));
}
function saveLocalAccount(identifier: string, password: string): void {
  const accounts = readLocalAccounts();
  accounts[normalizeAccountId(identifier)] = password;
  writeLocalAccounts(accounts);
}
function verifyLocalAccount(identifier: string, password: string): boolean {
  const accounts = readLocalAccounts();
  return accounts[normalizeAccountId(identifier)] === password;
}

export function renderSignup(root: HTMLElement): void {
  root.innerHTML = `
    <div class="screen auth-screen">
      ${logo()}
      <div class="auth-card">
        <h2 class="auth-title">Create your account</h2>
        <p class="auth-subtitle">
          Free to use. Your contacts, notes and safety plan stay encrypted on your device.
        </p>

        ${googleBtn('su')}

        <form class="auth-form" id="signup-form" autocomplete="on" novalidate>

          <label class="field-label" for="su-email">Email address</label>
          <input class="text-input" id="su-email" type="email"
            placeholder="you@example.com" autocomplete="email" />

          <label class="field-label" for="su-phone">Mobile number</label>
          <input class="text-input" id="su-phone" type="tel"
            placeholder="+27 82 123 4567" autocomplete="tel" />

          <label class="field-label" for="su-password">Password</label>
          <div class="password-wrap">
            <input class="text-input" id="su-password" type="password"
              placeholder="At least 8 characters" autocomplete="new-password" minlength="8" required />
            ${pwToggle('su-password')}
          </div>

          <label class="field-label" for="su-confirm">Confirm password</label>
          <div class="password-wrap">
            <input class="text-input" id="su-confirm" type="password"
              placeholder="Same password again" autocomplete="new-password" required />
            ${pwToggle('su-confirm')}
          </div>

          <p class="auth-error" id="su-error" aria-live="polite"></p>
          <button class="btn-primary" type="submit" id="su-submit">Create account</button>
        </form>

        <div class="auth-footer">
          <p class="auth-switch">Already have an account? <button class="auth-link-btn" id="btn-to-login">Sign in</button></p>
          <p class="auth-switch"><button class="auth-link-btn auth-link-muted" id="btn-skip">Skip — use without account</button></p>
        </div>
      </div>
    </div>`;

  wireToggles(root);

  root.querySelector('#btn-google')?.addEventListener('click', async () => {
    const errEl = root.querySelector<HTMLElement>('#su-google')!;
    errEl.textContent = '';
    const { error } = await signInWithGoogle();
    if (error) errEl.textContent = error;
  });

  root.querySelector('#btn-to-login')!.addEventListener('click', () => store.navigateTo('login'));
  root.querySelector('#btn-skip')!.addEventListener('click', () => store.navigateTo('setup-pin'));

  const form      = root.querySelector<HTMLFormElement>('#signup-form')!;
  const emailEl   = root.querySelector<HTMLInputElement>('#su-email')!;
  const phoneEl   = root.querySelector<HTMLInputElement>('#su-phone')!;
  const pwEl      = root.querySelector<HTMLInputElement>('#su-password')!;
  const cfEl      = root.querySelector<HTMLInputElement>('#su-confirm')!;
  const errEl     = root.querySelector<HTMLElement>('#su-error')!;
  const submitBtn = root.querySelector<HTMLButtonElement>('#su-submit')!;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errEl.textContent = '';
    const email = emailEl.value.trim();
    const phone = phoneEl.value.trim();
    const pw    = pwEl.value;
    const cf    = cfEl.value;
    if (!email && !phone) {
      errEl.textContent = 'Please enter your email address or mobile number.';
      emailEl.focus();
      return;
    }
    if (pw.length < 8) { errEl.textContent = 'Password must be at least 8 characters.'; pwEl.focus(); return; }
    if (pw !== cf)     { errEl.textContent = 'Passwords do not match — please try again.'; cfEl.focus(); return; }

    if (phone) {
      const phoneKey = normalizeAccountId(phone);
      const existing = readLocalAccounts();
      if (existing[phoneKey]) {
        errEl.textContent = 'This mobile number already has an account. Sign in instead.';
        return;
      }
      saveLocalAccount(phone, pw);
      if (email) saveLocalAccount(email, pw);
      store.saveProfile('', phone, '', 'en');
      store.navigateTo('setup-pin');
      return;
    }

    submitBtn.disabled    = true;
    submitBtn.textContent = 'Creating account…';
    const { error, alreadyRegistered } = await signUp(email, pw);
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Create account';

    if (alreadyRegistered) {
      errEl.textContent = 'An account with this email already exists. Sign in instead or use “Forgot password?” to reset it.';
      return;
    }
    if (error) {
      if (error.toLowerCase().includes('offline')) { store.navigateTo('setup-pin'); return; }
      if (error.toLowerCase().includes('already')) {
        errEl.textContent = 'An account with this email already exists. Sign in instead.';
        return;
      }
      if (error.toLowerCase().includes('rate limit')) {
        errEl.textContent = 'Too many attempts — please wait a moment and try again.';
        return;
      }
      errEl.textContent = error;
      return;
    }
    store.navigateTo('verify-email');
  });
}


export function renderLogin(root: HTMLElement): void {
  root.innerHTML = `
    <div class="screen auth-screen">
      ${logo()}
      <div class="auth-card">
        <h2 class="auth-title">Welcome back</h2>
        <p class="auth-subtitle">Sign in to access your safety circle and alert history.</p>

        ${googleBtn('li')}

        <form class="auth-form" id="login-form" autocomplete="on" novalidate>

          <label class="field-label" for="li-email">Email or mobile number</label>
          <input class="text-input" id="li-email" type="text"
            placeholder="you@example.com or +27 82 123 4567" autocomplete="username" required />

          <label class="field-label" for="li-password">Password</label>
          <div class="password-wrap">
            <input class="text-input" id="li-password" type="password"
              placeholder="Your password" autocomplete="current-password" required />
            ${pwToggle('li-password')}
          </div>

          <p class="auth-error" id="li-error" aria-live="polite"></p>
          <button class="btn-primary" type="submit" id="li-submit">Sign in</button>
          <button type="button" class="auth-forgot-btn" id="btn-forgot">Forgot password?</button>
        </form>

        <div class="auth-footer">
          <p class="auth-switch">No account yet? <button class="auth-link-btn" id="btn-to-signup">Create one</button></p>
          <p class="auth-switch"><button class="auth-link-btn auth-link-muted" id="btn-skip">Skip — use without account</button></p>
        </div>
      </div>
    </div>`;

  wireToggles(root);

  root.querySelector('#btn-google')?.addEventListener('click', async () => {
    const errEl = root.querySelector<HTMLElement>('#li-google')!;
    errEl.textContent = '';
    const { error } = await signInWithGoogle();
    if (error) errEl.textContent = error;
  });

  root.querySelector('#btn-to-signup')!.addEventListener('click', () => store.navigateTo('signup'));
  root.querySelector('#btn-skip')!.addEventListener('click', () => store.navigateTo('setup-pin'));
  root.querySelector('#btn-forgot')!.addEventListener('click', () => store.navigateTo('forgot-password'));

  const form      = root.querySelector<HTMLFormElement>('#login-form')!;
  const emailEl   = root.querySelector<HTMLInputElement>('#li-email')!;
  const pwEl      = root.querySelector<HTMLInputElement>('#li-password')!;
  const errEl     = root.querySelector<HTMLElement>('#li-error')!;
  const submitBtn = root.querySelector<HTMLButtonElement>('#li-submit')!;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errEl.textContent = '';
    const identifier = emailEl.value.trim();
    const pw = pwEl.value;
    if (!identifier) { errEl.textContent = 'Please enter your email address or mobile number.'; emailEl.focus(); return; }
    if (!pw)    { errEl.textContent = 'Please enter your password.'; pwEl.focus(); return; }

    const isPhone = /^\+?[0-9\s().-]{7,}$/.test(identifier);
    if (isPhone) {
      if (!verifyLocalAccount(identifier, pw)) {
        errEl.textContent = 'Incorrect mobile number or password. Please try again.';
        return;
      }
      store.setAuthEmail(identifier);
      store.saveProfile('', identifier, '', localStorage.getItem('pr_lang') ?? 'en');
      store.navigateTo('setup-pin');
      return;
    }

    submitBtn.disabled    = true;
    submitBtn.textContent = 'Signing in…';
    const { error } = await signIn(identifier, pw);
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Sign in';

    if (error) {
      if (error.toLowerCase().includes('offline')) { store.navigateTo('setup-pin'); return; }
      if (error.toLowerCase().includes('invalid login') || error.toLowerCase().includes('invalid credentials')) {
        errEl.textContent = 'Incorrect email or password. Please try again.';
      } else if (error.toLowerCase().includes('email not confirmed')) {
        errEl.textContent = 'Please confirm your email before signing in.';
        setTimeout(() => store.navigateTo('verify-email'), 1500);
      } else {
        errEl.textContent = error;
      }
    }
  });
}


export function renderForgotPassword(root: HTMLElement): void {
  root.innerHTML = `
    <div class="screen auth-screen">
      ${logo()}
      <div class="auth-card">
        <div class="auth-icon-big">Reset</div>
        <h2 class="auth-title">Reset your password</h2>
        <p class="auth-subtitle">
          Enter your email and we’ll send you a one-time reset code.
        </p>

        <form class="auth-form" id="forgot-form" novalidate>
          <label class="field-label" for="fp-email">Email address</label>
          <input class="text-input" id="fp-email" type="email"
            placeholder="you@example.com" autocomplete="email" required />

          <div id="fp-reset-fields" hidden>
            <label class="field-label" for="fp-code">Email code</label>
            <input class="text-input" id="fp-code" type="text" inputmode="numeric"
              autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6"
              placeholder="Enter the 6-digit code" />

            <label class="field-label" for="fp-password">New password</label>
            <div class="password-wrap">
              <input class="text-input" id="fp-password" type="password"
                autocomplete="new-password" minlength="8" placeholder="At least 8 characters" />
              ${pwToggle('fp-password')}
            </div>

            <label class="field-label" for="fp-confirm">Confirm new password</label>
            <div class="password-wrap">
              <input class="text-input" id="fp-confirm" type="password"
                autocomplete="new-password" minlength="8" placeholder="Enter it again" />
              ${pwToggle('fp-confirm')}
            </div>
          </div>

          <p class="auth-error"   id="fp-error"   aria-live="polite"></p>
          <p class="auth-success" id="fp-success" aria-live="polite"></p>

          <button class="btn-primary" type="submit" id="fp-submit">Send reset code</button>
          <button class="auth-forgot-btn" type="button" id="fp-resend" hidden>Send a new code</button>
        </form>

        <div class="auth-footer">
          <p class="auth-switch"><button class="auth-link-btn" id="btn-back">Back to sign in</button></p>
        </div>
      </div>
    </div>`;

  root.querySelector('#btn-back')!.addEventListener('click', () => store.navigateTo('login'));
  wireToggles(root);

  const form      = root.querySelector<HTMLFormElement>('#forgot-form')!;
  const emailEl   = root.querySelector<HTMLInputElement>('#fp-email')!;
  const resetFields = root.querySelector<HTMLElement>('#fp-reset-fields')!;
  const codeEl    = root.querySelector<HTMLInputElement>('#fp-code')!;
  const passwordEl = root.querySelector<HTMLInputElement>('#fp-password')!;
  const confirmEl = root.querySelector<HTMLInputElement>('#fp-confirm')!;
  const errEl     = root.querySelector<HTMLElement>('#fp-error')!;
  const successEl = root.querySelector<HTMLElement>('#fp-success')!;
  const submitBtn = root.querySelector<HTMLButtonElement>('#fp-submit')!;
  const resendBtn = root.querySelector<HTMLButtonElement>('#fp-resend')!;
  let codeSent = false;

  async function sendCode(): Promise<void> {
    errEl.textContent     = '';
    successEl.textContent = '';
    const email = emailEl.value.trim();
    if (!email) { errEl.textContent = 'Please enter your email address.'; emailEl.focus(); return; }

    submitBtn.disabled    = true;
    resendBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    const { error } = await resetPassword(email);
    submitBtn.disabled    = false;
    resendBtn.disabled = false;

    if (error) {
      errEl.textContent = error;
    } else {
      codeSent = true;
      emailEl.readOnly = true;
      resetFields.hidden = false;
      resendBtn.hidden = false;
      submitBtn.textContent = 'Verify code and update password';
      successEl.textContent = 'Check your inbox for a 6-digit code. It may take a few minutes to arrive.';
      codeEl.focus();
    }
  }

  resendBtn.addEventListener('click', () => void sendCode());

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!codeSent) {
      await sendCode();
      return;
    }

    errEl.textContent = '';
    successEl.textContent = '';
    if (!/^\d{6}$/.test(codeEl.value.trim())) {
      errEl.textContent = 'Enter the 6-digit code from your email.';
      codeEl.focus();
      return;
    }
    if (passwordEl.value.length < 8) {
      errEl.textContent = 'Your new password must be at least 8 characters.';
      passwordEl.focus();
      return;
    }
    if (passwordEl.value !== confirmEl.value) {
      errEl.textContent = 'The new passwords do not match.';
      confirmEl.focus();
      return;
    }

    submitBtn.disabled = true;
    resendBtn.disabled = true;
    submitBtn.textContent = 'Updating password…';
    const { error } = await verifyPasswordResetOtp(emailEl.value, codeEl.value, passwordEl.value);
    submitBtn.disabled = false;
    resendBtn.disabled = false;
    submitBtn.textContent = 'Verify code and update password';

    if (error) {
      errEl.textContent = error.toLowerCase().includes('expired') || error.toLowerCase().includes('invalid')
        ? 'That code is invalid or expired. Request a new code and try again.'
        : error;
      return;
    }

    successEl.textContent = 'Password updated. You can now sign in with your new password.';
    form.hidden = true;
    setTimeout(() => store.navigateTo('login'), 2500);
  });
}


export function renderVerifyEmail(root: HTMLElement): void {
  root.innerHTML = `
    <div class="screen auth-screen">
      ${logo()}
      <div class="auth-card">
        <div class="auth-icon-big">Inbox</div>
        <h2 class="auth-title">Check your inbox</h2>
        <p class="auth-subtitle">
          We sent a confirmation link to your email.
          Click it to activate your account — it only takes a second.
        </p>
        <div class="verify-steps">
          <div class="verify-step">1. Open your email app</div>
          <div class="verify-step">2. Find the email from Panic Ring</div>
          <div class="verify-step">3. Click the confirmation link</div>
          <div class="verify-step">4. Come back here and sign in</div>
        </div>
        <button class="btn-primary" id="btn-done">I've confirmed — sign in</button>
        <div class="auth-footer">
          <p class="auth-switch"><button class="auth-link-btn" id="btn-back">Back to sign in</button></p>
        </div>
      </div>
    </div>`;

  root.querySelector('#btn-done')!.addEventListener('click', () => store.navigateTo('login'));
  root.querySelector('#btn-back')!.addEventListener('click', () => store.navigateTo('login'));
}

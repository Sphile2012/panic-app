import { store } from '../state.js';
import { sendEmailAuthOtp, sendPhoneAuthOtp, verifyPhoneOtp, setAuthenticatedPassword, signInWithGoogle, signInWithPassword, verifyEmailOtp, sendPasswordResetEmail, updatePassword } from '../db.js';
import { resolveIdentifier } from '../authConfig.mjs';
import { formatAuthError, SIGNUP_CONFIRMATION_MESSAGE } from '../authMessages.js';
function googleButtonHtml(id) {
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
function wireGoogleSignIn(root, errorSelector, buttonId) {
    const button = root.querySelector(`#${buttonId}`);
    const error = root.querySelector(errorSelector);
    button?.addEventListener('click', async () => {
        if (!error)
            return;
        error.textContent = '';
        button.disabled = true;
        const label = button.querySelector('span');
        if (label)
            label.textContent = 'Connecting to Google...';
        const { error: authError } = await signInWithGoogle();
        if (authError) {
            error.textContent = authError;
            button.disabled = false;
            if (label)
                label.textContent = 'Continue with Google';
            return;
        }
        // If no error and no redirect happened, it means the provider is disabled
        if (button.disabled) {
            error.textContent = 'Google Sign-In is not available. Please use email/password authentication.';
            button.disabled = false;
            if (label)
                label.textContent = 'Continue with Google';
        }
    });
}
function validateEmail(rawEmail) {
    return resolveIdentifier(rawEmail);
}
function showEmailCodeForm(form, email, purpose, fullName = '') {
    form.innerHTML = `
    <label class="auth-visually-hidden" for="email-otp-code">Email verification code</label>
    <input class="text-input" id="email-otp-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="Enter verification code" required />
    <p class="auth-error" id="email-otp-error" aria-live="polite">Enter the code sent to your email.</p>
    <button class="btn-primary auth-entry-btn" type="submit" id="email-otp-submit">Verify code</button>
    <button class="auth-link-btn" id="email-otp-resend" type="button">Send another code</button>`;
    const error = form.querySelector('#email-otp-error');
    form.querySelector('#email-otp-resend')?.addEventListener('click', async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        const result = await sendEmailAuthOtp(email, purpose, fullName);
        button.disabled = false;
        error.textContent = result.error ? formatAuthError(result.error) : 'A new code has been sent.';
    });
    form.querySelector('#email-otp-code')?.focus();
}
function showPhoneCodeForm(form, phone, purpose) {
    form.innerHTML = `
    <label class="auth-visually-hidden" for="phone-otp-code">SMS verification code</label>
    <input class="text-input" id="phone-otp-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="Enter verification code" required />
    <p class="auth-error" id="phone-otp-error" aria-live="polite">Enter the code sent to your phone.</p>
    <button class="btn-primary auth-entry-btn" type="submit" id="phone-otp-submit">Verify code</button>
    <button class="auth-link-btn" id="phone-otp-resend" type="button">Send another code</button>`;
    const error = form.querySelector('#phone-otp-error');
    form.querySelector('#phone-otp-resend')?.addEventListener('click', async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        const result = await sendPhoneAuthOtp(phone, purpose);
        button.disabled = false;
        error.textContent = result.error ? formatAuthError(result.error) : 'A new code has been sent.';
    });
    form.querySelector('#phone-otp-code')?.focus();
}
export function renderWelcome(root) {
    const hasPinStored = store.getState().pinHash !== '';
    root.innerHTML = `
    <div class="screen auth-screen auth-screen--scenic">
      <header class="auth-hero"><h1>Welcome</h1></header>
      <section class="auth-sheet auth-sheet--welcome" aria-label="Get started">
        <button class="btn-secondary-outline auth-entry-btn" id="welcome-login" type="button">Sign in</button>
        <button class="btn-primary auth-entry-btn" id="welcome-signup" type="button">Sign up</button>
        ${hasPinStored ? '<button class="auth-guest-btn" id="welcome-local-pin" type="button">Use device PIN (offline)</button>' : ''}
        <button class="auth-guest-btn" id="welcome-guest" type="button">Continue without an account</button>
      </section>
    </div>`;
    root.querySelector('#welcome-login')?.addEventListener('click', () => store.navigateTo('login'));
    root.querySelector('#welcome-signup')?.addEventListener('click', () => store.navigateTo('signup'));
    root.querySelector('#welcome-guest')?.addEventListener('click', () => store.navigateTo('setup-pin'));
    root.querySelector('#welcome-local-pin')?.addEventListener('click', () => store.navigateTo('calculator'));
}
export function renderSignup(root) {
    root.innerHTML = `
    <div class="screen auth-screen auth-screen--scenic">
      <header class="auth-hero"><h1>Create Account</h1></header>
      <section class="auth-sheet">
        <form class="auth-form" id="signup-form" autocomplete="on" novalidate>
          <label class="auth-visually-hidden" for="su-name">Full name</label>
          <input class="text-input auth-line-input" id="su-name" type="text" placeholder="Full name" autocomplete="name" maxlength="100" required />
          <label class="auth-visually-hidden" for="su-email">Email address</label>
          <input class="text-input" id="su-email" type="email" placeholder="Email address" autocomplete="email" required />
          <label class="auth-visually-hidden" for="su-phone">Phone number</label>
          <input class="text-input" id="su-phone" type="tel" placeholder="Phone number (e.g., +27 82 123 4567)" autocomplete="tel" required />
          <label class="auth-visually-hidden" for="su-password">Password</label>
          <input class="text-input" id="su-password" type="password" placeholder="Create a password (at least 8 characters)" autocomplete="new-password" minlength="8" required />
          <label class="auth-visually-hidden" for="su-password-confirm">Confirm password</label>
          <input class="text-input" id="su-password-confirm" type="password" placeholder="Confirm password" autocomplete="new-password" minlength="8" required />
          
          <div class="auth-otp-choice" style="margin: 12px 0; padding: 12px; background: var(--surface2); border-radius: 8px;">
            <p style="font-size: 0.85rem; margin-bottom: 8px; color: var(--text);">Verification method:</p>
            <label style="display: flex; align-items: center; margin-bottom: 6px; cursor: pointer;">
              <input type="radio" name="otp-method" value="email" checked style="margin-right: 8px;" />
              <span style="font-size: 0.85rem;">Email verification code</span>
            </label>
            <label style="display: flex; align-items: center; cursor: pointer;">
              <input type="radio" name="otp-method" value="sms" style="margin-right: 8px;" />
              <span style="font-size: 0.85rem;">SMS verification code</span>
            </label>
          </div>
          
          <p class="auth-subtitle">Verify it with the code we send to activate your account.</p>
          <p class="auth-error" id="su-error" aria-live="polite"></p>
          <button class="btn-primary auth-entry-btn" type="submit" id="su-submit">Create account</button>
        </form>
        <p class="auth-switch">Already have an account? <button class="auth-link-btn" id="btn-to-login" type="button">Sign in</button></p>
        <button class="auth-back-btn" id="btn-to-welcome" type="button">Back</button>
      </section>
    </div>`;
    root.querySelector('#btn-to-login')?.addEventListener('click', () => store.navigateTo('login'));
    root.querySelector('#btn-to-welcome')?.addEventListener('click', () => store.navigateTo('welcome'));
    const form = root.querySelector('#signup-form');
    const nameInput = root.querySelector('#su-name');
    const emailInput = root.querySelector('#su-email');
    const phoneInput = root.querySelector('#su-phone');
    const passwordInput = root.querySelector('#su-password');
    const passwordConfirmInput = root.querySelector('#su-password-confirm');
    const error = root.querySelector('#su-error');
    const submit = root.querySelector('#su-submit');
    let pendingEmail = '';
    let pendingPhone = '';
    let pendingName = '';
    let pendingPassword = '';
    let awaitingCode = false;
    let emailVerified = false;
    let otpMethod = 'email';
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (awaitingCode) {
            if (otpMethod === 'sms') {
                const code = form.querySelector('#phone-otp-code');
                const codeError = form.querySelector('#phone-otp-error');
                const verifyButton = form.querySelector('#phone-otp-submit');
                verifyButton.disabled = true;
                const verificationResult = await verifyPhoneOtp(pendingPhone, code.value);
                if (!verificationResult.error) {
                    // Phone verified, now set password
                    const result = await setAuthenticatedPassword(pendingPassword);
                    verifyButton.disabled = false;
                    if (result.error) {
                        codeError.textContent = formatAuthError(result.error);
                        return;
                    }
                    pendingPassword = '';
                    return;
                }
                verifyButton.disabled = false;
                codeError.textContent = formatAuthError(verificationResult.error, 'otp');
                return;
            }
            else {
                const code = form.querySelector('#email-otp-code');
                const codeError = form.querySelector('#email-otp-error');
                const verifyButton = form.querySelector('#email-otp-submit');
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
        }
        error.textContent = '';
        const fullName = nameInput.value.trim();
        const email = validateEmail(emailInput.value);
        const phone = phoneInput.value.trim();
        const otpMethodRadio = form.querySelector('input[name="otp-method"]:checked');
        otpMethod = otpMethodRadio?.value || 'email';
        if (!fullName) {
            error.textContent = 'Please enter your name.';
            return;
        }
        if (!email) {
            error.textContent = 'Enter a valid email address.';
            return;
        }
        if (!phone) {
            error.textContent = 'Please enter your phone number.';
            return;
        }
        if (!/^\+?\d{10,15}$/.test(phone.replace(/\s/g, ''))) {
            error.textContent = 'Please enter a valid phone number (e.g., +27821234567).';
            return;
        }
        if (passwordInput.value.length < 8) {
            error.textContent = 'Use a password with at least 8 characters.';
            return;
        }
        if (passwordInput.value !== passwordConfirmInput.value) {
            error.textContent = 'Passwords do not match.';
            return;
        }
        submit.disabled = true;
        submit.textContent = 'Sending code…';
        // Send OTP based on selected method
        const result = otpMethod === 'sms'
            ? await sendPhoneAuthOtp(phone, 'signup')
            : await sendEmailAuthOtp(email, 'signup', fullName, phone);
        submit.disabled = false;
        submit.textContent = 'Create account';
        if (result.error) {
            error.textContent = formatAuthError(result.error);
            return;
        }
        pendingEmail = email;
        pendingPhone = phone;
        pendingName = fullName;
        pendingPassword = passwordInput.value;
        awaitingCode = true;
        // Save phone to sessionStorage
        if (phone) {
            sessionStorage.setItem('temp_signup_phone', phone);
        }
        if (otpMethod === 'sms') {
            showPhoneCodeForm(form, pendingPhone, 'signup');
        }
        else {
            showEmailCodeForm(form, pendingEmail, 'signup', pendingName);
        }
    });
}
export function renderLogin(root) {
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
          <button class="auth-link-btn" id="btn-forgot-password" type="button">Forgot password?</button>
        </form>
        <button class="auth-link-btn" id="btn-email-code" type="button">Sign in with an email code instead</button>
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
    root.querySelector('#btn-forgot-password')?.addEventListener('click', () => store.navigateTo('forgot-password'));
    const form = root.querySelector('#login-form');
    const emailInput = root.querySelector('#li-email');
    const passwordInput = root.querySelector('#li-password');
    const error = root.querySelector('#li-error');
    const submit = root.querySelector('#li-submit');
    const emailCodeButton = root.querySelector('#btn-email-code');
    let pendingEmail = '';
    let awaitingCode = false;
    emailCodeButton.addEventListener('click', async () => {
        error.textContent = '';
        const email = validateEmail(emailInput.value);
        if (!email) {
            error.textContent = 'Enter a valid email address.';
            return;
        }
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
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (awaitingCode) {
            const code = form.querySelector('#email-otp-code');
            const codeError = form.querySelector('#email-otp-error');
            const verifyButton = form.querySelector('#email-otp-submit');
            verifyButton.disabled = true;
            const result = await verifyEmailOtp(pendingEmail, code.value);
            verifyButton.disabled = false;
            if (result.error)
                codeError.textContent = formatAuthError(result.error, 'otp');
            return;
        }
        error.textContent = '';
        const email = validateEmail(emailInput.value);
        if (!email) {
            error.textContent = 'Enter a valid email address.';
            return;
        }
        if (!passwordInput.value) {
            error.textContent = 'Enter your password.';
            return;
        }
        submit.disabled = true;
        const result = await signInWithPassword(email, passwordInput.value);
        submit.disabled = false;
        if (result.error) {
            error.textContent = formatAuthError(result.error, 'password');
        }
    });
}
export function renderVerifyEmail(root) {
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
export function renderForgotPassword(root) {
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
    const form = root.querySelector('#forgot-password-form');
    const emailInput = root.querySelector('#fp-email');
    const error = root.querySelector('#fp-error');
    const success = root.querySelector('#fp-success');
    const submit = root.querySelector('#fp-submit');
    form.addEventListener('submit', async (event) => {
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
export function renderResetPassword(root) {
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
    const form = root.querySelector('#reset-password-form');
    const passwordInput = root.querySelector('#rp-password');
    const passwordConfirmInput = root.querySelector('#rp-password-confirm');
    const error = root.querySelector('#rp-error');
    const submit = root.querySelector('#rp-submit');
    form.addEventListener('submit', async (event) => {
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
export function renderChangePassword(root) {
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
    const form = root.querySelector('#change-password-form');
    const currentInput = root.querySelector('#cp-current');
    const newPasswordInput = root.querySelector('#cp-new');
    const newPasswordConfirmInput = root.querySelector('#cp-new-confirm');
    const error = root.querySelector('#cp-error');
    const success = root.querySelector('#cp-success');
    const submit = root.querySelector('#cp-submit');
    form.addEventListener('submit', async (event) => {
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

import { getClient, DB_CONFIGURED, signUp, signIn, signOut, getUser, onAuthStateChange, fetchAlertStats, fetchRecentAlerts, resetPassword, verifyPasswordResetOtp, } from './db.js';
import { loadAppearance, applyAppearance } from './theme.js';
import './style.css';
applyAppearance(loadAppearance());
let installPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installPrompt = e;
    showInstallButton();
});
window.addEventListener('appinstalled', () => {
    installPrompt = null;
    hideInstallButton();
    const alreadyEl = document.getElementById('dash-install-already');
    if (alreadyEl)
        alreadyEl.style.display = 'block';
});
function showInstallButton() {
    const btn = document.getElementById('dash-install-btn');
    const headerB = document.getElementById('dash-header-install');
    if (btn)
        btn.style.display = 'inline-flex';
    if (headerB)
        headerB.style.display = 'inline-flex';
}
function hideInstallButton() {
    const btn = document.getElementById('dash-install-btn');
    const headerB = document.getElementById('dash-header-install');
    if (btn)
        btn.style.display = 'none';
    if (headerB)
        headerB.style.display = 'none';
}
function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window['MSStream'];
}
function isInStandaloneMode() {
    const nav = navigator as Navigator & { standalone?: boolean };
    return window.matchMedia('(display-mode: standalone)').matches ||
        nav.standalone === true;
}
async function boot() {
    if (isIos() && !isInStandaloneMode()) {
        const iosEl = document.getElementById('dash-install-ios');
        if (iosEl)
            iosEl.style.display = 'block';
    }
    if (isInStandaloneMode()) {
        const alreadyEl = document.getElementById('dash-install-already');
        if (alreadyEl)
            alreadyEl.style.display = 'block';
    }
    if (!DB_CONFIGURED) {
        showNoConfig();
        return;
    }
    document.getElementById('dash-install-btn')?.addEventListener('click', async () => {
        if (!installPrompt)
            return;
        await installPrompt.prompt();
    });
    document.getElementById('dash-header-install')?.addEventListener('click', async () => {
        if (!installPrompt)
            return;
        await installPrompt.prompt();
    });
    const user = await getUser();
    if (user) {
        showDashboard(user.email ?? '');
    }
    else {
        showAuthGate();
    }
    onAuthStateChange(authUser => {
        if (authUser) {
            showDashboard(authUser.email ?? '');
        }
        else {
            showAuthGate();
        }
    });
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
        const { data } = await getClient().auth.getSession();
        if (data.session?.user) {
            showDashboard(data.session.user.email ?? '');
        }
    }
}
function showNoConfig() {
    const gate = document.getElementById('dash-auth-gate');
    gate.innerHTML = `
    <div class="dash-no-config">
      <h2>Account dashboard unavailable</h2>
      <p>The dashboard is currently offline. Open the app to manage your safety plan on this device.</p>
      <a class="btn-primary" href="/" style="display:inline-flex;margin-top:16px;text-decoration:none">
        Open app
      </a>
    </div>
  `;
}
function showAuthGate() {
    const gate = document.getElementById('dash-auth-gate');
    const content = document.getElementById('dash-content');
    gate.style.display = 'block';
    content.style.display = 'none';
    updateGreeting('Sign in or create an account to view your dashboard.');
    wireAuthForms();
}
function wireAuthForms() {
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const loginWrap = document.getElementById('login-wrap');
    const signupWrap = document.getElementById('signup-wrap');
    const resetWrap = document.getElementById('dash-reset-wrap');
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('dash-tab--active');
        tabSignup.classList.remove('dash-tab--active');
        loginWrap.style.display = 'block';
        signupWrap.style.display = 'none';
        resetWrap.style.display = 'none';
    });
    tabSignup.addEventListener('click', () => {
        tabSignup.classList.add('dash-tab--active');
        tabLogin.classList.remove('dash-tab--active');
        signupWrap.style.display = 'block';
        loginWrap.style.display = 'none';
        resetWrap.style.display = 'none';
    });
    const loginForm = document.getElementById('dash-login-form');
    const liEmailEl = document.getElementById('d-li-email') as HTMLInputElement | null;
    const liPwEl = document.getElementById('d-li-pw') as HTMLInputElement | null;
    const liErrEl = document.getElementById('d-li-error');
    const liSubmitBtn = document.getElementById('d-li-submit') as HTMLButtonElement | null;
    if (!loginForm || !liEmailEl || !liPwEl || !liErrEl || !liSubmitBtn) return;
    document.getElementById('dash-forgot-open')?.addEventListener('click', () => {
        const resetEmail = document.getElementById('d-rp-email') as HTMLInputElement | null;
        if (resetEmail)
            resetEmail.value = liEmailEl.value.trim();
        loginWrap.style.display = 'none';
        signupWrap.style.display = 'none';
        resetWrap.style.display = 'block';
    });
    document.getElementById('d-rp-back')?.addEventListener('click', () => tabLogin.click());
    wireDashboardPasswordReset();
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        liErrEl.textContent = '';
        const email = liEmailEl.value.trim();
        const pw = liPwEl.value;
        if (!email || !pw) {
            liErrEl.textContent = 'Fill in all fields.';
            return;
        }
        liSubmitBtn.disabled = true;
        liSubmitBtn.textContent = 'Signing in…';
        const { error } = await signIn(email, pw);
        liSubmitBtn.disabled = false;
        liSubmitBtn.textContent = 'Sign in';
        if (error) {
            liErrEl.textContent = error;
        }
    });
    const signupForm = document.getElementById('dash-signup-form');
    const suEmailEl = document.getElementById('d-su-email') as HTMLInputElement | null;
    const suPwEl = document.getElementById('d-su-pw') as HTMLInputElement | null;
    const suCfEl = document.getElementById('d-su-cf') as HTMLInputElement | null;
    const suErrEl = document.getElementById('d-su-error');
    const suSubmitBtn = document.getElementById('d-su-submit') as HTMLButtonElement | null;
    if (!signupForm || !suEmailEl || !suPwEl || !suCfEl || !suErrEl || !suSubmitBtn) return;
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        suErrEl.textContent = '';
        const email = suEmailEl.value.trim();
        const pw = suPwEl.value;
        const cf = suCfEl.value;
        if (!email || !pw) {
            suErrEl.textContent = 'Fill in all fields.';
            return;
        }
        if (pw.length < 8) {
            suErrEl.textContent = 'Password must be at least 8 characters.';
            return;
        }
        if (pw !== cf) {
            suErrEl.textContent = 'Passwords do not match.';
            return;
        }
        suSubmitBtn.disabled = true;
        suSubmitBtn.textContent = 'Creating…';
        const { error, alreadyRegistered } = await signUp(email, pw);
        suSubmitBtn.disabled = false;
        suSubmitBtn.textContent = 'Create account';
        if (alreadyRegistered) {
            const message = 'An account with this email already exists. Sign in instead or use “Forgot password?” to reset it.';
            tabLogin.click();
            liEmailEl.value = email;
            liErrEl.textContent = message;
            return;
        }
        if (error) {
            suErrEl.textContent = error;
            return;
        }
        suErrEl.style.color = 'var(--safe)';
        suErrEl.textContent = '✓ Check your email to confirm your account, then sign in.';
        tabLogin.click();
    });
}

function wireDashboardPasswordReset(): void {
    const form = document.getElementById('dash-reset-form') as HTMLFormElement | null;
    const emailEl = document.getElementById('d-rp-email') as HTMLInputElement | null;
    const fields = document.getElementById('d-rp-fields');
    const codeEl = document.getElementById('d-rp-code') as HTMLInputElement | null;
    const passwordEl = document.getElementById('d-rp-password') as HTMLInputElement | null;
    const confirmEl = document.getElementById('d-rp-confirm') as HTMLInputElement | null;
    const errorEl = document.getElementById('d-rp-error');
    const successEl = document.getElementById('d-rp-success');
    const submitBtn = document.getElementById('d-rp-submit') as HTMLButtonElement | null;
    const resendBtn = document.getElementById('d-rp-resend') as HTMLButtonElement | null;
    if (!form || !emailEl || !fields || !codeEl || !passwordEl || !confirmEl || !errorEl || !successEl || !submitBtn || !resendBtn)
        return;

    let codeSent = false;
    async function sendCode(): Promise<void> {
        errorEl.textContent = '';
        successEl.textContent = '';
        const email = emailEl.value.trim();
        if (!email) {
            errorEl.textContent = 'Enter the email address for your account.';
            emailEl.focus();
            return;
        }
        submitBtn.disabled = true;
        resendBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
        const { error } = await resetPassword(email);
        submitBtn.disabled = false;
        resendBtn.disabled = false;
        if (error) {
            errorEl.textContent = error;
            submitBtn.textContent = codeSent ? 'Verify code and update password' : 'Send reset code';
            return;
        }
        codeSent = true;
        emailEl.readOnly = true;
        fields.hidden = false;
        resendBtn.hidden = false;
        submitBtn.textContent = 'Verify code and update password';
        successEl.textContent = 'Check your inbox for a 6-digit code. It may take a few minutes to arrive.';
        codeEl.focus();
    }

    resendBtn.addEventListener('click', () => void sendCode());
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!codeSent) {
            await sendCode();
            return;
        }
        errorEl.textContent = '';
        successEl.textContent = '';
        if (!/^\d{6}$/.test(codeEl.value.trim())) {
            errorEl.textContent = 'Enter the 6-digit code from your email.';
            codeEl.focus();
            return;
        }
        if (passwordEl.value.length < 8) {
            errorEl.textContent = 'Your new password must be at least 8 characters.';
            passwordEl.focus();
            return;
        }
        if (passwordEl.value !== confirmEl.value) {
            errorEl.textContent = 'The new passwords do not match.';
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
            errorEl.textContent = error.toLowerCase().includes('expired') || error.toLowerCase().includes('invalid')
                ? 'That code is invalid or expired. Request a new code and try again.'
                : error;
            return;
        }
        successEl.textContent = 'Password updated. You can now sign in with your new password.';
        form.hidden = true;
    });
}
async function showDashboard(email) {
    const gate = document.getElementById('dash-auth-gate');
    const content = document.getElementById('dash-content');
    gate.style.display = 'none';
    content.style.display = 'block';
    const emailEls = document.querySelectorAll('#dash-user-email, #dash-account-email');
    emailEls.forEach(el => { el.textContent = email; });
    updateGreeting(`Welcome back, ${email.split('@')[0]}.`);
    document.getElementById('dash-signout')?.addEventListener('click', async () => {
        await signOut();
    });
    document.getElementById('dash-account-signout')?.addEventListener('click', async () => {
        await signOut();
    });
    await loadStats();
    await loadRecentAlerts();
}
async function loadStats() {
    const stats = await fetchAlertStats();
    if (!stats) {
        document.getElementById('stat-total').textContent = '0';
        document.getElementById('stat-opened').textContent = '0';
        document.getElementById('stat-failed').textContent = '0';
        document.getElementById('stat-location').textContent = '0';
        document.getElementById('stat-last').textContent = 'Never';
        return;
    }
    document.getElementById('stat-total').textContent = String(stats.total_alerts);
    document.getElementById('stat-opened').textContent = String(stats.total_opened);
    document.getElementById('stat-failed').textContent = String(stats.total_failed);
    document.getElementById('stat-location').textContent = String(stats.alerts_with_location);
    document.getElementById('stat-last').textContent = stats.last_alert_at
        ? new Date(stats.last_alert_at).toLocaleString('en-ZA')
        : 'Never';
}
async function loadRecentAlerts() {
    const tbody = document.getElementById('dash-alerts-body');
    const rows = await fetchRecentAlerts(20);
    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="dash-table-empty">No alerts yet.</td></tr>';
        return;
    }
    tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${new Date(r.fired_at).toLocaleString('en-ZA')}</td>
      <td>${r.contact_count}</td>
      <td class="dash-cell-good">${r.contacts_opened}</td>
      <td class="${r.contacts_failed > 0 ? 'dash-cell-bad' : ''}">${r.contacts_failed}</td>
    <td>${r.location_shared ? 'Yes' : 'No'}</td>
    </tr>
  `).join('');
}
function updateGreeting(text) {
    const el = document.getElementById('dash-greeting');
    if (el)
        el.textContent = text;
}
boot();

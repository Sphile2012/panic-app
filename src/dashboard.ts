import { getClient, DB_CONFIGURED, signUp, signIn, signOut, getUser, onAuthStateChange, fetchAlertStats, fetchRecentAlerts, } from './db.js';
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
      <h2>Supabase not configured</h2>
      <p>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>
         to your <code>.env</code> file, then rebuild.</p>
      <p>See <code>.env.example</code> for the format.</p>
      <a class="btn-primary" href="/" style="display:inline-flex;margin-top:16px;text-decoration:none">
        ← Open app (offline mode)
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
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('dash-tab--active');
        tabSignup.classList.remove('dash-tab--active');
        loginWrap.style.display = 'block';
        signupWrap.style.display = 'none';
    });
    tabSignup.addEventListener('click', () => {
        tabSignup.classList.add('dash-tab--active');
        tabLogin.classList.remove('dash-tab--active');
        signupWrap.style.display = 'block';
        loginWrap.style.display = 'none';
    });
    const loginForm = document.getElementById('dash-login-form');
    const liEmailEl = document.getElementById('d-li-email') as HTMLInputElement | null;
    const liPwEl = document.getElementById('d-li-pw') as HTMLInputElement | null;
    const liErrEl = document.getElementById('d-li-error');
    const liSubmitBtn = document.getElementById('d-li-submit') as HTMLButtonElement | null;
    if (!loginForm || !liEmailEl || !liPwEl || !liErrEl || !liSubmitBtn) return;
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
        const { error } = await signUp(email, pw);
        suSubmitBtn.disabled = false;
        suSubmitBtn.textContent = 'Create account';
        if (error) {
            suErrEl.textContent = error;
            return;
        }
        suErrEl.style.color = 'var(--safe)';
        suErrEl.textContent = '✓ Check your email to confirm your account, then sign in.';
        tabLogin.click();
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

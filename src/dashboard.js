import { getClient, DB_CONFIGURED, sendEmailAuthLink, signOut, getUser, onAuthStateChange, fetchAlertStats, fetchRecentAlerts, } from './db.js';
import './strings/groupC.js';
import { loadAppearance, applyAppearance } from './theme.js';
import { t, getLang, languageBarHtml, bindLanguageBar } from './i18n.js';
import { formatAuthError, SIGNUP_CONFIRMATION_MESSAGE } from './authMessages.js';
import './style.css';
applyAppearance(loadAppearance());
let currentEmail = null;
let noConfig = false;
let installPrompt = null;
let dashboardVisible = false;
let authFormsWired = false;
const DASH_LOCALES = { en: 'en-ZA', zu: 'zu-ZA', st: 'st-ZA', af: 'af-ZA' };
function applyDashboardTranslations() {
    document.title = `Panic Ring — ${t('c.dashboard.title')}`;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset['i18n'] ?? '');
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        el.innerHTML = t(el.dataset['i18nHtml'] ?? '');
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.dataset['i18nPlaceholder'] ?? '');
    });
}
function refreshLanguageBar() {
    const mount = document.getElementById('dashboard-language-bar');
    if (!mount)
        return;
    mount.innerHTML = languageBarHtml();
    bindLanguageBar(mount, () => {
        applyDashboardTranslations();
        refreshLanguageBar();
        if (noConfig)
            showNoConfig();
        else if (currentEmail !== null) {
            updateGreeting(t('c.dashboard.welcome', { name: currentEmail.split('@')[0] }));
            void loadStats();
            void loadRecentAlerts();
        }
        else
            updateGreeting(t('c.dashboard.signInPrompt'));
    });
}
refreshLanguageBar();
applyDashboardTranslations();
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
    const nav = navigator;
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
    noConfig = true;
    const gate = document.getElementById('dash-auth-gate');
    gate.innerHTML = `
    <div class="dash-no-config">
      <h2>${t('c.dashboard.noConfigTitle')}</h2>
      <p>${t('c.dashboard.noConfigBody')}</p>
      <a class="btn-primary" href="/" style="display:inline-flex;margin-top:16px;text-decoration:none">
        ${t('c.dashboard.openOffline')}
      </a>
    </div>
  `;
}
function showAuthGate() {
    noConfig = false;
    currentEmail = null;
    dashboardVisible = false;
    const gate = document.getElementById('dash-auth-gate');
    const content = document.getElementById('dash-content');
    gate.style.display = 'block';
    content.style.display = 'none';
    updateGreeting(t('c.dashboard.signInPrompt'));
    wireAuthForms();
}
function wireAuthForms() {
    if (authFormsWired)
        return;
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
    const liEmailEl = document.getElementById('d-li-email');
    const liErrEl = document.getElementById('d-li-error');
    const liSubmitBtn = document.getElementById('d-li-submit');
    if (!loginForm || !liEmailEl || !liErrEl || !liSubmitBtn)
        return;
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        liErrEl.textContent = '';
        const email = liEmailEl.value.trim();
        if (!email) {
            liErrEl.textContent = t('c.dashboard.fillFields');
            return;
        }
        liSubmitBtn.disabled = true;
        liSubmitBtn.textContent = 'Sending email link…';
        const { error } = await sendEmailAuthLink(email, 'login');
        liSubmitBtn.disabled = false;
        liSubmitBtn.textContent = 'Email me a sign-in link';
        if (error) {
            liErrEl.textContent = formatAuthError(error);
            return;
        }
        liErrEl.style.color = 'var(--safe)';
        liErrEl.textContent = 'Check your email for a secure sign-in link.';
    });
    const signupForm = document.getElementById('dash-signup-form');
    const suEmailEl = document.getElementById('d-su-email');
    const suErrEl = document.getElementById('d-su-error');
    const suSubmitBtn = document.getElementById('d-su-submit');
    if (!signupForm || !suEmailEl || !suErrEl || !suSubmitBtn)
        return;
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        suErrEl.textContent = '';
        suErrEl.style.color = '';
        const email = suEmailEl.value.trim();
        if (!email) {
            suErrEl.textContent = t('c.dashboard.fillFields');
            return;
        }
        suSubmitBtn.disabled = true;
        suSubmitBtn.textContent = 'Sending email link…';
        const { error } = await sendEmailAuthLink(email, 'signup');
        suSubmitBtn.disabled = false;
        suSubmitBtn.textContent = 'Create account with email';
        if (error) {
            suErrEl.textContent = formatAuthError(error);
            return;
        }
        suErrEl.style.color = 'var(--safe)';
        suErrEl.textContent = SIGNUP_CONFIRMATION_MESSAGE;
    });
    authFormsWired = true;
}
async function showDashboard(email) {
    if (dashboardVisible)
        return;
    dashboardVisible = true;
    noConfig = false;
    currentEmail = email;
    const gate = document.getElementById('dash-auth-gate');
    const content = document.getElementById('dash-content');
    gate.style.display = 'none';
    content.style.display = 'block';
    const emailEls = document.querySelectorAll('#dash-user-email, #dash-account-email');
    emailEls.forEach(el => { el.textContent = email; });
    updateGreeting(t('c.dashboard.welcome', { name: email.split('@')[0] }));
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
        document.getElementById('stat-last').textContent = t('c.dashboard.never');
        return;
    }
    document.getElementById('stat-total').textContent = String(stats.total_alerts);
    document.getElementById('stat-opened').textContent = String(stats.total_opened);
    document.getElementById('stat-failed').textContent = String(stats.total_failed);
    document.getElementById('stat-location').textContent = String(stats.alerts_with_location);
    document.getElementById('stat-last').textContent = stats.last_alert_at
        ? new Date(stats.last_alert_at).toLocaleString('en-ZA')
        : t('c.dashboard.never');
}
async function loadRecentAlerts() {
    const tbody = document.getElementById('dash-alerts-body');
    const rows = await fetchRecentAlerts(20);
    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="dash-table-empty">${t('c.dashboard.noAlerts')}</td></tr>`;
        return;
    }
    tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${new Date(r.fired_at).toLocaleString(DASH_LOCALES[getLang()] || 'en-ZA')}</td>
      <td>${r.contact_count}</td>
      <td class="dash-cell-good">${r.contacts_opened}</td>
      <td class="${r.contacts_failed > 0 ? 'dash-cell-bad' : ''}">${r.contacts_failed}</td>
    <td>${r.location_shared ? t('c.dashboard.yes') : t('c.dashboard.no')}</td>
    </tr>
  `).join('');
}
function updateGreeting(text) {
    const el = document.getElementById('dash-greeting');
    if (el)
        el.textContent = text;
}
boot();

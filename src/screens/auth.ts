import '../strings/groupC.js';
import { store } from '../state.js';
import { signUp, signIn, requestPasswordReset, updatePassword } from '../db.js';
import { t, languageBarHtml, bindLanguageBar, authErrorKey } from '../i18n.js';
function logoHtml() {
    return `
    <div class="auth-logo">
      <div class="auth-logo-ring" aria-hidden="true"></div>
      <h1 class="auth-logo-title">Panic Ring</h1>
    </div>
    ${languageBarHtml()}
  `;
}
function offlineNotice(btnId) {
    return `
    <div class="auth-notice auth-notice--warn">
      ${t('auth.skip.note')}
      <button class="auth-skip-btn" id="${btnId}">${t('auth.skip.btn')}</button>
    </div>
  `;
}
export function renderSignup(root) {
    root.innerHTML = `
    <div class="screen auth-screen">
      ${logoHtml()}
      <div class="auth-card">
        <h2 class="auth-title">${t('auth.create')}</h2>
        <p class="auth-subtitle">${t('auth.signup.sub')}</p>
        <form class="auth-form" id="signup-form" autocomplete="on" novalidate>
          <label class="field-label" for="su-email">${t('auth.id.label')}</label>
          <input class="text-input" id="su-email" type="text" inputmode="email"
            placeholder="${t('auth.id.placeholder')}" autocomplete="username" required />

          <label class="field-label" for="su-password">${t('auth.password')}</label>
          <div class="password-wrap">
            <input class="text-input" id="su-password" type="password"
              placeholder="${t('auth.password.new')}" autocomplete="new-password"
              minlength="8" required />
            <button type="button" class="pw-toggle" data-for="su-password"
              aria-label="${t('auth.show')}">${t('auth.show')}</button>
          </div>

          <label class="field-label" for="su-confirm">${t('auth.confirm')}</label>
          <div class="password-wrap">
            <input class="text-input" id="su-confirm" type="password"
              placeholder="${t('auth.confirm.placeholder')}" autocomplete="new-password" required />
            <button type="button" class="pw-toggle" data-for="su-confirm"
              aria-label="${t('auth.show')}">${t('auth.show')}</button>
          </div>

          <p class="auth-error" id="su-error" aria-live="polite"></p>
          <button class="btn-primary" type="submit" id="su-submit">${t('auth.create')}</button>
        </form>
        <p class="auth-switch">
          ${t('auth.haveaccount')}
          <button class="auth-link-btn" id="btn-to-login">${t('auth.signin')}</button>
        </p>
      </div>
    </div>
  `;
    bindLanguageBar(root, () => renderSignup(root));
    root.querySelector('#btn-skip')?.addEventListener('click', () => {
        store.navigateTo('setup-pin');
    });
    root.querySelector('#btn-to-login').addEventListener('click', () => {
        store.navigateTo('login');
    });
    bindPwToggles(root);
    const form = root.querySelector('#signup-form');
    const emailEl = root.querySelector('#su-email');
    const pwEl = root.querySelector('#su-password');
    const cfEl = root.querySelector('#su-confirm');
    const errEl = root.querySelector('#su-error');
    const submitBtn = root.querySelector('#su-submit');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errEl.textContent = '';
        errEl.style.color = '';
        const email = emailEl.value.trim();
        const pw = pwEl.value;
        const cf = cfEl.value;
        if (!email) {
            errEl.textContent = t('auth.err.id');
            return;
        }
        if (!pw || !cf) {
            errEl.textContent = t('auth.err.pwneed');
            return;
        }
        if (pw.length < 8) {
            errEl.textContent = t('auth.err.pwshort');
            return;
        }
        if (pw !== cf) {
            errEl.textContent = t('auth.err.pwmatch');
            return;
        }
        submitBtn.disabled = true;
        submitBtn.textContent = t('auth.busy.create');
        const { error, needsConfirm, identity } = await signUp(email, pw);
        submitBtn.disabled = false;
        submitBtn.textContent = t('auth.create');
        if (error) {
            errEl.textContent = t(authErrorKey(error));
            return;
        }
        if (needsConfirm) {
            store.navigateTo('verify-email');
        } else if (identity) {
            store.setAuthEmail(identity);
        } else {
            errEl.style.color = 'var(--safe)';
            errEl.textContent = t('auth.signup.created');
        }
    });
}
function bindPwToggles(root) {
    root.querySelectorAll('.pw-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const inp = root.querySelector(`#${btn.dataset['for']}`);
            inp.type = inp.type === 'password' ? 'text' : 'password';
            const label = inp.type === 'password' ? t('auth.show') : t('auth.hide');
            btn.textContent = label;
            btn.setAttribute('aria-label', label);
        });
    });
}
export function renderLogin(root) {
    root.innerHTML = `
    <div class="screen auth-screen">
      ${logoHtml()}
      <div class="auth-card">
        <h2 class="auth-title">${t('auth.signin')}</h2>
        <form class="auth-form" id="login-form" autocomplete="on" novalidate>
          <label class="field-label" for="li-email">${t('auth.id.label')}</label>
          <input class="text-input" id="li-email" type="text" inputmode="email"
            placeholder="${t('auth.id.placeholder')}" autocomplete="username" required />

          <label class="field-label" for="li-password">${t('auth.password')}</label>
          <div class="password-wrap">
            <input class="text-input" id="li-password" type="password"
              placeholder="${t('auth.password')}" autocomplete="current-password" required />
            <button type="button" class="pw-toggle" data-for="li-password"
              aria-label="${t('auth.show')}">${t('auth.show')}</button>
          </div>

          <p class="auth-error" id="li-error" aria-live="polite"></p>
          <button class="btn-primary" type="submit" id="li-submit">${t('auth.signin')}</button>
        </form>
        <p class="auth-switch">
          <button class="auth-link-btn" id="btn-forgot" type="button">${t('auth.forgot')}</button>
        </p>
        <p class="auth-switch">
          ${t('auth.noaccount')}
          <button class="auth-link-btn" id="btn-to-signup">${t('auth.createone')}</button>
        </p>
      </div>
    </div>
  `;
    bindLanguageBar(root, () => renderLogin(root));
    root.querySelector('#btn-forgot').addEventListener('click', () => {
        store.navigateTo('forgot-password');
    });
    root.querySelector('#btn-skip')?.addEventListener('click', () => {
        store.navigateTo('setup-pin');
    });
    root.querySelector('#btn-to-signup').addEventListener('click', () => {
        store.navigateTo('signup');
    });
    bindPwToggles(root);
    const form = root.querySelector('#login-form');
    const emailEl = root.querySelector('#li-email');
    const pwEl = root.querySelector('#li-password');
    const errEl = root.querySelector('#li-error');
    const submitBtn = root.querySelector('#li-submit');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errEl.textContent = '';
        errEl.style.color = '';
        const email = emailEl.value.trim();
        const pw = pwEl.value;
        if (!email) {
            errEl.textContent = t('auth.err.id');
            return;
        }
        if (!pw) {
            errEl.textContent = t('auth.err.pwneed');
            return;
        }
        submitBtn.disabled = true;
        submitBtn.textContent = t('auth.busy.signin');
        const { error, identity } = await signIn(email, pw);
        submitBtn.disabled = false;
        submitBtn.textContent = t('auth.signin');
        if (error) {
            errEl.textContent = t(authErrorKey(error));
            if (error === 'confirm')
                setTimeout(() => store.navigateTo('verify-email'), 1200);
        } else if (identity) {
            store.setAuthEmail(identity);
        }
    });
}
export function renderForgotPassword(root) {
    root.innerHTML = `
    <div class="screen auth-screen">
      ${logoHtml()}
      <div class="auth-card">
        <h2 class="auth-title">${t('auth.forgot')}</h2>
        <p class="auth-subtitle">${t('auth.forgot.body')}</p>
        <form class="auth-form" id="fp-form" novalidate>
          <label class="field-label" for="fp-email">${t('auth.id.label')}</label>
          <input class="text-input" id="fp-email" type="text" inputmode="email"
            placeholder="${t('auth.id.placeholder')}" autocomplete="username" required />
          <p class="auth-error" id="fp-msg" aria-live="polite"></p>
          <button class="btn-primary" type="submit" id="fp-submit">${t('auth.forgot.send')}</button>
        </form>
        <p class="auth-switch">
          <button class="auth-link-btn" id="btn-back">${t('auth.back')}</button>
        </p>
      </div>
    </div>
  `;
    bindLanguageBar(root, () => renderForgotPassword(root));
    root.querySelector('#btn-back').addEventListener('click', () => store.navigateTo('login'));
    const msg = root.querySelector('#fp-msg');
    root.querySelector('#fp-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        msg.style.color = '';
        const { error } = await requestPasswordReset(root.querySelector('#fp-email').value);
        if (error) {
            msg.textContent = t(error === 'id' ? 'auth.err.id' : error === 'phone' ? 'auth.forgot.phone' : 'auth.err.service');
            return;
        }
        msg.style.color = 'var(--safe)';
        msg.textContent = t('auth.forgot.sent');
    });
}
export function renderResetPassword(root) {
    root.innerHTML = `
    <div class="screen auth-screen">
      ${logoHtml()}
      <div class="auth-card">
        <h2 class="auth-title">${t('auth.reset.title')}</h2>
        <form class="auth-form" id="rp-form" novalidate>
          <label class="field-label" for="rp-pw">${t('auth.password')}</label>
          <input class="text-input" id="rp-pw" type="password" placeholder="${t('auth.password.new')}" autocomplete="new-password" />
          <p class="auth-error" id="rp-msg" aria-live="polite"></p>
          <button class="btn-primary" type="submit">${t('auth.reset.save')}</button>
        </form>
      </div>
    </div>
  `;
    bindLanguageBar(root, () => renderResetPassword(root));
    const msg = root.querySelector('#rp-msg');
    root.querySelector('#rp-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const pw = root.querySelector('#rp-pw').value;
        if (pw.length < 8) {
            msg.textContent = t('auth.password.new');
            return;
        }
        if (await updatePassword(pw))
            store.navigateTo('calculator');
        else
            msg.textContent = t('auth.err.service');
    });
}
export function renderVerifyEmail(root) {
    root.innerHTML = `
    <div class="screen auth-screen">
      ${logoHtml()}
      <div class="auth-card">
        <h2 class="auth-title">${t('auth.verify.title')}</h2>
        <p class="auth-subtitle">${t('auth.verify.body')}</p>
        <button class="btn-primary" id="btn-done" style="margin-top:20px">
          ${t('auth.verify.done')}
        </button>
        <p class="auth-switch">
          <button class="auth-link-btn" id="btn-back">${t('auth.back')}</button>
        </p>
      </div>
    </div>
  `;
    bindLanguageBar(root, () => renderVerifyEmail(root));
    root.querySelector('#btn-done').addEventListener('click', () => {
        store.navigateTo('login');
    });
    root.querySelector('#btn-back').addEventListener('click', () => {
        store.navigateTo('login');
    });
}

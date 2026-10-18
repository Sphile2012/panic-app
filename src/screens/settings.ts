import '../strings/groupA.js';
import { store } from '../state.js';
import { t, languageBarHtml, bindLanguageBar } from '../i18n.js';
import { displayIdentity } from '../db.js';
import { evidenceEnabled, setEvidenceEnabled, requestCameraAccess } from '../evidence.js';
export function renderSettings(root: HTMLElement) {
    const { autoLockMinutes, authEmail } = store.getState();
    const who = displayIdentity(authEmail);
    root.innerHTML = `
    <div class="screen settings-screen">

      <header class="screen-header">
        <button class="btn-back-small" id="btn-back"         aria-label="${t('common.back')}">${t('common.back')}</button>
                <h2 class="screen-title">${t('menu.settings')}</h2>
      </header>

      <section class="settings-section">
        <h3 class="settings-section-title">${t('set.language')}</h3>
        ${languageBarHtml()}
      </section>

      <!-- Account -->

      <!-- Appearance -->
      <section class="settings-section">
        <h3 class="settings-section-title">${t('a.set.appearance')}</h3>
        <p class="settings-section-body">${t('a.set.appearancebody')}</p>
        <button class="btn-secondary-outline" id="btn-appearance">${t('a.set.openappearance')}</button>
      </section>

      <section class="settings-section">
        <h3 class="settings-section-title">${t('a.set.photos')}</h3>
        <p class="settings-section-body">${t('a.set.photosbody')}</p>
        <label class="settings-radio"><input type="checkbox" id="evidence-toggle" ${evidenceEnabled() ? 'checked' : ''}> ${t('a.set.photostoggle')}</label>
        <p class="settings-section-body" id="evidence-msg"></p>
      </section>

      <!-- Auto-lock -->
      <section class="settings-section">
        <h3 class="settings-section-title">${t('a.set.autolock')}</h3>
        <p class="settings-section-body">${t('a.set.autolockbody')}</p>
        <div class="settings-radio-group">
          ${[
        { val: 1, label: t('a.set.min1') },
        { val: 5, label: t('a.set.minn', { n: 5 }) },
        { val: 10, label: t('a.set.minn', { n: 10 }) },
        { val: 0, label: t('a.set.off') },
    ].map(opt => `
            <label class="radio-label">
              <input type="radio" name="auto-lock" value="${opt.val}"
                ${autoLockMinutes === opt.val ? 'checked' : ''} />
              ${opt.label}
            </label>
          `).join('')}
        </div>
      </section>

      <!-- Change PINs -->
      <section class="settings-section">
        <h3 class="settings-section-title">${t('a.set.changepins')}</h3>
        <form class="setup-form" id="change-pin-form" autocomplete="off">
          <label class="field-label" for="new-pin">${t('a.set.newpin')}</label>
          <input class="pin-input" id="new-pin" type="password" inputmode="numeric"
            maxlength="4" pattern="[0-9]{4}" placeholder="${t('setup.pin.ph')}" autocomplete="new-password" />
          <label class="field-label" for="new-decoy">${t('a.set.newdecoy')}</label>
          <input class="pin-input" id="new-decoy" type="password" inputmode="numeric"
            maxlength="4" pattern="[0-9]{4}" placeholder="${t('setup.pin.ph')}" autocomplete="new-password" />
          <p class="setup-hint" id="pin-change-error" aria-live="polite"></p>
          <button class="btn-secondary-outline" type="submit">${t('a.set.updatepins')}</button>
        </form>
      </section>

      <!-- Trusted circle -->
      <section class="settings-section">
        <h3 class="settings-section-title">${t('app.circle')}</h3>
        <button class="btn-secondary-outline" id="btn-contacts">${t('a.set.managecontacts')}</button>
      </section>

      <!-- About -->
      <section class="settings-section">
        <h3 class="settings-section-title">${t('a.set.about')}</h3>
        <p class="settings-section-body">${t('a.set.aboutbody')}</p>
        <div class="settings-auth-buttons" style="margin-top:8px">
          <button class="btn-secondary-outline" id="btn-about">${t('a.set.aboutbtn')}</button>
          <button class="btn-secondary-outline" id="btn-terms">${t('a.set.terms')}</button>
        </div>
      </section>

      <!-- Danger zone -->
      <section class="settings-section settings-section--danger">
        <h3 class="settings-section-title">${t('a.set.reset')}</h3>
        <p class="settings-section-body">
          ${t('a.set.resetbody')}
        </p>
        <button class="btn-danger" id="btn-reset">${t('a.set.deleteall')}</button>
      </section>

    </div>
  `;
    root.querySelector('#btn-back').addEventListener('click', () => store.navigateTo('app'));
    bindLanguageBar(root, () => renderSettings(root));
    root.querySelector('#btn-about').addEventListener('click', () => store.navigateTo('about'));
    root.querySelector('#btn-terms').addEventListener('click', () => store.navigateTo('terms'));
    root.querySelector('#btn-signout')?.addEventListener('click', async () => {
        if (confirm(t('a.app.signoutconfirm')))
            await store.signOut();
    });
    root.querySelector('#btn-signin')?.addEventListener('click', () => store.navigateTo('login'));
    root.querySelector('#btn-create')?.addEventListener('click', () => store.navigateTo('signup'));
    root.querySelector('#btn-appearance').addEventListener('click', () => store.navigateTo('appearance'));
    root.querySelector('#btn-contacts').addEventListener('click', () => store.navigateTo('contacts'));
    const evToggle = root.querySelector('#evidence-toggle') as HTMLInputElement;
    evToggle.addEventListener('change', async () => {
        const msg = root.querySelector('#evidence-msg') as HTMLElement;
        if (evToggle.checked) {
            const ok = await requestCameraAccess();
            if (!ok) {
                evToggle.checked = false;
                msg.textContent = t('a.set.camdenied');
                return;
            }
        }
        setEvidenceEnabled(evToggle.checked);
        msg.textContent = evToggle.checked ? t('a.set.photoson') : t('a.set.photosoff');
    });
    root.querySelectorAll('input[name="auto-lock"]').forEach((r: HTMLInputElement) => {
        r.addEventListener('change', () => store.setAutoLock(Number(r.value)));
    });
    const pinForm = root.querySelector('#change-pin-form') as HTMLFormElement;
    const newPin = root.querySelector('#new-pin') as HTMLInputElement;
    const newDecoy = root.querySelector('#new-decoy') as HTMLInputElement;
    const pinErr = root.querySelector('#pin-change-error') as HTMLElement;
    pinForm.addEventListener('submit', async (e: SubmitEvent) => {
        e.preventDefault();
        const p = newPin.value.trim();
        const d = newDecoy.value.trim();
        if (!/^\d{4}$/.test(p) || !/^\d{4}$/.test(d)) {
            pinErr.textContent = t('a.set.err.both');
            return;
        }
        if (p === d) {
            pinErr.textContent = t('a.set.err.diff');
            return;
        }
        pinErr.textContent = '';
        await store.changePins(p, d);
        pinErr.style.color = 'var(--safe)';
        pinErr.textContent = t('a.set.pinsupdated');
        pinForm.reset();
        setTimeout(() => { pinErr.textContent = ''; pinErr.style.color = ''; }, 3000);
    });
    root.querySelector('#btn-reset').addEventListener('click', async () => {
        if (confirm(t('a.set.deleteconfirm')))
            await store.factoryReset();
    });
}

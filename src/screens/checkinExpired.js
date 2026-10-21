import '../strings/groupA.js';
import { t } from '../i18n.js';
import { store } from '../state.js';
export function renderCheckinExpired(root) {
    const { contacts } = store.getState();
    root.innerHTML = `
    <section class="screen checkin-expired-screen" aria-labelledby="checkin-expired-title">
      <div class="checkin-expired-mark" aria-hidden="true">!</div>
      <p class="checkin-expired-eyebrow">${t('a.exp.eyebrow')}</p>
      <h1 class="checkin-expired-title" id="checkin-expired-title">${t('a.exp.title')}</h1>
      <p class="checkin-expired-copy">
        ${contacts.length
        ? t('a.exp.copy')
        : t('a.exp.copynone')}
      </p>

      <div class="checkin-expired-note" role="note">
        <strong>${t('a.exp.note1')}</strong>
        <span>${t('a.exp.note2')}</span>
      </div>

      <div class="checkin-expired-actions">
        ${contacts.length
        ? `<button class="btn-primary checkin-expired-send" id="btn-expired-alert">${t('a.exp.prepare')}</button>`
        : `<button class="btn-primary checkin-expired-send" id="btn-expired-contacts">${t('a.exp.addcontacts')}</button>`}
        <button class="btn-secondary-outline" id="btn-expired-safe">${t('a.exp.safe')}</button>
      </div>

      <p class="checkin-expired-footnote">
        ${t('a.exp.foot')}
      </p>
    </section>
  `;
    root.querySelector('#btn-expired-alert')?.addEventListener('click', () => store.navigateTo('location'));
    root.querySelector('#btn-expired-contacts')?.addEventListener('click', () => store.navigateTo('contacts'));
    root.querySelector('#btn-expired-safe')?.addEventListener('click', () => store.navigateTo('app'));
}

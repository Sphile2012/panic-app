import '../strings/groupA.js';
import { t } from '../i18n.js';
import { store } from '../state.js';
import { telUri } from '../storage.js';
export function renderSending(root) {
    const { contacts } = store.getState();
    root.innerHTML = `
    <div class="screen sending-screen">
      <div class="sending-hero">
        <div class="sending-pulse"></div>
        <div class="sending-icon" aria-hidden="true"></div>
      </div>
      <h2 class="sending-title">${t('a.send.title')}</h2>
      <p class="sending-sub" id="sending-sub">
        ${t('a.send.sub')}
      </p>
      <ul class="sending-list" id="sending-list">
        ${contacts.map(sendingRow).join('')}
      </ul>
    </div>
  `;
}
export function updateSendingList(root) {
    const list = root.querySelector('#sending-list');
    if (!list)
        return;
    list.innerHTML = store.getState().contacts.map(sendingRow).join('');
}
export function renderSent(root) {
    const { contacts, alertLocation, locationShared } = store.getState();
    const opened = contacts.filter(c => c.status === 'delivered').length;
    const failed = contacts.filter(c => c.status === 'failed').length;
    const summaryLine = failed > 0
        ? t('a.send.summaryfail', { opened, failed })
        : t(opened === 1 ? 'a.send.one' : 'a.send.many', { n: opened });
    root.innerHTML = `
    <div class="screen sent-screen">

      <div class="sent-hero" aria-hidden="true">${failed > 0 ? '!' : 'OK'}</div>
      <h2 class="sent-title">${t('a.send.sent')}</h2>
      <p class="sent-summary">${summaryLine}</p>

      ${failed > 0 ? `
        <p class="sent-warning">
          ${t('a.send.warning')}
        </p>
      ` : ''}

      <ul class="sending-list">
        ${contacts.map(sentRow).join('')}
      </ul>

      ${locationShared ? `
        <div class="sent-location-box">
          <span class="sent-location-label">${t('a.send.locshared')}</span>
          <span class="sent-location-text">${alertLocation.split('\n')[0]}</span>
          ${alertLocation.includes('http')
        ? `<a class="sent-location-link" href="${alertLocation.split('\n')[1]}"
                 target="_blank" rel="noopener">${t('a.loc.openmaps')}</a>`
        : ''}
        </div>
      ` : `<p class="sent-no-location">${t('a.send.noloc')}</p>`}

      <!-- Always-visible emergency fallback numbers -->
      <div class="emergency-links">
        <p class="emergency-label">${t('a.send.calldirect')}</p>
        <a class="emergency-call" href="tel:10111">
          <span class="emergency-number">10111</span>
          <span class="emergency-name">${t('a.send.saps')}</span>
        </a>
        <a class="emergency-call" href="tel:0800428428">
          <span class="emergency-number">0800 428 428</span>
          <span class="emergency-name">${t('a.send.gbv')}</span>
        </a>
      </div>

      <div class="sent-actions">
        <button class="btn-secondary" id="btn-back">${t('a.send.backcontacts')}</button>
        <button class="btn-danger" id="btn-retry" title="${t('a.send.resendtitle')}">${t('a.send.resend')}</button>
      </div>

    </div>
  `;
    root.querySelector('#btn-back').addEventListener('click', () => {
        store.resetAlertStatuses();
        store.navigateTo('app');
    });
    root.querySelector('#btn-retry').addEventListener('click', () => {
        store.resetAlertStatuses();
        store.navigateTo('location');
    });
}
function sendingRow(c) {
    return `
    <li class="sending-item sending-item--${c.status}">
      <div class="contact-avatar">${c.initials}</div>
      <div class="contact-info">
        <span class="contact-name">${c.name}</span>
        <span class="contact-phone">${c.phone}</span>
      </div>
      <span class="sending-status">${deliveryIcon(c.status)}</span>
    </li>
  `;
}
function sentRow(c) {
    const callLink = c.status === 'failed'
        ? `<a class="sent-call-link" href="${telUri(c.phone)}">${t('a.send.call', { name: c.name })}</a>`
        : '';
    return `
    <li class="sending-item sending-item--${c.status}">
      <div class="contact-avatar">${c.initials}</div>
      <div class="contact-info">
        <span class="contact-name">${c.name}</span>
        <span class="contact-phone">${c.phone}</span>
        ${callLink}
      </div>
      <span class="sending-status">${deliveryIcon(c.status)}</span>
    </li>
  `;
}
function deliveryIcon(status) {
    switch (status) {
        case 'pending': return '–';
        case 'sending': return '<span class="spinner"></span>';
        case 'delivered': return t('a.send.statussent');
        case 'failed': return t('a.send.statusfailed');
    }
}

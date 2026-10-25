import { store } from '../state.js';
import { buildSmsBody, smsUri, telUri, whatsappUri } from '../storage.js';
export function renderSending(root) {
    const { contacts } = store.getState();
    root.innerHTML = `
    <div class="screen sending-screen">
      <div class="sending-hero">
        <div class="sending-pulse"></div>
        <div class="sending-icon" aria-hidden="true"></div>
      </div>
      <h2 class="sending-title">Preparing your alerts…</h2>
      <p class="sending-sub" id="sending-sub">
        Your selected SMS or WhatsApp app will open for each contact. Review the message and tap Send, then return here.
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
    const { contacts, alertLocation, locationShared, notes } = store.getState();
    const opened = contacts.filter(c => c.status === 'opened').length;
    const failed = contacts.filter(c => c.status === 'failed').length;
    const summaryLine = failed > 0
        ? `${opened} message app${opened !== 1 ? 's' : ''} opened · ${failed} could not be prepared`
        : `${opened} message app${opened !== 1 ? 's' : ''} opened; review and tap Send`;
    root.innerHTML = `
    <div class="screen sent-screen">

      <div class="sent-hero" aria-hidden="true">${failed > 0 ? '!' : 'OK'}</div>
      <h2 class="sent-title">Alert prepared</h2>
      <p class="sent-summary">${summaryLine}</p>

      ${failed > 0 ? `
        <p class="sent-warning">
          Some messages could not be opened — check your connection,
          then call your contacts or emergency services directly.
        </p>
      ` : ''}

      <ul class="sending-list">
        ${contacts.map(contact => {
        const body = buildSmsBody(contact.name, alertLocation, locationShared, notes);
        const fallbackLink = contact.notificationChannel === 'whatsapp'
            ? smsUri(contact.phone, body)
            : whatsappUri(contact.phone, body);
        return sentRow(contact, fallbackLink);
    }).join('')}
      </ul>

      ${locationShared ? `
        <div class="sent-location-box">
          <span class="sent-location-label">Location shared:</span>
          <span class="sent-location-text">${alertLocation.split('\n')[0]}</span>
          ${alertLocation.includes('http')
        ? `<a class="sent-location-link" href="${alertLocation.split('\n')[1]}"
                 target="_blank" rel="noopener">Open in Maps</a>`
        : ''}
        </div>
      ` : `<p class="sent-no-location">Location was not shared.</p>`}

      <div class="emergency-links">
        <p class="emergency-label">If nobody responds, call directly:</p>
        <a class="emergency-call" href="tel:10111">
          <span class="emergency-number">10111</span>
          <span class="emergency-name">SAPS Emergency</span>
        </a>
        <a class="emergency-call" href="tel:0800428428">
          <span class="emergency-number">0800 428 428</span>
          <span class="emergency-name">GBV Command Centre</span>
        </a>
      </div>

      <div class="sent-actions">
        <button class="btn-secondary" id="btn-back">← Back to contacts</button>
        <button class="btn-danger" id="btn-retry" title="Re-send alert">↺ Re-send</button>
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
      <span class="sending-status">${deliveryIcon(c.status, c.notificationChannel)}</span>
    </li>
  `;
}
function sentRow(c, fallbackLink) {
    const callLink = c.status === 'failed'
        ? `<a class="sent-call-link" href="${telUri(c.phone)}">Call ${c.name}</a>`
        : '';
    return `
    <li class="sending-item sending-item--${c.status}">
      <div class="contact-avatar">${c.initials}</div>
      <div class="contact-info">
        <span class="contact-name">${c.name}</span>
        <span class="contact-phone">${c.phone}</span>
        ${callLink}
        <a class="sent-whatsapp-fallback" href="${fallbackLink}" target="_blank" rel="noopener noreferrer">${c.notificationChannel === 'whatsapp' ? 'SMS backup' : 'WhatsApp backup'}</a>
      </div>
      <span class="sending-status">${deliveryIcon(c.status)}</span>
    </li>
  `;
}
function deliveryIcon(status, notificationChannel = 'sms') {
    switch (status) {
        case 'pending': return '–';
        case 'sending': return '<span class="spinner"></span>';
        case 'opened': return notificationChannel === 'whatsapp' ? 'WhatsApp opened' : 'SMS opened';
        case 'failed': return 'Failed';
    }
}

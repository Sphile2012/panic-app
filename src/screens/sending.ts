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
      <h2 class="sending-title">Preparing your alert…</h2>
      <p class="sending-sub" id="sending-sub">
        Your messaging app will open for each contact. Review and send each message there, then return here.
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
    const attempted = contacts.filter(c => c.status === 'prepared').length;
    const failed = contacts.filter(c => c.status === 'failed').length;
    const summaryLine = failed > 0
        ? `${attempted} SMS handoff${attempted !== 1 ? 's' : ''} attempted · ${failed} could not be opened`
        : `${attempted} SMS handoff${attempted !== 1 ? 's' : ''} attempted`;
    const locationLines = alertLocation.split('\n');
    const locationAddress = escapeHtml(locationLines[0] ?? '');
    const coordinates = locationLines.find(line => line.startsWith('Coordinates: '));
    const accuracy = locationLines.find(line => line.startsWith('Reported accuracy: '));
    const mapsUrl = locationLines.find(line => line.startsWith('Google Maps: '))
        ?.slice('Google Maps: '.length);
    root.innerHTML = `
    <div class="screen sent-screen">

      <div class="sent-hero" aria-hidden="true">${failed > 0 ? '!' : 'OK'}</div>
      <h2 class="sent-title">Alert handoff complete</h2>
      <p class="sent-summary">${summaryLine}</p>
      <p class="sent-warning">
        Check your messaging app and tap Send. Panic Ring cannot confirm that a message was sent or received.
      </p>

      ${failed > 0 ? `
        <p class="sent-warning">
      Some message composers could not be opened. Try again, or call your contacts or emergency services directly.
        </p>
      ` : ''}

      <ul class="sending-list">
        ${contacts.map(sentRow).join('')}
      </ul>

      ${locationShared ? `
        <div class="sent-location-box">
          <span class="sent-location-label">Location shared:</span>
          <span class="sent-location-text">${locationAddress}</span>
          ${coordinates ? `<span class="sent-location-text">${escapeHtml(coordinates)}</span>` : ''}
          ${accuracy ? `<span class="sent-location-label">${escapeHtml(accuracy)}</span>` : ''}
          ${mapsUrl?.startsWith('https://maps.google.com/?q=')
        ? `<a class="sent-location-link" href="${escapeHtml(mapsUrl)}"
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
      <span class="sending-status">${deliveryIcon(c.status)}</span>
    </li>
  `;
}
function sentRow(c) {
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
      </div>
      <span class="sending-status">${deliveryIcon(c.status)}</span>
    </li>
  `;
}
function deliveryIcon(status) {
    switch (status) {
        case 'pending': return '–';
        case 'sending': return '<span class="spinner"></span>';
        case 'prepared': return 'Attempted';
        case 'failed': return 'Failed';
    }
}

function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

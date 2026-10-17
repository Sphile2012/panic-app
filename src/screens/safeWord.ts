import { store } from '../state.js';
import { smsUri } from '../storage.js';

export function renderSafeWord(root: HTMLElement): void {
  const { contacts, safetyPlan } = store.getState();
  const phrase = safetyPlan.safeWord.trim();

  root.innerHTML = `
    <div class="screen safe-word-screen">
      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="Back">←</button>
        <h2 class="screen-title">Safe-word message</h2>
      </header>
      <p class="settings-section-body">
        Choose a phrase your trusted person already knows. Tapping a link opens
        your messaging app; you must review and send the message yourself.
        No location is included. The sent draft may remain visible in your
        messaging history, so use it only if that is safe for you.
      </p>
      ${phrase ? `
        <p class="safe-word-phrase">${escapeHtml(phrase)}</p>
        <p class="section-label">Choose who to message</p>
        ${contacts.length ? `
          <ul class="contact-list">
            ${contacts.map(contact => `
              <li class="contact-item">
                <div class="contact-info">
                  <span class="contact-name">${escapeHtml(contact.name)}</span>
                  <span class="contact-phone">${escapeHtml(contact.phone)}</span>
                </div>
                <a class="btn-secondary-outline" href="${escapeHtml(smsUri(contact.phone, phrase))}">
                  Open message
                </a>
              </li>
            `).join('')}
          </ul>
        ` : '<p class="empty-hint">Add a trusted contact before using a safe word.</p>'}
      ` : `
        <p class="empty-hint">Set a safe word in your Safety Plan before using this feature.</p>
        <button class="btn-primary" id="btn-plan">Open Safety Plan</button>
      `}
      <p class="plan-footer">
        Panic Ring does not detect the phrase in incoming messages. This is a
        manual SMS shortcut, not an alert or a guarantee that someone will respond.
      </p>
    </div>
  `;

  root.querySelector('#btn-back')?.addEventListener('click', () => store.navigateTo('app'));
  root.querySelector('#btn-plan')?.addEventListener('click', () => store.navigateTo('safety-plan'));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

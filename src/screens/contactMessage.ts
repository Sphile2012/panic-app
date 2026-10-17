import { store } from '../state.js';
import { smsUri, type ContactLevel } from '../storage.js';

type MessageMode = 'referral' | 'checkin';

const MODE_DETAILS: Record<MessageMode, {
  level: ContactLevel;
  title: string;
  description: string;
  message: string;
  label: string;
}> = {
  referral: {
    level: 'referral',
    title: 'Referral request',
    description: 'Only Level 2 contacts are listed. Edit the message and choose who to contact.',
    message: 'I would like help finding support services. Please contact me only if it is safe.',
    label: 'Message',
  },
  checkin: {
    level: 'checkin',
    title: 'Check-in request',
    description: 'Only Level 3 contacts are listed. Set an expected check-in time and choose who to contact.',
    message: '',
    label: 'Expected check-in time',
  },
};

export function renderContactMessage(root: HTMLElement, mode: MessageMode): void {
  const details = MODE_DETAILS[mode];
  const contacts = store.getState().contacts.filter(contact => contact.level === details.level);
  root.innerHTML = `
    <div class="screen contact-message-screen">
      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="Back">←</button>
        <h2 class="screen-title">${details.title}</h2>
      </header>
      <p class="settings-section-body">${details.description}</p>
      ${mode === 'checkin' ? `
        <label class="field-label" for="checkin-message-time">${details.label}</label>
        <input class="text-input" id="checkin-message-time" type="datetime-local" required />
      ` : `
        <label class="field-label" for="contact-message-body">${details.label}</label>
        <textarea class="plan-textarea" id="contact-message-body" rows="4">${details.message}</textarea>
      `}
      <p class="plan-footer">
        Messages are opened one at a time in your messaging app and are not sent
        automatically. No location is attached.
      </p>
      ${contacts.length ? `
        <ul class="contact-list" id="message-contact-list">
          ${contacts.map(contact => `
            <li class="contact-item">
              <div class="contact-info">
                <span class="contact-name">${escapeHtml(contact.name)}</span>
                <span class="contact-phone">${escapeHtml(contact.phone)}</span>
              </div>
              <a class="btn-secondary-outline message-link" data-phone="${escapeHtml(contact.phone)}">
                Open message
              </a>
            </li>
          `).join('')}
        </ul>
      ` : '<p class="empty-hint">No contacts have this role. Update roles in Trusted Circle settings.</p>'}
    </div>
  `;

  const updateLinks = (): void => {
    const body = mode === 'referral'
      ? (root.querySelector('#contact-message-body') as HTMLTextAreaElement).value.trim()
      : buildCheckinMessage((root.querySelector('#checkin-message-time') as HTMLInputElement).value);
    root.querySelectorAll<HTMLAnchorElement>('.message-link').forEach(link => {
      const phone = link.dataset['phone'] ?? '';
      link.href = body ? smsUri(phone, body) : '#';
      link.setAttribute('aria-disabled', body ? 'false' : 'true');
    });
  };

  root.querySelector('#btn-back')?.addEventListener('click', () => store.navigateTo('app'));
  root.querySelector('#contact-message-body')?.addEventListener('input', updateLinks);
  root.querySelector('#checkin-message-time')?.addEventListener('input', updateLinks);
  root.querySelector('#checkin-message-time')?.addEventListener('change', updateLinks);
  root.querySelectorAll<HTMLAnchorElement>('.message-link').forEach(link => {
    link.addEventListener('click', event => {
      if (link.getAttribute('aria-disabled') === 'true')
        event.preventDefault();
    });
  });
  updateLinks();
}

function buildCheckinMessage(value: string): string {
  if (!value)
    return '';
  const expectedAt = new Date(value);
  if (!Number.isFinite(expectedAt.getTime()))
    return '';
  return `I'm checking in by ${expectedAt.toLocaleString()}. If you don't hear from me, please check with me when it is safe. This is not an emergency alert.`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

import { store } from '../state.js';

export function renderCheckinExpired(root: HTMLElement): void {
  const { contacts } = store.getState();
  root.innerHTML = `
    <section class="screen checkin-expired-screen" aria-labelledby="checkin-expired-title">
      <div class="checkin-expired-mark" aria-hidden="true">!</div>
      <p class="checkin-expired-eyebrow">CHECK-IN MISSED</p>
      <h1 class="checkin-expired-title" id="checkin-expired-title">Your timer has ended</h1>
      <p class="checkin-expired-copy">
        ${contacts.length
            ? 'If you need help, continue to prepare an alert for your trusted circle.'
            : 'Your timer ended, but you have no trusted contacts set up yet.'}
      </p>

      <div class="checkin-expired-note" role="note">
        <strong>Messages are not sent automatically.</strong>
        <span>Panic Ring will open your messaging app. You must review and send each message yourself.</span>
      </div>

      <div class="checkin-expired-actions">
        ${contacts.length
            ? '<button class="btn-primary checkin-expired-send" id="btn-expired-alert">Prepare an alert</button>'
            : '<button class="btn-primary checkin-expired-send" id="btn-expired-contacts">Add trusted contacts</button>'}
        <button class="btn-secondary-outline" id="btn-expired-safe">I’m safe — return to Panic Ring</button>
      </div>

      <p class="checkin-expired-footnote">
        Timers depend on your browser and device. They may be delayed while the app is closed or suspended.
        For immediate danger, contact emergency services directly.
      </p>
    </section>
  `;

  root.querySelector('#btn-expired-alert')?.addEventListener('click', () => store.navigateTo('location'));
  root.querySelector('#btn-expired-contacts')?.addEventListener('click', () => store.navigateTo('contacts'));
  root.querySelector('#btn-expired-safe')?.addEventListener('click', () => store.navigateTo('app'));
}

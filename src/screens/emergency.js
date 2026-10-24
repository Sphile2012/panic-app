import { store } from '../state.js';
const SERVICES = [
    {
        name: 'General emergency',
        number: '112',
        href: 'tel:112',
        detail: 'Mobile emergency number for police, ambulance, and fire response.',
        icon: '<path d="M12 3v18M3 12h18"/>',
        tag: 'All genders',
    },
    {
        name: 'Police · SAPS',
        number: '10111',
        href: 'tel:10111',
        detail: 'South African Police Service emergency line.',
        icon: '<path d="M12 3 20 7v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V7l8-4Z"/><path d="m9 12 2 2 4-4"/>',
        tag: 'All genders',
    },
    {
        name: 'Ambulance',
        number: '10177',
        href: 'tel:10177',
        detail: 'Emergency medical services.',
        icon: '<path d="M3 8h11v10H3zM14 11h4l3 3v4h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8.5 10v5M6 12.5h5"/>',
        tag: 'All genders',
    },
    {
        name: 'Fire and rescue',
        number: '112',
        href: 'tel:112',
        detail: 'Call the general emergency number from a mobile phone.',
        icon: '<path d="M12 22c4 0 7-3 7-7 0-3-2-5-4-7 0 3-2 4-2 4 0-5-3-8-5-10 0 4-1 6-3 9-1 1-1 2-1 4 0 4 3 7 8 7Z"/><path d="M10 18c0-2 1-3 2-4 2 2 2 3 2 4a2 2 0 1 1-4 0Z"/>',
        tag: 'All genders',
    },
    {
        name: 'Gender-based violence support',
        number: '0800 428 428',
        href: 'tel:0800428428',
        detail: 'GBV Command Centre. Ask the service about support options for your situation; availability may vary.',
        icon: '<path d="M12 21s-8-4.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.5-8 11-8 11Z"/><path d="M12 11v5M12 8h.01"/>',
        tag: 'Support for all genders',
    },
    {
        name: 'Childline South Africa',
        number: '116',
        href: 'tel:116',
        detail: 'Free support line for children. Support is for children of all genders.',
        icon: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2"/><path d="M3 20c0-3 2-5 6-5s6 2 6 5M15 15c3 0 5 2 5 5"/>',
        tag: 'For children',
    },
];
export function renderEmergencyDialer(root) {
    root.innerHTML = `
    <div class="screen emergency-screen">
      <header class="screen-header">
        <button class="btn-back-small" id="btn-back-emergency" type="button" aria-label="Back">←</button>
        <h1 class="screen-title">Emergency dialer</h1>
      </header>
      <section class="emergency-intro">
        <span class="emergency-intro-icon" aria-hidden="true">!</span>
        <div>
          <h2>Help for anyone who needs it</h2>
          <p>Choose a service to open your phone's dialer. Check the number and tap Call.</p>
        </div>
      </section>
      <ul class="emergency-service-list">
        ${SERVICES.map(service => `
          <li class="emergency-service-card">
            <span class="emergency-service-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${service.icon}</svg></span>
            <div class="emergency-service-copy">
              <strong>${service.name}</strong>
              <span class="emergency-service-tag">${service.tag}</span>
              <p>${service.detail}</p>
            </div>
            <a class="emergency-dial-link" href="${service.href}" aria-label="Call ${service.name}, ${service.number}">
              <span>${service.number}</span>
              <small>Call</small>
            </a>
          </li>
        `).join('')}
      </ul>
      <p class="emergency-disclaimer">Calls are placed by your phone; Panic Ring cannot confirm they connect. If you are in immediate danger, use the most appropriate emergency service.</p>
    </div>`;
    root.querySelector('#btn-back-emergency')?.addEventListener('click', () => store.navigateBack());
}
export function renderTroubleshooting(root) {
    const topics = [
        ['The app will not open or looks stuck', 'Check your connection, then reload the page. If installed, close and reopen Panic Ring. Avoid clearing browser data unless you have safely backed up anything you need.'],
        ['I cannot unlock the app', 'Check the PIN and try again. If you set recovery questions, choose Forgot your PIN and answer both. If the app still will not unlock, reload it and use the recovery flow rather than clearing browser data.'],
        ['A trusted contact will not save', 'Enter a name and a phone number with 7–15 digits. Duplicate numbers are not allowed, and the trusted circle can contain up to five contacts. Keep the app open while the encrypted save completes.'],
        ['The location map is blank or inaccurate', 'Allow location access for this site, enable location services on your device, and move somewhere with a clearer view of the sky. The map needs an internet connection; you can still choose to send an alert without location.'],
        ['The SMS or WhatsApp message was not sent', 'Panic Ring opens a prepared message; it does not send it automatically. Review the recipient and text, then tap Send in Messages or WhatsApp. SMS needs carrier service and may use airtime; WhatsApp needs internet.'],
        ['I did not get a low-battery warning', 'Battery reporting is available only in some browsers. The app must be open and in the foreground; it cannot guarantee background warnings.'],
    ];
    root.innerHTML = `
    <div class="screen troubleshooting-screen">
      <header class="screen-header">
        <button class="btn-back-small" id="btn-back-troubleshooting" type="button" aria-label="Back">←</button>
        <h1 class="screen-title">Troubleshooting</h1>
      </header>
      <section class="troubleshooting-intro">
        <h2>Quick fixes</h2>
        <p>Try the steps below. If you are in immediate danger, call emergency services directly.</p>
      </section>
      <div class="troubleshooting-list">
        ${topics.map(([title, body]) => `
          <details class="troubleshooting-item">
            <summary>${title}</summary>
            <p>${body}</p>
          </details>
        `).join('')}
      </div>
      <button class="btn-primary" id="btn-open-emergency" type="button">Open emergency dialer</button>
    </div>`;
    root.querySelector('#btn-back-troubleshooting')?.addEventListener('click', () => store.navigateBack());
    root.querySelector('#btn-open-emergency')?.addEventListener('click', () => store.navigateTo('emergency'));
}

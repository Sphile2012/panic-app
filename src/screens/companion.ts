import { store } from '../state.js';
const STEPS = {
    start: {
        id: 'start',
        heading: 'What kind of help do you need?',
        body: 'I can help you find services or information. Choose the option that fits best.',
        options: [
            { label: 'I need help right now', next: 'emergency' },
            { label: 'Medical care', next: 'medical' },
            { label: 'Legal support', next: 'legal' },
            { label: 'Emotional support', next: 'emotional' },
            { label: 'Safe shelter', next: 'shelter' },
            { label: 'Support a friend', next: 'bystander' },
            { label: 'My safety plan', next: 'safetyplan' },
            { label: 'Digital safety tips', next: 'digital' },
        ],
    },
    emergency: {
        id: 'emergency',
        heading: 'Get help right now',
        body: 'Your Trusted Circle is the first option. If nobody can reach you, call one of these directly:',
        options: [
            { label: 'Call SAPS — 10111', next: 'call:10111' },
            { label: 'GBV Command Centre — 0800 428 428', next: 'call:0800428428' },
            { label: 'GBV (free code) — *120*7867#', next: 'call:*120*7867#' },
            { label: 'Back', next: 'start' },
        ],
    },
    medical: {
        id: 'medical',
        heading: 'Medical care',
        body: 'Thuthuzela Care Centres offer medical care, counselling, help with reporting and follow-up — all in one place.',
        options: [
            { label: 'Find a Thuthuzela Centre', next: 'open:https://www.npa.gov.za/content/thuthuzela-care-centres' },
            { label: 'GBV Command Centre', next: 'call:0800428428' },
            { label: 'Back', next: 'start' },
        ],
    },
    legal: {
        id: 'legal',
        heading: 'Legal support',
        body: 'Legal Aid South Africa offers a free advice line on weekdays 07:00–19:00. POWA also provides legal guidance.',
        options: [
            { label: 'Legal Aid SA — 0800 110 110', next: 'call:0800110110' },
            { label: 'POWA — 011 642 4345', next: 'call:0116424345' },
            { label: 'Back', next: 'start' },
        ],
    },
    emotional: {
        id: 'emotional',
        heading: 'Emotional support',
        body: 'POWA provides telephonic counselling. The GBV Command Centre is also available 24 hours and can guide you to a counsellor.',
        options: [
            { label: 'POWA — 011 642 4345', next: 'call:0116424345' },
            { label: 'GBV Command Centre — 0800 428 428', next: 'call:0800428428' },
            { label: 'Back', next: 'start' },
        ],
    },
    shelter: {
        id: 'shelter',
        heading: 'Safe shelter',
        body: 'Shelter addresses are never shown here to protect their safety. Call the national helpline — they will guide you to the right place.',
        options: [
            { label: 'National Shelter Helpline — 0800 001 005', next: 'call:0800001005' },
            { label: 'POWA — 011 642 4345', next: 'call:0116424345' },
            { label: 'Back', next: 'start' },
        ],
    },
    bystander: {
        id: 'bystander',
        heading: 'Support a friend',
        body: 'If someone has told you they are experiencing abuse:\n\n• Listen without judgement\n• Do not pressure them to act before they are ready\n• Ask what they need from you\n• Do not contact the abuser\n• Help them access the GBV Command Centre if they choose\n\nYour support matters — but their safety and control come first.',
        options: [
            { label: 'GBV Command Centre — 0800 428 428', next: 'call:0800428428' },
            { label: 'Back', next: 'start' },
        ],
    },
    safetyplan: {
        id: 'safetyplan',
        heading: 'Your safety plan',
        body: 'Your safety plan stores trusted people, safe places, emergency numbers, documents and transport options. Fill it in now so it is ready when you need it.',
        options: [
            { label: 'Open my safety plan', next: 'nav:safety-plan' },
            { label: 'Back', next: 'start' },
        ],
    },
    digital: {
        id: 'digital',
        heading: 'Digital safety',
        body: '• Use a strong, unique password for this app\n' +
            '• Check which apps have access to your location — turn off any you don\'t need\n' +
            '• Log out of accounts on shared devices\n' +
            '• Be aware that photos, voice notes and messages can be accessed if your phone is unlocked\n' +
            '• This app\'s notes are encrypted — only you can read them\n' +
            '• The cover screen hides the app\'s purpose',
        options: [
            { label: 'Back', next: 'start' },
        ],
    },
};
export function renderCompanion(root) {
    let currentStepId = 'start';
    function show(stepId) {
        currentStepId = stepId;
        const step = STEPS[stepId];
        if (!step)
            return;
        root.innerHTML = `
      <div class="screen companion-screen">

        <header class="screen-header">
          <button class="btn-back-small" id="btn-back" aria-label="Back to app">Back</button>
          <h2 class="screen-title">Safety Companion</h2>
          <span class="companion-badge">Automated</span>
        </header>

        <div class="companion-body">
          <h3 class="companion-heading">${step.heading}</h3>
          <p class="companion-text">${step.body.replace(/\n/g, '<br/>')}</p>
        </div>

        <div class="companion-options" id="companion-options">
          ${step.options.map(o => `
            <button class="companion-option-btn" data-next="${o.next}">
              ${o.label}
            </button>
          `).join('')}
        </div>

        <p class="companion-disclaimer">
          This guide uses reviewed content only. It will never diagnose, counsel,
          give legal advice, say help is on the way, or share anything without your consent.
        </p>

      </div>
    `;
        root.querySelector('#btn-back').addEventListener('click', () => {
            store.navigateTo('app');
        });
        root.querySelectorAll('[data-next]').forEach(btn => {
            btn.addEventListener('click', () => {
                const next = btn.dataset['next'];
                if (next.startsWith('call:')) {
                    window.location.href = `tel:${next.slice(5)}`;
                    return;
                }
                if (next.startsWith('open:')) {
                    window.open(next.slice(5), '_blank', 'noopener');
                    return;
                }
                if (next.startsWith('nav:')) {
                    store.navigateTo(next.slice(4));
                    return;
                }
                show(next);
            });
        });
    }
    show(currentStepId);
}

import { store } from '../state.js';
const SERVICES = [
    {
        name: 'SAPS Emergency',
        contact: '10111',
        href: 'tel:10111',
        description: 'Police emergency line, available 24 hours.',
        category: 'emergency',
        status: 'Listed',
        verified: 'Public number — verified',
    },
    {
        name: 'GBV Command Centre',
        contact: '0800 428 428',
        href: 'tel:0800428428',
        description: '24-hour support line for gender-based violence. Also reachable via *120*7867# (free from most networks).',
        category: 'gbv',
        status: 'Listed',
        verified: 'SAPS-published number — verified',
    },
    {
        name: 'Thuthuzela Care Centres',
        contact: 'Find a centre',
        href: 'https://www.npa.gov.za/content/thuthuzela-care-centres',
        description: 'One-stop facilities: medical care, counselling, help with reporting, and follow-up support.',
        category: 'medical',
        status: 'Listed',
        verified: 'NPA-listed — directory verified',
    },
    {
        name: 'National Shelter Helpline (NSMSA)',
        contact: '0800 001 005',
        href: 'tel:0800001005',
        description: '24-hour helpline for emergency shelter placement. The app does not display shelter addresses — call this line for safe routing.',
        category: 'shelter',
        status: 'Listed',
        verified: 'NSMSA-published — verified',
    },
    {
        name: 'POWA — People Opposing Women Abuse',
        contact: '011 642 4345',
        href: 'tel:0116424345',
        description: 'Telephonic counselling and shelter services.',
        category: 'gbv',
        status: 'Listed',
        verified: 'Organisation-published number — verified',
    },
    {
        name: 'Legal Aid South Africa',
        contact: '0800 110 110',
        href: 'tel:0800110110',
        description: 'Free legal advice line, open weekdays 07:00–19:00.',
        category: 'legal',
        status: 'Listed',
        verified: 'Legal Aid SA website — verified',
    },
];
const FILTER_LABELS = {
    all: 'All',
    emergency: 'Emergency',
    gbv: 'GBV support',
    medical: 'Medical',
    shelter: 'Shelter',
    legal: 'Legal',
};
export function renderSupport(root) {
    root.innerHTML = `
    <div class="screen support-screen">

      <header class="support-header">
        <button class="btn-back-small" id="btn-back-support" aria-label="Back">←</button>
        <h2 class="support-title">Support services</h2>
      </header>

      <div class="support-filters" role="tablist" aria-label="Filter by category">
        ${Object.entries(FILTER_LABELS).map(([key, label]) => `
          <button
            class="filter-tab${key === 'all' ? ' filter-tab--active' : ''}"
            data-filter="${key}"
            role="tab"
            aria-selected="${key === 'all'}">
            ${label}
          </button>
        `).join('')}
      </div>

      <ul class="service-list" id="service-list">
        ${SERVICES.map(serviceCard).join('')}
      </ul>

      <p class="support-footer">
        All entries are Listed (public information verified).
        No organisation is called a Partner without a written agreement.
        Contact details are re-verified on a schedule.
      </p>

    </div>
  `;
    root.querySelector('#btn-back-support').addEventListener('click', () => {
        store.navigateTo('app');
    });
    const list = root.querySelector('#service-list');
    root.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            root.querySelectorAll('.filter-tab').forEach(t => {
                t.classList.remove('filter-tab--active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('filter-tab--active');
            tab.setAttribute('aria-selected', 'true');
            const filter = tab.dataset['filter'] ?? 'all';
            const visible = filter === 'all'
                ? SERVICES
                : SERVICES.filter(s => s.category === filter);
            list.innerHTML = visible.map(serviceCard).join('');
        });
    });
}
function serviceCard(s) {
    return `
    <li class="service-card">
      <div class="service-card-top">
        <div class="service-card-name">${s.name}</div>
        <span class="service-status service-status--${s.status.toLowerCase()}">${s.status}</span>
      </div>
      <p class="service-description">${s.description}</p>
      <div class="service-card-footer">
        <a class="service-call-btn" href="${s.href}" aria-label="Call ${s.name}">
          Call ${s.contact}
        </a>
        <span class="service-verified">${s.verified}</span>
      </div>
    </li>
  `;
}

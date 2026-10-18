import '../strings/groupB.js';
import { store } from '../state.js';
import { t } from '../i18n.js';

const SERVICES = [
    {
        id: 'saps',
        name: 'SAPS Emergency',
        contact: '10111',
        href: 'tel:10111',
        category: 'emergency',
        status: 'Listed',
    },
    {
        id: 'gbv',
        name: 'GBV Command Centre',
        contact: '0800 428 428',
        href: 'tel:0800428428',
        category: 'gbv',
        status: 'Listed',
    },
    {
        id: 'thuth',
        name: 'Thuthuzela Care Centres',
        contact: '',
        href: 'https://www.npa.gov.za/content/thuthuzela-care-centres',
        category: 'medical',
        status: 'Listed',
    },
    {
        id: 'nsh',
        name: 'National Shelter Helpline (NSMSA)',
        contact: '0800 001 005',
        href: 'tel:0800001005',
        category: 'shelter',
        status: 'Listed',
    },
    {
        id: 'powa',
        name: 'POWA — People Opposing Women Abuse',
        contact: '011 642 4345',
        href: 'tel:0116424345',
        category: 'gbv',
        status: 'Listed',
    },
    {
        id: 'legalaid',
        name: 'Legal Aid South Africa',
        contact: '0800 110 110',
        href: 'tel:0800110110',
        category: 'legal',
        status: 'Listed',
    },
];
const FILTERS = ['all', 'emergency', 'gbv', 'medical', 'shelter', 'legal'];
export function renderSupport(root) {
    root.innerHTML = `
    <div class="screen support-screen">

      <header class="support-header">
        <button class="btn-back-small" id="btn-back-support" aria-label="${t('common.back')}">${t('common.back')}</button>
        <h2 class="support-title">${t('b.sup.title')}</h2>
      </header>

      <!-- Category filter tabs -->
      <div class="support-filters" role="tablist" aria-label="${t('b.sup.filter')}">
        ${FILTERS.map(key => `
          <button
            class="filter-tab${key === 'all' ? ' filter-tab--active' : ''}"
            data-filter="${key}"
            role="tab"
            aria-selected="${key === 'all'}">
            ${t('b.sup.f.' + key)}
          </button>
        `).join('')}
      </div>

      <!-- Service list -->
      <ul class="service-list" id="service-list">
        ${SERVICES.map(serviceCard).join('')}
      </ul>

      <p class="support-footer">${t('b.sup.footer')}</p>

    </div>
  `;
    root.querySelector('#btn-back-support').addEventListener('click', () => {
        store.navigateTo('app');
    });
    const list = root.querySelector('#service-list');
    root.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            root.querySelectorAll('.filter-tab').forEach(tb => {
                tb.classList.remove('filter-tab--active');
                tb.setAttribute('aria-selected', 'false');
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
    const name = s.id === 'saps' || s.id === 'legalaid' ? t('b.sup.' + s.id + '.name') : s.name;
    const callLabel = s.contact ? t('b.sup.call', { contact: s.contact }) : t('b.sup.findcentre');
    return `
    <li class="service-card">
      <div class="service-card-top">
        <div class="service-card-name">${name}</div>
        <span class="service-status service-status--${s.status.toLowerCase()}">${t('b.sup.status.listed')}</span>
      </div>
      <p class="service-description">${t('b.sup.' + s.id + '.desc')}</p>
      <div class="service-card-footer">
        <a class="service-call-btn" href="${s.href}" aria-label="${t('b.sup.callname', { name })}">
          ${callLabel}
        </a>
        <span class="service-verified">${t('b.sup.' + s.id + '.ver')}</span>
      </div>
    </li>
  `;
}

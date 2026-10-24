import { store } from './state.js';
import { t } from './i18n.js';
import './strings/core.js';
const ICONS = {
    app: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    emergency: '<path d="M12 3v18M3 12h18"/>',
    troubleshoot: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1.1-1.5 2.5M12 17h.01"/>',
    live: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    contacts: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.5 0 4 1.8 4 4"/>',
    records: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 8v5l3 2"/>',
    journey: '<path d="M21 3L3 10l7 3 3 7z"/>',
    fakecall: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    watch: '<rect x="7" y="6" width="10" height="12" rx="3"/><path d="M9 6l1-3h4l1 3M9 18l1 3h4l1-3"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    guide: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
    faq: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 17h.01"/>',
    'safety-plan': '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/><path d="M9 12l2 2 4-4"/>',
    notes: '<path d="M5 3h14v18H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    companion: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
    about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
};
function escapeHtml(value) {
    return value.replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[character] ?? character));
}
function sections() {
    return [
        { title: t('menu.main'), items: [
                { screen: 'app', label: t('menu.home') },
                { screen: 'profile', label: t('menu.profile') },
                { screen: 'contacts', label: t('menu.contacts') },
                { screen: 'emergency', label: 'Emergency dialer' },
                { screen: 'live', label: t('menu.map') },
                { screen: 'chat', label: 'Messages' },
            ] },
        { title: t('menu.safety'), items: [
                { screen: 'safety-plan', label: 'Safety plan' },
                { screen: 'history', label: t('menu.history') },
                { screen: 'records', label: 'Records' },
                { screen: 'notes', label: 'Notes' },
                { screen: 'troubleshoot', label: 'Troubleshooting' },
            ] },
        { title: t('menu.account'), items: [
                { screen: 'companion', label: 'Safety companion' },
                { screen: 'settings', label: t('menu.settings') },
                { screen: 'about', label: 'About Panic Ring' },
            ] },
    ];
}
export function closeMenu() {
    document.getElementById('side-menu-root')?.remove();
}
export function openMenu() {
    closeMenu();
    const { screen, profile } = store.getState();
    const displayName = escapeHtml(profile.name || 'Your profile');
    const avatar = profile.photo
        ? `<img src="${escapeHtml(profile.photo)}" alt="" />`
        : `<span>${displayName[0]?.toUpperCase() ?? '?'}</span>`;
    const wrap = document.createElement('div');
    wrap.id = 'side-menu-root';
    wrap.className = 'side-menu-root';
    wrap.innerHTML = `
    <div class="side-menu-backdrop" data-close="1"></div>
    <aside class="side-menu" role="dialog" aria-label="${t('menu.open')}">
      <div class="side-menu-head">
        <button class="side-menu-user" data-go="profile" type="button">
          <span class="side-menu-avatar">${avatar}</span>
          <span class="side-menu-user-copy">
            <strong>${displayName}</strong>
            <small>On this device</small>
          </span>
        </button>
        <button class="side-menu-close" data-close="1" aria-label="${t('common.close')}">${t('common.close')}</button>
      </div>
      <nav class="side-menu-body">
        ${sections().map(s => `
          <div class="side-menu-title">${s.title}</div>
          ${s.items.map(i => `
            <button class="side-menu-item${i.screen === screen ? ' side-menu-item--active' : ''}" data-go="${i.screen}">
              <span class="side-menu-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[i.screen] ?? ICONS.guide}</svg></span>
              <span>${i.label}</span>
            </button>`).join('')}
        `).join('')}
      </nav>
      <div class="side-menu-foot">
        <p class="side-menu-version">Panic Ring v1.0</p>
      </div>
    </aside>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click', (e) => {
        const el = e.target;
        if (el.closest('[data-close]')) {
            closeMenu();
            return;
        }
        const go = el.closest('[data-go]');
        if (go) {
            closeMenu();
            store.navigateTo(go.dataset['go']);
            return;
        }
    });
}

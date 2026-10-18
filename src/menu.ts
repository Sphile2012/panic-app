import { store } from './state.js';
import { t } from './i18n.js';

const ICONS: Record<string, string> = {
    app: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
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
};

type Item = { screen: string; label: string };

function sections(): Array<{ title: string; items: Item[] }> {
    return [
        { title: t('menu.main'), items: [
            { screen: 'app', label: t('menu.home') },
            { screen: 'live', label: t('menu.map') },
            { screen: 'contacts', label: t('menu.contacts') },
        ] },
        { title: t('menu.safety'), items: [
            { screen: 'history', label: t('menu.history') },
            { screen: 'records', label: t('menu.records') },
            { screen: 'journey', label: t('menu.journey') },
            { screen: 'fakecall', label: t('menu.fakecall') },
            { screen: 'watch', label: t('menu.watch') },
        ] },
        { title: t('menu.account'), items: [
            { screen: 'profile', label: t('menu.profile') },
            { screen: 'settings', label: t('menu.settings') },
            { screen: 'guide', label: t('menu.guide') },
            { screen: 'faq', label: t('menu.faq') },
        ] },
    ];
}

export function closeMenu() {
    document.getElementById('side-menu-root')?.remove();
}

export function openMenu() {
    closeMenu();
    const { screen, authEmail } = store.getState();
    const wrap = document.createElement('div');
    wrap.id = 'side-menu-root';
    wrap.className = 'side-menu-root';
    wrap.innerHTML = `
    <div class="side-menu-backdrop" data-close="1"></div>
    <aside class="side-menu" role="dialog" aria-label="${t('menu.open')}">
      <div class="side-menu-head">
        <div class="side-menu-logo" aria-hidden="true"></div>
        <strong class="side-menu-brand">Panic Ring</strong>
        <button class="side-menu-close" data-close="1" aria-label="${t('common.close')}">${t('common.close')}</button>
      </div>
      <nav class="side-menu-body">
        ${sections().map(s => `
          <div class="side-menu-title">${s.title}</div>
          ${s.items.map(i => `
            <button class="side-menu-item${i.screen === screen ? ' side-menu-item--active' : ''}" data-go="${i.screen}">
              <span class="side-menu-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[i.screen]}</svg></span>
              <span>${i.label}</span>
            </button>`).join('')}
        `).join('')}
      </nav>
      <div class="side-menu-foot">
        <button class="side-menu-item" data-go="calculator">
          <span class="side-menu-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 22 12a14 14 0 0 1-2.6 3.6M6.1 6.1A14 14 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4-.9"/></svg></span>
          <span>${t('menu.hide')}</span>
        </button>
        <p class="side-menu-version">Panic Ring v1.0</p>
      </div>
    </aside>`;
    document.body.appendChild(wrap);

    wrap.addEventListener('click', async (e) => {
        const el = e.target as HTMLElement;
        if (el.closest('[data-close]')) {
            closeMenu();
            return;
        }
        const go = el.closest<HTMLElement>('[data-go]');
        if (go) {
            closeMenu();
            store.navigateTo(go.dataset['go'] as string);
            return;
        }
        if (el.closest('#side-menu-auth')) {
            closeMenu();
            if (store.getState().authEmail) await store.signOut();
            else store.navigateTo('login');
        }
    });
}

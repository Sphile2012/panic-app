import { store } from '../state.js';
import { loadAppearance, saveAppearance, DISGUISE_OPTIONS } from '../theme.js';
import { isCheckinActive, checkinSecondsLeft, startCheckin, cancelCheckin, resumeCheckinIfActive } from '../checkin.js';
import { openMenu } from '../menu.js';
function escapeHtml(value) {
    return value.replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[character] ?? character));
}
const DASHBOARD_CARDS = [
    { screen: 'contacts', icon: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.5 0 4 1.8 4 4"/>', label: 'Trusted contacts', detail: 'Manage your circle' },
    { screen: 'live', icon: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1116 0z"/><circle cx="12" cy="10" r="2.5"/>', label: 'Live location', detail: 'Share your location' },
    { screen: 'safety-plan', icon: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/><path d="M9 12l2 2 4-4"/>', label: 'Safety plan', detail: 'Your plan, ready' },
    { screen: 'history', icon: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 8v5l3 2"/>', label: 'Alert history', detail: 'Review past alerts' },
    { screen: 'notes', icon: '<path d="M5 3h14v18H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>', label: 'Private notes', detail: 'Keep key details' },
    { screen: 'checkin', icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', label: 'Check-in timer', detail: 'Set a safe arrival time' },
];
export function renderApp(root) {
    const { contacts, authEmail, profile } = store.getState();
    const appearance = loadAppearance();
    const displayName = profile.name || authEmail?.split('@')[0] || 'Your safety dashboard';
    const avatarLetter = displayName[0]?.toUpperCase() ?? '?';
    const avatar = profile.photo
        ? `<img src="${profile.photo}" alt="" />`
        : escapeHtml(avatarLetter);
    const currentDisguise = DISGUISE_OPTIONS.find(d => d.id === appearance.disguise);
    root.innerHTML = `
    <div class="screen app-screen">

      <header class="app-header">
        <button class="app-menu-button" id="btn-menu" type="button" aria-label="Open menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <div class="app-header-text">
          <h1 class="app-title">Dashboard</h1>
          <p class="app-subtitle">Welcome, ${escapeHtml(displayName)}</p>
        </div>
        <button class="app-avatar" id="btn-profile" aria-label="Open profile"
          title="${escapeHtml(authEmail ?? 'Profile')}">
          ${avatar}
        </button>
      </header>

      <section class="dashboard-alert-card" aria-label="Emergency alert">
        <div class="dashboard-alert-copy">
          <span class="dashboard-eyebrow">PANIC RING</span>
          <h2>Your safety comes first</h2>
          <p>Hold the button to alert your trusted circle.</p>
        </div>
        <button class="btn-hold" id="btn-hold" aria-label="Hold to send alert" title="Hold for 1.5 seconds to send">
          <span class="btn-hold-label">Hold to alert</span>
          <div class="btn-hold-ring"></div>
        </button>
      </section>
      <p class="app-activate-hint">Hold for 1.5 seconds · release to cancel</p>

      <section class="dashboard-section">
        <div class="dashboard-section-heading">
          <h2>Quick access</h2>
          <span>${contacts.length} trusted ${contacts.length === 1 ? 'contact' : 'contacts'}</span>
        </div>
        <div class="dashboard-grid">
          ${DASHBOARD_CARDS.map(card => `
            <button class="dashboard-card" type="button" data-dashboard="${card.screen}">
              <span class="dashboard-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${card.icon}</svg>
              </span>
              <span class="dashboard-card-label">${card.label}</span>
              <span class="dashboard-card-detail">${card.detail}</span>
            </button>
          `).join('')}
        </div>
      </section>

      <div class="app-quick-bar" aria-label="Display options">
        <button class="app-quick-btn" id="btn-disguise" title="Change disguise screen"
          aria-label="Change disguise screen">
          <span class="app-quick-icon">${currentDisguise?.preview ?? 'Calculator'}</span>
          <span class="app-quick-label">${currentDisguise?.label ?? 'Calculator'}</span>
        </button>

        <button class="app-quick-btn" id="btn-quick-checkin" title="Check-in timer"
          aria-label="Check-in timer">
          <span class="app-quick-label">Check-in</span>
        </button>
      </div>

      <nav class="app-bottom-nav" aria-label="Main navigation">
        <button class="app-bottom-nav-btn" data-bottom-nav="contacts" type="button">Trusted circle</button>
        <button class="app-bottom-nav-btn app-bottom-nav-btn--active" data-bottom-nav="app" type="button">Home</button>
        <button class="app-bottom-nav-btn" data-bottom-nav="profile" type="button">Profile</button>
      </nav>

      <div class="checkin-bar" id="checkin-bar" style="display:none">
        <div class="checkin-bar-inner">
          <span class="checkin-label" id="checkin-label">Check-in active</span>
          <span class="checkin-countdown" id="checkin-countdown"></span>
          <button class="checkin-cancel" id="checkin-cancel" aria-label="Cancel check-in">Cancel ✕</button>
        </div>
      </div>

      <div class="checkin-sheet" id="checkin-sheet" aria-hidden="true">
        <p class="checkin-sheet-title">Set a check-in timer</p>
        <p class="checkin-sheet-body">
          If you don't cancel before time runs out, your circle will be alerted.
        </p>
        <input class="text-input" id="checkin-name" type="text"
          placeholder="Walk home / Meeting…" maxlength="40" />
        <div class="checkin-presets">
          ${[15, 30, 60, 90].map(m => `
            <button class="checkin-preset" data-mins="${m}">${m} min</button>
          `).join('')}
        </div>
        <div class="checkin-sheet-actions">
          <button class="btn-primary" id="checkin-start-btn">Start timer</button>
          <button class="checkin-sheet-close" id="checkin-close">Cancel</button>
        </div>
      </div>

      <div class="disguise-sheet" id="disguise-sheet" aria-hidden="true">
        <p class="disguise-sheet-title">Choose disguise screen</p>
        <div class="disguise-sheet-grid">
          ${DISGUISE_OPTIONS.map(d => `
            <button
              class="ap-disguise-card ${appearance.disguise === d.id ? 'ap-disguise-card--active' : ''}"
              data-disguise="${d.id}">
              <span class="ap-disguise-icon">${d.preview}</span>
              <span class="ap-disguise-label">${d.label}</span>
              ${appearance.disguise === d.id ? '<span class="ap-disguise-check">✓ Active</span>' : ''}
            </button>
          `).join('')}
        </div>
        <button class="disguise-sheet-close" id="disguise-close" aria-label="Close">Close</button>
      </div>

    </div>
  `;
    const holdBtn = root.querySelector('#btn-hold');
    let holdTimer = null;
    const cancelHold = () => {
        if (holdTimer) {
            clearTimeout(holdTimer);
            holdTimer = null;
        }
        holdBtn.classList.remove('btn-hold--holding');
    };
    const startHold = () => {
        if (store.getState().contacts.length === 0) {
            holdBtn.classList.add('btn-hold--no-contacts');
            setTimeout(() => holdBtn.classList.remove('btn-hold--no-contacts'), 800);
            return;
        }
        holdBtn.classList.add('btn-hold--holding');
        holdTimer = setTimeout(() => store.navigateTo('location'), 1500);
    };
    holdBtn.addEventListener('mousedown', startHold);
    holdBtn.addEventListener('touchstart', startHold, { passive: true });
    holdBtn.addEventListener('mouseup', cancelHold);
    holdBtn.addEventListener('mouseleave', cancelHold);
    holdBtn.addEventListener('touchend', cancelHold);
    holdBtn.addEventListener('touchcancel', cancelHold);
    root.querySelector('#btn-profile').addEventListener('click', () => {
        store.navigateTo('profile');
    });
    root.querySelector('#btn-menu').addEventListener('click', openMenu);
    root.querySelectorAll('[data-dashboard]').forEach(button => {
        button.addEventListener('click', () => {
            const screen = button.dataset['dashboard'];
            if (screen === 'checkin') {
                const sheet = root.querySelector('#checkin-sheet');
                sheet?.setAttribute('aria-hidden', 'false');
                sheet?.classList.add('checkin-sheet--open');
            }
            else if (screen)
                store.navigateTo(screen);
        });
    });
    root.querySelectorAll('[data-bottom-nav]').forEach(button => {
        button.addEventListener('click', () => store.navigateTo(button.dataset['bottomNav'] ?? 'app'));
    });
    const sheet = root.querySelector('#disguise-sheet');
    root.querySelector('#btn-disguise').addEventListener('click', () => {
        const open = sheet.getAttribute('aria-hidden') === 'false';
        sheet.setAttribute('aria-hidden', open ? 'true' : 'false');
        sheet.classList.toggle('disguise-sheet--open', !open);
    });
    root.querySelector('#disguise-close').addEventListener('click', () => {
        sheet.setAttribute('aria-hidden', 'true');
        sheet.classList.remove('disguise-sheet--open');
    });
    root.querySelectorAll('[data-disguise]').forEach(btn => {
        btn.addEventListener('click', () => {
            const ap = loadAppearance();
            ap.disguise = btn.dataset['disguise'];
            saveAppearance(ap);
            sheet.setAttribute('aria-hidden', 'true');
            sheet.classList.remove('disguise-sheet--open');
            store.navigateTo('app');
        });
    });
    const navRoutes = {
        notes: () => store.navigateTo('notes'),
        'safety-plan': () => store.navigateTo('safety-plan'),
        companion: () => store.navigateTo('companion'),
        settings: () => store.navigateTo('settings'),
    };
    root.querySelectorAll('[data-nav]').forEach(btn => {
        btn.addEventListener('click', () => navRoutes[btn.dataset['nav']]?.());
    });
    const checkinBar = root.querySelector('#checkin-bar');
    const checkinLabel = root.querySelector('#checkin-label');
    const checkinCountdown = root.querySelector('#checkin-countdown');
    const checkinSheet = root.querySelector('#checkin-sheet');
    const checkinName = root.querySelector('#checkin-name');
    let selectedMins = 30;
    function fmtSecs(s) {
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    }
    function onTick(secsLeft) {
        checkinBar.style.display = 'block';
        checkinCountdown.textContent = fmtSecs(secsLeft);
    }
    function onExpire() {
        checkinBar.style.display = 'none';
    }
    if (isCheckinActive()) {
        checkinBar.style.display = 'block';
        checkinCountdown.textContent = fmtSecs(checkinSecondsLeft());
        resumeCheckinIfActive(onTick, onExpire);
    }
    root.querySelector('#btn-disguise').addEventListener('click', () => { });
    root.querySelectorAll('.checkin-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedMins = Number(btn.dataset['mins']);
            root.querySelectorAll('.checkin-preset').forEach(b => b.classList.remove('checkin-preset--active'));
            btn.classList.add('checkin-preset--active');
        });
    });
    root.querySelector('#checkin-start-btn').addEventListener('click', () => {
        const name = checkinName.value.trim() || 'Check-in';
        checkinSheet.setAttribute('aria-hidden', 'true');
        checkinSheet.classList.remove('checkin-sheet--open');
        checkinLabel.textContent = name;
        startCheckin(selectedMins, name, onTick, onExpire);
        checkinBar.style.display = 'block';
        checkinCountdown.textContent = fmtSecs(selectedMins * 60);
    });
    root.querySelector('#checkin-cancel').addEventListener('click', () => {
        cancelCheckin();
        checkinBar.style.display = 'none';
    });
    root.querySelector('#checkin-close').addEventListener('click', () => {
        checkinSheet.setAttribute('aria-hidden', 'true');
        checkinSheet.classList.remove('checkin-sheet--open');
    });
    root.querySelector('#btn-quick-checkin')?.addEventListener('click', () => {
        const open = checkinSheet.getAttribute('aria-hidden') === 'false';
        checkinSheet.setAttribute('aria-hidden', open ? 'true' : 'false');
        checkinSheet.classList.toggle('checkin-sheet--open', !open);
    });
}
function contactRow(c) {
    return `
    <li class="contact-item" data-id="${c.id}">
      <div class="contact-avatar">${c.initials}</div>
      <div class="contact-info">
        <span class="contact-name">${c.name}</span>
        <span class="contact-phone">${c.phone}</span>
      </div>
    </li>
  `;
}

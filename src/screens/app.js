import { store } from '../state.js';
import { loadAppearance, saveAppearance, DISGUISE_OPTIONS } from '../theme.js';
import { isCheckinActive, checkinSecondsLeft, startCheckin, cancelCheckin, resumeCheckinIfActive } from '../checkin.js';
import { openMenu, openMoreMenu } from '../menu.js';
import { smsUri } from '../storage.js';
import { dismissLowBattery, getLowBattery, onTrackChange, startBatteryMonitoring } from '../tracking.js';
function escapeHtml(value) {
    return value.replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[character] ?? character));
}
const DASHBOARD_CARDS = [
    { screen: 'emergency', icon: '<path d="M12 3v18M3 12h18"/>', label: 'Emergency dialer', detail: 'Call help directly' },
    { screen: 'contacts', icon: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.5 0 4 1.8 4 4"/>', label: 'Trusted contacts', detail: 'Manage your circle' },
    { screen: 'live', icon: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1116 0z"/><circle cx="12" cy="10" r="2.5"/>', label: 'Live location', detail: 'Share your location' },
    { screen: 'safety-plan', icon: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/><path d="M9 12l2 2 4-4"/>', label: 'Safety plan', detail: 'Your plan, ready' },
    { screen: 'history', icon: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 8v5l3 2"/>', label: 'Alert history', detail: 'Review past alerts' },
    { screen: 'notes', icon: '<path d="M5 3h14v18H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>', label: 'Private notes', detail: 'Keep key details' },
    { screen: 'chat', icon: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>', label: 'Safety assistant', detail: 'Get step-by-step guidance' },
    { screen: 'checkin', icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', label: 'Check-in timer', detail: 'Set a safe arrival time' },
    { screen: 'troubleshoot', icon: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1.1-1.5 2.5M12 17h.01"/>', label: 'Troubleshooting', detail: 'Fix common issues' },
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
        <button class="app-menu-button" id="btn-menu" type="button" aria-label="Open app menu" title="Open app menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
      </header>

      <section class="dashboard-alert-card" aria-label="Emergency alert">
        <button class="btn-hold" id="btn-hold" aria-label="Hold the PANIC button to send an alert" title="Hold for 1.5 seconds to send">
          <span class="btn-hold-label">PANIC</span>
          <div class="btn-hold-ring"></div>
        </button>
      </section>

      <div id="dashboard-battery-alert"></div>

      <nav class="app-bottom-nav" aria-label="Main navigation">
        <button class="app-bottom-nav-btn" data-bottom-nav="contacts" type="button">Circle</button>
        <button class="app-bottom-nav-btn" data-bottom-nav="profile" type="button">Profile</button>
        <button class="app-bottom-nav-btn" id="btn-open-menu" type="button">More</button>
      </nav>

      <div class="checkin-bar" id="checkin-bar" style="display:none">
        <div class="checkin-bar-inner">
          <span class="checkin-label" id="checkin-label">Check-in active</span>
          <span class="checkin-countdown" id="checkin-countdown"></span>
          <button class="checkin-cancel" id="checkin-cancel" aria-label="Cancel check-in">Cancel ✕</button>
        </div>
      </div>

      <button class="checkin-backdrop" id="checkin-backdrop" type="button" aria-label="Close check-in timer" hidden></button>
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

    </div>
  `;
    const holdBtn = root.querySelector('#btn-hold');
    const renderBatteryAlert = () => {
        const container = root.querySelector('#dashboard-battery-alert');
        if (!container)
            return;
        const lowBattery = getLowBattery();
        if (lowBattery === null) {
            container.innerHTML = '';
            return;
        }
        const currentState = store.getState();
        const currentName = currentState.profile.name || currentState.authEmail?.split('@')[0] || 'the phone owner';
        const message = `Panic Ring battery is low (${lowBattery}%). Please check in with ${currentName}.`;
        const contactLinks = currentState.contacts.map(contact => `<a class="dashboard-battery-contact" href="${smsUri(contact.phone, message)}">Message ${escapeHtml(contact.name)}</a>`).join('');
        container.innerHTML = `
          <section class="dashboard-battery-warning" role="alert">
            <div>
              <strong>Battery low — ${lowBattery}%</strong>
              <p>Choose a contact to prepare an SMS. Review it and tap Send in your Messages app.</p>
            </div>
            ${contactLinks || '<p>Add a trusted contact to prepare a battery alert.</p>'}
            <button class="btn-secondary" id="btn-dismiss-battery" type="button">Dismiss</button>
          </section>`;
        container.querySelector('#btn-dismiss-battery')?.addEventListener('click', dismissLowBattery);
    };
    const unsubscribeBattery = onTrackChange(renderBatteryAlert);
    const unsubscribeScreen = store.subscribe(state => {
        if (state.screen !== 'app') {
            unsubscribeBattery();
            unsubscribeScreen();
        }
    });
    void startBatteryMonitoring();
    renderBatteryAlert();
    let holdTimer = null;
    const cancelHold = () => {
        if (holdTimer) {
            clearTimeout(holdTimer);
            holdTimer = null;
        }
        holdBtn.classList.remove('btn-hold--holding');
    };
    const startHold = () => {
        if (holdTimer !== null)
            return;
        if (store.getState().contacts.length === 0) {
            holdBtn.classList.add('btn-hold--no-contacts');
            setTimeout(() => holdBtn.classList.remove('btn-hold--no-contacts'), 800);
            return;
        }
        holdBtn.classList.add('btn-hold--holding');
        holdTimer = setTimeout(() => store.navigateTo('location'), 1500);
    };
    holdBtn.addEventListener('pointerdown', event => {
        event.preventDefault();
        holdBtn.setPointerCapture(event.pointerId);
        startHold();
    });
    holdBtn.addEventListener('pointerup', cancelHold);
    holdBtn.addEventListener('pointercancel', cancelHold);
    holdBtn.addEventListener('lostpointercapture', cancelHold);
    holdBtn.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            startHold();
        }
    });
    holdBtn.addEventListener('keyup', event => {
        if (event.key === 'Enter' || event.key === ' ')
            cancelHold();
    });
    holdBtn.addEventListener('blur', cancelHold);
    root.querySelector('#btn-menu').addEventListener('click', openMenu);
    root.querySelector('#btn-open-menu').addEventListener('click', openMoreMenu);
    root.querySelector('#btn-manage-contacts')?.addEventListener('click', () => {
        store.navigateTo('contacts');
    });
    const checkinSheet = root.querySelector('#checkin-sheet');
    const checkinBackdrop = root.querySelector('#checkin-backdrop');
    const setCheckinOpen = (open) => {
        checkinSheet.setAttribute('aria-hidden', String(!open));
        checkinSheet.classList.toggle('checkin-sheet--open', open);
        checkinBackdrop.hidden = !open;
    };
    checkinBackdrop.addEventListener('click', () => setCheckinOpen(false));
    root.querySelectorAll('[data-dashboard]').forEach(button => {
        button.addEventListener('click', () => {
            const screen = button.dataset['dashboard'];
            if (screen === 'checkin') {
                setCheckinOpen(true);
            }
            else if (screen)
                store.navigateTo(screen);
        });
    });
    root.querySelectorAll('[data-bottom-nav]').forEach(button => {
        button.addEventListener('click', () => store.navigateTo(button.dataset['bottomNav'] ?? 'app'));
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
    root.querySelectorAll('.checkin-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedMins = Number(btn.dataset['mins']);
            root.querySelectorAll('.checkin-preset').forEach(b => b.classList.remove('checkin-preset--active'));
            btn.classList.add('checkin-preset--active');
        });
    });
    root.querySelector('#checkin-start-btn').addEventListener('click', () => {
        const name = checkinName.value.trim() || 'Check-in';
        setCheckinOpen(false);
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
        setCheckinOpen(false);
    });
    root.querySelector('#btn-quick-checkin')?.addEventListener('click', () => {
        const open = checkinSheet.getAttribute('aria-hidden') === 'false';
        setCheckinOpen(!open);
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

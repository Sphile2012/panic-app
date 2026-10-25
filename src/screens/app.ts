import { store } from '../state.js';
import { loadAppearance, saveAppearance, DISGUISE_OPTIONS } from '../theme.js';
import { isCheckinActive, checkinSecondsLeft, startCheckin, cancelCheckin, resumeCheckinIfActive } from '../checkin.js';
import { openMenu } from '../menu.js';
import { smsUri } from '../storage.js';
import { dismissLowBattery, getLowBattery, onTrackChange, startBatteryMonitoring, startTracking } from '../tracking.js';
import { startEmergencySession } from '../emergencySession.js';

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[character] ?? character));
}

export function renderApp(root) {
    const { contacts } = store.getState();
    const appearance = loadAppearance();
    const currentDisguise = DISGUISE_OPTIONS.find(d => d.id === appearance.disguise);
    root.innerHTML = `
    <div class="screen app-screen">

      <header class="app-header">
        <button class="app-menu-button" id="btn-menu" type="button" aria-label="Open app menu" title="Open app menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14"/></svg>
        </button>
      </header>

      <section class="dashboard-alert-card" aria-label="Emergency alert">
        <div class="dashboard-alert-copy">
          <h2>Your Safety<br><em>Matters</em></h2>
          <span class="app-title-underline" aria-hidden="true"></span>
        </div>
        <div class="app-panic-shell">
          <button class="btn-hold" id="btn-hold" aria-label="Hold the PANIC button to send an alert" title="Hold for 1.5 seconds to send">
            <span class="btn-hold-label">PANIC</span>
            <div class="btn-hold-ring"></div>
          </button>
        </div>
      </section>
      <div id="dashboard-battery-alert"></div>

      <div class="app-quick-bar" aria-label="Display options">
        <button class="app-quick-btn" id="btn-disguise" title="Change disguise screen"
          aria-label="Change disguise screen" aria-expanded="false">
          <img class="app-quick-icon" src="/favicon.svg" alt="" />
          <span class="app-quick-label">${currentDisguise?.label ?? 'Calculator'}</span>
          <svg class="app-quick-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>
        </button>

        <button class="app-quick-btn" id="btn-quick-checkin" title="Check-in timer"
          aria-label="Check-in timer">
          <span class="app-quick-label">Check-in</span>
        </button>
      </div>

      <nav class="app-bottom-nav" aria-label="Main navigation">
        <button class="app-bottom-nav-btn" data-bottom-nav="contacts" type="button">Circle</button>
        <button class="app-bottom-nav-btn app-bottom-nav-btn--active" data-bottom-nav="app" type="button">Home</button>
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

      <button class="disguise-backdrop" id="disguise-backdrop" type="button" aria-label="Close disguise menu" hidden></button>
      <div class="disguise-sheet" id="disguise-sheet" aria-hidden="true" inert>
        <details class="disguise-dropdown" open>
          <summary class="disguise-sheet-title">
            <span><img src="/favicon.svg" alt="" />Choose disguise screen</span>
            <span class="disguise-sheet-current">${currentDisguise?.label ?? 'Calculator'}</span>
          </summary>
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
        </details>
        <button class="disguise-sheet-close" id="disguise-close" aria-label="Close">Close</button>
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
        const contactLinks = currentState.contacts.map(contact =>
            `<a class="dashboard-battery-contact" href="${smsUri(contact.phone, message)}">Message ${escapeHtml(contact.name)}</a>`,
        ).join('');
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
        holdTimer = setTimeout(async () => {
            // Start emergency session and navigate to emergency status screen
            await startEmergencySession();
            store.navigateTo('emergency-status');
        }, 1500);
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
    root.querySelector('#btn-open-menu').addEventListener('click', openMenu);
    const checkinSheet: HTMLElement = root.querySelector('#checkin-sheet');
    const checkinBackdrop: HTMLButtonElement = root.querySelector('#checkin-backdrop');
    const setCheckinOpen = (open: boolean) => {
        checkinSheet.setAttribute('aria-hidden', String(!open));
        checkinSheet.classList.toggle('checkin-sheet--open', open);
        checkinBackdrop.hidden = !open;
    };
    checkinBackdrop.addEventListener('click', () => setCheckinOpen(false));
    root.querySelectorAll('[data-bottom-nav]').forEach(button => {
        button.addEventListener('click', () => store.navigateTo((button as HTMLElement).dataset['bottomNav'] ?? 'app'));
    });
    const sheet: HTMLElement = root.querySelector('#disguise-sheet');
    const disguiseBackdrop: HTMLButtonElement = root.querySelector('#disguise-backdrop');
    const disguiseButton: HTMLButtonElement = root.querySelector('#btn-disguise');
    const setDisguiseOpen = (open: boolean) => {
        sheet.setAttribute('aria-hidden', String(!open));
        sheet.classList.toggle('disguise-sheet--open', open);
        sheet.inert = !open;
        disguiseBackdrop.hidden = !open;
        disguiseButton.setAttribute('aria-expanded', String(open));
    };
    root.querySelector('#btn-disguise').addEventListener('click', () => {
        const open = sheet.getAttribute('aria-hidden') === 'false';
        setDisguiseOpen(!open);
    });
    disguiseBackdrop.addEventListener('click', () => setDisguiseOpen(false));
    root.querySelector('#disguise-close').addEventListener('click', () => setDisguiseOpen(false));
    root.querySelectorAll('[data-disguise]').forEach(btn => {
        btn.addEventListener('click', () => {
            const ap = loadAppearance();
            ap.disguise = btn.dataset['disguise'];
            saveAppearance(ap);
            setDisguiseOpen(false);
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

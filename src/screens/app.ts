import { store } from '../state.js';
import { loadAppearance, saveAppearance, applyAppearance, DISGUISE_OPTIONS } from '../theme.js';
import { isCheckinActive, checkinSecondsLeft, startCheckin, cancelCheckin, resumeCheckinIfActive } from '../checkin.js';
export function renderApp(root) {
    const { contacts, authEmail } = store.getState();
    const appearance = loadAppearance();
    const avatarLetter = authEmail
        ? authEmail[0].toUpperCase()
        : '?';
    const currentDisguise = DISGUISE_OPTIONS.find(d => d.id === appearance.disguise);
    root.innerHTML = `
    <div class="screen app-screen">

      <!-- Header row with avatar + account info -->
      <header class="app-header">
        <div class="app-ring-icon" aria-hidden="true">○</div>
        <div class="app-header-text">
          <h1 class="app-title">Panic Ring</h1>
          <p class="app-subtitle">Your circle is ready.</p>
        </div>
        <!-- Avatar / profile button -->
        <button class="app-avatar" id="btn-profile" aria-label="Account settings"
          title="${authEmail ?? 'Profile'}">
          ${avatarLetter}
        </button>
      </header>

      <!-- Signed-in account strip (shown only when logged in) -->
      ${authEmail ? `
        <div class="app-account-strip" id="account-strip">
          <span class="app-account-email">${authEmail}</span>
          <button class="app-signout-btn" id="btn-signout">Sign out</button>
        </div>
      ` : ''}

      <!-- Hold to activate -->
      <div class="app-activate-wrap">
        <button
          class="btn-hold"
          id="btn-hold"
          aria-label="Hold to send alert"
          title="Hold for 1.5 seconds to send">
          <span class="btn-hold-label">Hold to activate</span>
          <div class="btn-hold-ring"></div>
        </button>
        <p class="app-activate-hint">Hold 1.5 s · release to cancel</p>
      </div>

      <!-- Trusted circle -->
      <section class="app-contacts">
        <div class="section-header">
          <h2 class="section-label">Trusted circle</h2>
          <button class="section-action" id="btn-manage-contacts">Manage</button>
        </div>
        ${contacts.length === 0
        ? '<p class="empty-hint">No contacts yet — tap Manage to add someone.</p>'
        : `<ul class="contact-list">${contacts.map(contactRow).join('')}</ul>`}
      </section>

      <!-- Quick settings bar -->
      <div class="app-quick-bar">
        <!-- Disguise screen quick-switcher -->
        <button class="app-quick-btn" id="btn-disguise" title="Change disguise screen"
          aria-label="Change disguise screen">
          <span class="app-quick-icon">${currentDisguise?.preview ?? 'Calculator'}</span>
          <span class="app-quick-label">${currentDisguise?.label ?? 'Calculator'}</span>
        </button>

        <!-- Theme toggle -->
        <button class="app-quick-btn" id="btn-theme" title="Toggle dark/light mode"
          aria-label="Toggle theme">
          <span class="app-quick-icon" id="theme-icon">
            ${appearance.mode === 'light' ? 'Light' : 'Dark'}
          </span>
          <span class="app-quick-label">Theme</span>
        </button>

        <!-- Check-in timer -->
        <button class="app-quick-btn" id="btn-quick-checkin" title="Check-in timer"
          aria-label="Check-in timer">
          <span class="app-quick-label">Check-in</span>
        </button>
      </div>

      <!-- Bottom nav -->
      <nav class="app-nav" aria-label="Main navigation">
        <button class="app-nav-btn" data-nav="notes"        aria-label="Notes">Notes</button>
        <button class="app-nav-btn" data-nav="safety-plan"  aria-label="Safety Plan">Plan</button>
        <button class="app-nav-btn" data-nav="companion"    aria-label="Safety Companion">Help</button>
        <button class="app-nav-btn" data-nav="settings"     aria-label="Settings">Settings</button>
      </nav>

      <!-- Check-in timer panel -->
      <div class="checkin-bar" id="checkin-bar" style="display:none">
        <div class="checkin-bar-inner">
          <span class="checkin-label" id="checkin-label">Check-in active</span>
          <span class="checkin-countdown" id="checkin-countdown"></span>
          <button class="checkin-cancel" id="checkin-cancel" aria-label="Cancel check-in">Cancel ✕</button>
        </div>
      </div>

      <!-- Check-in setup sheet (hidden by default) -->
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

      <!-- Disguise picker sheet (hidden by default) -->
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
    root.querySelector('#btn-manage-contacts').addEventListener('click', () => {
        store.navigateTo('contacts');
    });
    root.querySelector('#btn-profile').addEventListener('click', () => {
        store.navigateTo('settings');
    });
    root.querySelector('#btn-signout')?.addEventListener('click', async () => {
        if (confirm('Sign out? The app will lock and you will need to sign in again.')) {
            await store.signOut();
        }
    });
    root.querySelector('#btn-theme').addEventListener('click', () => {
        const ap = loadAppearance();
        ap.mode = ap.mode === 'dark' ? 'light' : 'dark';
        saveAppearance(ap);
        applyAppearance(ap);
        const icon = root.querySelector('#theme-icon');
        icon.textContent = ap.mode === 'light' ? 'Light' : 'Dark';
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
    root.querySelector('#btn-theme').parentElement;
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

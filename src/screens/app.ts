import { store } from '../state.js';
import { loadAppearance, saveAppearance, applyAppearance, DISGUISE_OPTIONS } from '../theme.js';
import { isCheckinActive, checkinSecondsLeft, startCheckin, cancelCheckin, resumeCheckinIfActive } from '../checkin.js';
import type { Contact } from '../storage.js';

export function renderApp(root: HTMLElement): void {
  const { contacts, authEmail, safetyPlan, recoveryConfigured } = store.getState();
  const emergencyContacts = contacts.filter(contact => contact.level === 'emergency');
  const appearance   = loadAppearance();
  const avatarLetter = authEmail ? authEmail[0]!.toUpperCase() : '?';
  const firstName    = authEmail ? authEmail.split('@')[0]!.split('.')[0]! : null;
  const greeting     = getGreeting();
  const currentDisguise = DISGUISE_OPTIONS.find(d => d.id === appearance.disguise);
  const readinessItems = [
    ['At least one Level 1 emergency contact', emergencyContacts.length > 0],
    ['Trusted people are written in your plan', Boolean(safetyPlan.trustedPeople.trim())],
    ['A safe place is listed', Boolean(safetyPlan.safePlaces.trim())],
    ['Emergency numbers are recorded', Boolean(safetyPlan.emergencyNumbers.trim())],
    ['Transport options are recorded', Boolean(safetyPlan.transportOptions.trim())],
    ['Important documents are noted', Boolean(safetyPlan.importantDocs.trim())],
    ['PIN recovery is set up', recoveryConfigured],
  ] as const;
  const completedReadiness = readinessItems.filter(([, complete]) => complete).length;
  const readinessPercent = Math.round(completedReadiness / readinessItems.length * 100);
  const circleCheckDue = localStorage.getItem('pr_circle_check') !== localDateKey();

  root.innerHTML = `
    <div class="screen app-screen">

      
      <header class="app-header">
        <div class="app-header-left">
          <div class="app-ring-icon" aria-hidden="true">○</div>
          <div>
            <p class="app-greeting">${greeting}${firstName ? `, ${firstName}` : ''}</p>
            <h1 class="app-title">Panic Ring</h1>
          </div>
        </div>
        <button class="app-avatar" id="btn-profile"
          aria-label="Account settings" title="${authEmail ?? 'Profile'}">
          ${avatarLetter}
        </button>
      </header>

      
      ${authEmail ? `
        <div class="app-account-strip">
          <span class="app-account-email">${authEmail}</span>
          <button class="app-signout-btn" id="btn-signout">Sign out</button>
        </div>
      ` : `
        <div class="app-account-strip app-account-strip--guest">
          <span class="app-account-email">Guest mode — data stays on this device</span>
          <button class="app-signout-btn" id="btn-signin-prompt">Sign in</button>
        </div>
      `}

      
      <div class="app-activate-wrap">
        <button class="btn-hold" id="btn-hold"
          aria-label="Hold to send alert"
          title="Hold for 1.5 seconds to alert your circle">
          <span class="btn-hold-icon">Activate</span>
          <span class="btn-hold-label">Hold to activate</span>
          <div class="btn-hold-ring"></div>
        </button>
        <p class="app-activate-hint">
          ${emergencyContacts.length === 0
            ? 'Add a Level 1 emergency contact first'
            : `Hold 1.5 s · alerts ${emergencyContacts.length} emergency contact${emergencyContacts.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      <section class="readiness-card" aria-labelledby="readiness-title">
        <div class="readiness-heading">
          <h2 class="section-label" id="readiness-title">Safety readiness</h2>
          <span>${readinessPercent}% · ${completedReadiness}/${readinessItems.length}</span>
        </div>
        <div class="readiness-track" role="progressbar" aria-label="Safety readiness checklist"
          aria-valuemin="0" aria-valuemax="${readinessItems.length}" aria-valuenow="${completedReadiness}">
          <span style="width:${readinessPercent}%"></span>
        </div>
        <p class="readiness-note">A preparation checklist, not a prediction or guarantee of safety.</p>
        <details class="readiness-details">
          <summary>View checklist</summary>
          <ul>
            ${readinessItems.map(([label, complete]) => `
              <li>${complete ? 'Complete' : 'Pending'} · ${label}</li>
            `).join('')}
          </ul>
        </details>
      </section>

      ${circleCheckDue ? `
        <section class="circle-check-card" aria-labelledby="circle-check-title">
          <h2 id="circle-check-title">Circle Check</h2>
          <p>Are you safe today? Your answer stays on this device and is not shared.</p>
          <div class="circle-check-actions">
            <button class="btn-secondary-outline" id="circle-safe">I’m safe</button>
            <button class="btn-secondary-outline" id="circle-support">I need support</button>
            <button class="btn-danger" id="circle-danger">I may be in danger</button>
          </div>
        </section>
      ` : ''}

      
      <section class="app-contacts">
        <div class="section-header">
          <h2 class="section-label">Trusted circle</h2>
          <button class="section-action" id="btn-manage-contacts">
            ${contacts.length === 0 ? '+ Add contacts' : 'Manage'}
          </button>
        </div>
        ${contacts.length === 0
          ? `<div class="app-empty-state">
               <p class="app-empty-icon">0</p>
               <p class="app-empty-title">No contacts yet</p>
               <p class="app-empty-body">Add at least one trusted person to send alerts to.</p>
               <button class="btn-primary" id="btn-add-first" style="margin-top:10px">Add a contact</button>
             </div>`
          : `<ul class="contact-list">${contacts.map(contactRow).join('')}</ul>`
        }
      </section>

      
      <div class="app-quick-bar">
        <button class="app-quick-btn" id="btn-disguise" title="Change disguise screen">
          <span class="app-quick-icon">${currentDisguise?.preview ?? 'Calc'}</span>
          <span class="app-quick-label">${currentDisguise?.label ?? 'Calculator'}</span>
        </button>
        <button class="app-quick-btn" id="btn-theme" title="Toggle theme">
          <span class="app-quick-icon" id="theme-icon">${appearance.mode === 'light' ? 'Light' : 'Dark'}</span>
          <span class="app-quick-label">Theme</span>
        </button>
        <button class="app-quick-btn" id="btn-quick-checkin" title="Check-in timer">
          <span class="app-quick-icon">Timer</span>
          <span class="app-quick-label">Check-in</span>
        </button>
        <button class="app-quick-btn" id="btn-chatbot-home" title="Guidance bot">
          <span class="app-quick-icon">Bot</span>
          <span class="app-quick-label">Guide</span>
        </button>
        <button class="app-quick-btn" id="btn-safe-word-quick" title="Send a safe-word message">
          <span class="app-quick-icon">Word</span>
          <span class="app-quick-label">Safe word</span>
        </button>
      </div>

      
      <nav class="app-nav" aria-label="Main navigation">
        <button class="app-nav-btn" data-nav="notes">Notes</button>
        <button class="app-nav-btn" data-nav="safety-plan">Safety Plan</button>
        <button class="app-nav-btn" data-nav="companion">Get Help</button>
        <button class="app-nav-btn" data-nav="settings">Settings</button>
      </nav>

      
      <div class="checkin-bar" id="checkin-bar" style="display:none">
        <div class="checkin-bar-inner">
          <span class="checkin-icon">Timer</span>
          <span class="checkin-label" id="checkin-label">Check-in active</span>
          <span class="checkin-countdown" id="checkin-countdown"></span>
          <button class="checkin-cancel" id="checkin-cancel">I'm safe ✓</button>
        </div>
      </div>

      
      <div class="checkin-sheet" id="checkin-sheet" aria-hidden="true">
        <p class="checkin-sheet-title">Set a check-in timer</p>
        <p class="checkin-sheet-body">
          If time runs out, Panic Ring will prompt you to prepare an alert. Messages are never sent automatically.
        </p>
        <input class="text-input" id="checkin-name" type="text"
          placeholder="e.g. Walking home, Meeting…" maxlength="40" />
        <p class="checkin-sheet-sublabel">How long?</p>
        <div class="checkin-presets">
          <button class="checkin-preset checkin-preset--active" data-mins="15">15 min</button>
          <button class="checkin-preset" data-mins="30">30 min</button>
          <button class="checkin-preset" data-mins="60">1 hour</button>
          <button class="checkin-preset" data-mins="90">90 min</button>
        </div>
        <p class="checkin-form-note">
          Your browser may pause timers in the background. Reopen and unlock Panic Ring to check an expired timer.
        </p>
        <button class="btn-secondary-outline" id="btn-checkin-request" type="button">
          Prepare a check-in request for Level 3 contacts
        </button>
        <p class="checkin-form-hint" id="checkin-form-hint" aria-live="polite"></p>
        <div class="checkin-sheet-actions">
          <button class="btn-primary" id="checkin-start-btn">Start timer</button>
          <button class="checkin-sheet-close" id="checkin-close">Cancel</button>
        </div>
      </div>

      
      <div class="disguise-sheet" id="disguise-sheet" aria-hidden="true">
        <p class="disguise-sheet-title">Choose your cover screen</p>
        <p class="disguise-sheet-body">This is what the app looks like before you enter your PIN.</p>
        <div class="disguise-sheet-grid">
          ${DISGUISE_OPTIONS.map(d => `
            <button class="ap-disguise-card ${appearance.disguise === d.id ? 'ap-disguise-card--active' : ''}"
              data-disguise="${d.id}">
              <span class="ap-disguise-icon">${d.preview}</span>
              <span class="ap-disguise-label">${d.label}</span>
              <span class="ap-disguise-desc">${d.description}</span>
              ${appearance.disguise === d.id ? '<span class="ap-disguise-check">✓ Active</span>' : ''}
            </button>
          `).join('')}
        </div>
        <button class="disguise-sheet-close" id="disguise-close">Done</button>
      </div>

    </div>
  `;

  const holdBtn = root.querySelector<HTMLButtonElement>('#btn-hold')!;
  let holdTimer: ReturnType<typeof setTimeout> | null = null;

  const cancelHold = (): void => {
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    holdBtn.classList.remove('btn-hold--holding');
  };

  const startHold = (): void => {
    if (!store.getState().contacts.some(contact => contact.level === 'emergency')) {
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

  root.querySelector('#btn-manage-contacts')!.addEventListener('click', () => store.navigateTo('contacts'));
  root.querySelector('#btn-add-first')?.addEventListener('click', () => store.navigateTo('contacts'));

  root.querySelector('#btn-profile')!.addEventListener('click', () => store.navigateTo('settings'));
  root.querySelectorAll<HTMLButtonElement>('.contact-delete').forEach(delBtn => {
    delBtn.addEventListener('click', () => {
      const id = delBtn.dataset['id'];
      if (!id) return;
      const contact = store.getState().contacts.find(c => c.id === id);
      if (!contact) return;
      if (confirm(`Remove ${contact.name} from your circle?`)) {
        store.deleteContact(id);
        store.navigateTo('app');
      }
    });
  });
  root.querySelector('#btn-signout')?.addEventListener('click', async () => {
    if (confirm('Sign out? The app will lock and you will need to sign in again.')) {
      await store.signOut();
    }
  });
  root.querySelector('#btn-signin-prompt')?.addEventListener('click', () => store.navigateTo('login'));
  root.querySelector('#btn-safe-word-quick')!.addEventListener('click', () => store.navigateTo('safe-word'));
  root.querySelector('#btn-chatbot-home')?.addEventListener('click', () => store.navigateTo('chatbot'));

  root.querySelector('#circle-safe')?.addEventListener('click', () => {
    recordCircleCheck();
    root.querySelector('.circle-check-card')?.remove();
  });
  root.querySelector('#circle-support')?.addEventListener('click', () => {
    recordCircleCheck();
    store.navigateTo('companion');
  });
  root.querySelector('#circle-danger')?.addEventListener('click', () => {
    recordCircleCheck();
    store.navigateTo(emergencyContacts.length > 0 ? 'location' : 'companion');
  });

  root.querySelector('#btn-theme')!.addEventListener('click', () => {
    const ap = loadAppearance();
    ap.mode = ap.mode === 'dark' ? 'light' : 'dark';
    saveAppearance(ap);
    applyAppearance(ap);
    const icon = root.querySelector<HTMLElement>('#theme-icon')!;
    icon.textContent = ap.mode === 'light' ? 'Light' : 'Dark';
  });

  const sheet = root.querySelector<HTMLElement>('#disguise-sheet')!;

  root.querySelector('#btn-disguise')!.addEventListener('click', () => {
    sheet.setAttribute('aria-hidden', 'false');
    sheet.classList.add('disguise-sheet--open');
  });

  root.querySelector('#disguise-close')!.addEventListener('click', () => {
    sheet.setAttribute('aria-hidden', 'true');
    sheet.classList.remove('disguise-sheet--open');
  });

  root.querySelectorAll<HTMLButtonElement>('[data-disguise]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ap = loadAppearance();
      ap.disguise = btn.dataset['disguise'] as typeof ap.disguise;
      saveAppearance(ap);
      sheet.setAttribute('aria-hidden', 'true');
      sheet.classList.remove('disguise-sheet--open');
      store.navigateTo('app');
    });
  });

  const navRoutes: Record<string, () => void> = {
    notes:          () => store.navigateTo('notes'),
    'safety-plan':  () => store.navigateTo('safety-plan'),
    companion:      () => store.navigateTo('companion'),
    settings:       () => store.navigateTo('settings'),
  };
  root.querySelectorAll<HTMLButtonElement>('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => navRoutes[btn.dataset['nav']!]?.());
  });

  const checkinBar       = root.querySelector<HTMLElement>('#checkin-bar')!;
  const checkinLabel     = root.querySelector<HTMLElement>('#checkin-label')!;
  const checkinCountdown = root.querySelector<HTMLElement>('#checkin-countdown')!;
  const checkinSheet     = root.querySelector<HTMLElement>('#checkin-sheet')!;
  const checkinName      = root.querySelector<HTMLInputElement>('#checkin-name')!;
  const checkinHint      = root.querySelector<HTMLElement>('#checkin-form-hint')!;
  let selectedMins = 15;

  function fmtSecs(s: number): string {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  const onTick = (secsLeft: number): void => {
    checkinBar.style.display = 'block';
    checkinCountdown.textContent = fmtSecs(secsLeft);
  };

  const onExpire = (): void => {
    checkinBar.style.display = 'none';
  };

  if (isCheckinActive()) {
    checkinBar.style.display = 'block';
    checkinCountdown.textContent = fmtSecs(checkinSecondsLeft());
  }
  resumeCheckinIfActive(onTick, onExpire);

  root.querySelectorAll<HTMLButtonElement>('.checkin-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedMins = Number(btn.dataset['mins']);
      root.querySelectorAll('.checkin-preset').forEach(b => b.classList.remove('checkin-preset--active'));
      btn.classList.add('checkin-preset--active');
    });
  });

  root.querySelector('#btn-quick-checkin')!.addEventListener('click', () => {
    const open = checkinSheet.getAttribute('aria-hidden') === 'false';
    checkinSheet.setAttribute('aria-hidden', open ? 'true' : 'false');
    checkinSheet.classList.toggle('checkin-sheet--open', !open);
  });
  root.querySelector('#btn-checkin-request')!.addEventListener('click', () => store.navigateTo('checkin-request'));

  root.querySelector('#checkin-start-btn')!.addEventListener('click', () => {
    const name = checkinName.value.trim() || 'Check-in';
    try {
      startCheckin(selectedMins, name, onTick, onExpire);
      checkinHint.textContent = '';
      checkinSheet.setAttribute('aria-hidden', 'true');
      checkinSheet.classList.remove('checkin-sheet--open');
      checkinLabel.textContent = name;
      checkinBar.style.display = 'block';
      checkinCountdown.textContent = fmtSecs(selectedMins * 60);
    } catch {
      checkinHint.textContent = 'Could not save this timer on your device. Check your browser storage settings and try again.';
    }
  });

  root.querySelector('#checkin-cancel')!.addEventListener('click', () => {
    cancelCheckin();
    checkinBar.style.display = 'none';
  });

  root.querySelector('#checkin-close')!.addEventListener('click', () => {
    checkinSheet.setAttribute('aria-hidden', 'true');
    checkinSheet.classList.remove('checkin-sheet--open');
  });
}


function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function contactRow(c: Contact): string {
  return `
    <li class="contact-item" data-id="${c.id}">
      <div class="contact-avatar">${escapeHtml(c.initials)}</div>
      <div class="contact-info">
        <span class="contact-name">${escapeHtml(c.name)}</span>
        <span class="contact-phone">${escapeHtml(c.phone)}</span>
        <span class="contact-phone">${c.level === 'emergency' ? 'Level 1 · Emergency' : c.level === 'referral' ? 'Level 2 · Referrals' : 'Level 3 · Check-ins'}</span>
      </div>
      <button class="contact-delete" data-id="${c.id}" aria-label="Remove ${escapeHtml(c.name)}">Remove</button>
      <span class="contact-ready-dot" title="Ready to receive alerts"></span>
    </li>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function localDateKey(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function recordCircleCheck(): void {
  localStorage.setItem('pr_circle_check', localDateKey());
}

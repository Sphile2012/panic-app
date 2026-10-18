import '../strings/groupA.js';
import { store } from '../state.js';
import { t } from '../i18n.js';
import { openMenu } from '../menu.js';
import { displayIdentity, isPhoneIdentity } from '../db.js';
import { loadAppearance, saveAppearance, applyAppearance, DISGUISE_OPTIONS, disguiseLabel } from '../theme.js';
import { isCheckinActive, checkinSecondsLeft, startCheckin, cancelCheckin, resumeCheckinIfActive } from '../checkin.js';
export function renderApp(root) {
    const { contacts, authEmail: rawEmail, profile } = store.getState();
    const authEmail = rawEmail ? displayIdentity(rawEmail) : null;
    const appearance = loadAppearance();
    const avatarLetter = rawEmail
        ? (isPhoneIdentity(rawEmail) ? 'P' : rawEmail[0].toUpperCase())
        : '?';
    const currentDisguise = DISGUISE_OPTIONS.find(d => d.id === appearance.disguise);
    root.innerHTML = `
    <div class="screen app-screen">

      <!-- Header -->
      <header class="dash-header">
        <div class="dash-header-top">
          <button class="dash-menu-btn" id="btn-menu" aria-label="${t('menu.open')}">
            <span></span><span></span><span></span>
          </button>
          <button class="dash-hide-btn" id="btn-hide" aria-label="${t('app.hide')}">${t('app.hide')}</button>
          <button class="app-avatar dash-avatar" id="btn-profile" aria-label="${t('menu.profile')}"
            title="${authEmail ?? t('menu.profile')}">
            ${profile.photo ? `<img class="avatar-img" src="${profile.photo}" alt="" />` : avatarLetter}
          </button>
        </div>
        <h1 class="dash-title">${t('a.app.dashboard')}</h1>
        <p class="dash-sub">${profile.name ? profile.name + ' - ' : ''}${t('app.subtitle')}</p>
      </header>

      <div class="dash-sheet">

      <!-- Signed-in account strip (shown only when logged in) -->

      <!-- Tiles -->
      <nav class="dash-grid" aria-label="${t('a.app.mainnav')}">
        ${[
            ['profile', t('menu.profile'), 'M12 12a4 4 0 100-8 4 4 0 000 8zm-8 9a8 8 0 0116 0'],
            ['live', t('app.live'), 'M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11zm0-8.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z'],
            ['contacts', t('menu.contacts'), 'M16 11a3 3 0 100-6 3 3 0 000 6zM8 11a3 3 0 100-6 3 3 0 000 6zm0 2c-3 0-5 1.5-5 4v2h10v-2c0-2.5-2-4-5-4zm8 0c-.5 0-1 0-1.500.1 1.600 1 2.500 2.300 2.500 3.900v2h4v-2c0-2.500-2-4-5-4z'],
            ['notes', t('a.app.notes'), 'M6 3h9l4 4v14H6zM9 12h7M9 16h7'],
            ['safety-plan', t('a.app.plan'), 'M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z'],
            ['chat', t('app.chat'), 'M4 5h16v11H9l-5 4z'],
            ['companion', t('a.app.help'), 'M12 21a9 9 0 100-18 9 9 0 000 18zm0-6v-1c0-1.500 2-1.700 2-3.500a2 2 0 00-4 0M12 18h.01'],
            ['settings', t('menu.settings'), 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-2-4-2 .5-1.500-1L15 4h-4l-.5 2.500-1.500 1L7 7l-2 4 2 1v2l-2 1 2 4 2-.5 1.500 1L11 20h4l.5-2.500 1.500-1 2 .5 2-4-2-1z'],
        ].map(([id, label, d]) => `
          <button class="dash-tile" data-nav="${id}" aria-label="${label}">
            <span class="dash-tile-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg></span>
            <span class="dash-tile-label">${label}</span>
          </button>`).join('')}
      </nav>

      <!-- Hold to activate -->
      <div class="app-activate-wrap">
        <button
          class="btn-hold"
          id="btn-hold"
          aria-label="${t('app.hold')}"
          title="${t('app.hint')}">
          <span class="btn-hold-label">${t('app.hold')}</span>
          <div class="btn-hold-ring"></div>
        </button>
        <p class="app-activate-hint">${t('app.hint')}</p>
      </div>

      <!-- Trusted circle -->
      <section class="app-contacts">
        <div class="section-header">
          <h2 class="section-label">${t('app.circle')}</h2>
          <button class="section-action" id="btn-manage-contacts">${t('app.manage')}</button>
        </div>
        ${contacts.length === 0
        ? `<p class="empty-hint">${t('app.nocontacts')}</p>`
        : `<ul class="contact-list">${contacts.map(contactRow).join('')}</ul>`}
      </section>

      <!-- Quick settings bar -->
      <div class="app-quick-bar">
        <!-- Disguise screen quick-switcher -->
        <button class="app-quick-btn" id="btn-disguise"         title="${t('a.app.changedisguise')}"
                  aria-label="${t('a.app.changedisguise')}">
          <span class="app-quick-icon">${currentDisguise?.preview ?? 'Calculator'}</span>
          <span class="app-quick-label">${currentDisguise ? disguiseLabel(currentDisguise.id) : disguiseLabel('calculator')}</span>
        </button>

        <!-- Theme toggle -->
        <button class="app-quick-btn" id="btn-theme"         title="${t('a.app.togglemode')}"
                  aria-label="${t('a.app.toggletheme')}">
          <span class="app-quick-icon" id="theme-icon">
            ${appearance.mode === 'light' ? t('a.app.light') : t('a.app.dark')}
          </span>
          <span class="app-quick-label">${t('a.app.theme')}</span>
        </button>

        <!-- Check-in timer -->
        <button class="app-quick-btn" id="btn-quick-checkin"         title="${t('a.app.checkintimer')}"
                  aria-label="${t('a.app.checkintimer')}">
                  <span class="app-quick-label">${t('a.app.checkin')}</span>
        </button>
      </div>

      </div>

      <!-- Bottom bar -->
      <div class="dash-bottom">
        <button class="dash-bottom-btn" id="btn-menu-bottom" aria-label="${t('menu.open')}">${t('menu.open')}</button>
        <button class="dash-fab" id="btn-fab" aria-label="${t('app.hold')}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z"/></svg>
        </button>
        <button class="dash-bottom-btn" data-nav="profile" aria-label="${t('menu.profile')}">${t('menu.profile')}</button>
      </div>

      <!-- Check-in timer panel -->
      <div class="checkin-bar" id="checkin-bar" style="display:none">
        <div class="checkin-bar-inner">
          <span class="checkin-label" id="checkin-label">${t('a.app.checkinactive')}</span>
          <span class="checkin-countdown" id="checkin-countdown"></span>
          <button class="checkin-cancel" id="checkin-cancel" aria-label="${t('a.app.cancelcheckin')}">${t('common.cancel')}</button>
        </div>
      </div>

      <!-- Check-in setup sheet (hidden by default) -->
      <div class="checkin-sheet" id="checkin-sheet" aria-hidden="true">
        <p class="checkin-sheet-title">${t('a.app.settimer')}</p>
        <p class="checkin-sheet-body">
          ${t('a.app.timerbody')}
        </p>
        <input class="text-input" id="checkin-name" type="text"
          placeholder="${t('a.app.nameph')}" maxlength="40" />
        <div class="checkin-presets">
          ${[15, 30, 60, 90].map(m => `
            <button class="checkin-preset" data-mins="${m}">${t('a.app.mins', { n: m })}</button>
          `).join('')}
        </div>
        <div class="checkin-sheet-actions">
          <button class="btn-primary" id="checkin-start-btn">${t('a.app.start')}</button>
          <button class="checkin-sheet-close" id="checkin-close">${t('common.cancel')}</button>
        </div>
      </div>

      <!-- Disguise picker sheet (hidden by default) -->
      <div class="disguise-sheet" id="disguise-sheet" aria-hidden="true">
        <p class="disguise-sheet-title">${t('a.app.choosedisguise')}</p>
        <div class="disguise-sheet-grid">
          ${DISGUISE_OPTIONS.map(d => `
            <button
              class="ap-disguise-card ${appearance.disguise === d.id ? 'ap-disguise-card--active' : ''}"
              data-disguise="${d.id}">
              <span class="ap-disguise-icon">${d.preview}</span>
              <span class="ap-disguise-label">${disguiseLabel(d.id)}</span>
              ${appearance.disguise === d.id ? `<span class="ap-disguise-check">${t('a.app.active')}</span>` : ''}
            </button>
          `).join('')}
        </div>
        <button class="disguise-sheet-close" id="disguise-close" aria-label="${t('common.close')}">${t('common.close')}</button>
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
        store.navigateTo('profile');
    });
    root.querySelector('#btn-hide').addEventListener('click', () => store.navigateTo('calculator'));
    root.querySelector('#btn-menu').addEventListener('click', () => openMenu());
    root.querySelector('#btn-menu-bottom').addEventListener('click', () => openMenu());
    root.querySelector('#btn-fab').addEventListener('click', () => {
        holdBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        holdBtn.classList.add('btn-hold--no-contacts');
        setTimeout(() => holdBtn.classList.remove('btn-hold--no-contacts'), 800);
    });
    root.querySelector('#btn-signout')?.addEventListener('click', async () => {
        if (confirm(t('a.app.signoutconfirm'))) {
            await store.signOut();
        }
    });
    root.querySelector('#btn-theme').addEventListener('click', () => {
        const ap = loadAppearance();
        ap.mode = ap.mode === 'dark' ? 'light' : 'dark';
        saveAppearance(ap);
        applyAppearance(ap);
        const icon = root.querySelector('#theme-icon');
        icon.textContent = ap.mode === 'light' ? t('a.app.light') : t('a.app.dark');
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
        profile: () => store.navigateTo('profile'),
        contacts: () => store.navigateTo('contacts'),
        live: () => store.navigateTo('live'),
        chat: () => store.navigateTo('chat'),
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
        const name = checkinName.value.trim() || t('a.app.checkin');
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
        <span class="contact-phone">${c.phone}${c.relationship ? ' - ' + t('rel.' + c.relationship) : ''}</span>
      </div>
    </li>
  `;
}

import './style.css';
import { PIN_FAILURE_LIMIT, store } from './state.js';
import { renderCalculator } from './screens/calculator.js';
import { renderSetupPin, renderSetupDisguise, renderSetupProfile, renderSetupContacts, renderRecoverySetup } from './screens/setup.js';
import { renderApp } from './screens/app.js';
import { renderContacts } from './screens/contacts.js';
import { renderLocation } from './screens/location.js';
import { renderLive } from './screens/live.js';
import { renderProfile } from './screens/profile.js';
import { renderHistory, renderJourney, renderFakeCall, renderWatch, renderGuide, renderFaq } from './screens/pages.js';
import { renderRecords } from './screens/records.js';
import { renderChat } from './screens/chat.js';
import { renderSending, renderSent, updateSendingList } from './screens/sending.js';
import { renderNotes, renderNoteEdit } from './screens/notes.js';
import { renderSafetyPlan } from './screens/safetyPlan.js';
import { renderSupport } from './screens/support.js';
import { renderSettings, renderChangePins, renderPinRecovery } from './screens/settings.js';
import { renderAppearance } from './screens/appearance.js';
import { renderBudget } from './screens/disguise/budget.js';
import { renderWeather } from './screens/disguise/weather.js';
import { renderNotesPlain } from './screens/disguise/notesPlain.js';
import { renderClock } from './screens/disguise/clock.js';
import { renderCompanion } from './screens/companion.js';
import { renderAbout } from './screens/about.js';
import { renderTerms } from './screens/terms.js';
import { renderEmergencyDialer, renderTroubleshooting } from './screens/emergency.js';
import { renderDecoy } from './screens/decoy.js';
import { renderWelcome } from './screens/emailAuth.js';
import { runAlertSequence } from './alertService.js';
import { pruneStaleQueue, watchForReconnect } from './alertQueue.js';
import { loadAppearance, applyAppearance } from './theme.js';
import { initPwa, canInstall, isInstalled, isIosSafari, promptInstall, onInstallReady, onInstalled } from './pwa.js';

const appRoot = document.getElementById('app-root') as HTMLElement | null;
if (!appRoot) {
    throw new Error('App root element not found.');
}
initPwa();

let currentScreen: string | null = null;

function updateInstallBanner() {
    const banner = document.getElementById('install-banner') as HTMLElement | null;
    if (!banner)
        return;
    if (isInstalled()) {
        banner.style.display = 'none';
        return;
    }
    if (canInstall() || isIosSafari()) {
        banner.style.display = 'flex';
    }
}

function renderDisguise() {
    const appearance = loadAppearance();
    switch (appearance.disguise) {
        case 'budget':
            renderBudget(appRoot);
            break;
        case 'weather':
            renderWeather(appRoot);
            break;
        case 'notes-plain':
            renderNotesPlain(appRoot);
            break;
        case 'clock':
            renderClock(appRoot);
            break;
        default:
            renderCalculator(appRoot);
            break;
    }
}

function render(screen: string) {
    currentScreen = screen;
    appRoot.scrollTop = 0;
    switch (screen) {
        case 'welcome':
            renderWelcome(appRoot);
            break;
        case 'calculator':
            renderDisguise();
            break;
        case 'decoy':
            renderDecoy(appRoot);
            break;
        case 'setup-pin':
            renderSetupPin(appRoot);
            break;
        case 'setup-disguise':
            renderSetupDisguise(appRoot);
            break;
        case 'setup-profile':
            renderSetupProfile(appRoot);
            break;
        case 'setup-contacts':
            renderSetupContacts(appRoot);
            break;
        case 'recovery-setup':
            renderRecoverySetup(appRoot, 'setup-profile');
            break;
        case 'recovery-settings':
            renderRecoverySetup(appRoot, 'settings');
            break;
        case 'app':
            renderApp(appRoot);
            break;
        case 'profile':
            renderProfile(appRoot);
            break;
        case 'contacts':
            renderContacts(appRoot);
            break;
        case 'live':
            renderLive(appRoot);
            break;
        case 'history':
            renderHistory(appRoot);
            break;
        case 'records':
            void renderRecords(appRoot);
            break;
        case 'chat':
            renderChat(appRoot);
            break;
        case 'journey':
            renderJourney(appRoot);
            break;
        case 'fakecall':
            renderFakeCall(appRoot);
            break;
        case 'watch':
            renderWatch(appRoot);
            break;
        case 'guide':
            renderGuide(appRoot);
            break;
        case 'faq':
            renderFaq(appRoot);
            break;
        case 'location':
            renderLocation(appRoot);
            break;
        case 'notes':
            renderNotes(appRoot);
            break;
        case 'note-edit':
            renderNoteEdit(appRoot);
            break;
        case 'safety-plan':
            renderSafetyPlan(appRoot);
            break;
        case 'support':
            renderSupport(appRoot);
            break;
        case 'emergency':
            renderEmergencyDialer(appRoot);
            break;
        case 'troubleshoot':
            renderTroubleshooting(appRoot);
            break;
        case 'companion':
            renderCompanion(appRoot);
            break;
        case 'about':
            renderAbout(appRoot);
            break;
        case 'terms':
            renderTerms(appRoot);
            break;
        case 'settings':
            renderSettings(appRoot);
            break;
        case 'change-pins':
            renderChangePins(appRoot);
            break;
        case 'pin-recovery':
            renderPinRecovery(appRoot);
            break;
        case 'appearance':
            renderAppearance(appRoot);
            break;
        case 'sending':
            renderSending(appRoot);
            runAlertSequence(
                store.getState().alertLocation,
                store.getState().locationShared,
                () => {
                    if (store.getState().screen === 'sending')
                        updateSendingList(appRoot);
                },
            );
            break;
        case 'sent':
            renderSent(appRoot);
            break;
        default:
            renderCalculator(appRoot);
            break;
    }
    attachBackButton(screen);
}

function attachBackButton(screen: string) {
    if (['welcome', 'calculator', 'decoy', 'sending'].includes(screen))
        return;
    if (screen === 'pin-recovery' && store.getState().pinFailures >= PIN_FAILURE_LIMIT)
        return;
    const button = document.createElement('button');
    button.className = 'global-back-button';
    button.type = 'button';
    button.setAttribute('aria-label', 'Back');
    button.textContent = '←';
    if (screen === 'app') {
        button.classList.add('global-back-button--inline');
        appRoot.querySelector('.app-header')?.prepend(button);
        return;
    }
    const screenRoot = appRoot.querySelector<HTMLElement>('.screen');
    if (!screenRoot || screenRoot.querySelector('.btn-back-small'))
        return;
    screenRoot.prepend(button);
}

store.subscribe((state) => {
    if (state.screen !== currentScreen)
        render(state.screen);
});

document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element))
        return;
    const button = target.closest<HTMLButtonElement>('.btn-back-small, .global-back-button');
    if (!button)
        return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (store.getState().screen === 'sent')
        store.navigateTo('app');
    else
        store.navigateBack();
}, true);

document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
        const safe = [
            'calculator', 'decoy', 'setup-pin', 'setup-profile', 'setup-contacts',
            'welcome',
        ];
        if (!safe.includes(store.getState().screen)) {
            window.location.href = 'https://www.google.com';
        }
    }
});

document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (store.getState().screen !== 'calculator')
        return;
    const keysEl = appRoot.querySelector('.calc-keys') as HTMLElement | null;
    if (!keysEl)
        return;

    let value: string | null = null;
    if (/^[0-9]$/.test(event.key)) {
        value = event.key;
    }
    else if (event.key === 'Enter' || event.key === '=') {
        value = '=';
    }
    else if (event.key === 'Backspace' || event.key === 'c' || event.key === 'C') {
        value = 'C';
    }
    else if (event.key === '+') {
        value = '+';
    }
    else if (event.key === '-') {
        value = '-';
    }
    else if (event.key === '*') {
        value = '*';
    }
    else if (event.key === '/') {
        event.preventDefault();
        value = '/';
    }

    if (value) {
        const key = keysEl.querySelector(`[data-value="${value}"]`) as HTMLElement | null;
        key?.click();
    }
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => { });
}

async function handleInstallClick() {
    const coverMessage = document.getElementById('splash-install-message');
    if (isInstalled()) {
        if (coverMessage) {
            coverMessage.textContent = 'Panic Ring is already installed.';
            coverMessage.hidden = false;
        }
        return;
    }
    if (isIosSafari()) {
        const msg = document.getElementById('ios-install-msg');
        if (msg)
            msg.style.display = 'block';
        if (coverMessage) {
            coverMessage.textContent = 'Tap Share, then Add to Home Screen.';
            coverMessage.hidden = false;
        }
        return;
    }
    const outcome = await promptInstall();
    if (outcome === 'unavailable' && coverMessage) {
        coverMessage.textContent = 'Install is not available in this browser yet.';
        coverMessage.hidden = false;
    }
}

document.getElementById('install-btn')?.addEventListener('click', () => void handleInstallClick());
appRoot.addEventListener('click', event => {
    if ((event.target as HTMLElement).closest('#splash-install'))
        void handleInstallClick();
});

onInstallReady(() => updateInstallBanner());
onInstalled(() => {
    const banner = document.getElementById('install-banner');
    if (banner)
        banner.style.display = 'none';
});

pruneStaleQueue();
watchForReconnect(({ locationText, locationShared }) => {
    store.startSending();
    runAlertSequence(locationText, locationShared, () => {
        if (store.getState().screen === 'sending')
            updateSendingList(appRoot);
    });
});
render(store.getState().screen);
updateInstallBanner();
const appearance = loadAppearance();
applyAppearance(appearance);

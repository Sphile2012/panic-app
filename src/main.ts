import './style.css';
import { store } from './state.js';
import { renderCalculator } from './screens/calculator.js';
import { renderSetupPin, renderSetupContacts } from './screens/setup.js';
import { renderApp } from './screens/app.js';
import { renderContacts } from './screens/contacts.js';
import { renderLocation } from './screens/location.js';
import { renderLive } from './screens/live.js';
import { renderChat } from './screens/chat.js';
import { renderProfile } from './screens/profile.js';
import { renderRecords } from './screens/records.js';
import { startEvidenceCapture } from './evidence.js';
import { renderHistory, renderJourney, renderFakeCall, renderWatch, renderGuide, renderFaq } from './screens/pages.js';
import { onTrackChange, getLowBattery } from './tracking.js';
import { renderSending, renderSent, updateSendingList } from './screens/sending.js';
import { renderNotes, renderNoteEdit } from './screens/notes.js';
import { renderSafetyPlan } from './screens/safetyPlan.js';
import { renderSupport } from './screens/support.js';
import { renderSettings } from './screens/settings.js';
import { renderAppearance } from './screens/appearance.js';
import { renderSignup, renderLogin, renderVerifyEmail, renderForgotPassword, renderResetPassword } from './screens/auth.js';
import { renderBudget } from './screens/disguise/budget.js';
import { renderWeather } from './screens/disguise/weather.js';
import { renderNotesPlain } from './screens/disguise/notesPlain.js';
import { renderClock } from './screens/disguise/clock.js';
import { renderCompanion } from './screens/companion.js';
import { renderAbout } from './screens/about.js';
import { renderTerms } from './screens/terms.js';
import { renderDecoy } from './screens/decoy.js';
import { runAlertSequence } from './alertService.js';
import { pruneStaleQueue, watchForReconnect } from './alertQueue.js';
import { loadAppearance, applyAppearance, watchSystemTheme } from './theme.js';
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
        case 'signup':
            renderSignup(appRoot);
            break;
        case 'login':
            renderLogin(appRoot);
            break;
        case 'forgot-password':
            renderForgotPassword(appRoot);
            break;
        case 'reset-password':
            renderResetPassword(appRoot);
            break;
        case 'verify-email':
            renderVerifyEmail(appRoot);
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
        case 'setup-contacts':
            renderSetupContacts(appRoot);
            break;
        case 'app':
            renderApp(appRoot);
            break;
        case 'contacts':
            renderContacts(appRoot);
            break;
        case 'location':
            renderLocation(appRoot);
            break;
        case 'live':
            renderLive(appRoot);
            break;
        case 'chat':
            renderChat(appRoot);
            break;
        case 'profile':
            renderProfile(appRoot);
            break;
        case 'history':
            renderHistory(appRoot);
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
        case 'appearance':
            renderAppearance(appRoot);
            break;
        case 'sending':
            renderSending(appRoot);
            startEvidenceCapture();
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
        case 'records':
            renderRecords(appRoot);
            break;
        default:
            renderCalculator(appRoot);
            break;
    }
}

let currentRev = -1;
store.subscribe((state) => {
    if (state.screen !== currentScreen || state.rev !== currentRev) {
        currentRev = state.rev;
        render(state.screen);
    }
});

document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
        const safe = ['calculator', 'decoy', 'setup-pin', 'setup-contacts', 'signup', 'login', 'verify-email'];
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

onTrackChange(() => {
    if (getLowBattery() !== null && store.getState().screen === 'app')
        store.navigateTo('live');
});

document.getElementById('install-btn')?.addEventListener('click', async () => {
    if (isIosSafari()) {
        const msg = document.getElementById('ios-install-msg');
        if (msg)
            msg.style.display = 'block';
        return;
    }
    await promptInstall();
});

onInstallReady(() => updateInstallBanner());
onInstalled(() => {
    const banner = document.getElementById('install-banner');
    if (banner)
        banner.style.display = 'none';
});

const appearance = loadAppearance();
applyAppearance(appearance);
render(store.getState().screen);
updateInstallBanner();

store.initAuth().then(() => {
    if (/type=recovery/.test(window.location.hash))
        store.navigateTo('reset-password');
    pruneStaleQueue();
    watchForReconnect(({ locationText, locationShared }) => {
        store.startSending();
        startEvidenceCapture();
        runAlertSequence(locationText, locationShared, () => {
            if (store.getState().screen === 'sending')
                updateSendingList(appRoot);
        });
    });

    watchSystemTheme(() => loadAppearance().mode);
});

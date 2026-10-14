import { store } from './state.js';
import { buildSmsBody, smsUri } from './storage.js';
const SESSION_KEY = 'pr_checkin';
function loadCheckin() {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
function saveCheckin(s) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
}
function clearCheckin() {
    sessionStorage.removeItem(SESSION_KEY);
}
let _expiryTimer = null;
let _tickInterval = null;
let _onTick = null;
let _onExpire = null;
export function isCheckinActive() {
    const s = loadCheckin();
    return s !== null && s.endsAt > Date.now();
}
export function checkinSecondsLeft() {
    const s = loadCheckin();
    if (!s)
        return 0;
    return Math.max(0, Math.floor((s.endsAt - Date.now()) / 1000));
}
export function startCheckin(durationMinutes, timerName, onTick, onExpire) {
    stopCheckin();
    const state = {
        endsAt: Date.now() + durationMinutes * 60 * 1000,
        timerName,
        message: `Check-in missed: ${timerName}`,
    };
    saveCheckin(state);
    _onTick = onTick;
    _onExpire = onExpire;
    _arm();
}
export function cancelCheckin() {
    stopCheckin();
    clearCheckin();
}
function stopCheckin() {
    if (_expiryTimer) {
        clearTimeout(_expiryTimer);
        _expiryTimer = null;
    }
    if (_tickInterval) {
        clearInterval(_tickInterval);
        _tickInterval = null;
    }
}
function _arm() {
    const secsLeft = checkinSecondsLeft();
    if (secsLeft <= 0) {
        _fire();
        return;
    }
    _tickInterval = setInterval(() => {
        const s = checkinSecondsLeft();
        _onTick?.(s);
        if (s <= 0)
            _fire();
    }, 1000);
    _expiryTimer = setTimeout(_fire, secsLeft * 1000);
}
function _fire() {
    stopCheckin();
    clearCheckin();
    _onExpire?.();
    const { contacts } = store.getState();
    const checkin = loadCheckin();
    const msg = checkin?.message ?? 'Check-in missed.';
    contacts.forEach(c => {
        const body = buildSmsBody(c.name, 'Check-in not received.', false) +
            `\n\nOriginal check-in: ${msg}`;
        window.location.href = smsUri(c.phone, body);
    });
}
export function resumeCheckinIfActive(onTick, onExpire) {
    if (!isCheckinActive())
        return false;
    _onTick = onTick;
    _onExpire = onExpire;
    _arm();
    return true;
}

import { store } from './state.js';
const CHECKIN_KEY = 'pr_checkin';
function loadCheckin() {
    try {
        const raw = localStorage.getItem(CHECKIN_KEY) ?? sessionStorage.getItem(CHECKIN_KEY);
        if (!raw)
            return null;
        const value = JSON.parse(raw);
        if (typeof value !== 'object' || value === null)
            return null;
        const checkin = value;
        if (!Number.isFinite(checkin.endsAt) || typeof checkin.timerName !== 'string')
            return null;
        return { endsAt: checkin.endsAt, timerName: checkin.timerName };
    }
    catch {
        return null;
    }
}
function saveCheckin(checkin) {
    localStorage.setItem(CHECKIN_KEY, JSON.stringify(checkin));
}
function clearCheckin() {
    localStorage.removeItem(CHECKIN_KEY);
    sessionStorage.removeItem(CHECKIN_KEY);
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
    if (_expiryTimer !== null) {
        clearTimeout(_expiryTimer);
        _expiryTimer = null;
    }
    if (_tickInterval !== null) {
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
    const checkin = loadCheckin();
    if (!checkin)
        return;
    const lockedScreens = [
        'calculator', 'decoy', 'setup-pin', 'setup-contacts', 'signup',
        'login', 'forgot-password', 'verify-email', 'pin-recovery',
    ];
    if (lockedScreens.includes(store.getState().screen))
        return;
    clearCheckin();
    _onExpire?.();
    setTimeout(() => store.navigateTo('checkin-expired'), 0);
}
export function resumeCheckinIfActive(onTick, onExpire) {
    const checkin = loadCheckin();
    if (!checkin)
        return false;
    _onTick = onTick;
    _onExpire = onExpire;
    if (checkin.endsAt <= Date.now()) {
        _fire();
        return false;
    }
    stopCheckin();
    _arm();
    return true;
}

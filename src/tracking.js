import { DB_CONFIGURED, getClient } from './db.js';
const TOKEN_KEY = 'pr_track_token';
const ACTIVE_KEY = 'pr_track_active';
const INTERVAL_MS = 10000;
const LOW_LEVELS = [0.2];
let timer = null;
let last = null;
let error = null;
let batteryRef = null;
let alertedLevel = null;
let lowPct = null;
const listeners = new Set();
function emit() {
    listeners.forEach(l => l());
}
export function onTrackChange(l) {
    listeners.add(l);
    return () => listeners.delete(l);
}
export function isTrackToken(token) {
    return /^[0-9a-f]{32}$/i.test(token);
}
export function getToken() {
    let tok = localStorage.getItem(TOKEN_KEY);
    if (!tok || !isTrackToken(tok)) {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        tok = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
        localStorage.setItem(TOKEN_KEY, tok);
    }
    return tok;
}
export function trackUrl() {
    return `${location.origin}/track.html#${getToken()}`;
}
export function isTracking() {
    return timer !== null;
}
export function getLast() {
    return last;
}
export function getError() {
    return error;
}
export function getLowBattery() {
    return lowPct;
}
export function dismissLowBattery() {
    lowPct = null;
    emit();
}
export function mapsUrl(s) {
    return s ? `https://maps.google.com/?q=${s.lat},${s.lng}` : trackUrl();
}
async function initBattery() {
    const nav = navigator;
    if (batteryRef || typeof nav.getBattery !== 'function')
        return;
    try {
        batteryRef = await nav.getBattery();
        batteryRef.addEventListener('levelchange', checkBattery);
        batteryRef.addEventListener('chargingchange', checkBattery);
    }
    catch {
        batteryRef = null;
    }
}
export async function startBatteryMonitoring() {
    await initBattery();
    checkBattery();
}
function checkBattery() {
    if (!batteryRef)
        return;
    const level = batteryRef.level;
    if (batteryRef.charging) {
        alertedLevel = null;
        if (lowPct !== null)
            lowPct = null;
        emit();
        return;
    }
    for (const lv of LOW_LEVELS) {
        if (level <= lv && (alertedLevel === null || lv < alertedLevel)) {
            alertedLevel = lv;
            lowPct = Math.round(level * 100);
            emit();
            return;
        }
    }
}
function getPosition() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 9000,
            maximumAge: 0,
        });
    });
}
async function tick() {
    try {
        const pos = await getPosition();
        last = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            battery: batteryRef ? Math.round(batteryRef.level * 100) : null,
            charging: batteryRef ? Boolean(batteryRef.charging) : false,
            at: Date.now(),
        };
        checkBattery();
        if (DB_CONFIGURED) {
            try {
                const { data, error: syncError } = await getClient().rpc('push_track', {
                    p_token: getToken(),
                    p_lat: last.lat,
                    p_lng: last.lng,
                    p_accuracy: last.accuracy,
                    p_battery: last.battery,
                    p_charging: last.charging,
                });
                if (syncError || data !== true) {
                    error = 'network';
                    console.warn('[tracking] Location sync failed:', syncError?.code ?? 'not-owner');
                }
                else {
                    error = null;
                }
            }
            catch {
                error = 'network';
                console.warn('[tracking] Location sync unavailable.');
            }
        }
        else {
            error = null;
        }
    }
    catch (e) {
        error = e && e.code === 1 ? 'denied' : 'unavailable';
        if (error === 'denied')
            stopTracking();
    }
    emit();
}
export async function startTracking() {
    if (timer !== null)
        return;
    if (!('geolocation' in navigator)) {
        error = 'unsupported';
        emit();
        return;
    }
    error = null;
    await initBattery();
    localStorage.setItem(ACTIVE_KEY, '1');
    timer = window.setInterval(tick, INTERVAL_MS);
    emit();
    await tick();
}
export function stopTracking() {
    if (timer !== null) {
        clearInterval(timer);
        timer = null;
    }
    localStorage.removeItem(ACTIVE_KEY);
    emit();
}
export function wasTracking() {
    return localStorage.getItem(ACTIVE_KEY) === '1';
}
export async function fetchTrack(token) {
    if (!DB_CONFIGURED || !isTrackToken(token))
        return null;
    try {
        const { data, error: err } = await getClient().rpc('get_track', { p_token: token });
        if (err || !data || !data.length) {
            if (err)
                console.warn('[tracking] Shared location lookup failed:', err.code ?? 'unknown');
            return null;
        }
        const r = data[0];
        return {
            lat: r.lat,
            lng: r.lng,
            accuracy: r.accuracy,
            battery: r.battery,
            charging: r.charging,
            at: new Date(r.updated_at).getTime(),
            updated: r.updated_at,
        };
    }
    catch {
        console.warn('[tracking] Shared location service unavailable.');
        return null;
    }
}

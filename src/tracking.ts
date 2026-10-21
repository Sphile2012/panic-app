import { DB_CONFIGURED, getClient } from './db.js';

export interface TrackSnapshot {
    lat: number;
    lng: number;
    accuracy: number;
    battery: number | null;
    charging: boolean;
    at: number;
}

export type TrackListener = () => void;

const TOKEN_KEY = 'pr_track_token';
const ACTIVE_KEY = 'pr_track_active';
const INTERVAL_MS = 10_000;
const LOW_LEVELS = [0.2, 0.1];

let timer: number | null = null;
let last: TrackSnapshot | null = null;
let error: 'denied' | 'unsupported' | 'unavailable' | 'network' | null = null;
let batteryRef: any = null;
let alertedLevel: number | null = null;
let lowPct: number | null = null;
const listeners = new Set<TrackListener>();

function emit() {
    listeners.forEach(l => l());
}

export function onTrackChange(l: TrackListener): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
}

export function isTrackToken(token: string): boolean {
    return /^[0-9a-f]{32}$/i.test(token);
}

export function getToken(): string {
    let tok = localStorage.getItem(TOKEN_KEY);
    if (!tok || !isTrackToken(tok)) {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        tok = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
        localStorage.setItem(TOKEN_KEY, tok);
    }
    return tok;
}

export function trackUrl(): string {
    return `${location.origin}/track.html#${getToken()}`;
}

export function isTracking(): boolean {
    return timer !== null;
}

export function getLast(): TrackSnapshot | null {
    return last;
}

export function getError() {
    return error;
}

export function getLowBattery(): number | null {
    return lowPct;
}

export function dismissLowBattery() {
    lowPct = null;
    emit();
}

export function mapsUrl(s: TrackSnapshot | null): string {
    return s ? `https://maps.google.com/?q=${s.lat},${s.lng}` : trackUrl();
}

async function initBattery() {
    const nav: any = navigator;
    if (batteryRef || typeof nav.getBattery !== 'function') return;
    try {
        batteryRef = await nav.getBattery();
        batteryRef.addEventListener('levelchange', checkBattery);
        batteryRef.addEventListener('chargingchange', checkBattery);
    } catch {
        batteryRef = null;
    }
}

function checkBattery() {
    if (!batteryRef) return;
    const level: number = batteryRef.level;
    if (batteryRef.charging) {
        alertedLevel = null;
        if (lowPct !== null) lowPct = null;
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

function getPosition(): Promise<GeolocationPosition> {
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
            } catch {
                error = 'network';
                console.warn('[tracking] Location sync unavailable.');
            }
        }
        else {
            error = null;
        }
    } catch (e: any) {
        error = e && e.code === 1 ? 'denied' : 'unavailable';
        if (error === 'denied') stopTracking();
    }
    emit();
}

export async function startTracking(): Promise<void> {
    if (timer !== null) return;
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

export function wasTracking(): boolean {
    return localStorage.getItem(ACTIVE_KEY) === '1';
}

export async function fetchTrack(token: string): Promise<(TrackSnapshot & { updated: string }) | null> {
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

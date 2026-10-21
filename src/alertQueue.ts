import { store } from './state.js';
const QUEUE_KEY = 'pr_alert_queue';
export function enqueueAlert(locationText, locationShared) {
    const item = { locationText, locationShared, queuedAt: Date.now() };
    localStorage.setItem(QUEUE_KEY, JSON.stringify(item));
}
export function dequeueAlert() {
    try {
        const raw = localStorage.getItem(QUEUE_KEY);
        if (!raw)
            return null;
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
export function clearQueue() {
    localStorage.removeItem(QUEUE_KEY);
}
export function hasQueuedAlert() {
    return localStorage.getItem(QUEUE_KEY) !== null;
}
export function watchForReconnect(onReconnect) {
    window.addEventListener('online', () => {
        const queued = dequeueAlert();
        if (!queued)
            return;
        clearQueue();
        const banner = document.createElement('div');
        banner.className = 'reconnect-banner';
        banner.textContent = 'Connection restored — sending your alert now…';
        banner.setAttribute('role', 'alert');
        document.body.prepend(banner);
        setTimeout(() => banner.remove(), 5000);
        onReconnect(queued);
    });
    if (navigator.onLine) {
        const queued = dequeueAlert();
        if (!queued)
            return;
        clearQueue();
        onReconnect(queued);
    }
}
const STALE_MS = 30 * 60 * 1000;
export function isQueuedAlertStale() {
    const q = dequeueAlert();
    if (!q)
        return false;
    return Date.now() - q.queuedAt > STALE_MS;
}
export function pruneStaleQueue() {
    if (isQueuedAlertStale()) {
        clearQueue();
        store.resetAlertStatuses();
    }
}

import { store } from './state.js';
const QUEUE_KEY = 'pr_alert_queue';
const STALE_MS = 30 * 60 * 1000;

type QueuedAlert = {
    locationText: string;
    locationShared: boolean;
    queuedAt: number;
};

export function enqueueAlert(locationText, locationShared) {
    const item = { locationText, locationShared, queuedAt: Date.now() };
    localStorage.setItem(QUEUE_KEY, JSON.stringify(item));
}
export function dequeueAlert(): QueuedAlert | null {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw)
        return null;

    let item: unknown;
    try {
        item = JSON.parse(raw);
    }
    catch {
        discardInvalidQueuedAlert();
        return null;
    }
    if (typeof item !== 'object' || item === null) {
        discardInvalidQueuedAlert();
        return null;
    }
    const queued = item as Partial<QueuedAlert>;
    if (typeof queued.locationText !== 'string'
        || typeof queued.locationShared !== 'boolean'
        || typeof queued.queuedAt !== 'number'
        || !Number.isFinite(queued.queuedAt)) {
        discardInvalidQueuedAlert();
        return null;
    }
    return {
        locationText: queued.locationText,
        locationShared: queued.locationShared,
        queuedAt: queued.queuedAt,
    };
}
export function clearQueue() {
    localStorage.removeItem(QUEUE_KEY);
}
export function hasQueuedAlert() {
    return localStorage.getItem(QUEUE_KEY) !== null;
}

function showQueueBanner(message: string, warning = false) {
    const banner = document.createElement('div');
    banner.className = `reconnect-banner${warning ? ' reconnect-banner--warning' : ''}`;
    banner.textContent = message;
    banner.setAttribute('role', 'alert');
    document.body.prepend(banner);
    setTimeout(() => banner.remove(), 7000);
}

function discardInvalidQueuedAlert(): void {
    clearQueue();
    store.resetAlertStatuses();
    showQueueBanner('A saved alert could not be restored and was not sent. Prepare a new alert if you still need help.', true);
}

function takeQueuedAlert(onReconnect: (alert: QueuedAlert) => void) {
    const queued = dequeueAlert();
    if (!queued)
        return;
    clearQueue();
    if (Date.now() - queued.queuedAt > STALE_MS) {
        store.resetAlertStatuses();
        showQueueBanner('This alert expired after 30 minutes offline and was not sent. Prepare a new alert if you still need help.', true);
        return;
    }
    showQueueBanner('Connection restored — preparing your alert. Review and send each message.');
    onReconnect(queued);
}

export function watchForReconnect(onReconnect: (alert: QueuedAlert) => void) {
    window.addEventListener('online', () => takeQueuedAlert(onReconnect));
    if (navigator.onLine) {
        takeQueuedAlert(onReconnect);
    }
}

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
        showQueueBanner('This alert expired after 30 minutes offline and was not sent. Prepare a new alert if you still need help.', true);
    }
}

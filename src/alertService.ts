import { store } from './state.js';
import { buildSmsBody, smsUri, isOnline } from './storage.js';
import { insertAlertLog, getDeviceId, getUser } from './db.js';
import { enqueueAlert } from './alertQueue.js';
async function nominatimFetch(lat, lng, zoom) {
    try {
        const url = [
            'https://nominatim.openstreetmap.org/reverse',
            `?lat=${lat.toFixed(7)}`,
            `&lon=${lng.toFixed(7)}`,
            `&format=jsonv2`,
            `&addressdetails=1`,
            `&zoom=${zoom}`,
        ].join('');
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'PanicRing/1.0 (safety-app; contact: support@panicring.app)',
                'Accept-Language': 'en-ZA,en;q=0.9',
                'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(3000),
        });
        if (!res.ok)
            return null;
        return await res.json();
    }
    catch {
        return null;
    }
}
export async function reverseGeocode(lat, lng) {
    const result = await nominatimFetch(lat, lng, 18) ?? await nominatimFetch(lat, lng, 14);
    if (!result)
        return formatCoords(lat, lng);
    const a = result.address ?? {};
    const parts = [];
    if (a.house_number && a.road)
        parts.push(`${a.house_number} ${a.road}`);
    else if (a.road)
        parts.push(a.road);
    const area = a.suburb ?? a.neighbourhood ?? a.city_district;
    if (area)
        parts.push(area);
    const city = a.city ?? a.town ?? a.municipality ?? a.village;
    if (city)
        parts.push(city);
    if (a.state)
        parts.push(a.state);
    if (a.postcode)
        parts[parts.length - 1] += ` ${a.postcode}`;
    if (parts.length > 0)
        return parts.join(', ');
    if (result.display_name) {
        return result.display_name.split(',').slice(0, 4).join(', ').trim();
    }
    return formatCoords(lat, lng);
}
function formatCoords(lat, lng) {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lng).toFixed(6)}° ${lngDir}`;
}
async function getWhat3Words(lat, lng) {
    const key = import.meta.env['VITE_W3W_API_KEY'];
    if (!key)
        return null;
    try {
        const res = await fetch(`https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat},${lng}&language=en&key=${key}`, { signal: AbortSignal.timeout(3000) });
        if (!res.ok)
            return null;
        const data = await res.json();
        return data.words ? `///${data.words}` : null;
    }
    catch {
        return null;
    }
}
export type LocationResult =
    | { ok: true; coords: GeolocationCoordinates; address: string; mapsUrl: string; what3words: string | null; accuracy: number; text: string }
    | { ok: false; reason: string };

function locationErrorMessage(err: GeolocationPositionError): string {
    if (err.code === 1)
        return 'Location permission was denied. Enable it in your device settings, then try again.';
    if (err.code === 2)
        return 'Your device could not get a location fix. Move near a window or outdoors and try again.';
    if (err.code === 3)
        return 'Getting your location took too long. Try again somewhere with a clearer GPS signal.';
    return 'Location unavailable. Check your device settings and try again.';
}

export async function getLocation(timeoutMs = 15000, onAccuracy?: (accuracy: number) => void): Promise<LocationResult> {
    if (!('geolocation' in navigator)) {
        return { ok: false, reason: 'Location services are not available on this device.' };
    }
    return new Promise<LocationResult>(resolve => {
        let watchId: number | null = null;
        let settleTimer: ReturnType<typeof setTimeout> | null = null;
        let deadlineTimer: ReturnType<typeof setTimeout> | null = null;
        let bestFix: GeolocationPosition | null = null;
        let finished = false;

        const finish = async (reason?: string): Promise<void> => {
            if (finished)
                return;
            finished = true;
            if (settleTimer !== null)
                clearTimeout(settleTimer);
            if (deadlineTimer !== null)
                clearTimeout(deadlineTimer);
            if (watchId !== null)
                navigator.geolocation.clearWatch(watchId);

            if (!bestFix) {
                resolve({ ok: false, reason: reason ?? 'Your device could not get a location fix. Move near a window or outdoors and try again.' });
                return;
            }

            const { latitude: lat, longitude: lng, accuracy } = bestFix.coords;
            const [address, w3w] = await Promise.all([
                reverseGeocode(lat, lng),
                getWhat3Words(lat, lng),
            ]);
            const coordinates = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            const mapsUrl = `https://maps.google.com/?q=${lat.toFixed(7)},${lng.toFixed(7)}`;
            const lines = [
                `Location: ${address}`,
                `Coordinates: ${coordinates}`,
                `Reported accuracy: ±${Math.round(accuracy)} m`,
                w3w ? `what3words: ${w3w}` : null,
                `Google Maps: ${mapsUrl}`,
            ].filter(Boolean).join('\n');
            resolve({
                ok: true,
                coords: bestFix.coords,
                address,
                mapsUrl,
                what3words: w3w,
                accuracy,
                text: lines,
            });
        };

        try {
            deadlineTimer = setTimeout(() => {
                void finish();
            }, timeoutMs);
            watchId = navigator.geolocation.watchPosition(position => {
                if (!bestFix || position.coords.accuracy < bestFix.coords.accuracy) {
                    bestFix = position;
                    onAccuracy?.(position.coords.accuracy);
                }
                if (position.coords.accuracy <= 15) {
                    void finish();
                    return;
                }
                if (settleTimer !== null)
                    clearTimeout(settleTimer);
                settleTimer = setTimeout(() => {
                    void finish();
                }, 2500);
            }, error => {
                void finish(locationErrorMessage(error));
            }, {
                timeout: timeoutMs,
                maximumAge: 0,
                enableHighAccuracy: true,
            });
        } catch {
            void finish('Your browser could not access location services. Check your device settings and try again.');
        }
    });
}
export async function runAlertSequence(locationText, locationShared, onStep) {
    const { contacts } = store.getState();
    if (contacts.length === 0) {
        store.navigateTo('sent');
        return;
    }
    if (!isOnline()) {
        enqueueAlert(locationText, locationShared);
        contacts.forEach(c => store.updateContactStatus(c.id, 'failed'));
        onStep();
        await delay(400);
        void logAlert(contacts.length, locationShared, 0, contacts.length);
        store.navigateTo('sent');
        return;
    }
    let attempted = 0;
    let failed = 0;
    for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        const body = buildSmsBody(contact.name, locationText, locationShared);
        window.location.href = smsUri(contact.phone, body);
        await waitForReturn();
        store.updateContactStatus(contact.id, 'prepared');
        attempted++;
        onStep();
        if (i < contacts.length - 1)
            await delay(600);
    }
    void logAlert(contacts.length, locationShared, attempted, failed);
    await delay(500);
    store.navigateTo('sent');
}
function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}
function waitForReturn() {
    return new Promise<void>(resolve => {
        let done = false;
        const finish = () => {
            if (done)
                return;
            done = true;
            document.removeEventListener('visibilitychange', onVisible);
            resolve();
        };
        const onVisible = () => {
            if (document.visibilityState === 'visible')
                finish();
        };
        document.addEventListener('visibilitychange', onVisible);
        setTimeout(finish, 30000);
    });
}
async function logAlert(contactCount, locationShared, attempted, failed) {
    const user = await getUser();
    await insertAlertLog({
        user_id: user?.id ?? '',
        device_id: getDeviceId(),
        contact_count: contactCount,
        location_shared: locationShared,
        contacts_opened: attempted,
        contacts_failed: failed,
    });
}

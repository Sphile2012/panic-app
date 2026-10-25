import { store } from './state.js';
import { buildSmsBody, smsUri, whatsappUri } from './storage.js';
import { insertAlertLog, getDeviceId, getUser } from './db.js';
import { hasValidCoordinates, isShareableAccuracy } from './locationConfig.mjs';
type LocationResult =
    | { ok: false; reason: string }
    | {
        ok: true;
        coords: GeolocationCoordinates;
        address: string;
        mapsUrl: string;
        what3words: string | null;
        accuracy: number;
        text: string;
    };
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
            signal: AbortSignal.timeout(6000),
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
        const res = await fetch(`https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat},${lng}&language=en&key=${key}`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok)
            return null;
        const data = await res.json();
        return data.words ? `///${data.words}` : null;
    }
    catch {
        return null;
    }
}
export async function getLocation(timeoutMs = 12000): Promise<LocationResult> {
    if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        return { ok: false, reason: 'Location access requires a secure HTTPS connection. Open Panic Ring using its HTTPS address and try again.' };
    }
    if (!('geolocation' in navigator)) {
        return { ok: false, reason: 'Location services are not available on this device.' };
    }
    return new Promise<LocationResult>(resolve => {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude: lat, longitude: lng, accuracy } = pos.coords;
            if (!hasValidCoordinates(lat, lng) || !Number.isFinite(accuracy) || accuracy <= 0) {
                resolve({ ok: false, reason: 'Your device returned an invalid location. Try again, or send without location.' });
                return;
            }
            if (!isShareableAccuracy(accuracy)) {
                resolve({
                    ok: false,
                    reason: `Your location is only accurate to within ±${Math.ceil(accuracy)} m. It has not been shared. Move to an open area and try again, or send without location.`,
                });
                return;
            }
            const [address, w3w] = await Promise.all([
                reverseGeocode(lat, lng),
                getWhat3Words(lat, lng),
            ]);
            const mapsUrl = `https://maps.google.com/?q=${lat.toFixed(7)},${lng.toFixed(7)}`;
            const accuracyStr = `±${Math.round(accuracy)} m`;
            const lines = [
                `Nearby mapped address (approximate): ${address}`,
                `Accuracy: ${accuracyStr}`,
                w3w ? `what3words: ${w3w}` : null,
                `Google Maps: ${mapsUrl}`,
            ].filter(Boolean).join('\n');
            resolve({
                ok: true,
                coords: pos.coords,
                address,
                mapsUrl,
                what3words: w3w,
                accuracy,
                text: lines,
            });
        }, err => {
            let reason = 'Location unavailable.';
            if (err.code === 1)
                reason = 'Location permission was denied. Please enable it in your device settings.';
            if (err.code === 2)
                reason = 'No GPS signal found. Move to an open area and try again.';
            if (err.code === 3)
                reason = 'Location request timed out. Try again in a moment.';
            resolve({ ok: false, reason });
        }, {
            timeout: timeoutMs,
            maximumAge: 0,
            enableHighAccuracy: true,
        });
    });
}
export async function runAlertSequence(locationText, locationShared, onStep) {
    const { contacts, notes } = store.getState();
    if (contacts.length === 0) {
        store.navigateTo('sent');
        return;
    }
    const prioritizedContacts = contacts
        .map((contact, index) => ({ contact, index }))
        .sort((a, b) => (a.contact.priority ?? a.index + 1) - (b.contact.priority ?? b.index + 1) || a.index - b.index)
        .map(item => item.contact);
    let opened = 0;
    for (let i = 0; i < prioritizedContacts.length; i++) {
        const contact = prioritizedContacts[i];
        const body = buildSmsBody(contact.name, locationText, locationShared, notes);
        window.location.href = contact.notificationChannel === 'whatsapp'
            ? whatsappUri(contact.phone, body)
            : smsUri(contact.phone, body);
        await waitForReturn();
        store.updateContactStatus(contact.id, 'opened');
        opened++;
        onStep();
        if (i < contacts.length - 1)
            await delay(600);
    }
    void logAlert(contacts.length, locationShared, opened, 0);
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
async function logAlert(contactCount, locationShared, opened, failed) {
    const user = await getUser();
    if (!user)
        return;
    await insertAlertLog({
        user_id: user.id,
        device_id: getDeviceId(),
        contact_count: contactCount,
        location_shared: locationShared,
        contacts_opened: opened,
        contacts_failed: failed,
    });
}

import './strings/groupA.js';
import { t } from './i18n.js';
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
    try {
        const coordinates = encodeURIComponent(`${lat},${lng}`);
        const res = await fetch(`/api/what3words?coordinates=${coordinates}&language=en`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok)
            return null;
        const data = await res.json();
        return data.words ? `///${data.words}` : null;
    }
    catch {
        return null;
    }
}
export async function getLocation(timeoutMs = 12000) {
    if (!('geolocation' in navigator)) {
        return { ok: false, reason: t('trk.unsupported') };
    }
    return new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude: lat, longitude: lng, accuracy } = pos.coords;
            const [address, w3w] = await Promise.all([
                reverseGeocode(lat, lng),
                getWhat3Words(lat, lng),
            ]);
            const mapsUrl = `https://maps.google.com/?q=${lat.toFixed(7)},${lng.toFixed(7)}`;
            const accuracyStr = `±${Math.round(accuracy)} m`;
            const lines = [
                `${t('a.alert.location')}: ${address}`,
                `${t('a.alert.accuracy')}: ${accuracyStr}`,
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
            let reason = t('a.alert.err.unavailable');
            if (err.code === 1)
                reason = t('a.alert.err.denied');
            if (err.code === 2)
                reason = t('a.alert.err.nosignal');
            if (err.code === 3)
                reason = t('a.alert.err.timeout');
            resolve({ ok: false, reason });
        }, {
            timeout: timeoutMs,
            maximumAge: 30000,
            enableHighAccuracy: true,
        });
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
    let opened = 0;
    let failed = 0;
    for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        const body = await buildSmsBody(contact.name, locationText, locationShared);
        window.location.href = smsUri(contact.phone, body);
        await waitForReturn();
        store.updateContactStatus(contact.id, 'delivered');
        opened++;
        onStep();
        if (i < contacts.length - 1)
            await delay(600);
    }
    void logAlert(contacts.length, locationShared, opened, failed);
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
    if (!user) {
        console.warn('[alert] Alert history not saved: no authenticated user.');
        return;
    }
    await insertAlertLog({
        user_id: user.id,
        device_id: getDeviceId(),
        contact_count: contactCount,
        location_shared: locationShared,
        contacts_opened: opened,
        contacts_failed: failed,
    });
}

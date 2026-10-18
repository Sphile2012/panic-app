import { upsertDevice, getDeviceId, getUser } from './db.js';
import { encryptJson, decryptJson } from './crypto.js';

export type Contact = {
    id: string;
    name: string;
    phone: string;
    initials: string;
    relationship?: string;
    status: 'pending' | 'sending' | 'delivered' | 'failed';
};

export type Profile = {
    name: string;
    phone: string;
    photo: string;
};

export const EMPTY_PROFILE: Profile = { name: '', phone: '', photo: '' };

export const RELATIONSHIPS = ['partner', 'parent', 'child', 'sibling', 'relative', 'friend', 'neighbour', 'colleague', 'other'] as const;

export type Note = {
    id: string;
    title: string;
    body: string;
    createdAt: number;
    updatedAt: number;
};

export type SafetyPlan = {
    trustedPeople: string;
    safePlaces: string;
    emergencyNumbers: string;
    importantDocs: string;
    transportOptions: string;
    thingsToRemember: string;
};

export type VaultData = {
    contacts: Contact[];
    notes: Note[];
    safetyPlan: SafetyPlan;
    profile?: Profile;
};

const KEY_PUBLIC = 'pr_public';
const KEY_VAULT = 'pr_vault';
function loadPublic() {
    try {
        const raw = localStorage.getItem(KEY_PUBLIC);
        if (!raw)
            return null;
        const data = JSON.parse(raw);
        if (data && typeof data === 'object' && 'recovery' in data) {
            delete data.recovery;
            try {
                localStorage.setItem(KEY_PUBLIC, JSON.stringify(data));
            }
            catch (error) {
                console.warn('[storage] Could not remove legacy PIN recovery data:', error);
            }
        }
        return data;
    }
    catch {
        return null;
    }
}
function savePublic(d) {
    localStorage.setItem(KEY_PUBLIC, JSON.stringify(d));
}
export const EMPTY_PLAN: SafetyPlan = {
    trustedPeople: '', safePlaces: '', emergencyNumbers: '',
    importantDocs: '', transportOptions: '', thingsToRemember: '',
};

export const EMPTY_VAULT: VaultData = { contacts: [], notes: [], safetyPlan: { ...EMPTY_PLAN } };

export const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'zu', label: 'Zulu' },
    { code: 'af', label: 'Afrikaans' },
    { code: 'st', label: 'Sotho' },
] as const;

export function getPreferredLanguage(): string {
    const stored = localStorage.getItem('pr_lang');
    return LANGUAGES.some(lang => lang.code === stored) ? stored! : 'en';
}

export function setPreferredLanguage(code: string) {
    const next = LANGUAGES.some(lang => lang.code === code) ? code : 'en';
    localStorage.setItem('pr_lang', next);
    return next;
}

export function normalizePhone(input: string): string {
    return input.trim().replace(/[^\d+]/g, '').replace(/(\+\d{1,3})(?=\d)/, '$1 ');
}

export function getBatteryStatus() {
    const battery = (navigator as Navigator & { getBattery?: () => Promise<{ level: number }> }).getBattery?.();
    if (!battery) return { level: 100, isLow: false, text: 'Battery status: 100%.' };
    return battery.then((result) => {
        const level = Math.max(0, Math.min(100, Math.round((result.level ?? 1) * 100)));
        const isLow = level <= 20;
        return { level, isLow, text: isLow ? `Battery status: low (${level}%).` : `Battery status: ${level}%.` };
    }).catch(() => ({ level: 100, isLow: false, text: 'Battery status: 100%.' }));
}


export async function loadVault(pinHash: string): Promise<VaultData> {
    try {
        const b64 = localStorage.getItem(KEY_VAULT);
        if (!b64)
            return { ...EMPTY_VAULT };
        const data = await decryptJson<VaultData>(b64, pinHash);
        return data ?? { ...EMPTY_VAULT };
    }
    catch {
        return { ...EMPTY_VAULT };
    }
}

export async function saveVault(data: VaultData, pinHash: string) {
    const encryptedVault = await encryptJson(data, pinHash);
    localStorage.setItem(KEY_VAULT, encryptedVault);
}
export function loadPublicSync() {
    const pub = loadPublic();
    return {
        pin: pub?.pinHash ?? '',
        decoyPin: pub?.decoyHash ?? '',
        autoLockMinutes: pub?.autoLock ?? 5,
        contacts: [],
        notes: [],
        safetyPlan: { ...EMPTY_PLAN },
    };
}
export async function savePinHashes(pinHash, decoyHash, autoLock, oldPinHash?: string) {
    const pub = loadPublic() ?? {};
    let vault: VaultData | null = null;
    if (oldPinHash && oldPinHash !== pinHash) {
        vault = await loadVault(oldPinHash);
    }
    pub.pinHash = pinHash;
    pub.decoyHash = decoyHash;
    pub.autoLock = autoLock;
    savePublic(pub);
    if (vault)
        await saveVault(vault, pinHash);
    getUser().then(user => {
        upsertDevice({
            user_id: user?.id ?? '',
            device_id: getDeviceId(),
            pin_hash: pinHash,
            decoy_hash: decoyHash,
            auto_lock: autoLock,
        }).catch(() => { });
    }).catch(() => { });
}
export function saveAutoLock(minutes) {
    const pub = loadPublic();
    if (!pub)
        return;
    pub.autoLock = minutes;
    savePublic(pub);
    getUser().then(user => {
        upsertDevice({
            user_id: user?.id ?? '',
            device_id: getDeviceId(),
            pin_hash: pub.pinHash,
            decoy_hash: pub.decoyHash,
            auto_lock: minutes,
        }).catch(() => { });
    }).catch(() => { });
}
export function clearAll() {
    localStorage.removeItem(KEY_PUBLIC);
    localStorage.removeItem(KEY_VAULT);
    localStorage.removeItem('pr_device_id');
}
export function initials(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2)
        return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}
export function uid() {
    return crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
        : Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
export function dialable(phone) {
    return phone.replace(/[\s\-().]/g, '');
}
export async function buildSmsBody(contactName, locationText, locationShared) {
    const header = `ALERT — ${contactName} may need urgent help.`;
    const loc = locationShared
        ? locationText
        : 'Location was not shared. Please call them immediately.';
    const battery = await getBatteryStatus();
    const batteryLine = battery.isLow
        ? `Battery status: low (${battery.level}%). Please share their location urgently and keep the device on.`
        : `Battery status: ${battery.level}%.`;
    const footer = `If you cannot reach them: SAPS 10111 | GBV Command Centre 0800 428 428`;
    return `${header}\n\n${loc}\n\n${batteryLine}\n\n${footer}`;
}
export function isOnline() {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
export function smsUri(phone, body) {
    return `sms:${dialable(phone)}?body=${encodeURIComponent(body)}`;
}
export function telUri(phone) {
    return `tel:${dialable(phone)}`;
}
export async function hashPin(pin) {
    const encoded = new TextEncoder().encode(pin);
    const buf = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}


import { upsertDevice, getDeviceId, getUser } from './db.js';
import { createRecoverySalt, createRecoverySecret, deriveRecoveryHash, encrypt, decrypt, encryptJson, decryptJson } from './crypto.js';
import { LANGS } from './i18n.js';

export type Contact = {
    id: string;
    name: string;
    phone: string;
    initials: string;
    status: 'pending' | 'sending' | 'delivered' | 'failed';
};

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

export type Profile = {
    name: string;
    phone: string;
    photo: string;
};

export const EMPTY_PROFILE: Profile = { name: '', phone: '', photo: '' };

export type VaultData = {
    contacts: Contact[];
    notes: Note[];
    safetyPlan: SafetyPlan;
    profile?: Profile;
};

export type RecoveryRecord = {
    questionIds: string[];
    salt: string;
    answerWrap: string;
    pinWrap: string;
    encryptedVault: string;
};

const KEY_PUBLIC = 'pr_public';
const KEY_VAULT = 'pr_vault';
export const LANGUAGES = LANGS;

export function getPreferredLanguage(): string {
    const stored = localStorage.getItem('pr_lang');
    return LANGUAGES.some(language => language.code === stored) ? stored! : 'en';
}

export function setPreferredLanguage(code: string): string {
    const next = LANGUAGES.some(language => language.code === code) ? code : 'en';
    localStorage.setItem('pr_lang', next);
    return next;
}

function loadPublic() {
    try {
        const raw = localStorage.getItem(KEY_PUBLIC);
        return raw ? JSON.parse(raw) : null;
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
    const pub = loadPublic();
    if (pub?.recovery) {
        const recoverySecret = await decrypt(pub.recovery.pinWrap, pinHash);
        pub.recovery.encryptedVault = await encryptJson(data, recoverySecret);
        savePublic(pub);
    }
    localStorage.setItem(KEY_VAULT, encryptedVault);
}

export async function setRecoveryQuestions(pinHash: string, questionIds: string[], answers: string[]) {
    const pub = loadPublic();
    if (!pub || pub.pinHash !== pinHash)
        throw new Error('Unlock with your current PIN before setting recovery questions.');
    if (new Set(questionIds).size !== 2 || answers.some(answer => !answer.trim()))
        throw new Error('Choose two different questions and enter both answers.');

    const salt = createRecoverySalt();
    const recoverySecret = createRecoverySecret();
    const answerHash = await deriveRecoveryHash(questionIds, answers, salt);
    const vault = await loadVault(pinHash);
    const recovery: RecoveryRecord = {
        questionIds,
        salt,
        answerWrap: await encrypt(recoverySecret, answerHash),
        pinWrap: await encrypt(recoverySecret, pinHash),
        encryptedVault: await encryptJson(vault, recoverySecret),
    };
    pub.recovery = recovery;
    savePublic(pub);
}

export async function recoverVaultWithAnswers(answers: string[], pinHash: string, decoyHash: string, autoLock: number) {
    const pub = loadPublic();
    const recovery = pub?.recovery as RecoveryRecord | undefined;
    if (!pub || !recovery)
        return null;

    let recoverySecret: string;
    let vault: VaultData | null;
    try {
        const answerHash = await deriveRecoveryHash(recovery.questionIds, answers, recovery.salt);
        recoverySecret = await decrypt(recovery.answerWrap, answerHash);
        vault = await decryptJson<VaultData>(recovery.encryptedVault, recoverySecret);
    }
    catch {
        return null;
    }
    if (!vault)
        return null;

    pub.pinHash = pinHash;
    pub.decoyHash = decoyHash;
    pub.autoLock = autoLock;
    recovery.pinWrap = await encrypt(recoverySecret, pinHash);
    savePublic(pub);
    await saveVault(vault, pinHash);
    return vault;
}

export function getRecoveryQuestionIds(): string[] | null {
    const ids = loadPublic()?.recovery?.questionIds;
    return Array.isArray(ids) && ids.length === 2 ? ids : null;
}
export function loadPublicSync() {
    const pub = loadPublic();
    return {
        pin: pub?.pinHash ?? '',
        decoyPin: pub?.decoyHash ?? '',
        autoLockMinutes: pub?.autoLock ?? 5,
        recoveryQuestionIds: Array.isArray(pub?.recovery?.questionIds) ? pub.recovery.questionIds : null,
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
        if (pub.recovery) {
            const recoverySecret = await decrypt(pub.recovery.pinWrap, oldPinHash);
            pub.recovery.pinWrap = await encrypt(recoverySecret, pinHash);
            pub.recovery.encryptedVault = await encryptJson(vault, recoverySecret);
        }
    }
    pub.pinHash = pinHash;
    pub.decoyHash = decoyHash;
    pub.autoLock = autoLock;
    pub.cloudBackup = pub.cloudBackup ?? false;
    savePublic(pub);
    if (vault)
        await saveVault(vault, pinHash);
    getUser().then(user => {
        upsertDevice({
            user_id: user?.id ?? '',
            device_id: getDeviceId(),
            auto_lock: autoLock,
        }).catch(() => { });
    }).catch(() => { });
}

export function hasCloudBackup(): boolean {
    const pub = loadPublic();
    return pub?.cloudBackup === true;
}

export function setCloudBackup(enabled: boolean) {
    const pub = loadPublic();
    if (pub) {
        pub.cloudBackup = enabled;
        savePublic(pub);
    }
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
export function buildSmsBody(contactName, locationText, locationShared) {
    const header = `ALERT — ${contactName} may need urgent help.`;
    const loc = locationShared
        ? locationText
        : 'Location was not shared. Please call them immediately.';
    const footer = `If you cannot reach them: SAPS 10111 | GBV Command Centre 0800 428 428`;
    return `${header}\n\n${loc}\n\n${footer}`;
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

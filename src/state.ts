import { EMPTY_PROFILE, loadPublicSync, loadVault, saveVault, savePinHashes, saveAutoLock, clearAll, hashPin, recoverVaultWithAnswers, uid, initials, type Contact as StorageContact, type Note as StorageNote, type Profile, type SafetyPlan as StorageSafetyPlan, type VaultData } from './storage.js';
import { onAuthStateChange, DB_CONFIGURED, signOut } from './db.js';

type Contact = StorageContact;
type Note = StorageNote;
type SafetyPlan = StorageSafetyPlan;

type AppState = {
    screen: string;
    profile: Profile;
    pinBuffer: string;
    pinHash: string;
    authEmail: string | null;
    accountPinUnlocked: boolean;
    accountPinQuestionIds: string[];
    contacts: Contact[];
    notes: Note[];
    safetyPlan: SafetyPlan;
    autoLockMinutes: number;
    alertLocation: string;
    locationShared: boolean;
    editingNoteId: string | null;
    isFirstRun: boolean;
    recoveryConfigured: boolean;
    pinFailures: number;
    lastActivityAt: number;
};

function buildInitialState(): AppState {
    const pub = loadPublicSync();
    return {
        screen: pub.pin === '' ? (DB_CONFIGURED ? 'welcome' : 'setup-pin') : 'calculator',
        profile: { ...EMPTY_PROFILE },
        pinBuffer: '',
        pinHash: pub.pin,
        authEmail: null,
        accountPinUnlocked: false,
        accountPinQuestionIds: [],
        contacts: [],
        notes: [],
        safetyPlan: {
            trustedPeople: '', safePlaces: '', emergencyNumbers: '',
            importantDocs: '', transportOptions: '', thingsToRemember: '',
        },
        autoLockMinutes: pub.autoLockMinutes,
        alertLocation: 'Location not shared',
        locationShared: false,
        editingNoteId: null,
        isFirstRun: pub.pin === '',
        recoveryConfigured: pub.recoveryQuestionIds !== null,
        pinFailures: 0,
        lastActivityAt: Date.now(),
    };
}

class Store {
    state: AppState;
    listeners: Array<(state: AppState) => void>;
    lockTimer: number | null;

    constructor() {
        this.state = buildInitialState();
        this.listeners = [];
        this.lockTimer = null;
    }
    getState(): AppState { return this.state; }
    subscribe(fn: (state: AppState) => void) {
        this.listeners.push(fn);
        return () => { this.listeners = this.listeners.filter(l => l !== fn); };
    }
    notify() { this.listeners.forEach(l => l(this.state)); }
    touch() {
        this.state = { ...this.state, lastActivityAt: Date.now() };
        this.scheduleAutoLock();
    }
    scheduleAutoLock() {
        if (this.lockTimer)
            clearTimeout(this.lockTimer);
        const mins = this.state.autoLockMinutes;
        if (mins === 0)
            return;
        this.lockTimer = window.setTimeout(() => {
            const safe = ['calculator', 'decoy', 'setup-pin', 'setup-contacts'];
            if (!safe.includes(this.state.screen))
                this.navigateTo(this.state.authEmail ? 'account-pin-login' : 'calculator');
        }, mins * 60 * 1000);
    }
    navigateTo(screen: string) {
        this.state = { ...this.state, screen };
        this.touch();
        this.notify();
    }
    markRecoveryConfigured() {
        this.state = { ...this.state, recoveryConfigured: true };
        this.notify();
    }
    appendPin(digit: string) {
        if (this.state.pinBuffer.length >= 4)
            return;
        this.state = { ...this.state, pinBuffer: this.state.pinBuffer + digit };
        this.notify();
    }
    clearPin() {
        this.state = { ...this.state, pinBuffer: '' };
        this.notify();
    }
    async evaluatePin() {
        const pin = this.state.pinBuffer;
        this.clearPin();
        const pub = loadPublicSync();
        const hashed = await hashPin(pin);
        if (hashed === pub.pin) {
            const vault: VaultData = await loadVault(hashed);
            this.state = {
                ...this.state,
                screen: 'app',
                pinHash: hashed,
                profile: { ...EMPTY_PROFILE, ...(vault.profile ?? {}) },
                contacts: vault.contacts.map(c => ({ ...c, status: 'pending' as const })),
                notes: vault.notes,
                safetyPlan: vault.safetyPlan,
                pinFailures: 0,
            };
            this.touch();
            this.scheduleAutoLock();
            this.notify();
            return 'app';
        }
        if (pub.decoyPin !== '' && hashed === pub.decoyPin) {
            this.state = { ...this.state, screen: 'decoy', pinFailures: 0 };
            this.notify();
            return 'decoy';
        }
        this.state = { ...this.state, pinFailures: this.state.pinFailures + 1 };
        this.notify();
        return null;
    }
    async savePin(pin: string, decoyPin: string) {
        const pinHash = await hashPin(pin);
        const decoyHash = await hashPin(decoyPin);
        const oldHash = this.state.pinHash;
        await savePinHashes(pinHash, decoyHash, this.state.autoLockMinutes, oldHash || undefined);
        this.state = { ...this.state, pinHash, isFirstRun: false };
        this.notify();
    }
    async _saveContacts(contacts: Contact[]) {
        const vault: VaultData = await loadVault(this.state.pinHash);
        vault.contacts = contacts;
        await saveVault(vault, this.state.pinHash);
    }
    saveProfile(profile: Profile) {
        this.state = { ...this.state, profile };
        this.touch();
        this.notify();
        (async () => {
            const vault = await loadVault(this.state.pinHash);
            vault.profile = profile;
            await saveVault(vault, this.state.pinHash);
        })().catch(console.error);
    }
    addContact(name: string, phone: string): boolean {
        const contact: Contact = {
            id: uid(), name: name.trim(), phone: phone.trim(),
            initials: initials(name), status: 'pending',
        };
        const updated = [...this.state.contacts, contact];
        this.state = { ...this.state, contacts: updated };
        this.touch();
        this.notify();
        this._saveContacts(updated).catch(console.error);
        return true;
    }
    updateContact(id: string, name: string, phone: string) {
        const updated = this.state.contacts.map(c => c.id === id ? { ...c, name: name.trim(), phone: phone.trim(), initials: initials(name) } : c);
        this.state = { ...this.state, contacts: updated };
        this.touch();
        this.notify();
        this._saveContacts(updated).catch(console.error);
    }
    deleteContact(id: string) {
        const updated = this.state.contacts.filter(c => c.id !== id);
        this.state = { ...this.state, contacts: updated };
        this.touch();
        this.notify();
        this._saveContacts(updated).catch(console.error);
    }
    setLocationShared(shared: boolean, locationText: string) {
        this.state = { ...this.state, locationShared: shared, alertLocation: locationText };
        this.notify();
    }
    startSending() {
        this.state = {
            ...this.state,
            screen: 'sending',
            contacts: this.state.contacts.map(c => ({ ...c, status: 'sending' as const })),
        };
        this.notify();
    }
    updateContactStatus(id: string, status: Contact['status']) {
        this.state = {
            ...this.state,
            contacts: this.state.contacts.map(c => c.id === id ? { ...c, status } : c),
        };
        this.notify();
    }
    resetAlertStatuses() {
        this.state = {
            ...this.state,
            contacts: this.state.contacts.map(c => ({ ...c, status: 'pending' as const })),
            alertLocation: 'Location not shared',
            locationShared: false,
        };
        this.notify();
    }
    async _saveNotes(notes: Note[]) {
        const vault: VaultData = await loadVault(this.state.pinHash);
        vault.notes = notes;
        await saveVault(vault, this.state.pinHash);
    }
    saveNote(id: string | null, title: string, body: string) {
        const now = Date.now();
        let notes: Note[];
        if (id) {
            notes = this.state.notes.map(n => n.id === id ? { ...n, title, body, updatedAt: now } : n);
        }
        else {
            notes = [{ id: uid(), title, body, createdAt: now, updatedAt: now }, ...this.state.notes];
        }
        this.state = { ...this.state, notes, editingNoteId: null };
        this.touch();
        this.notify();
        this._saveNotes(notes).catch(console.error);
    }
    deleteNote(id: string) {
        const notes = this.state.notes.filter(n => n.id !== id);
        this.state = { ...this.state, notes };
        this.touch();
        this.notify();
        this._saveNotes(notes).catch(console.error);
    }
    setEditingNote(id: string | null) {
        this.state = { ...this.state, editingNoteId: id };
        this.notify();
    }
    saveSafetyPlan(plan: SafetyPlan) {
        this.state = { ...this.state, safetyPlan: plan };
        this.touch();
        this.notify();
        (async () => {
            const vault: VaultData = await loadVault(this.state.pinHash);
            vault.safetyPlan = plan;
            await saveVault(vault, this.state.pinHash);
        })().catch(console.error);
    }
    setAutoLock(minutes: number) {
        this.state = { ...this.state, autoLockMinutes: minutes };
        saveAutoLock(minutes);
        this.scheduleAutoLock();
        this.notify();
    }
    async changePins(newPin: string, newDecoy: string) {
        await this.savePin(newPin, newDecoy);
    }
    async recoverPins(answers: string[], newPin: string, newDecoy: string): Promise<boolean> {
        if (!/^\d{4}$/.test(newPin) || !/^\d{4}$/.test(newDecoy) || newPin === newDecoy)
            return false;
        try {
            const pinHash = await hashPin(newPin);
            const decoyHash = await hashPin(newDecoy);
            const vault = await recoverVaultWithAnswers(answers, pinHash, decoyHash, this.state.autoLockMinutes);
            if (!vault)
                return false;
            await savePinHashes(pinHash, decoyHash, this.state.autoLockMinutes);
            this.state = {
                ...this.state,
                screen: 'app',
                pinHash,
                profile: { ...EMPTY_PROFILE, ...(vault.profile ?? {}) },
                contacts: vault.contacts.map(c => ({ ...c, status: 'pending' as const })),
                notes: vault.notes,
                safetyPlan: vault.safetyPlan,
                isFirstRun: false,
                recoveryConfigured: true,
                pinFailures: 0,
            };
            this.touch();
            this.notify();
            return true;
        }
        catch {
            return false;
        }
    }
    async factoryReset() {
        if (this.lockTimer)
            clearTimeout(this.lockTimer);
        clearAll();
        await signOut().catch(() => { });
        this.state = buildInitialState();
        this.notify();
    }
    setAuthEmail(email: string | null) {
        const previousEmail = this.state.authEmail;
        const identityChanged = previousEmail !== email;
        this.state = {
            ...this.state,
            authEmail: email,
            ...(identityChanged ? { accountPinUnlocked: false, accountPinQuestionIds: [] } : {}),
        };
        if (email && !this.state.accountPinUnlocked &&
            (previousEmail !== email || ['welcome', 'login', 'signup', 'verify-email'].includes(this.state.screen))) {
            this.state = { ...this.state, screen: 'account-pin-check' };
        } else if (!email && previousEmail && ['account-pin-check', 'account-pin-setup', 'account-pin-login'].includes(this.state.screen)) {
            this.state = { ...this.state, screen: buildInitialState().screen };
        }
        this.notify();
    }
    async unlockAccountWithPrimaryPin(primaryPin: string, secondPin: string): Promise<boolean> {
        const pinHash = await hashPin(primaryPin);
        const pub = loadPublicSync();
        if (pub.pin && pub.pin !== pinHash)
            return false;
        if (!pub.pin)
            await this.savePin(primaryPin, secondPin);
        const vault = await loadVault(pinHash);
        this.state = {
            ...this.state,
            pinHash,
            profile: { ...EMPTY_PROFILE, ...(vault.profile ?? {}) },
            contacts: vault.contacts.map(contact => ({ ...contact, status: 'pending' as const })),
            notes: vault.notes,
            safetyPlan: vault.safetyPlan,
            pinFailures: 0,
            accountPinUnlocked: true,
        };
        this.notify();
        return true;
    }
    markAccountPinUnlocked() {
        this.state = { ...this.state, accountPinUnlocked: true };
        this.notify();
    }
    setAccountPinQuestionIds(questionIds: string[]) {
        this.state = { ...this.state, accountPinQuestionIds: [...questionIds] };
        this.notify();
    }
    async signOut() {
        await signOut();
        this.state = buildInitialState();
        this.notify();
    }
    async initAuth() {
        if (!DB_CONFIGURED) {
            this.notify();
            return;
        }
        try {
            onAuthStateChange(authUser => {
                this.setAuthEmail(authUser?.email ?? null);
            });
        }
        catch { }
        this.notify();
    }
}
export const store = new Store();

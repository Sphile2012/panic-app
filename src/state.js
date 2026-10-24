import { EMPTY_PROFILE, loadPublicSync, loadPinFailures, savePinFailures, loadVault, saveVault, savePinHashes, saveAutoLock, clearAll, hashPin, recoverVaultWithAnswers, uid, initials } from './storage.js';
import { DB_CONFIGURED, onAuthStateChange, signOut } from './db.js';
export const PIN_FAILURE_LIMIT = 3;
export function hasDistinctPinDigits(pin) {
    return /^\d+$/.test(pin) && new Set(pin).size === pin.length;
}
function buildInitialState() {
    const pub = loadPublicSync();
    // Show welcome screen with signup/login options
    const initialScreen = 'welcome';
    return {
        screen: 'welcome',
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
        pinFailures: loadPinFailures(),
        lastActivityAt: Date.now(),
    };
}
class Store {
    constructor() {
        this.state = buildInitialState();
        this.listeners = [];
        this.lockTimer = null;
        this.screenHistory = [];
    }
    getState() { return this.state; }
    subscribe(fn) {
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
    navigateTo(screen) {
        if (this.state.screen === 'pin-recovery' && this.state.pinFailures >= PIN_FAILURE_LIMIT && screen !== 'pin-recovery')
            return;
        if (screen !== this.state.screen) {
            if (screen === 'app') {
                this.screenHistory = [];
            }
            else {
                this.screenHistory.push(this.state.screen);
                if (this.screenHistory.length > 50)
                    this.screenHistory.shift();
            }
        }
        this.state = { ...this.state, screen };
        this.touch();
        this.notify();
    }
    navigateBack() {
        if (this.state.screen === 'pin-recovery' && this.state.pinFailures >= PIN_FAILURE_LIMIT)
            return;
        const previousScreen = this.screenHistory.pop()
            ?? (this.state.screen === 'app' ? 'calculator' : 'welcome');
        this.state = { ...this.state, screen: previousScreen };
        this.touch();
        this.notify();
    }
    markRecoveryConfigured() {
        this.state = { ...this.state, recoveryConfigured: true };
        this.notify();
    }
    appendPin(digit) {
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
        if (this.state.pinFailures >= PIN_FAILURE_LIMIT) {
            this.navigateTo('pin-recovery');
            return null;
        }
        const pin = this.state.pinBuffer;
        this.clearPin();
        const pub = loadPublicSync();
        const hashed = await hashPin(pin);
        if (hashed === pub.pin) {
            this.screenHistory = [];
            const vault = await loadVault(hashed);
            this.state = {
                ...this.state,
                screen: 'app',
                pinHash: hashed,
                profile: { ...EMPTY_PROFILE, ...(vault.profile ?? {}) },
                contacts: vault.contacts.map(c => ({ ...c, relationship: c.relationship || 'Other', status: 'pending' })),
                notes: vault.notes,
                safetyPlan: vault.safetyPlan,
                pinFailures: 0,
            };
            savePinFailures(0);
            this.touch();
            this.scheduleAutoLock();
            this.notify();
            return 'app';
        }
        if (pub.decoyPin !== '' && hashed === pub.decoyPin) {
            this.screenHistory = [];
            this.state = { ...this.state, screen: 'decoy' };
            this.notify();
            return 'decoy';
        }
        const pinFailures = this.state.pinFailures + 1;
        savePinFailures(pinFailures);
        this.state = {
            ...this.state,
            pinFailures,
            ...(pinFailures >= PIN_FAILURE_LIMIT ? { screen: 'pin-recovery' } : {}),
        };
        this.notify();
        return null;
    }
    async savePin(pin, decoyPin) {
        const pinHash = await hashPin(pin);
        const decoyHash = await hashPin(decoyPin);
        const oldHash = this.state.pinHash;
        await savePinHashes(pinHash, decoyHash, this.state.autoLockMinutes, oldHash || undefined);
        this.state = { ...this.state, pinHash, isFirstRun: false };
        this.notify();
    }
    async _saveContacts(contacts) {
        const pinHash = this.state.pinHash;
        if (!pinHash)
            throw new Error('Unlock the app before changing trusted contacts.');
        const vault = await loadVault(pinHash);
        vault.contacts = contacts;
        await saveVault(vault, pinHash);
    }
    saveProfile(profile) {
        this.state = { ...this.state, profile };
        this.touch();
        this.notify();
        (async () => {
            const vault = await loadVault(this.state.pinHash);
            vault.profile = profile;
            await saveVault(vault, this.state.pinHash);
        })().catch(console.error);
    }
    async addContact(name, phone, relationship = 'Other') {
        const cleanName = name.trim();
        const cleanPhone = phone.trim();
        const phoneDigits = cleanPhone.replace(/\D/g, '');
        if (!cleanName || phoneDigits.length < 7 || phoneDigits.length > 15 || this.state.contacts.length >= 5)
            return false;
        if (this.state.contacts.some(contact => contact.phone.replace(/\D/g, '') === phoneDigits))
            return false;
        const contact = {
            id: uid(), name: cleanName, phone: cleanPhone, relationship,
            initials: initials(cleanName), status: 'pending',
        };
        const updated = [...this.state.contacts, contact];
        await this._saveContacts(updated);
        this.state = { ...this.state, contacts: updated };
        this.touch();
        this.notify();
        return true;
    }
    async updateContact(id, name, phone, relationship = 'Other') {
        const cleanName = name.trim();
        const cleanPhone = phone.trim();
        const phoneDigits = cleanPhone.replace(/\D/g, '');
        if (!cleanName || phoneDigits.length < 7 || phoneDigits.length > 15)
            return false;
        if (!this.state.contacts.some(contact => contact.id === id) ||
            this.state.contacts.some(contact => contact.id !== id && contact.phone.replace(/\D/g, '') === phoneDigits))
            return false;
        const updated = this.state.contacts.map(c => c.id === id
            ? { ...c, name: cleanName, phone: cleanPhone, relationship, initials: initials(cleanName) }
            : c);
        await this._saveContacts(updated);
        this.state = { ...this.state, contacts: updated };
        this.touch();
        this.notify();
        return true;
    }
    async deleteContact(id) {
        if (!this.state.contacts.some(contact => contact.id === id))
            return false;
        const updated = this.state.contacts.filter(c => c.id !== id);
        await this._saveContacts(updated);
        this.state = { ...this.state, contacts: updated };
        this.touch();
        this.notify();
        return true;
    }
    setLocationShared(shared, locationText) {
        this.state = { ...this.state, locationShared: shared, alertLocation: locationText };
        this.notify();
    }
    startSending() {
        this.state = {
            ...this.state,
            screen: 'sending',
            contacts: this.state.contacts.map(c => ({ ...c, status: 'sending' })),
        };
        this.notify();
    }
    updateContactStatus(id, status) {
        this.state = {
            ...this.state,
            contacts: this.state.contacts.map(c => c.id === id ? { ...c, status } : c),
        };
        this.notify();
    }
    resetAlertStatuses() {
        this.state = {
            ...this.state,
            contacts: this.state.contacts.map(c => ({ ...c, status: 'pending' })),
            alertLocation: 'Location not shared',
            locationShared: false,
        };
        this.notify();
    }
    async _saveNotes(notes) {
        const vault = await loadVault(this.state.pinHash);
        vault.notes = notes;
        await saveVault(vault, this.state.pinHash);
    }
    saveNote(id, title, body) {
        const now = Date.now();
        let notes;
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
    deleteNote(id) {
        const notes = this.state.notes.filter(n => n.id !== id);
        this.state = { ...this.state, notes };
        this.touch();
        this.notify();
        this._saveNotes(notes).catch(console.error);
    }
    setEditingNote(id) {
        this.state = { ...this.state, editingNoteId: id };
        this.notify();
    }
    saveSafetyPlan(plan) {
        this.state = { ...this.state, safetyPlan: plan };
        this.touch();
        this.notify();
        (async () => {
            const vault = await loadVault(this.state.pinHash);
            vault.safetyPlan = plan;
            await saveVault(vault, this.state.pinHash);
        })().catch(console.error);
    }
    setAutoLock(minutes) {
        this.state = { ...this.state, autoLockMinutes: minutes };
        saveAutoLock(minutes);
        this.scheduleAutoLock();
        this.notify();
    }
    async changePins(newPin, newDecoy) {
        await this.savePin(newPin, newDecoy);
    }
    async recoverPins(answers, newPin, newDecoy, returnTo = 'app') {
        if (!/^\d{4}$/.test(newPin) || !/^\d{4}$/.test(newDecoy) ||
            !hasDistinctPinDigits(newPin) || !hasDistinctPinDigits(newDecoy) || newPin === newDecoy)
            return false;
        try {
            const pinHash = await hashPin(newPin);
            const decoyHash = await hashPin(newDecoy);
            const vault = await recoverVaultWithAnswers(answers, pinHash, decoyHash, this.state.autoLockMinutes);
            if (!vault)
                return false;
            await savePinHashes(pinHash, decoyHash, this.state.autoLockMinutes);
            if (returnTo === 'app')
                this.screenHistory = [];
            this.state = {
                ...this.state,
                screen: returnTo,
                pinHash,
                profile: { ...EMPTY_PROFILE, ...(vault.profile ?? {}) },
                contacts: vault.contacts.map(c => ({ ...c, relationship: c.relationship || 'Other', status: 'pending' })),
                notes: vault.notes,
                safetyPlan: vault.safetyPlan,
                isFirstRun: false,
                recoveryConfigured: true,
                pinFailures: 0,
            };
            savePinFailures(0);
            this.touch();
            this.notify();
            return true;
        }
        catch {
            return false;
        }
    }
    async changePinsWithRecovery(answer1, answer2, newPin1, newPin2) {
        if (!/^\d{4}$/.test(newPin1) || !/^\d{4}$/.test(newPin2) || newPin1 === newPin2)
            return false;
        try {
            const pinHash = await hashPin(newPin1);
            const decoyHash = await hashPin(newPin2);
            const answers = [answer1, answer2];
            const vault = await recoverVaultWithAnswers(answers, pinHash, decoyHash, this.state.autoLockMinutes);
            if (!vault)
                return false;
            await savePinHashes(pinHash, decoyHash, this.state.autoLockMinutes, this.state.pinHash);
            this.state = {
                ...this.state,
                pinHash,
            };
            this.notify();
            return true;
        }
        catch {
            return false;
        }
    }
    async recoverPinWithAnswers(answer1, answer2, newPin1, newPin2) {
        if (!/^\d{4}$/.test(newPin1) || !/^\d{4}$/.test(newPin2) || newPin1 === newPin2)
            return false;
        try {
            const pinHash = await hashPin(newPin1);
            const decoyHash = await hashPin(newPin2);
            const answers = [answer1, answer2];
            const vault = await recoverVaultWithAnswers(answers, pinHash, decoyHash, this.state.autoLockMinutes);
            if (!vault)
                return false;
            await savePinHashes(pinHash, decoyHash, this.state.autoLockMinutes);
            this.state = {
                ...this.state,
                pinHash,
                isFirstRun: false,
                recoveryConfigured: true,
                pinFailures: 0,
            };
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
        this.screenHistory = [];
        this.state = buildInitialState();
        this.notify();
    }
    setAuthEmail(email) {
        const previousEmail = this.state.authEmail;
        const identityChanged = previousEmail !== email;
        this.state = {
            ...this.state,
            authEmail: email,
            ...(identityChanged ? { accountPinUnlocked: true, accountPinQuestionIds: [] } : {}),
        };
        if (email && !this.state.accountPinUnlocked &&
            (previousEmail !== email || ['welcome', 'login', 'signup', 'verify-email'].includes(this.state.screen))) {
            this.state = { ...this.state, screen: 'setup-pin' };
        }
        else if (email && !this.state.isFirstRun) {
            this.state = { ...this.state, screen: 'calculator' };
        }
        else if (!email && previousEmail && ['account-pin-check', 'account-pin-setup', 'account-pin-login'].includes(this.state.screen)) {
            this.state = { ...this.state, screen: buildInitialState().screen };
        }
        this.notify();
    }
    async unlockAccountWithPrimaryPin(primaryPin, secondPin) {
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
            contacts: vault.contacts.map(contact => ({ ...contact, relationship: contact.relationship || 'Other', status: 'pending' })),
            notes: vault.notes,
            safetyPlan: vault.safetyPlan,
            pinFailures: 0,
            accountPinUnlocked: true,
        };
        savePinFailures(0);
        this.notify();
        return true;
    }
    markAccountPinUnlocked() {
        this.state = { ...this.state, accountPinUnlocked: true };
        this.notify();
    }
    setAccountPinQuestionIds(questionIds) {
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

import { createClient } from '@supabase/supabase-js';
import { getFrontendRedirectUrl } from './authConfig.mjs';
const SUPABASE_URL = `${window.location.origin}/api`;
const PROXY_API_KEY = 'panic-ring-public-proxy-key';
const FRONTEND_URL = import.meta.env['VITE_FRONTEND_URL'];
const AUTH_ENABLED = import.meta.env['VITE_AUTH_ENABLED'] === 'true';
const LEGACY_CLIENT_CONFIGURED = Boolean(
    import.meta.env['VITE_SUPABASE_URL'] && import.meta.env['VITE_SUPABASE_ANON_KEY'],
);
export const DB_CONFIGURED = AUTH_ENABLED || LEGACY_CLIENT_CONFIGURED;
const PHONE_DOMAIN = 'phone.panicring.app';

export function isPhoneIdentity(email: string | null | undefined): boolean {
    return Boolean(email && email.endsWith(`@${PHONE_DOMAIN}`));
}

export function displayIdentity(email: string | null | undefined): string {
    if (!email)
        return '';
    return isPhoneIdentity(email) ? `+${email.split('@')[0]}` : email;
}

let _client = null;
export function getClient() {
    if (!_client) {
        if (!DB_CONFIGURED) {
            throw new Error('Account service is disabled — set VITE_AUTH_ENABLED=true and configure server-side SUPABASE_URL and SUPABASE_ANON_KEY.');
        }
        _client = createClient(SUPABASE_URL, PROXY_API_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
            },
        });
    }
    return _client;
}
export async function sendEmailAuthOtp(email: string, purpose: 'signup' | 'login' | 'reauth', fullName = '') {
    if (!DB_CONFIGURED)
        return { error: 'Secure account service unavailable. Continue in offline mode.' };
    try {
        const { error } = await getClient().auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: purpose === 'signup',
                ...(fullName ? { data: { full_name: fullName } } : {}),
            },
        });
        return { error: error?.message ?? null };
    }
    catch {
        return { error: 'Unable to reach the secure account service. Continue in offline mode.' };
    }
}
export async function verifyEmailOtp(email: string, token: string) {
    if (!DB_CONFIGURED)
        return { error: 'Secure account service unavailable. Continue in offline mode.' };
    try {
        const { error } = await getClient().auth.verifyOtp({ email, token: token.trim(), type: 'email' });
        return { error: error?.message ?? null };
    }
    catch {
        return { error: 'Unable to verify the email code. Request a new code and try again.' };
    }
}
export async function signInWithGoogle() {
    if (!DB_CONFIGURED)
        return { error: 'Secure account service unavailable. Continue in offline mode.' };
    try {
        const { error } = await getClient().auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: getFrontendRedirectUrl(FRONTEND_URL, window.location.origin) },
        });
        if (error && /unsupported provider/i.test(error.message)) {
            return { error: 'Google sign-in is not enabled yet. Enable the Google provider in Supabase Auth settings.' };
        }
        return { error: error?.message ?? null };
    }
    catch {
        console.warn('[auth] Google sign-in could not reach the account service.');
        return { error: 'Unable to start Google sign-in. Check your connection and try again.' };
    }
}
export type PinOperationResult = {
    success: boolean;
    error?: string;
    locked?: boolean;
    minutesRemaining?: number;
    remainingAttempts?: number;
};

async function pinFunctionErrorMessage(error: { message: string; context?: unknown }) {
    if (error.context instanceof Response) {
        try {
            const body = await error.context.clone().json() as { error?: string };
            if (body.error)
                return body.error;
        } catch { }
    }
    return error.message;
}

export type AccountPinStatus = {
    configured: boolean;
    questionIds: string[];
    lockedUntil: string | null;
};

export async function getAccountPinStatus() {
    const { data, error } = await getClient().functions.invoke('pin-status', { method: 'GET' });
    if (error)
        throw new Error(error.message);
    return data as AccountPinStatus;
}

export async function setupAccountPins(input: {
    pin1: string;
    confirmPin1: string;
    pin2: string;
    confirmPin2: string;
    question1Id: string;
    question1Answer: string;
    question2Id: string;
    question2Answer: string;
}) {
    const { data, error } = await getClient().functions.invoke('pin-setup', {
        body: {
            pin1: input.pin1,
            confirm_pin1: input.confirmPin1,
            pin2: input.pin2,
            confirm_pin2: input.confirmPin2,
            question1_id: input.question1Id,
            question1_answer: input.question1Answer,
            question2_id: input.question2Id,
            question2_answer: input.question2Answer,
        },
    });
    if (error)
        return { success: false, error: await pinFunctionErrorMessage(error) } as PinOperationResult;
    return data as PinOperationResult;
}

export async function verifyAccountPins(pin1: string, pin2: string) {
    const { data, error } = await getClient().functions.invoke('pin-verify', {
        body: { pin1, pin2 },
    });
    if (error)
        return { success: false, error: await pinFunctionErrorMessage(error) } as PinOperationResult;
    return data as PinOperationResult;
}

export async function changeAccountPins(input: {
    answer1: string;
    answer2: string;
    newPin1: string;
    confirmPin1: string;
    newPin2: string;
    confirmPin2: string;
}) {
    const { data, error } = await getClient().functions.invoke('pin-change', {
        body: {
            answer1: input.answer1,
            answer2: input.answer2,
            new_pin1: input.newPin1,
            confirm_pin1: input.confirmPin1,
            new_pin2: input.newPin2,
            confirm_pin2: input.confirmPin2,
        },
    });
    if (error)
        return { success: false, error: await pinFunctionErrorMessage(error) } as PinOperationResult;
    return data as PinOperationResult;
}

export async function sendReauthenticationCode() {
    const session = await getSession();
    const email = session?.user.email;
    if (!email)
        return 'Your account session expired. Sign in again.';
    const { error } = await sendEmailAuthOtp(email, 'reauth');
    return error;
}

export async function signOut() {
    if (!DB_CONFIGURED)
        return;
    await getClient().auth.signOut();
}
export async function getSession() {
    if (!DB_CONFIGURED)
        return null;
    try {
        const { data } = await getClient().auth.getSession();
        return data.session;
    }
    catch {
        return null;
    }
}
export async function getUser() {
    if (!DB_CONFIGURED)
        return null;
    try {
        const { data } = await getClient().auth.getUser();
        return data.user ?? null;
    }
    catch {
        return null;
    }
}
export function onAuthStateChange(cb) {
    if (!DB_CONFIGURED)
        return () => { };
    const { data } = getClient().auth.onAuthStateChange((_event, session) => {
        cb(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
}
const DEVICE_KEY = 'pr_device_id';
export function getDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
}
export async function upsertDevice(row) {
    if (!DB_CONFIGURED)
        return;
    try {
        const { error } = await getClient()
            .from('devices')
            .upsert(row, { onConflict: 'device_id' });
        if (error)
            console.warn('[db] upsertDevice:', error.message);
    }
    catch (e) {
        console.warn('[db] upsertDevice offline:', e);
    }
}
export async function insertAlertLog(row) {
    if (!DB_CONFIGURED)
        return;
    try {
        const { error } = await getClient().from('alert_logs').insert(row);
        if (error)
            console.warn('[db] insertAlertLog:', error.message);
    }
    catch (e) {
        console.warn('[db] insertAlertLog offline:', e);
    }
}
export async function fetchAlertStats() {
    if (!DB_CONFIGURED)
        return null;
    try {
        const user = await getUser();
        if (!user)
            return null;
        const { data, error } = await getClient()
            .from('alert_stats')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
        if (error) {
            console.warn('[db] fetchAlertStats:', error.message);
            return null;
        }
        return data;
    }
    catch {
        return null;
    }
}
export async function fetchRecentAlerts(limit = 10) {
    if (!DB_CONFIGURED)
        return [];
    try {
        const user = await getUser();
        if (!user)
            return [];
        const { data, error } = await getClient()
            .from('alert_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('fired_at', { ascending: false })
            .limit(limit);
        if (error)
            return [];
        return (data ?? []);
    }
    catch {
        return [];
    }
}

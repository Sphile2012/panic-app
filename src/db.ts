import { createClient } from '@supabase/supabase-js';
import { getFrontendRedirectUrl, resolveIdentifier } from './authConfig.mjs';
const ACCOUNT_API_URL = `${window.location.origin}/api`;
const API_PROXY_KEY = 'panic-ring-public-proxy-key';
const FRONTEND_URL = import.meta.env['VITE_FRONTEND_URL'];
const AUTH_ENABLED = import.meta.env['VITE_AUTH_ENABLED'] === 'true';
export const DB_CONFIGURED = AUTH_ENABLED || import.meta.env.DEV;
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
            throw new Error('Account service is disabled — enable account access in the deployment configuration.');
        }
        _client = createClient(ACCOUNT_API_URL, API_PROXY_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
            },
        });
    }
    return _client;
}
export async function sendEmailAuthOtp(email: string, purpose: 'signup' | 'login' | 'reauth', fullName = '', phone = '') {
    const verifiedEmail = resolveIdentifier(email);
    if (!verifiedEmail)
        return { error: 'Enter a valid email address.' };
    if (!DB_CONFIGURED)
        return { error: 'Secure account service unavailable. Continue in offline mode.' };
    try {
        const { error } = await getClient().auth.signInWithOtp({
            email: verifiedEmail,
            options: {
                shouldCreateUser: purpose === 'signup',
                ...(fullName ? { data: { full_name: fullName, phone: phone } } : {}),
            },
        });
        return { error: error?.message ?? null };
    }
    catch {
        return { error: 'Unable to reach the secure account service. Continue in offline mode.' };
    }
}

export async function sendPhoneAuthOtp(phone: string, purpose: 'signup' | 'login') {
    // Normalize phone number (remove spaces, ensure + prefix)
    const normalizedPhone = phone.replace(/\s/g, '').startsWith('+') ? phone.replace(/\s/g, '') : `+${phone.replace(/\s/g, '')}`;
    
    if (!DB_CONFIGURED)
        return { error: 'Secure account service unavailable. Continue in offline mode.' };
    try {
        const { error } = await getClient().auth.signInWithOtp({
            phone: normalizedPhone,
            options: {
                shouldCreateUser: purpose === 'signup',
            },
        });
        return { error: error?.message ?? null };
    }
    catch {
        return { error: 'Unable to reach the secure account service. Continue in offline mode.' };
    }
}

export async function verifyPhoneOtp(phone: string, token: string) {
    const normalizedPhone = phone.replace(/\s/g, '').startsWith('+') ? phone.replace(/\s/g, '') : `+${phone.replace(/\s/g, '')}`;
    
    if (!token.trim())
        return { error: 'Enter the verification code sent to your phone.' };
    if (!DB_CONFIGURED)
        return { error: 'Secure account service unavailable. Continue in offline mode.' };
    try {
        const { error } = await getClient().auth.verifyOtp({ phone: normalizedPhone, token: token.trim(), type: 'sms' });
        return { error: error?.message ?? null };
    }
    catch {
        return { error: 'Unable to verify the phone code. Request a new code and try again.' };
    }
}
export async function verifyEmailOtp(email: string, token: string) {
    const verifiedEmail = resolveIdentifier(email);
    if (!verifiedEmail)
        return { error: 'Enter a valid email address.' };
    if (!token.trim())
        return { error: 'Enter the verification code sent to your email.' };
    if (!DB_CONFIGURED)
        return { error: 'Secure account service unavailable. Continue in offline mode.' };
    try {
        const { error } = await getClient().auth.verifyOtp({ email: verifiedEmail, token: token.trim(), type: 'email' });
        return { error: error?.message ?? null };
    }
    catch {
        return { error: 'Unable to verify the email code. Request a new code and try again.' };
    }
}
export async function setAuthenticatedPassword(password: string) {
    if (!password)
        return { error: 'Enter a password.' };
    if (!DB_CONFIGURED)
        return { error: 'Secure account service unavailable. Continue in offline mode.' };
    try {
        const { error } = await getClient().auth.updateUser({ password });
        return { error: error?.message ?? null };
    }
    catch {
        return { error: 'Unable to set the password. Sign in again and retry.' };
    }
}
export async function signInWithPassword(email: string, password: string) {
    const verifiedEmail = resolveIdentifier(email);
    if (!verifiedEmail)
        return { error: 'Enter a valid email address.' };
    if (!password)
        return { error: 'Enter your password.' };
    if (!DB_CONFIGURED)
        return { error: 'Secure account service unavailable. Continue in offline mode.' };
    try {
        const { error } = await getClient().auth.signInWithPassword({ email: verifiedEmail, password });
        return { error: error?.message ?? null };
    }
    catch {
        return { error: 'Unable to sign in. Check your connection and try again.' };
    }
}
export async function sendPasswordResetEmail(email: string) {
    const verifiedEmail = resolveIdentifier(email);
    if (!verifiedEmail)
        return { error: 'Enter a valid email address.' };
    if (!DB_CONFIGURED)
        return { error: 'Secure account service unavailable. Continue in offline mode.' };
    try {
        const { error } = await getClient().auth.resetPasswordForEmail(verifiedEmail, {
            redirectTo: getFrontendRedirectUrl(FRONTEND_URL, window.location.origin, 'recovery'),
        });
        return { error: error?.message ?? null };
    }
    catch {
        return { error: 'Unable to send password reset email. Check your connection and try again.' };
    }
}
export async function updatePassword(newPassword: string) {
    if (!newPassword || newPassword.length < 8)
        return { error: 'Password must be at least 8 characters.' };
    if (!DB_CONFIGURED)
        return { error: 'Secure account service unavailable. Continue in offline mode.' };
    try {
        const { error } = await getClient().auth.updateUser({ password: newPassword });
        return { error: error?.message ?? null };
    }
    catch {
        return { error: 'Unable to update password. Please try again.' };
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
        if (error) {
            if (/unsupported provider|not enabled/i.test(error.message)) {
                return { error: 'Google Sign-In is currently disabled. Please use email/password authentication instead.' };
            }
            return { error: error.message };
        }
        return { error: null };
    }
    catch (err) {
        console.warn('[auth] Google sign-in error:', err);
        return { error: 'Google Sign-In is currently unavailable. Please use email/password authentication.' };
    }
}

export async function isGoogleAuthEnabled(): Promise<boolean> {
    if (!DB_CONFIGURED) return false;
    try {
        // Try to check if Google provider is available
        // This is a simple check - if it fails, we know it's not enabled
        const testResult = await getClient().auth.signInWithOAuth({
            provider: 'google',
            options: { 
                redirectTo: getFrontendRedirectUrl(FRONTEND_URL, window.location.origin),
                skipBrowserRedirect: true // Don't actually redirect
            },
        });
        return !testResult.error || !/unsupported provider|not enabled/i.test(testResult.error.message || '');
    }
    catch {
        return false;
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
    const { data } = getClient().auth.onAuthStateChange((event, session) => {
        cb(session?.user ?? null, event);
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

// PIN Authentication Functions
const EDGE_FUNCTION_URL = '';

export async function setupPinsInCloud(
    pin1: string,
    pin2: string,
    question1_id: string,
    answer1: string,
    question2_id: string,
    answer2: string
): Promise<{ error: string | null; success: boolean }> {
    if (!DB_CONFIGURED)
        return { error: 'Cloud backup not available in offline mode', success: false };

    try {
        const session = await getSession();
        if (!session?.access_token) {
            return { error: 'Authentication required for cloud backup', success: false };
        }

        const response = await fetch(`${EDGE_FUNCTION_URL}/functions/v1/pin-setup`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pin1,
                pin2,
                question1_id,
                question1_answer: answer1,
                question2_id,
                question2_answer: answer2,
            }),
        });

        const result = await response.json();
        if (!response.ok) {
            return { error: result.error || 'Failed to save PINs', success: false };
        }

        return { error: null, success: true };
    }
    catch (error) {
        console.error('[pin-setup] Error:', error);
        return { error: 'Unable to connect to cloud backup service', success: false };
    }
}

export async function verifyPinsInCloud(
    pin1: string,
    pin2: string
): Promise<{ error: string | null; success: boolean; locked?: boolean; remainingAttempts?: number }> {
    if (!DB_CONFIGURED)
        return { error: 'Cloud verification not available', success: false };

    try {
        const session = await getSession();
        if (!session?.access_token) {
            return { error: 'Authentication required', success: false };
        }

        const response = await fetch(`${EDGE_FUNCTION_URL}/functions/v1/pin-verify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pin1, pin2 }),
        });

        const result = await response.json();
        if (!response.ok) {
            return {
                error: result.error || 'PIN verification failed',
                success: false,
                locked: result.locked,
                remainingAttempts: result.remainingAttempts,
            };
        }

        return { error: null, success: true };
    }
    catch (error) {
        console.error('[pin-verify] Error:', error);
        return { error: 'Unable to verify PINs', success: false };
    }
}

export async function changePinsInCloud(
    answer1: string,
    answer2: string,
    newPin1: string,
    newPin2: string
): Promise<{ error: string | null; success: boolean }> {
    if (!DB_CONFIGURED)
        return { error: 'Cloud backup not available', success: false };

    try {
        const session = await getSession();
        if (!session?.access_token) {
            return { error: 'Authentication required', success: false };
        }

        const response = await fetch(`${EDGE_FUNCTION_URL}/functions/v1/pin-change`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                answer1,
                answer2,
                new_pin1: newPin1,
                new_pin2: newPin2,
            }),
        });

        const result = await response.json();
        if (!response.ok) {
            return { error: result.error || 'Failed to change PINs', success: false };
        }

        return { error: null, success: true };
    }
    catch (error) {
        console.error('[pin-change] Error:', error);
        return { error: 'Unable to change PINs', success: false };
    }
}

export async function checkCloudPinsExist(): Promise<boolean> {
    if (!DB_CONFIGURED)
        return false;

    try {
        const user = await getUser();
        if (!user)
            return false;

        const { data, error } = await getClient()
            .from('user_pins')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

        return !error && data !== null;
    }
    catch {
        return false;
    }
}

import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = import.meta.env['VITE_SUPABASE_URL'];
const SUPABASE_ANON = import.meta.env['VITE_SUPABASE_ANON_KEY'];
export const DB_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON) &&
    SUPABASE_URL !== 'https://your-project-ref.supabase.co';
let _client = null;

function safeAuthError(message: string | undefined, fallback: string): string {
    const normalized = message?.toLowerCase() ?? '';
    if (normalized.includes('rate limit') || normalized.includes('too many requests'))
        return 'Too many attempts — please wait a moment and try again.';
    if (normalized.includes('email not confirmed'))
        return 'Please confirm your email before signing in.';
    if (normalized.includes('invalid') && (normalized.includes('otp') || normalized.includes('token')))
        return 'That code is invalid or expired. Request a new code and try again.';
    if (normalized.includes('password') && (normalized.includes('weak') || normalized.includes('least')))
        return 'Choose a stronger password and try again.';
    if (normalized.includes('invalid email') || normalized.includes('email address'))
        return 'Enter a valid email address and try again.';
    return fallback;
}

export function getClient() {
    if (!_client) {
        if (!DB_CONFIGURED || !SUPABASE_URL || !SUPABASE_ANON) {
            throw new Error('Supabase not configured — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env');
        }
        _client = createClient(SUPABASE_URL, SUPABASE_ANON, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
            },
        });
    }
    return _client;
}
export async function signUp(email, password): Promise<{ error: string | null; alreadyRegistered: boolean }> {
    if (!DB_CONFIGURED)
        return { error: 'Secure account service unavailable. Continue in offline mode.', alreadyRegistered: false };
    try {
        const { data, error } = await getClient().auth.signUp({ email: email.trim(), password });
        if (
            error?.code === 'user_already_exists' ||
            error?.message.toLowerCase().includes('already registered') ||
            data.user?.identities?.length === 0
        ) {
            return { error: null, alreadyRegistered: true };
        }
        return {
            error: error ? safeAuthError(error.message, 'We could not create your account. Please try again.') : null,
            alreadyRegistered: false,
        };
    }
    catch {
        return { error: 'Unable to reach the secure account service. Continue in offline mode.', alreadyRegistered: false };
    }
}
export async function signIn(email, password) {
    if (!DB_CONFIGURED)
        return { error: 'Secure account service unavailable. Continue in offline mode.' };
    try {
        const { error } = await getClient().auth.signInWithPassword({ email, password });
        if (!error)
            return { error: null };
        if (error.code === 'invalid_credentials' || error.message.toLowerCase().includes('invalid login credentials')) {
            return {
                error: 'We could not verify this email and password. For security, sign-in does not reveal which one is incorrect. Check the email address, or use “Forgot password?” to set a new password.',
            };
        }
        return { error: safeAuthError(error.message, 'We could not sign you in. Please try again.') };
    }
    catch {
        return { error: 'Unable to reach the secure account service. Continue in offline mode.' };
    }
}
export async function signOut() {
    if (!DB_CONFIGURED)
        return;
    await getClient().auth.signOut();
}

export async function signInWithGoogle(): Promise<{ error: string | null }> {
    if (!DB_CONFIGURED)
        return { error: 'Secure account service unavailable.' };
    try {
        const { error } = await getClient().auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        });
        return {
            error: error ? safeAuthError(error.message, 'Google sign-in is unavailable right now. Please try again.') : null,
        };
    } catch {
        return { error: 'Unable to sign in with Google.' };
    }
}

export async function resetPassword(email: string): Promise<{ error: string | null }> {
    if (!DB_CONFIGURED)
        return { error: 'Secure account service unavailable.' };
    try {
        const { error } = await getClient().auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        });
        return {
            error: error ? safeAuthError(error.message, 'We could not send a reset code. Check the address and try again.') : null,
        };
    } catch {
        return { error: 'Unable to send reset email.' };
    }
}

export async function verifyPasswordResetOtp(
    email: string,
    token: string,
    password: string,
): Promise<{ error: string | null }> {
    if (!DB_CONFIGURED)
        return { error: 'Secure account service unavailable.' };
    try {
        const client = getClient();
        const { error: verifyError } = await client.auth.verifyOtp({
            email: email.trim(),
            token: token.trim(),
            type: 'recovery',
        });
        if (verifyError)
            return { error: safeAuthError(verifyError.message, 'That code is invalid or expired. Request a new code and try again.') };
        const { error: updateError } = await client.auth.updateUser({ password });
        return {
            error: updateError ? safeAuthError(updateError.message, 'We could not update your password. Please try again.') : null,
        };
    }
    catch {
        return { error: 'Unable to verify the reset code. Request a new code and try again.' };
    }
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

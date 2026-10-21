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

export function displayIdentity(email: string | null | undefined): string {
    if (!email)
        return '';
    return email.endsWith(`@${PHONE_DOMAIN}`) ? `+${email.split('@')[0]}` : email;
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
export async function signUp(email, password) {
    if (!DB_CONFIGURED)
        return { error: 'Secure account service unavailable. Continue in offline mode.' };
    try {
        const { data, error } = await getClient().auth.signUp({
            email,
            password,
            options: { emailRedirectTo: getFrontendRedirectUrl(FRONTEND_URL, window.location.origin) },
        });
        return { error: error?.message ?? null, session: data.session };
    }
    catch {
        return { error: 'Unable to reach the secure account service. Continue in offline mode.', session: null };
    }
}
export async function signIn(email, password) {
    if (!DB_CONFIGURED)
        return { error: 'Secure account service unavailable. Continue in offline mode.' };
    try {
        const { error } = await getClient().auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
    }
    catch {
        return { error: 'Unable to reach the secure account service. Continue in offline mode.' };
    }
}
export async function resetPasswordForEmail(email, redirectTo?: string) {
    if (!DB_CONFIGURED)
        return { error: 'Secure account service unavailable. Continue in offline mode.' };
    try {
        const { error } = await getClient().auth.resetPasswordForEmail(email.trim(), redirectTo ? { redirectTo } : undefined);
        return { error: error?.message ?? null };
    }
    catch {
        console.warn('[auth] Password recovery request could not reach the account service.');
        return { error: 'Unable to reach the secure account service. Continue in offline mode.' };
    }
}
export async function updatePassword(password) {
    if (!DB_CONFIGURED)
        return { error: 'Secure account service unavailable. Continue in offline mode.' };
    try {
        const { error } = await getClient().auth.updateUser({ password });
        return { error: error?.message ?? null };
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

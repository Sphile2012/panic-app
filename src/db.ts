import { createClient } from '@supabase/supabase-js';
import { getFrontendRedirectUrl, resolveIdentifier } from './authConfig.mjs';
export { resolveIdentifier } from './authConfig.mjs';
const PROXY_API_KEY = 'panic-ring-public-proxy-key';
const FRONTEND_URL = import.meta.env['VITE_FRONTEND_URL'];
export const DB_CONFIGURED = import.meta.env['VITE_AUTH_ENABLED'] === 'true';
let _client = null;
export function getClient() {
    if (!_client) {
        if (!DB_CONFIGURED) {
            throw new Error('Account service not configured.');
        }
        _client = createClient(`${window.location.origin}/api`, PROXY_API_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
            },
        });
    }
    return _client;
}
export type AuthFailure = 'id' | 'invalid' | 'confirm' | 'service' | 'generic';
const PHONE_DOMAIN = 'phone.panicring.app';

function logAuthFailure(operation: string, code?: string) {
    console.warn(`[auth] ${operation} failed${code ? ` (${code})` : ''}`);
}

export function isPhoneIdentity(email: string | null | undefined): boolean {
    return Boolean(email && email.endsWith('@' + PHONE_DOMAIN));
}
export function displayIdentity(email: string | null | undefined): string {
    if (!email)
        return '';
    return isPhoneIdentity(email) ? '+' + email.split('@')[0] : email;
}
function mapAuthError(message: string | undefined): AuthFailure {
    const m = (message ?? '').toLowerCase();
    if (m.includes('not confirmed'))
        return 'confirm';
    if (m.includes('invalid') || m.includes('already registered'))
        return 'invalid';
    return 'generic';
}
export async function signUp(identifier: string, password: string): Promise<{ error: AuthFailure | null; needsConfirm?: boolean; identity?: string }> {
    const email = resolveIdentifier(identifier);
    if (!email)
        return { error: 'id' };
    if (!DB_CONFIGURED)
        return { error: 'service' };
    try {
        const { data, error } = await getClient().auth.signUp({
            email,
            password,
            options: { emailRedirectTo: getFrontendRedirectUrl(FRONTEND_URL, window.location.origin) },
        });
        if (error) {
            logAuthFailure('sign up', error.code);
            return { error: mapAuthError(error.message) };
        }
        return {
            error: null,
            needsConfirm: !data.session && !isPhoneIdentity(email),
            identity: data.session ? data.user?.email ?? email : undefined,
        };
    }
    catch {
        logAuthFailure('sign up');
        return { error: 'service' };
    }
}
export async function signIn(identifier: string, password: string): Promise<{ error: AuthFailure | null; identity?: string }> {
    const email = resolveIdentifier(identifier);
    if (!email)
        return { error: 'id' };
    if (!DB_CONFIGURED)
        return { error: 'service' };
    try {
        const { data, error } = await getClient().auth.signInWithPassword({ email, password });
        if (error)
            logAuthFailure('sign in', error.code);
        return {
            error: error ? mapAuthError(error.message) : null,
            identity: error ? undefined : data.user.email ?? email,
        };
    }
    catch {
        logAuthFailure('sign in');
        return { error: 'service' };
    }
}
export async function signOut() {
    if (!DB_CONFIGURED)
        return;
    try {
        const { error } = await getClient().auth.signOut();
        if (error)
            logAuthFailure('sign out', error.code);
    }
    catch {
        logAuthFailure('sign out');
        throw new Error('Could not sign out.');
    }
}
export async function requestPasswordReset(identifier: string): Promise<{ error: 'id' | 'phone' | 'service' | null }> {
    const email = resolveIdentifier(identifier);
    if (!email)
        return { error: 'id' };
    if (isPhoneIdentity(email))
        return { error: 'phone' };
    if (!DB_CONFIGURED)
        return { error: 'service' };
    try {
        const { error } = await getClient().auth.resetPasswordForEmail(email, {
            redirectTo: getFrontendRedirectUrl(FRONTEND_URL, window.location.origin, 'recovery'),
        });
        if (error)
            logAuthFailure('password reset request', error.code);
        return { error: error ? 'service' : null };
    }
    catch {
        logAuthFailure('password reset request');
        return { error: 'service' };
    }
}
export async function updatePassword(password: string): Promise<boolean> {
    if (!DB_CONFIGURED)
        return false;
    try {
        const { error } = await getClient().auth.updateUser({ password });
        if (error)
            logAuthFailure('password update', error.code);
        return !error;
    }
    catch {
        logAuthFailure('password update');
        return false;
    }
}
export async function getSession() {
    if (!DB_CONFIGURED)
        return null;
    try {
        const { data, error } = await getClient().auth.getSession();
        if (error)
            logAuthFailure('get session', error.code);
        return data.session;
    }
    catch {
        logAuthFailure('get session');
        return null;
    }
}
export async function getUser() {
    if (!DB_CONFIGURED)
        return null;
    try {
        const { data, error } = await getClient().auth.getUser();
        if (error)
            logAuthFailure('get user', error.code);
        return data.user ?? null;
    }
    catch {
        logAuthFailure('get user');
        return null;
    }
}
export function onAuthStateChange(cb) {
    if (!DB_CONFIGURED)
        return () => { };
    try {
        const { data, error } = getClient().auth.onAuthStateChange((_event, session) => {
            cb(session?.user ?? null);
        });
        if (error)
            logAuthFailure('subscribe to auth changes', error.code);
        return () => data.subscription.unsubscribe();
    }
    catch {
        logAuthFailure('subscribe to auth changes');
        return () => { };
    }
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
        const user = await getUser();
        if (!user || user.id !== row.user_id) {
            console.warn('[db] upsertDevice skipped: authenticated user unavailable');
            return;
        }
        const { error } = await getClient()
            .from('devices')
            .upsert({
                user_id: user.id,
                device_id: row.device_id,
                auto_lock: row.auto_lock,
            }, { onConflict: 'user_id,device_id' });
        if (error)
            console.warn('[db] upsertDevice failed:', error.code ?? 'unknown');
    }
    catch {
        console.warn('[db] upsertDevice failed: request unavailable');
    }
}
export async function insertAlertLog(row) {
    if (!DB_CONFIGURED)
        return;
    try {
        const user = await getUser();
        if (!user) {
            console.warn('[db] insertAlertLog skipped: authenticated user unavailable');
            return;
        }
        const { error } = await getClient().from('alert_logs').insert({
            ...row,
            user_id: user.id,
        });
        if (error)
            console.warn('[db] insertAlertLog failed:', error.code ?? 'unknown');
    }
    catch {
        console.warn('[db] insertAlertLog failed: request unavailable');
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
            console.warn('[db] fetchAlertStats failed:', error.code ?? 'unknown');
            return null;
        }
        return data;
    }
    catch {
        console.warn('[db] fetchAlertStats failed: request unavailable');
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
        if (error) {
            console.warn('[db] fetchRecentAlerts failed:', error.code ?? 'unknown');
            return [];
        }
        return (data ?? []);
    }
    catch {
        console.warn('[db] fetchRecentAlerts failed: request unavailable');
        return [];
    }
}

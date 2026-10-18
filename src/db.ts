import { createClient } from '@supabase/supabase-js';
const APP_URL = 'https://panic-ring-app.netlify.app/';
const SUPABASE_URL = import.meta.env['VITE_SUPABASE_URL'];
const SUPABASE_ANON = import.meta.env['VITE_SUPABASE_ANON_KEY'];
const ENABLE_LOCAL_AUTH = import.meta.env['VITE_ENABLE_LOCAL_AUTH'] === 'true';
const isLocalSupabase = Boolean(SUPABASE_URL && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?:\/|$)/i.test(SUPABASE_URL));
export const DB_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON) &&
    SUPABASE_URL !== 'https://your-project-ref.supabase.co' &&
    (!isLocalSupabase || ENABLE_LOCAL_AUTH);
let _client = null;
export function getClient() {
    if (!_client) {
        if (!DB_CONFIGURED || !SUPABASE_URL || !SUPABASE_ANON) {
            throw new Error('Account service not configured.');
        }
        // Static hosts (Netlify) have no /api proxy, so a production build talks to the hosted project directly.
        const base = import.meta.env.PROD && !isLocalSupabase ? SUPABASE_URL : window.location.origin + '/api';
        _client = createClient(base, SUPABASE_ANON, {
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
export function resolveIdentifier(raw: string): string | null {
    const v = raw.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
        return v.toLowerCase();
    return null;
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
        const { data, error } = await getClient().auth.signUp({ email, password });
        if (error)
            return { error: mapAuthError(error.message) };
        return {
            error: null,
            needsConfirm: !data.session && !isPhoneIdentity(email),
            identity: data.session ? data.user?.email ?? email : undefined,
        };
    }
    catch {
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
        return {
            error: error ? mapAuthError(error.message) : null,
            identity: error ? undefined : data.user.email ?? email,
        };
    }
    catch {
        return { error: 'service' };
    }
}
export async function signOut() {
    if (!DB_CONFIGURED)
        return;
    await getClient().auth.signOut();
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
        const { error } = await getClient().auth.resetPasswordForEmail(email, { redirectTo: APP_URL });
        return { error: error ? 'service' : null };
    }
    catch {
        return { error: 'service' };
    }
}
export async function updatePassword(password: string): Promise<boolean> {
    if (!DB_CONFIGURED)
        return false;
    try {
        const { error } = await getClient().auth.updateUser({ password });
        return !error;
    }
    catch {
        return false;
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


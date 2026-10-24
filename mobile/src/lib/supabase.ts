import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { secureSessionStorage } from './secure-session-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

let client: SupabaseClient | undefined;
const volatileStorage = new Map<string, string>();
const browserSessionStorage = {
  getItem: async (key: string) => volatileStorage.get(key) ?? null,
  setItem: async (key: string, value: string) => { volatileStorage.set(key, value); },
  removeItem: async (key: string) => { volatileStorage.delete(key); },
};

export function isSupabaseConfigured(): boolean {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  try {
    const url = new URL(supabaseUrl);
    return url.protocol === 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured() || !supabaseUrl || !supabaseAnonKey) {
    throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env.');
  }

  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: Platform.OS === 'web' ? browserSessionStorage : secureSessionStorage,
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: Platform.OS !== 'web',
        detectSessionInUrl: false,
      },
    });
  }

  return client;
}

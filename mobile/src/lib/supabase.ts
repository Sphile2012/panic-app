import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

let client: SupabaseClient | undefined;

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
        storage: AsyncStorage,
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  return client;
}

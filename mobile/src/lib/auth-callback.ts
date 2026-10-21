import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase';

export type AuthRedirect = {
  session: Session;
  type: string | null;
};

export async function completeAuthRedirect(url: string): Promise<AuthRedirect> {
  let callbackUrl: URL;
  try {
    callbackUrl = new URL(url);
  } catch {
    throw new Error('The authentication link is invalid.');
  }

  const query = new URLSearchParams(callbackUrl.search);
  const fragment = new URLSearchParams(callbackUrl.hash.replace(/^#/, ''));
  const getParam = (name: string) => query.get(name) ?? fragment.get(name);
  const providerError = getParam('error_description') ?? getParam('error');
  if (providerError) throw new Error(providerError);

  const client = getSupabaseClient();
  const code = getParam('code');
  let session: Session | null;

  if (code) {
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw error;
    session = data.session;
  } else {
    const accessToken = getParam('access_token');
    const refreshToken = getParam('refresh_token');
    if (!accessToken || !refreshToken) {
      throw new Error('The authentication link is invalid or has expired.');
    }

    const { data, error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    session = data.session;
  }

  if (!session) throw new Error('The authentication link is invalid or has expired.');
  return { session, type: getParam('type') };
}

import type { LocationObject } from 'expo-location';
import { getSupabaseClient } from './supabase';

export type TrustedContact = {
  id: string;
  display_name: string;
  phone_number: string;
  created_at: string;
};

export type EmergencySession = {
  id: string;
  status: 'active';
  started_at: string;
};

export type EmergencyLocation = {
  latitude: number;
  longitude: number;
  accuracy_meters: number;
  captured_at: string;
};

export function isValidPhoneNumber(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value.trim());
}

export function getLiveTrackingUrl(sessionId: string): string | null {
  const configuredUrl = process.env.EXPO_PUBLIC_TRACKING_URL?.trim()
    || 'https://panic-ring-app.netlify.app/track.html';
  const token = sessionId.replaceAll('-', '').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(token)) {
    throw new Error('The live tracking token is invalid.');
  }

  let url: URL;
  try {
    url = new URL(configuredUrl);
  } catch {
    throw new Error('EXPO_PUBLIC_TRACKING_URL must be a valid HTTPS URL.');
  }

  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error('EXPO_PUBLIC_TRACKING_URL must use HTTPS.');
  }
  if (url.hash) {
    throw new Error('EXPO_PUBLIC_TRACKING_URL must not include a URL fragment.');
  }
  if (!url.pathname.endsWith('.html')) {
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/track.html`;
  }
  url.hash = token;
  return url.toString();
}

export async function startLiveTracking(position: LocationObject): Promise<string> {
  const location = getValidatedLocation(position);
  const { data, error } = await getSupabaseClient().rpc('start_track', {
    p_lat: location.latitude,
    p_lng: location.longitude,
    p_accuracy: location.accuracy_meters,
  });
  if (error) throw new Error(`Could not start live tracking: ${error.message}`);
  if (typeof data !== 'string' || !/^[0-9a-f]{32}$/.test(data)) {
    throw new Error('The server returned an invalid live tracking token.');
  }
  return data;
}

export async function recordLiveLocation(token: string, position: LocationObject): Promise<void> {
  if (!/^[0-9a-f]{32}$/.test(token)) throw new Error('The live tracking token is invalid.');
  const location = getValidatedLocation(position);
  const { data, error } = await getSupabaseClient().rpc('push_track', {
    p_token: token,
    p_lat: location.latitude,
    p_lng: location.longitude,
    p_accuracy: location.accuracy_meters,
    p_battery: null,
    p_charging: false,
  });
  if (error) throw new Error(`Could not update the live location: ${error.message}`);
  if (data !== true) throw new Error('The live tracking session is no longer active.');
}

export async function stopLiveTracking(token: string): Promise<void> {
  if (!/^[0-9a-f]{32}$/.test(token)) throw new Error('The live tracking token is invalid.');
  const { data, error } = await getSupabaseClient().rpc('stop_track', { p_token: token });
  if (error) throw new Error(`Could not stop live tracking: ${error.message}`);
  if (data !== true) throw new Error('The live tracking session was already stopped.');
}

function getValidatedLocation(position: LocationObject): {
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
} {
  const { latitude, longitude, accuracy } = position.coords;
  if (
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    || (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0))
  ) {
    throw new Error('The device returned invalid GPS coordinates or accuracy.');
  }
  return { latitude, longitude, accuracy_meters: accuracy };
}

async function requireUserId(): Promise<string> {
  const { data, error } = await getSupabaseClient().auth.getUser();
  if (error) throw new Error('Sign in again before using emergency features.');
  if (!data.user) throw new Error('Sign in before using emergency features.');
  return data.user.id;
}

export async function listTrustedContacts(): Promise<TrustedContact[]> {
  const userId = await requireUserId();
  const { data, error } = await getSupabaseClient()
    .from('trusted_contacts')
    .select('id, display_name, phone_number, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Could not load your trusted circle: ${error.message}`);
  return data;
}

export async function addTrustedContact(displayName: string, phoneNumber: string): Promise<void> {
  const normalizedName = displayName.trim();
  const normalizedPhone = phoneNumber.trim();
  if (normalizedName.length < 1 || normalizedName.length > 80) {
    throw new Error('Name must be between 1 and 80 characters.');
  }
  if (!isValidPhoneNumber(normalizedPhone)) {
    throw new Error('Use an international number such as +27123456789.');
  }

  const userId = await requireUserId();
  const { error } = await getSupabaseClient().from('trusted_contacts').insert({
    user_id: userId,
    display_name: normalizedName,
    phone_number: normalizedPhone,
  });
  if (error) {
    if (error.code === '23505') throw new Error('That phone number is already in your circle.');
    throw new Error(`Could not add this contact: ${error.message}`);
  }
}

export async function removeTrustedContact(contactId: string): Promise<void> {
  const userId = await requireUserId();
  const { error, count } = await getSupabaseClient()
    .from('trusted_contacts')
    .delete({ count: 'exact' })
    .eq('id', contactId)
    .eq('user_id', userId);

  if (error) throw new Error(`Could not remove this contact: ${error.message}`);
  if (count === 0) throw new Error('This contact was not found. Refresh and try again.');
}

export async function getActiveEmergency(): Promise<EmergencySession | null> {
  const userId = await requireUserId();
  const { data, error } = await getSupabaseClient()
    .from('emergency_sessions')
    .select('id, status, started_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw new Error(`Could not check for an active emergency: ${error.message}`);
  return data;
}

export async function startEmergency(): Promise<EmergencySession> {
  const userId = await requireUserId();
  const { data, error } = await getSupabaseClient()
    .from('emergency_sessions')
    .insert({ user_id: userId })
    .select('id, status, started_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('An emergency is already active. Resume or end it before starting another.');
    }
    throw new Error(`Could not create an emergency record: ${error.message}`);
  }
  return data;
}

export async function getLatestEmergencyLocation(sessionId: string): Promise<EmergencyLocation | null> {
  const userId = await requireUserId();
  const { data, error } = await getSupabaseClient()
    .from('emergency_location_updates')
    .select('latitude, longitude, accuracy_meters, captured_at')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Could not load the last saved location: ${error.message}`);
  return data;
}

export async function recordEmergencyLocation(
  sessionId: string,
  position: LocationObject,
): Promise<void> {
  const userId = await requireUserId();
  const client = getSupabaseClient();
  const location = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy_meters: position.coords.accuracy ?? 0,
  };

  const { error: insertError } = await client.from('emergency_location_updates').insert({
    session_id: sessionId,
    user_id: userId,
    ...location,
    captured_at: new Date(position.timestamp).toISOString(),
  });
  if (insertError) throw new Error(`GPS was read, but could not be saved securely: ${insertError.message}`);

  const { data, error: syncError } = await client.rpc('push_track', {
    p_token: sessionId.replaceAll('-', '').toLowerCase(),
    p_lat: location.latitude,
    p_lng: location.longitude,
    p_accuracy: location.accuracy_meters,
    p_battery: null,
    p_charging: false,
  });
  if (syncError) throw new Error(`Location was saved, but the live-share link did not update: ${syncError.message}`);
  if (data !== true) throw new Error('The live-share token belongs to a different tracking session.');
}

export async function stopEmergency(sessionId: string, status: 'cancelled' | 'ended'): Promise<string[]> {
  const client = getSupabaseClient();
  const failures: string[] = [];

  const { error: stopTrackError } = await client.rpc('stop_track', {
    p_token: sessionId.replaceAll('-', '').toLowerCase(),
  });
  if (stopTrackError) failures.push(`Live link revocation failed: ${stopTrackError.message}`);

  const { data, error: endError } = await client
    .from('emergency_sessions')
    .update({ status, ended_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('status', 'active')
    .select('id')
    .maybeSingle();
  if (endError) failures.push(`Emergency record could not be closed: ${endError.message}`);
  else if (!data) failures.push('The emergency record was already closed or could not be found.');

  return failures;
}

export function getMapUrl(latitude: number, longitude: number): string {
  return `https://maps.google.com/?q=${latitude},${longitude}`;
}

export function buildEmergencyMessage(
  location: EmergencyLocation | null,
  trackingUrl: string | null,
): string {
  const locationLine = location
    ? `Last location (accuracy ±${Math.round(location.accuracy_meters)} m): ${getMapUrl(location.latitude, location.longitude)}`
    : 'No GPS fix is available yet. Do not assume this message contains your location.';
  const liveLine = trackingUrl
    ? `Live location link (anyone with this link can view it): ${trackingUrl}`
    : 'Live location link is not configured for this app.';
  return `Panic Ring SOS: I need help. ${locationLine} ${liveLine} Please call the police now (SAPS 10111).`;
}

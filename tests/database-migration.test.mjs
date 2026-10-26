import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const migration = await readFile(
  new URL('../supabase/migrations/20261018103000_harden_panic_ring.sql', import.meta.url),
  'utf8',
);
const liveTracksBase = await readFile(
  new URL('../supabase/migrations/20261017100000_create_live_tracks_base.sql', import.meta.url),
  'utf8',
);
const nativeEmergency = await readFile(
  new URL('../supabase/migrations/20261024160000_add_native_emergency_core.sql', import.meta.url),
  'utf8',
);
const liveTrackSessions = await readFile(
  new URL('../supabase/migrations/20261028120000_add_live_track_sessions.sql', import.meta.url),
  'utf8',
);
const runner = await readFile(new URL('../scripts/db.mjs', import.meta.url), 'utf8');
const bootstrap = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
const compose = await readFile(new URL('../docker-compose.yml', import.meta.url), 'utf8');

test('database migration preflights inconsistent rows and aborts rather than deleting them', () => {
  assert.match(migration, /duplicate device records exist/);
  assert.match(migration, /device auto-lock values need review/);
  assert.match(migration, /alert counts need review/);
  assert.match(migration, /live tracking records need review/);
  assert.match(migration, /validate constraint alert_counts_consistent/i);
  assert.doesNotMatch(migration, /delete\s+from\s+public\.(devices|alert_logs)\b/i);
  assert.match(migration, /delete from public\.live_tracks where updated_at < now\(\) - interval '24 hours'/i);
});

test('live tracking base migration creates a missing table before hardening and denies direct access', () => {
  assert.ok(
    '20261017100000' < '20261018103000',
    'the base table migration must run before the hardening migration',
  );
  const baseTablePreflight = runner.match(/const hasCoreTables = query\(`([\s\S]*?)`\)/);
  assert.ok(baseTablePreflight, 'the migration runner must preflight core application tables');
  assert.match(baseTablePreflight[1], /public\.devices/);
  assert.match(baseTablePreflight[1], /public\.alert_logs/);
  assert.doesNotMatch(baseTablePreflight[1], /public\.live_tracks/);
  assert.match(liveTracksBase, /create table if not exists public\.live_tracks/i);
  assert.match(liveTracksBase, /user_id uuid references auth\.users\(id\) on delete cascade/i);
  assert.match(liveTracksBase, /enable row level security/i);
  assert.match(liveTracksBase, /revoke all on public\.live_tracks from public, anon, authenticated/i);
});

test('tracking migration restricts writes to authenticated owners and validates location inputs', () => {
  assert.match(migration, /add column if not exists user_id uuid references auth\.users\(id\) on delete cascade/i);
  assert.match(migration, /orphaned live tracking owners need review/);
  assert.match(migration, /auth\.uid\(\) is null/);
  assert.match(migration, /where public\.live_tracks\.user_id is null or public\.live_tracks\.user_id = auth\.uid\(\)/);
  assert.match(migration, /revoke all on function public\.push_track[\s\S]*?from public, anon/i);
  assert.match(migration, /grant execute on function public\.get_track[\s\S]*?to anon, authenticated/i);
  assert.match(migration, /p_lat < -90 or p_lat > 90/);
  assert.match(migration, /p_lng < -180 or p_lng > 180/);
});

test('live share sessions get unguessable tokens and only authenticated users can create them', () => {
  assert.match(liveTrackSessions, /create or replace function public\.start_track/i);
  assert.match(liveTrackSessions, /auth\.uid\(\) is null/);
  assert.match(liveTrackSessions, /replace\(gen_random_uuid\(\)::text, '-', ''\)/);
  assert.match(liveTrackSessions, /insert into public\.live_tracks \(token, user_id, lat, lng, accuracy, updated_at\)/);
  assert.match(liveTrackSessions, /p_lat < -90 or p_lat > 90/);
  assert.match(liveTrackSessions, /p_lng < -180 or p_lng > 180/);
  assert.match(liveTrackSessions, /revoke all on function public\.start_track[\s\S]*?from public, anon, authenticated/i);
  assert.match(liveTrackSessions, /grant execute on function public\.start_track[\s\S]*?to authenticated/i);
  assert.match(bootstrap, /create or replace function public\.start_track/i);
  assert.match(bootstrap, /grant execute on function public\.start_track[\s\S]*?to authenticated/i);
});

test('migration runner backs up and verifies before a locked, checksummed transaction', () => {
  assert.match(runner, /pg_dump/);
  assert.match(runner, /pg_restore', \['--list'/);
  assert.match(runner, /createHash\('sha256'\)/);
  assert.match(runner, /pg_advisory_xact_lock/);
  assert.match(runner, /begin;[\s\S]*\$\{migrationBody\(sql\)\}[\s\S]*insert into panic_ring_private\.schema_migrations[\s\S]*commit;/);
  assert.ok(runner.includes(".replace(/(^|\\n)\\s*begin\\s*;\\s*/i, '$1')"));
  assert.ok(runner.includes(".replace(/\\s*commit\\s*;\\s*$/i, '')"));
  assert.match(runner, /\$\{migrationBody\(sql\)\}/);
  assert.match(runner, /Migration and rollback commands make and validate a full backup first/);
});

test('rollback is explicitly destructive and restores only a verified backup', () => {
  assert.match(runner, /--confirm-data-loss/);
  assert.match(runner, /Rollback restores the entire database and discards writes since the migration/);
  assert.match(runner, /--clean[\s\S]*--single-transaction/);
  assert.match(runner, /pre-migration backup is missing; rollback stopped/);
});

test('fresh bootstrap is transactional and Docker uses that same canonical schema', () => {
  assert.match(bootstrap, /bootstrap the current schema/i);
  assert.match(bootstrap, /\bbegin;/i);
  assert.match(bootstrap, /commit;\s*$/i);
  assert.doesNotMatch(bootstrap, /drop column if exists (pin_hash|decoy_hash)/i);
  assert.ok(compose.includes('./supabase/schema.sql:/docker-entrypoint-initdb.d/99-panic-ring-schema.sql'));
});

test('native emergency data is owner-protected and live tracking can be revoked', () => {
  assert.match(nativeEmergency, /create table if not exists public\.trusted_contacts/i);
  assert.match(nativeEmergency, /phone_number ~ /);
  assert.match(nativeEmergency, /trusted_contacts_owner[\s\S]*?auth\.uid\(\) = user_id/);
  assert.match(nativeEmergency, /create table if not exists public\.emergency_sessions/i);
  assert.match(nativeEmergency, /where status = 'active'/);
  assert.match(nativeEmergency, /create table if not exists public\.emergency_location_updates/i);
  assert.match(nativeEmergency, /references public\.emergency_sessions \(id, user_id\) on delete cascade/i);
  assert.match(nativeEmergency, /emergency_locations_active_insert[\s\S]*?s\.status = 'active'/);
  assert.match(nativeEmergency, /revoke all on public\.emergency_location_updates from public, anon, authenticated/i);
  assert.match(nativeEmergency, /delete from public\.live_tracks[\s\S]*?user_id = auth\.uid\(\)/);
  assert.match(nativeEmergency, /grant execute on function public\.stop_track\(text\) to authenticated/i);
  assert.match(nativeEmergency, /Migration verification failed: anonymous emergency data access is enabled/);
  assert.match(runner, /emergency location RLS/);
  assert.match(runner, /anonymous emergency table access denied/);
});

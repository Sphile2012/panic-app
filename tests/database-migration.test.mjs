import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const migration = await readFile(
  new URL('../supabase/migrations/20261018103000_harden_panic_ring.sql', import.meta.url),
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

test('migration runner backs up and verifies before a locked, checksummed transaction', () => {
  assert.match(runner, /pg_dump/);
  assert.match(runner, /pg_restore', \['--list'/);
  assert.match(runner, /createHash\('sha256'\)/);
  assert.match(runner, /pg_advisory_xact_lock/);
  assert.match(runner, /begin;[\s\S]*\$\{sql\}[\s\S]*insert into panic_ring_private\.schema_migrations[\s\S]*commit;/);
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
  assert.ok(compose.includes('./supabase/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql'));
});

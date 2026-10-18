import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chmod, mkdir, readFile, readdir, realpath, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationDirectory = path.join(root, 'supabase', 'migrations');
const postconditionSql = `
select 'devices RLS|' || coalesce((select relrowsecurity::text from pg_class where oid = to_regclass('public.devices')), 'false')
union all select 'alert log RLS|' || coalesce((select relrowsecurity::text from pg_class where oid = to_regclass('public.alert_logs')), 'false')
union all select 'live track RLS|' || coalesce((select relrowsecurity::text from pg_class where oid = to_regclass('public.live_tracks')), 'false')
union all select 'device ownership policy|' || exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'devices' and policyname = 'devices_owner'
    and qual like '%auth.uid()%' and with_check like '%auth.uid()%'
)::text
union all select 'alert ownership policy|' || exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'alert_logs' and policyname = 'alertlogs_owner'
    and qual like '%auth.uid()%' and with_check like '%auth.uid()%'
)::text
union all select 'PIN hashes removed from database|' || (not exists (
  select 1 from pg_attribute
  where attrelid = to_regclass('public.devices') and attname in ('pin_hash', 'decoy_hash')
    and not attisdropped
))::text
union all select 'device/user foreign key|' || exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.devices') and confrelid = to_regclass('auth.users') and contype = 'f'
)::text
union all select 'alert/user foreign key|' || exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.alert_logs') and confrelid = to_regclass('auth.users') and contype = 'f'
)::text
union all select 'location/user foreign key|' || exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.live_tracks') and confrelid = to_regclass('auth.users') and contype = 'f'
)::text
union all select 'unique user/device index|' || exists (
  select 1 from pg_indexes where schemaname = 'public' and indexname = 'devices_user_device_uidx'
)::text
union all select 'user alert timeline index|' || exists (
  select 1 from pg_indexes where schemaname = 'public' and indexname = 'alertlogs_user_fired_idx'
)::text
union all select 'alert statistics view|' || (to_regclass('public.alert_stats') is not null)::text
union all select 'authenticated tracking write|' || has_function_privilege(
  'authenticated', to_regprocedure('public.push_track(text,double precision,double precision,real,smallint,boolean)'), 'EXECUTE'
)::text
union all select 'anonymous tracking write denied|' || (not has_function_privilege(
  'anon', to_regprocedure('public.push_track(text,double precision,double precision,real,smallint,boolean)'), 'EXECUTE'
))::text
union all select 'anonymous tracking read|' || has_function_privilege('anon', to_regprocedure('public.get_track(text)'), 'EXECUTE')::text
union all select 'anonymous direct location access denied|' || (not has_table_privilege(
  'anon', to_regclass('public.live_tracks'), 'SELECT'
))::text
union all select 'validated device check|' || coalesce((
  select convalidated::text from pg_constraint
  where conrelid = to_regclass('public.devices') and conname = 'devices_auto_lock_range'
), 'false')
union all select 'validated alert checks|' || (
  select count(*) = 3 from pg_constraint
  where conrelid = to_regclass('public.alert_logs')
    and conname in ('alert_logs_contact_count_check', 'alert_counts_nonnegative', 'alert_counts_consistent')
    and convalidated
)::text
union all select 'validated tracking checks|' || (
  select count(*) = 5 from pg_constraint
  where conrelid = to_regclass('public.live_tracks')
    and conname in (
      'live_tracks_token_check', 'live_tracks_lat_check', 'live_tracks_lng_check',
      'live_tracks_accuracy_check', 'live_tracks_battery_check'
    )
    and convalidated
)::text
`;
const backupDirectory = path.resolve(
  process.env.DATABASE_BACKUP_DIR || path.join(os.homedir(), '.panic-ring', 'database-backups'),
);
const connectionString = process.env.DATABASE_URL;

function showUsage() {
  console.log(`Panic Ring database tools

Usage:
  node scripts/db.mjs check
  node scripts/db.mjs migrate
  node scripts/db.mjs rollback <version> --confirm-data-loss

Requires PostgreSQL client tools (psql, pg_dump, pg_restore) and DATABASE_URL.
Migration and rollback commands make and validate a full backup first.
`);
}

function safeErrorText(text) {
  return text
    .replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, '[redacted database URL]')
    .replace(/\beyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g, '[redacted token]')
    .slice(-2400);
}

function runTool(name, args, extraEnv = {}, input) {
  const result = spawnSync(name, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: undefined, PGDATABASE: connectionString, PGCONNECT_TIMEOUT: '10', ...extraEnv },
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
    input,
  });
  if (result.error)
    throw new Error(`${name} is required but could not be started. Install PostgreSQL client tools and retry.`);
  if (result.status !== 0) {
    const detail = safeErrorText(result.stderr || result.stdout || '');
    throw new Error(`${name} failed${result.status === null ? '' : ` (exit ${result.status})`}.${detail ? `\n${detail}` : ''}`);
  }
  return result.stdout.trim();
}

function requireDatabaseUrl() {
  if (!connectionString)
    throw new Error('DATABASE_URL is required. Use a direct PostgreSQL connection string; do not commit it.');
  let url;
  try {
    url = new URL(connectionString);
  }
  catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.pathname || url.pathname === '/')
    throw new Error('DATABASE_URL must identify a PostgreSQL database.');
  if (!['localhost', '127.0.0.1', '::1', 'db'].includes(url.hostname) &&
      !['require', 'verify-ca', 'verify-full'].includes(url.searchParams.get('sslmode'))) {
    throw new Error('Remote DATABASE_URL must enable TLS with sslmode=require or stronger.');
  }
}

function migrationChecksum(sql) {
  return createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
}

async function ensureBackupDirectory() {
  await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
  if (process.platform !== 'win32')
    await chmod(backupDirectory, 0o700);
  const directory = await realpath(backupDirectory);
  const repository = await realpath(root);
  if (directory === repository || directory.startsWith(`${repository}${path.sep}`))
    throw new Error('Database backups must be outside the repository.');
  return directory;
}

async function makeBackup(label) {
  const directory = await ensureBackupDirectory();
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const backupPath = path.join(directory, `${label}-before-${stamp}.dump`);
  runTool('pg_dump', ['--format=custom', '--no-owner', '--no-privileges', `--file=${backupPath}`]);
  if (process.platform !== 'win32')
    await chmod(backupPath, 0o600);
  const backupStat = await stat(backupPath);
  if (backupStat.size < 100)
    throw new Error('Database backup was empty or incomplete; migration was not started.');
  runTool('pg_restore', ['--list', backupPath]);
  console.log(`[database] Verified full backup: ${backupPath}`);
  return backupPath;
}

function query(sql) {
  return runTool('psql', ['--no-psqlrc', '--tuples-only', '--no-align', '--set=ON_ERROR_STOP=1', '--command', sql]);
}

function verifyDatabase() {
  const rows = query(postconditionSql).split(/\r?\n/).filter(Boolean);
  const failed = [];
  for (const row of rows) {
    const separator = row.lastIndexOf('|');
    const label = row.slice(0, separator);
    const passed = row.slice(separator + 1) === 'true';
    console.log(`[database] ${passed ? 'OK' : 'FAIL'} ${label}`);
    if (!passed)
      failed.push(label);
  }
  if (failed.length)
    throw new Error(`Database integrity checks failed: ${failed.join(', ')}`);
}

async function appliedMigration(version) {
  const tableExists = query(`select to_regclass('panic_ring_private.schema_migrations') is not null`);
  if (tableExists !== 't')
    return null;
  const row = query(`select version || '|' || checksum
    from panic_ring_private.schema_migrations
    where version = '${version}'`);
  if (!row)
    return null;
  const separator = row.indexOf('|');
  return { version: row.slice(0, separator), checksum: row.slice(separator + 1) };
}

async function discoverMigrations() {
  const names = await readdir(migrationDirectory);
  const migrations = [];
  for (const name of names.sort()) {
    const match = /^(\d{14})_[a-z0-9_]+\.sql$/.exec(name);
    if (match)
      migrations.push({ version: match[1], sql: await readFile(path.join(migrationDirectory, name), 'utf8') });
  }
  if (!migrations.length)
    throw new Error('No versioned database migrations were found.');
  return migrations;
}

async function migrate() {
  const hasBaseTables = query(`select
    to_regclass('public.devices') is not null
    and to_regclass('public.alert_logs') is not null
    and to_regclass('public.live_tracks') is not null`);
  if (hasBaseTables !== 't')
    throw new Error('The application tables are missing. Initialize an empty database with supabase/schema.sql before using the upgrade migration.');

  for (const migration of await discoverMigrations()) {
    const { version, sql } = migration;
    const checksum = migrationChecksum(sql);
    const applied = await appliedMigration(version);
    if (applied) {
      if (applied.checksum !== checksum)
        throw new Error(`Migration ${version} was already applied with a different checksum.`);
      console.log(`[database] Migration ${version} is already applied.`);
      continue;
    }

    const backupPath = await makeBackup(version);
    const transaction = `
begin;
select pg_advisory_xact_lock(hashtext('panic-ring-database-migrations'));
create schema if not exists panic_ring_private;
revoke all on schema panic_ring_private from public, anon, authenticated;
create table if not exists panic_ring_private.schema_migrations (
  version text primary key,
  checksum text not null,
  applied_at timestamptz not null default now()
);
revoke all on panic_ring_private.schema_migrations from public, anon, authenticated;
${sql}
insert into panic_ring_private.schema_migrations (version, checksum)
values ('${version}', '${checksum}')
on conflict (version) do nothing;
commit;
`;
    let committed = false;
    try {
      runTool(
        'psql',
        ['--no-psqlrc', '--set=ON_ERROR_STOP=1', '--file=-'],
        { PGOPTIONS: '-c lock_timeout=10s -c statement_timeout=15min' },
        transaction,
      );
      committed = true;
      verifyDatabase();
    }
    catch (error) {
      const outcome = committed ? 'The migration committed but verification failed.' : 'The migration transaction was rolled back.';
      throw new Error(`${error.message}\n${outcome} The verified recovery backup is ${backupPath}.`);
    }
    console.log(`[database] Migration ${version} applied successfully.`);
  }
  verifyDatabase();
}

async function rollback(version, confirmed) {
  if (!/^\d{14}$/.test(version || '') ||
      !(await discoverMigrations()).some(migration => migration.version === version))
    throw new Error(`Unknown migration version: ${version || '(missing)'}.`);
  if (!confirmed)
    throw new Error('Rollback restores the entire database and discards writes since the migration. Re-run with --confirm-data-loss only after reviewing the impact.');
  const applied = await appliedMigration(version);
  if (!applied)
    throw new Error(`Migration ${version} is not recorded as applied.`);
  const latestVersion = query('select max(version) from panic_ring_private.schema_migrations');
  if (latestVersion !== version)
    throw new Error(`Only the latest applied migration (${latestVersion}) can be rolled back first.`);

  const directory = await ensureBackupDirectory();
  const names = await readdir(directory);
  const backupName = names
    .filter(name => name.startsWith(`${version}-before-`) && name.endsWith('.dump'))
    .sort()
    .at(-1);
  if (!backupName)
    throw new Error('The verified pre-migration backup is missing; rollback stopped.');
  const backupPath = path.join(directory, backupName);
  runTool('pg_restore', ['--list', backupPath]);
  await makeBackup(`before-rollback-${version}`);
  runTool('pg_restore', ['--clean', '--if-exists', '--no-owner', '--no-privileges', '--exit-on-error', '--single-transaction', backupPath]);
  console.log(`[database] Restored the verified pre-migration backup for ${version}.`);
}

async function main() {
  const [command, version, flag] = process.argv.slice(2);
  if (!command || command === 'help' || command === '--help') {
    showUsage();
    return;
  }
  if (!['check', 'migrate', 'rollback'].includes(command))
    throw new Error(`Unknown database command: ${command}`);

  requireDatabaseUrl();
  if (command === 'check') {
    runTool('psql', ['--no-psqlrc', '--set=ON_ERROR_STOP=1', '--command', 'select 1']);
    console.log('[database] Connection check passed.');
    verifyDatabase();
    return;
  }
  if (command === 'migrate') {
    await migrate();
    return;
  }
  await rollback(version, flag === '--confirm-data-loss');
}

main().catch(error => {
  console.error(`[database] ${error.message}`);
  process.exitCode = 1;
});

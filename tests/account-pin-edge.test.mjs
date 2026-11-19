import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const migration = await readFile(
  new URL('../supabase/migrations/20261022130000_harden_pin_edge_functions.sql', import.meta.url),
  'utf8',
);
const setup = await readFile(new URL('../supabase/functions/pin-setup/index.ts', import.meta.url), 'utf8');
const accountPinScreen = await readFile(new URL('../src/screens/accountPin.ts', import.meta.url), 'utf8');
const accountPinScreenRuntime = await readFile(new URL('../src/screens/accountPin.js', import.meta.url), 'utf8');
const recoveryScreen = await readFile(new URL('../src/screens/setup.ts', import.meta.url), 'utf8');
const recoveryStorage = await readFile(new URL('../src/storage.ts', import.meta.url), 'utf8');
const verify = await readFile(new URL('../supabase/functions/pin-verify/index.ts', import.meta.url), 'utf8');
const change = await readFile(new URL('../supabase/functions/pin-change/index.ts', import.meta.url), 'utf8');
const status = await readFile(new URL('../supabase/functions/pin-status/index.ts', import.meta.url), 'utf8');
const databaseRunner = await readFile(new URL('../scripts/db.mjs', import.meta.url), 'utf8');
const database = await readFile(new URL('../src/db.ts', import.meta.url), 'utf8');
const databaseRuntime = await readFile(new URL('../src/db.js', import.meta.url), 'utf8');
const bootstrap = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8');

test('PIN hashes are inaccessible to public roles and setup storage is service-role only', () => {
  assert.match(migration, /revoke all on public\.user_pins, public\.security_questions from public, anon, authenticated/);
  assert.match(migration, /alter table public\.user_pins enable row level security/);
  assert.match(migration, /alter table public\.security_questions enable row level security/);
  assert.match(migration, /store_account_pin_setup/);
  assert.match(migration, /grant execute on function public\.store_account_pin_setup[^;]*to service_role/);
  assert.match(setup, /rpc\('store_account_pin_setup'/);
  assert.doesNotMatch(setup, /\.from\('user_pins'\)[\s\S]*?\.insert\(/);
  assert.doesNotMatch(setup, /\.from\('security_questions'\)[\s\S]*?\.insert\(/);
});

test('PIN and security-answer failures use atomic lockout updates', () => {
  assert.match(migration, /create or replace function public\.record_pin_failure/);
  assert.match(migration, /failed_attempts = least\(failed_attempts \+ 1, 20\)/);
  assert.match(migration, /when failed_attempts \+ 1 >= 5 then now\(\) \+ interval '15 minutes'/);
  assert.match(verify, /rpc\('record_pin_failure'/);
  assert.match(verify, /rpc\('clear_pin_failures'/);
  assert.match(change, /rpc\('record_pin_failure'/);
  assert.match(change, /locked_until/);
});

test('PIN changes require recent Supabase authentication and normalized answers', () => {
  assert.match(change, /payload\.auth_time/);
  assert.match(change, /Date\.now\(\) \/ 1000 - 300/);
  assert.match(change, /answer\.normalize\('NFKC'\)/);
  assert.match(change, /bcrypt\.compare/);
  assert.match(change, /failed_attempts: 0/);
  assert.match(change, /locked_until: null/);
  assert.doesNotMatch(change, /rpc\('clear_pin_failures'/);
  assert.match(change, /body\.new_pin1 !== body\.confirm_pin1/);
  assert.match(change, /body\.new_pin2 !== body\.confirm_pin2/);
});

test('PIN setup requires recent authentication and verification reports counter reset failures', () => {
  assert.match(setup, /payload\.auth_time/);
  assert.match(setup, /Date\.now\(\) \/ 1000 - 300/);
  assert.match(setup, /hasRecentAuthentication\(req\.headers\.get\('Authorization'\)\)/);
  assert.match(verify, /const \{ error: clearError \} = await supabaseAdmin\.rpc\('clear_pin_failures'/);
  assert.match(verify, /if \(clearError\)[\s\S]*?status: 503[\s\S]*?success: false/);
});

test('setup validates PIN confirmations and status exposes no credential hashes', () => {
  assert.match(setup, /body\.pin1 !== body\.confirm_pin1/);
  assert.match(setup, /body\.pin2 !== body\.confirm_pin2/);
  assert.match(status, /auth\.getUser\(\)/);
  assert.match(status, /question1_id, question2_id/);
  assert.doesNotMatch(status, /pin1_hash|pin2_hash|answer_hash/);
  assert.match(status, /Cache-Control': 'no-store'/);
  assert.match(status, /Boolean\(pin\) !== Boolean\(questions\)/);
  assert.match(status, /configured: Boolean\(pin\)/);
});

test('existing device PINs are connected without asking the user to create or confirm another pair', () => {
  for (const screen of [accountPinScreen, accountPinScreenRuntime]) {
    assert.match(screen, /const hasExistingDevicePins = Boolean\(publicData\.pin\)/);
    assert.match(screen, /hasExistingDevicePins \? 'Connect your existing PINs' : 'Create your account PINs'/);
    assert.match(screen, /hasExistingDevicePins \? 'Existing first PIN' : 'First PIN', !hasExistingDevicePins/);
    assert.match(screen, /hasExistingDevicePins \? first : read\(root, 'pin-one-confirm'\)/);
    assert.match(screen, /if \(!hasExistingDevicePins && \(first !== firstConfirm \|\| second !== secondConfirm\)\)/);
    assert.match(screen, /!publicData\.decoyPin \|\| await hashPin\(first\) !== publicData\.pin \|\| await hashPin\(second\) !== publicData\.decoyPin/);
  }
});

test('PIN backup and recovery calls use the configured Supabase client proxy', () => {
  for (const source of [database, databaseRuntime]) {
    assert.match(source, /setupAccountPins\(/);
    assert.match(source, /verifyAccountPins\(pin1, pin2\)/);
    assert.match(source, /changeAccountPins\(/);
    assert.doesNotMatch(source, /EDGE_FUNCTION_URL|fetch\(`\$\{EDGE_FUNCTION_URL\}/);
  }
});

test('fresh database bootstrap includes locked-down PIN tables and service-role RPCs', () => {
  assert.match(bootstrap, /create table if not exists public\.user_pins/);
  assert.match(bootstrap, /create table if not exists public\.security_questions/);
  assert.match(bootstrap, /alter table public\.user_pins enable row level security/);
  assert.match(bootstrap, /alter table public\.security_questions enable row level security/);
  assert.match(bootstrap, /revoke all on public\.user_pins, public\.security_questions from public, anon, authenticated/);
  assert.match(bootstrap, /grant execute on function public\.store_account_pin_setup[^;]*to service_role/);
  assert.match(bootstrap, /grant execute on function public\.record_pin_failure[^;]*to service_role/);
  assert.match(bootstrap, /grant execute on function public\.clear_pin_failures[^;]*to service_role/);
});

test('PIN Edge Functions restrict methods and advertise CORS methods', () => {
  for (const source of [setup, change, verify]) {
    assert.match(source, /'Access-Control-Allow-Methods': 'POST, OPTIONS'/);
    assert.match(source, /if \(req\.method !== 'POST'\)/);
    assert.match(source, /status: 405/);
  }
  assert.match(status, /'Access-Control-Allow-Methods': 'GET, OPTIONS'/);
  assert.match(status, /if \(request\.method !== 'GET'\)/);
});

test('security answers may be shorter than eight characters but cannot be blank', () => {
  for (const source of [setup, accountPinScreen, recoveryScreen, recoveryStorage]) {
    assert.doesNotMatch(source, /answer[^\n]*length\s*<\s*8|length\s*<\s*8[^\n]*answer/i);
  }
  assert.match(setup, /!body\.question1_answer\.trim\(\)/);
  assert.match(accountPinScreen, /!answer1\.trim\(\)/);
  assert.match(recoveryScreen, /!answerOne\.value\.trim\(\)/);
  assert.match(recoveryStorage, /answers\.some\(answer => !answer\.trim\(\)\)/);
  assert.doesNotMatch(accountPinScreen, /id="pin-answer-one"[^>]*minlength=/);
  assert.doesNotMatch(recoveryScreen, /id="recovery-answer-one"[^>]*minlength=/);
});

test('database verification checks PIN table isolation and service-role RPC grants', () => {
  assert.match(databaseRunner, /PIN credential tables have RLS/);
  assert.match(databaseRunner, /PIN credential tables inaccessible to app roles/);
  assert.match(databaseRunner, /PIN setup RPC restricted to service role/);
  assert.match(databaseRunner, /PIN lockout RPC restricted to service role/);
});

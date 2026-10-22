import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const migration = await readFile(
  new URL('../supabase/migrations/20261022130000_harden_pin_edge_functions.sql', import.meta.url),
  'utf8',
);
const setup = await readFile(new URL('../supabase/functions/pin-setup/index.ts', import.meta.url), 'utf8');
const accountPinScreen = await readFile(new URL('../src/screens/accountPin.ts', import.meta.url), 'utf8');
const recoveryScreen = await readFile(new URL('../src/screens/setup.ts', import.meta.url), 'utf8');
const recoveryStorage = await readFile(new URL('../src/storage.ts', import.meta.url), 'utf8');
const verify = await readFile(new URL('../supabase/functions/pin-verify/index.ts', import.meta.url), 'utf8');
const change = await readFile(new URL('../supabase/functions/pin-change/index.ts', import.meta.url), 'utf8');
const status = await readFile(new URL('../supabase/functions/pin-status/index.ts', import.meta.url), 'utf8');
const databaseRunner = await readFile(new URL('../scripts/db.mjs', import.meta.url), 'utf8');

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
  assert.match(change, /rpc\('clear_pin_failures'/);
  assert.match(change, /body\.new_pin1 !== body\.confirm_pin1/);
  assert.match(change, /body\.new_pin2 !== body\.confirm_pin2/);
});

test('setup validates PIN confirmations and status exposes no credential hashes', () => {
  assert.match(setup, /body\.pin1 !== body\.confirm_pin1/);
  assert.match(setup, /body\.pin2 !== body\.confirm_pin2/);
  assert.match(status, /auth\.getUser\(\)/);
  assert.match(status, /question1_id, question2_id/);
  assert.doesNotMatch(status, /pin1_hash|pin2_hash|answer_hash/);
  assert.match(status, /Cache-Control': 'no-store'/);
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

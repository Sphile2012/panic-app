import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const emailAuth = await readFile(new URL('../src/screens/emailAuth.ts', import.meta.url), 'utf8');
const database = await readFile(new URL('../src/db.ts', import.meta.url), 'utf8');
const settings = await readFile(new URL('../src/screens/settings.ts', import.meta.url), 'utf8');
const dashboard = await readFile(new URL('../dashboard.html', import.meta.url), 'utf8');
const dashboardScript = await readFile(new URL('../src/dashboard.ts', import.meta.url), 'utf8');

test('signup and sign-in request email links without password fields', () => {
  assert.match(emailAuth, /sendEmailAuthLink\(email, 'signup', fullName\)/);
  assert.match(emailAuth, /sendEmailAuthLink\(email, 'login'\)/);
  assert.doesNotMatch(emailAuth, /type=["']password|passwordInput|passwordEl/);
  assert.doesNotMatch(dashboard, /type="password"|d-li-pw|d-su-pw|d-su-cf/);
  assert.doesNotMatch(dashboardScript, /signInWithPassword|signUp\(email,\s*\w+\s*,|signIn\(email,\s*\w+\s*\)/);
});

test('email links create accounts only for signup and use the reauth callback for PIN changes', () => {
  assert.match(database, /auth\.signInWithOtp\(/);
  assert.match(database, /shouldCreateUser: purpose === 'signup'/);
  assert.match(database, /purpose === 'reauth' \? 'reauth' : undefined/);
  assert.match(database, /sendEmailAuthLink\(email, 'reauth'\)/);
  assert.doesNotMatch(database, /signInWithPassword/);
  assert.doesNotMatch(settings, /account-change-password|reauthenticate\(/);
  assert.match(settings, /sendReauthenticationLink\(/);
});

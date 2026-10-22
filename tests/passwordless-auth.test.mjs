import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const emailAuth = await readFile(new URL('../src/screens/emailAuth.ts', import.meta.url), 'utf8');
const database = await readFile(new URL('../src/db.ts', import.meta.url), 'utf8');
const settings = await readFile(new URL('../src/screens/settings.ts', import.meta.url), 'utf8');
const dashboard = await readFile(new URL('../dashboard.html', import.meta.url), 'utf8');
const dashboardScript = await readFile(new URL('../src/dashboard.ts', import.meta.url), 'utf8');

test('signup and sign-in request and verify email codes without password fields', () => {
  assert.match(emailAuth, /sendEmailAuthOtp\(email, 'signup', fullName\)/);
  assert.match(emailAuth, /sendEmailAuthOtp\(email, 'login'\)/);
  assert.match(emailAuth, /verifyEmailOtp\(pendingEmail, code\.value\)/);
  assert.match(emailAuth, /autocomplete="one-time-code"/);
  assert.doesNotMatch(emailAuth, /type=["']password|passwordInput|passwordEl/);
  assert.doesNotMatch(dashboard, /type="password"|d-li-pw|d-su-pw|d-su-cf/);
  assert.doesNotMatch(dashboardScript, /signInWithPassword|signUp\(email,\s*\w+\s*,|signIn\(email,\s*\w+\s*\)/);
});

test('email codes create accounts only for signup and reauthenticate sensitive PIN changes', () => {
  assert.match(database, /auth\.signInWithOtp\(/);
  assert.match(database, /auth\.verifyOtp\(\{ email, token: token\.trim\(\), type: 'email' \}\)/);
  assert.match(database, /shouldCreateUser: purpose === 'signup'/);
  assert.doesNotMatch(database, /emailRedirectTo/);
  assert.match(database, /sendEmailAuthOtp\(email, 'reauth'\)/);
  assert.match(settings, /verifyEmailOtp\(email, code\)/);
  assert.doesNotMatch(database, /signInWithPassword/);
  assert.doesNotMatch(settings, /account-change-password|reauthenticate\(/);
  assert.match(settings, /sendReauthenticationCode\(/);
  assert.match(dashboardScript, /sendEmailAuthOtp\(email, 'login'\)/);
  assert.match(dashboardScript, /verifyEmailOtp\(loginEmail, code\.value\)/);
});

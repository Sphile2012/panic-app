import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const emailAuth = await readFile(new URL('../src/screens/emailAuth.ts', import.meta.url), 'utf8');
const database = await readFile(new URL('../src/db.ts', import.meta.url), 'utf8');
const dashboardSource = await readFile(new URL('../src/dashboard.ts', import.meta.url), 'utf8');
const settings = await readFile(new URL('../src/screens/settings.ts', import.meta.url), 'utf8');
const settingsRuntime = await readFile(new URL('../src/screens/settings.js', import.meta.url), 'utf8');
const dashboard = await readFile(new URL('../dashboard.html', import.meta.url), 'utf8');
const dashboardScript = await readFile(new URL('../src/dashboard.ts', import.meta.url), 'utf8');

test('signup verifies email before setting a password and sign-in supports passwords and email codes', () => {
  assert.match(emailAuth, /sendEmailAuthOtp\(email, 'signup', fullName\)/);
  assert.match(emailAuth, /sendEmailAuthOtp\(email, 'login'\)/);
  assert.match(emailAuth, /verifyEmailOtp\(pendingEmail, code\.value\)/);
  assert.match(emailAuth, /setAuthenticatedPassword\(pendingPassword\)/);
  assert.match(emailAuth, /passwordInput\.value\.length < 8/);
  assert.match(emailAuth, /passwordInput\.value !== passwordConfirmInput\.value/);
  assert.match(emailAuth, /signInWithPassword\(email, passwordInput\.value\)/);
  assert.match(emailAuth, /formatAuthError\(result\.error, 'password'\)/);
  assert.match(emailAuth, /formatAuthError\(result\.error, 'otp'\)/);
  assert.match(emailAuth, /store\.getState\(\)\.pinHash\s*\?/);
  assert.match(emailAuth, /Unlock this device with its PIN \(offline only\)/);
  assert.match(emailAuth, /btn-local-pin.*store\.navigateTo\('calculator'\)/s);
  assert.match(emailAuth, /autocomplete="one-time-code"/);
  assert.match(dashboard, /id="d-li-password" type="password"/);
  assert.match(dashboard, /id="d-su-password" type="password"/);
  assert.match(dashboardScript, /signInWithPassword/);
  assert.match(dashboardScript, /formatAuthError\(error, 'password'\)/);
  assert.match(dashboardScript, /formatAuthError\(result\.error, 'otp'\)/);
});

test('email codes create accounts only for signup and reauthenticate sensitive PIN changes', () => {
  assert.match(database, /auth\.signInWithOtp\(/);
  assert.match(database, /auth\.verifyOtp\(\{ email: verifiedEmail, token: token\.trim\(\), type: 'email' \}\)/);
  assert.match(database, /shouldCreateUser: purpose === 'signup'/);
  assert.doesNotMatch(database, /emailRedirectTo/);
  assert.match(database, /sendEmailAuthOtp\(email, 'reauth'\)/);
  assert.match(settings, /verifyEmailOtp\(email, code\)/);
  assert.match(database, /auth\.signInWithPassword\(\{ email: verifiedEmail, password \}\)/);
  assert.match(database, /auth\.updateUser\(\{ password \}\)/);
  assert.doesNotMatch(settings, /account-change-password|reauthenticate\(/);
  assert.match(settings, /sendReauthenticationCode\(/);
  assert.match(settings, /formatAuthError\(result\.error, 'otp'\)/);
  assert.match(settingsRuntime, /formatAuthError\(result\.error, 'otp'\)/);
  assert.match(dashboardScript, /sendEmailAuthOtp\(email, 'login'\)/);
  assert.match(dashboardScript, /verifyEmailOtp\(loginEmail, code\.value\)/);
});

test('email account access requires a syntactically valid, OTP-verified inbox in every signup surface', () => {
  assert.match(database, /const verifiedEmail = resolveIdentifier\(email\)/);
  assert.match(database, /auth\.verifyOtp\(\{ email: verifiedEmail, token: token\.trim\(\), type: 'email' \}\)/);
  assert.match(emailAuth, /Verify it with the code we send to activate your account/);
  assert.match(dashboardSource, /resolveIdentifier\(suEmailEl\.value\)/);
  assert.match(dashboardSource, /verifyEmailOtp\(signupEmail, code\.value\)/);
  assert.match(dashboardSource, /setAuthenticatedPassword\(signupPassword\)/);
  assert.match(dashboardSource, /signInWithPassword\(email, liPasswordEl\.value\)/);
  assert.match(dashboardSource, /Passwords do not match/);
});

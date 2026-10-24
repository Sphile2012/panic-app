import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const emailAuth = await readFile(new URL('../src/screens/emailAuth.ts', import.meta.url), 'utf8');
const database = await readFile(new URL('../src/db.ts', import.meta.url), 'utf8');
const dashboardSource = await readFile(new URL('../src/dashboard.ts', import.meta.url), 'utf8');
const settings = await readFile(new URL('../src/screens/settings.ts', import.meta.url), 'utf8');
const settingsRuntime = await readFile(new URL('../src/screens/settings.js', import.meta.url), 'utf8');
const pinSetup = await readFile(new URL('../src/screens/setup.ts', import.meta.url), 'utf8');
const appState = await readFile(new URL('../src/state.ts', import.meta.url), 'utf8');
const dashboard = await readFile(new URL('../dashboard.html', import.meta.url), 'utf8');
const mainApp = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');

test('the app exposes PIN-only access, with no email or password dashboard', () => {
  assert.match(emailAuth, /Sign in with your 4-digit PIN/);
  assert.match(emailAuth, /Login with PIN/);
  assert.match(emailAuth, /Create PINs/);
  assert.match(emailAuth, /store\.navigateTo\(hasPinStored \? 'calculator' : 'setup-pin'\)/);
  assert.match(emailAuth, /store\.navigateTo\('setup-pin'\)/);
  assert.doesNotMatch(mainApp, /renderSignup|renderLogin/);
  assert.doesNotMatch(dashboard, /d-li-email|d-su-email|d-li-password|d-su-password/);
  assert.match(dashboard, /http-equiv="refresh" content="0;url=\/"/);
  assert.match(dashboard, /window\.location\.replace/);
  assert.doesNotMatch(dashboard, /dashboard\.js|dashboard\.ts/);
});

test('backend email auth uses verification while PIN changes use local recovery questions', () => {
  assert.match(database, /auth\.signInWithOtp\(/);
  assert.match(database, /auth\.verifyOtp\(\{ email: verifiedEmail, token: token\.trim\(\), type: 'email' \}\)/);
  assert.match(database, /shouldCreateUser: purpose === 'signup'/);
  assert.doesNotMatch(database, /emailRedirectTo/);
  assert.match(database, /sendEmailAuthOtp\(email, 'reauth'\)/);
  assert.match(database, /auth\.signInWithPassword\(\{ email: verifiedEmail, password \}\)/);
  assert.match(database, /auth\.updateUser\(\{ password \}\)/);
  assert.match(settings, /id="change-answer-one"/);
  assert.match(settings, /id="change-answer-two"/);
  assert.match(settings, /store\.recoverPins\(/);
  assert.match(settings, /PIN confirmations do not match/);
  assert.doesNotMatch(settings, /verifyEmailOtp|sendReauthenticationCode|reauthenticate\(/);
  assert.match(settingsRuntime, /store\.recoverPins\(/);
  assert.match(dashboardSource, /sendEmailAuthOtp\(email, 'login'\)/);
  assert.match(dashboardSource, /verifyEmailOtp\(loginEmail, code\.value\)/);
});

test('PIN setup and updates require confirmation and reject repeated digits', () => {
  assert.match(pinSetup, /id="pin-confirm"/);
  assert.match(pinSetup, /id="decoy-confirm"/);
  assert.match(pinSetup, /hasDistinctPinDigits\(pin\)/);
  assert.match(pinSetup, /hasDistinctPinDigits\(decoy\)/);
  assert.match(settings, /id="new-pin-confirm"/);
  assert.match(settings, /id="new-decoy-confirm"/);
  assert.match(settings, /hasDistinctPinDigits\(p\)/);
  assert.match(settings, /store\.recoverPins\(/);
  assert.match(appState, /new Set\(pin\)\.size === pin\.length/);
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

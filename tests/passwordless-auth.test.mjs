import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const emailAuth = await readFile(new URL('../src/screens/emailAuth.ts', import.meta.url), 'utf8');
const emailAuthRuntime = await readFile(new URL('../src/screens/emailAuth.js', import.meta.url), 'utf8');
const termsScreen = await readFile(new URL('../src/screens/terms.ts', import.meta.url), 'utf8');
const termsScreenRuntime = await readFile(new URL('../src/screens/terms.js', import.meta.url), 'utf8');
const database = await readFile(new URL('../src/db.ts', import.meta.url), 'utf8');
const dashboardSource = await readFile(new URL('../src/dashboard.ts', import.meta.url), 'utf8');
const settings = await readFile(new URL('../src/screens/settings.ts', import.meta.url), 'utf8');
const settingsRuntime = await readFile(new URL('../src/screens/settings.js', import.meta.url), 'utf8');
const pinSetup = await readFile(new URL('../src/screens/setup.ts', import.meta.url), 'utf8');
const pinSetupRuntime = await readFile(new URL('../src/screens/setup.js', import.meta.url), 'utf8');
const appState = await readFile(new URL('../src/state.ts', import.meta.url), 'utf8');
const appStateRuntime = await readFile(new URL('../src/state.js', import.meta.url), 'utf8');
const dashboard = await readFile(new URL('../dashboard.html', import.meta.url), 'utf8');
const mainApp = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
const mainRuntime = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const liveScreen = await readFile(new URL('../src/screens/live.ts', import.meta.url), 'utf8');
const liveRuntime = await readFile(new URL('../src/screens/live.js', import.meta.url), 'utf8');

test('the app exposes PIN-only access, with no email or password dashboard', () => {
  assert.match(emailAuth, /welcome\.pinHint/);
  assert.match(emailAuth, /welcome\.login/);
  assert.match(emailAuth, /welcome\.new[\s\S]*?welcome\.signup/);
  assert.match(emailAuth, /splash-signup[\s\S]*?store\.navigateTo\('signup'\)/);
  assert.match(mainApp, /case 'signup':[\s\S]*?renderSignup\(appRoot\)/);
  assert.doesNotMatch(dashboard, /d-li-email|d-su-email|d-li-password|d-su-password/);
  assert.match(dashboard, /http-equiv="refresh" content="0;url=\/"/);
  assert.match(dashboard, /window\.location\.replace/);
  assert.doesNotMatch(dashboard, /dashboard\.js|dashboard\.ts/);
});

test('signup continues into PIN confirmation and recovery-question setup regardless of saved local PIN data', () => {
  for (const source of [pinSetup, pinSetupRuntime]) {
    const pinSetupScreen = source.match(/export function renderSetupPin[\s\S]*?(?=\nexport function renderSetupProfile)/)?.[0];
    assert.ok(pinSetupScreen);
    assert.doesNotMatch(pinSetupScreen, /already protected|already set up|account already exists/i);
    assert.match(pinSetupScreen, /id="pin-confirm"/);
    assert.match(pinSetupScreen, /id="decoy-confirm"/);
    assert.doesNotMatch(pinSetupScreen, /navigateTo\('calculator'\)|sendEmailAuthOtp|verifyEmailOtp/);
  }
  assert.match(pinSetup, /id="recovery-question-one"/);
  assert.match(pinSetup, /id="recovery-question-two"/);
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

test('restored Supabase sessions initialize the app auth state used by Live Map', () => {
  for (const source of [mainApp, mainRuntime]) {
    assert.match(source, /void store\.initAuth\(\)/);
  }
  for (const source of [appState, appStateRuntime]) {
    assert.match(source, /isAuthenticated:\s*false/);
    assert.match(source, /isPinUnlocked:\s*true/);
    assert.match(source, /isAuthenticated:\s*isAuthenticated \|\| this\.state\.isPinUnlocked/);
    assert.match(source, /async savePin\([\s\S]*?isFirstRun: false,[\s\S]*?isPinUnlocked: true,[\s\S]*?isAuthenticated: true/);
    assert.match(source, /event === 'INITIAL_SESSION'/);
    assert.match(source, /restoreSession/);
  }
  for (const source of [liveScreen, liveRuntime]) {
    assert.match(source, /let isAuthenticated = store\.getState\(\)\.isAuthenticated/);
    assert.match(source, /\$\{isAuthenticated\s*\?/);
    assert.match(source, /state\.isAuthenticated !== isAuthenticated/);
  }
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

test('signup collects the requested details and continues to PIN confirmation without passwords or OTP', () => {
  for (const source of [emailAuth, emailAuthRuntime]) {
    assert.match(source, /splash-signup[\s\S]*?store\.navigateTo\('signup'\)/);
    for (const fieldId of ['su-name', 'su-surname', 'su-dob', 'su-phone', 'su-email', 'su-province', 'su-country', 'su-address']) {
      assert.match(source, new RegExp(`id="${fieldId}"`));
    }
    assert.match(source, /id="su-detect-location"/);
    assert.match(source, /id="su-terms" type="checkbox"[^>]*required/);
    assert.match(source, /id="su-terms-link"/);
    assert.match(source, /Read Terms and Conditions/);
    assert.match(source, /store\.navigateTo\('terms'\)/);
    assert.match(source, /Please agree to the Terms and Conditions to continue/);
    assert.match(source, /syncSignupDraft\(\)/);
    assert.match(source, /pendingSignupProfile = \{/);
    assert.match(source, /store\.navigateTo\('setup-pin'\)/);
    assert.doesNotMatch(source.match(/export function renderSignup[\s\S]*?(?=\nexport function renderLogin)/)?.[0] ?? '', /sendEmailAuthOtp|verifyEmailOtp|type="password"|otp-code/i);
  }
  assert.match(mainApp, /case 'signup':[\s\S]*?renderSignup\(appRoot\)/);
  assert.match(pinSetup, /id="pin-confirm"/);
  assert.match(pinSetup, /id="decoy-confirm"/);
  assert.match(pinSetup, /id="recovery-question-one"/);
  assert.match(pinSetup, /id="recovery-question-two"/);
  assert.doesNotMatch(pinSetup, /sendEmailAuthOtp|verifyEmailOtp|setAuthenticatedPassword/);
  assert.match(termsScreen, /store\.navigateBack\(\)/);
  assert.match(termsScreenRuntime, /store\.navigateBack\(\)/);
});

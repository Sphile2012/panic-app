import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const menu = await readFile(new URL('../src/menu.js', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/screens/app.js', import.meta.url), 'utf8');
const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const welcome = await readFile(new URL('../src/screens/emailAuth.js', import.meta.url), 'utf8');
const safetyPlan = await readFile(new URL('../src/screens/safetyPlan.js', import.meta.url), 'utf8');
const storage = await readFile(new URL('../src/storage.js', import.meta.url), 'utf8');

test('hamburger and More open the same full menu without subscriptions, smartwatch, or Find My Phone', () => {
  assert.match(app, /bindImmediateActivation\(root\.querySelector(?:<HTMLButtonElement>)?\('#btn-menu'\), openMenu\)/);
  assert.match(app, /button\.addEventListener\('pointerdown'/);
  assert.match(app, /button\.addEventListener\('click'[\s\S]*?event\.detail === 0/);
  assert.match(app, /root\.querySelector\('#btn-open-menu'\)\.addEventListener\('click', openMoreMenu\)/);
  assert.doesNotMatch(app, /querySelector\('#btn-profile'\)|querySelector\('#btn-disguise'\)/);
  const bottomNav = app.match(/<nav class="app-bottom-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? '';
  assert.equal([...bottomNav.matchAll(/<button\b/g)].length, 3);
  assert.match(bottomNav, /data-bottom-nav="contacts"[\s\S]*?<span>\$\{t\('nav\.circle'\)\}<\/span>/);
  assert.match(bottomNav, /id="btn-open-menu"[\s\S]*?<span>\$\{t\('nav\.more'\)\}<\/span>/);
  assert.match(bottomNav, /data-bottom-nav="change-pins"[\s\S]*?<span>\$\{t\('nav\.changePin'\)\}<\/span>/);
  assert.match(bottomNav, /<svg[\s\S]*?aria-hidden="true"/);
  assert.match(app, /store\.navigateTo\(button\.dataset\['bottomNav'\] \?\? 'app'\)/);
  assert.doesNotMatch(bottomNav, />\s*Home\s*</);
  assert.match(menu, /export function openMoreMenu\(\)/);
  assert.doesNotMatch(menu, /screen: '(?:subscriptions|watch|location)'/);
  assert.match(menu, /screen: 'journey', label: t\('menu\.journey'\)/);
  assert.match(menu, /screen: 'fakecall', label: t\('menu\.fakecall'\)/);
  assert.match(menu, /screen: 'guide', label: t\('menu\.guide'\)/);
  assert.match(menu, /<details class="side-menu-disguise">[\s\S]*?<summary>[\s\S]*?Disguise screen[\s\S]*?DISGUISE_OPTIONS\.map/);
  assert.match(menu, /class="side-menu-close"[^>]*aria-label="\$\{t\('common\.close'\)\}"[\s\S]*?<svg[\s\S]*?<path d="m6 6 12 12M18 6 6 18"/);
  assert.doesNotMatch(menu, /side-menu-nav-controls|data-history=|side-menu-cancel/);
  assert.match(menu, /id="side-menu-theme-toggle"[\s\S]*?Day mode/);
  assert.match(menu, /applyAppearance\(appearance\)/);
});

test('welcome login uses a local PIN without requiring email or password', () => {
  const screen = welcome.match(/export function renderWelcome\(root\) \{[\s\S]*?(?=\nexport function renderSignup)/)?.[0] ?? '';
  assert.match(screen, /store\.navigateTo\(hasPinStored \? 'calculator' : 'setup-pin'\)/);
  assert.match(screen, /id="splash-panic-message"[^>]*>Please log in to use the app\.<\/p>/);
  assert.doesNotMatch(screen, /type="email"|type="password"|email\/password/);
  assert.match(main, /case 'location':\s*renderLocation\(appRoot\)/);
  assert.match(main, /case 'watch':\s*renderWatch\(appRoot\)/);
});

test('safety plan stores a safe word and exposes the safe-word screen', () => {
  assert.match(storage, /safeWord:\s*''/);
  assert.match(safetyPlan, /safe-word[\s\S]*?Safe word|Safe word[\s\S]*?safe-word/);
  assert.match(safetyPlan, /safeWord:\s*get\('safe-word'\)/);
  assert.match(main, /case 'safe-word':\s*renderSafeWord\(appRoot\)/);
});

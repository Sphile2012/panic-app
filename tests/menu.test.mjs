import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const menu = await readFile(new URL('../src/menu.js', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/screens/app.js', import.meta.url), 'utf8');
const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const welcome = await readFile(new URL('../src/screens/emailAuth.js', import.meta.url), 'utf8');

test('hamburger and More open the same full menu without subscriptions, smartwatch, or Find My Phone', () => {
  assert.match(app, /root\.querySelector\('#btn-menu'\)\.addEventListener\('click', openMenu\)/);
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

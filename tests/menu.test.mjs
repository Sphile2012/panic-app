import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const menu = await readFile(new URL('../src/menu.js', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/screens/app.js', import.meta.url), 'utf8');
const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');

test('three-line menu includes Find My Phone and Smartwatch without Subscriptions', () => {
  assert.match(app, /root\.querySelector\('#btn-menu'\)\.addEventListener\('click', openMenu\)/);
  assert.match(app, /root\.querySelector\('#btn-open-menu'\)\.addEventListener\('click', openMenu\)/);
  assert.match(menu, /screen: 'location', label: 'Find My Phone'/);
  assert.match(menu, /screen: 'watch', label: t\('menu\.watch'\)/);
  assert.match(menu, /screen: 'journey', label: t\('menu\.journey'\)/);
  assert.match(menu, /screen: 'fakecall', label: t\('menu\.fakecall'\)/);
  assert.doesNotMatch(menu, /subscription/i);
  assert.match(main, /case 'location':\s*renderLocation\(appRoot\)/);
  assert.match(main, /case 'watch':\s*renderWatch\(appRoot\)/);
});

test('side menu adapts to narrow and short screens with a scrollable item list', () => {
  assert.match(styles, /\.side-menu-body\s*\{[^}]*min-height:\s*0;[^}]*overflow:\s*auto;/s);
  assert.match(styles, /@media\s*\(max-width:\s*360px\)\s*\{[^}]*\.side-menu/);
  assert.match(styles, /@media\s*\(max-height:\s*560px\)\s*\{[^}]*\.side-menu/);
  assert.match(styles, /padding:\s*10px 12px max\(14px,\s*env\(safe-area-inset-bottom\)\)/);
});

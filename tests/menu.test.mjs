import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const menu = await readFile(new URL('../src/menu.js', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/screens/app.js', import.meta.url), 'utf8');
const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

test('hamburger and More open the same menu with the requested safety destinations', () => {
  assert.match(app, /root\.querySelector\('#btn-menu'\)\.addEventListener\('click', openMenu\)/);
  assert.match(app, /root\.querySelector\('#btn-open-menu'\)\.addEventListener\('click', openMenu\)/);
  assert.match(app, /id="btn-open-menu"[^>]*>More<\/button>/);
  assert.match(menu, /screen: 'location', label: 'Find My Phone'/);
  assert.match(menu, /screen: 'journey', label: t\('menu\.journey'\)/);
  assert.match(menu, /screen: 'fakecall', label: t\('menu\.fakecall'\)/);
  assert.match(menu, /screen: 'watch', label: t\('menu\.watch'\)/);
  assert.match(menu, /screen: 'guide', label: t\('menu\.guide'\)/);
  assert.match(main, /case 'location':\s*renderLocation\(appRoot\)/);
  assert.match(main, /case 'watch':\s*renderWatch\(appRoot\)/);
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const menuScreen = await readFile(new URL('../src/menu.ts', import.meta.url), 'utf8');
const menuRuntime = await readFile(new URL('../src/menu.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');

test('disguise screen options are controlled by an accessible dropdown arrow', () => {
  for (const source of [menuScreen, menuRuntime]) {
    assert.match(source, /<details class="side-menu-disguise">/);
    assert.match(source, /<summary>[\s\S]*?Disguise screen[\s\S]*?<\/summary>/);
    assert.match(source, /DISGUISE_OPTIONS\.map/);
    assert.match(source, /data-disguise="\$\{option\.id\}"/);
  }

  assert.match(styles, /\.side-menu-disguise summary \{/);
});

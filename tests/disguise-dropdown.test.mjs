import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const appScreen = await readFile(new URL('../src/screens/app.ts', import.meta.url), 'utf8');
const appRuntime = await readFile(new URL('../src/screens/app.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');

test('disguise screen options are controlled by an accessible dropdown arrow', () => {
  for (const source of [appScreen, appRuntime]) {
    assert.match(source, /<details class="disguise-dropdown" open>/);
    assert.match(source, /<summary class="disguise-sheet-title">Choose disguise screen<\/summary>/);
    assert.match(source, /DISGUISE_OPTIONS\.map/);
    assert.match(source, /data-disguise="\$\{d\.id\}"/);
  }

  assert.match(styles, /\.disguise-sheet-title::after/);
  assert.match(styles, /\.disguise-dropdown:not\(\[open\]\) \.disguise-sheet-title::after/);
});

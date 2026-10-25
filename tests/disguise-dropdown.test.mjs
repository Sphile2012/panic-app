import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const appScreen = await readFile(new URL('../src/screens/app.ts', import.meta.url), 'utf8');
const appRuntime = await readFile(new URL('../src/screens/app.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');

test('disguise screen options are controlled by an accessible dropdown arrow', () => {
  for (const source of [appScreen, appRuntime]) {
    assert.match(source, /<details class="disguise-dropdown" open>/);
    assert.match(source, /<summary class="disguise-sheet-title">[\s\S]*?Choose disguise screen[\s\S]*?<\/summary>/);
    assert.match(source, /<button class="disguise-backdrop" id="disguise-backdrop"[^>]*hidden><\/button>/);
    assert.match(source, /src="\/favicon\.svg"/);
    assert.match(source, /class="app-quick-arrow"/);
    assert.match(source, /DISGUISE_OPTIONS\.map/);
    assert.match(source, /data-disguise="\$\{d\.id\}"/);
    assert.match(source, /dashboard-trusted-circle--hidden/);
  }

  assert.match(styles, /\.disguise-sheet-title::after/);
  assert.match(styles, /\.disguise-dropdown:not\(\[open\]\) \.disguise-sheet-title::after/);
  assert.match(styles, /\.disguise-sheet \{\s*position: fixed;/);
  assert.match(styles, /\.disguise-sheet--open \{\s*transform: translate\(-50%, 0\)/);
  assert.match(styles, /\.app-screen \.dashboard-trusted-circle--hidden \{ display: none; \}/);
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const theme = await readFile(new URL('../src/theme.ts', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');

test('dark mode is the default and side decoration is global and non-interactive', () => {
  assert.match(theme, /const DEFAULT = \{\s*mode: 'dark'/);
  assert.match(styles, /body::before,\s*body::after\s*\{[\s\S]*?position: fixed;[\s\S]*?pointer-events: none;/);
  assert.match(styles, /\.phone-frame::before,\s*\.phone-frame::after\s*\{[\s\S]*?pointer-events: none;/);
  assert.match(styles, /\[data-theme="dark"\] body\s*\{[\s\S]*?#100e18;/);
});

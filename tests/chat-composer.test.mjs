import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const chatTs = await readFile(new URL('../src/screens/chat.ts', import.meta.url), 'utf8');
const chatJs = await readFile(new URL('../src/screens/chat.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');

test('assistant chat has a visible flexible typing area beside a compact send button', () => {
  for (const source of [chatTs, chatJs]) {
    assert.match(source, /<textarea class="text-input chat-input" id="chat-input"/);
    assert.match(source, /placeholder="\$\{esc\(t\('chat\.placeholder'\)\)\}"/);
  }
  assert.match(css, /\.chat-screen \.chat-form \.chat-input\s*\{[^}]*width:\s*auto;[^}]*flex:\s*1 1 0;/s);
  assert.match(css, /\.chat-screen \.chat-form \.chat-input::placeholder\s*\{[^}]*opacity:\s*1;/s);
  assert.match(css, /\.chat-screen \.chat-send\s*\{[^}]*width:\s*auto;[^}]*min-width:\s*76px;/s);
});

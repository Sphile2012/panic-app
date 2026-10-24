import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const i18n = await readFile(new URL('../src/i18n.ts', import.meta.url), 'utf8');
const i18nRuntime = await readFile(new URL('../src/i18n.js', import.meta.url), 'utf8');
const database = await readFile(new URL('../src/db.ts', import.meta.url), 'utf8');
const databaseRuntime = await readFile(new URL('../src/db.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');
const welcome = await readFile(new URL('../src/screens/emailAuth.ts', import.meta.url), 'utf8');

test('language selection uses an accessible dropdown with a visible arrow and all supported languages', () => {
  for (const source of [i18n, i18nRuntime]) {
    assert.match(source, /<select class="lang-select"[^>]*data-language-select/);
    assert.match(source, /LANGS\.map\(l => `<option value="\$\{l\.code\}"/);
    assert.match(source, /addEventListener\('change'/);
    assert.match(source, /setLang\(selected\.code\)/);
    assert.doesNotMatch(source, /data-lang=/);
    assert.match(source, /code: 'xh', label: 'isiXhosa'/);
  }
  assert.match(welcome, /languageBarHtml\(\)/);
  assert.match(styles, /\.lang-select\s*\{[\s\S]*background-image:[\s\S]*background-repeat:\s*no-repeat/);
  assert.match(styles, /\.lang-select:focus-visible/);
});

test('browser database client uses only the same-origin Netlify API proxy', () => {
  for (const source of [database, databaseRuntime]) {
    assert.match(source, /const ACCOUNT_API_URL = `\$\{window\.location\.origin\}\/api`/);
    assert.match(source, /createClient\(ACCOUNT_API_URL, API_PROXY_KEY/);
    assert.match(source, /export const DB_CONFIGURED = AUTH_ENABLED \|\| import\.meta\.env\.DEV/);
    assert.doesNotMatch(source, /LEGACY_CLIENT_CONFIGURED|VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY|https:\/\/[^`'"]+\.supabase\.co/);
  }
});

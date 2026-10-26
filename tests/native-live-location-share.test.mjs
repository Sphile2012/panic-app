import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = await readFile(new URL('../mobile/app/live-location.tsx', import.meta.url), 'utf8');

test('native WhatsApp drafts target one selected trusted contact without scheme probing', () => {
  assert.match(source, /\.select\('id, name, phone'\)/);
  assert.match(source, /\.eq\('trusted', true\)/);
  assert.match(source, /whatsappUrl = `https:\/\/wa\.me\/\$\{number\}\?text=/);
  assert.match(source, /contacts\.map\(\(contact\) =>/);
  assert.match(source, /onPress=\{\(\) => void shareViaWhatsApp\(contact\)\}/);
  assert.doesNotMatch(source, /whatsapp:\/\/send|Linking\.canOpenURL/);
  assert.match(source, /SMS\.sendSMSAsync\(recipients, message\)/);
  assert.match(source, /contacts\.map\(c => c\.phone\)/);
  assert.match(source, /Review and send it in the messaging app/);
});

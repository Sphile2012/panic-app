import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const sources = await Promise.all([
  readFile(new URL('../src/screens/pages.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/screens/pages.js', import.meta.url), 'utf8'),
]);

test('journey planner includes destination, duration, followers, and SMS/WhatsApp sharing', () => {
  for (const source of sources) {
    assert.match(source, /id="j-destination"/);
    assert.match(source, /type="range" min="5" max="480"/);
    assert.match(source, /FOLLOWER CONTACTS/);
    assert.match(source, /name="j-followers"/);
    assert.match(source, /contact\.notificationChannel === 'whatsapp'/);
    assert.match(source, /whatsappUri\(contact\.phone, message\)/);
    assert.match(source, /smsUri\(contact\.phone, message\)/);
    assert.match(source, /Choose a contact to open a message/);
    assert.match(source, /My last known location:/);
    assert.match(source, /if \(!destination\)/);
  }
});

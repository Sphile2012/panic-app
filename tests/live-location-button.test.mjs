import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const liveScreen = await readFile(new URL('../src/screens/live.ts', import.meta.url), 'utf8');
const liveRuntime = await readFile(new URL('../src/screens/live.js', import.meta.url), 'utf8');
const tracking = await readFile(new URL('../src/tracking.ts', import.meta.url), 'utf8');

test('live location button requests location and does not start camera capture', () => {
  for (const source of [liveScreen, liveRuntime]) {
    assert.match(source, /void startTracking\(\)/);
    assert.doesNotMatch(source, /startEvidenceCapture|evidence\.js/);
    assert.match(source, /<button[^>]+data-live-contact=/);
    assert.match(source, /root\.querySelectorAll(?:<[^>]+>)?\([^)]*data-live-contact/);
    assert.match(source, /smsUri\(contact\.phone, linkBody\)/);
  }

  assert.match(tracking, /const INTERVAL_MS = 10_000/);
  assert.match(tracking, /navigator\.geolocation\.getCurrentPosition/);
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const liveScreen = await readFile(new URL('../src/screens/live.ts', import.meta.url), 'utf8');
const liveRuntime = await readFile(new URL('../src/screens/live.js', import.meta.url), 'utf8');
const tracking = await readFile(new URL('../src/tracking.ts', import.meta.url), 'utf8');

test('live location button requests location and does not start camera capture', () => {
  for (const source of [liveScreen, liveRuntime]) {
    assert.match(source, /void startTracking\(\)/);
    assert.match(source, /class="screen live-location-screen"/);
    assert.match(source, /class="live-location-status" role="status" aria-live="polite"/);
    assert.match(source, /t\('trk\.off'\)/);
    assert.match(source, /t\('trk\.enable'\)/);
    assert.match(source, /Last location update:/);
    assert.doesNotMatch(source, /last\.lat\.toFixed|last\.lng\.toFixed/);
    assert.doesNotMatch(source, /startEvidenceCapture|evidence\.js/);
    assert.match(source, /<button[^>]+data-live-contact=/);
    assert.match(source, /<a[^>]+data-live-whatsapp=/);
    assert.match(source, /data-share-sms=/);
    assert.match(source, /root\.querySelectorAll(?:<[^>]+>)?\([^)]*data-share-sms/);
    assert.match(source, /scheduleSmsFallback\(locationShareBody\)/);
    assert.match(source, /No SMS app opened/);
    assert.match(source, /live-copy-message/);
    assert.match(source, /root\.querySelectorAll(?:<[^>]+>)?\([^)]*data-live-contact/);
    assert.match(source, /smsUri\(contact\.phone, linkBody\)/);
    assert.match(source, /whatsappUri\(c\.phone, linkBody\)/);
    assert.match(source, /Please call the police now \(SAPS 10111\)/);
    assert.match(source, /Open last GPS fix in Google Maps/);
    assert.match(source, /href="\$\{mapUrl\}"/);
    assert.match(source, /err === 'auth'/);
    assert.match(source, /err === 'auth' \? mapUrl : null/);
    assert.match(source, /Share GPS via SMS/);
    assert.match(source, /GPS captured; live link sync unavailable/);
    assert.doesNotMatch(source, /id="btn-live-login"/);
    assert.match(source, /err === null \? trackUrl\(\) : err === 'auth' \? mapUrl : null/);
    assert.match(source, /: mapsUrl\(last\)/);
    assert.match(source, /My last known location is here: \$\{link\} \(this map is not live tracking\)/);
    assert.match(source, /Waiting for a GPS fix before sharing a location/);
  }

  assert.match(tracking, /const INTERVAL_MS = 10_000/);
  assert.match(tracking, /navigator\.geolocation\.getCurrentPosition/);
});

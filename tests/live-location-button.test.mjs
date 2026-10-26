import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const liveScreen = await readFile(new URL('../src/screens/live.ts', import.meta.url), 'utf8');
const liveRuntime = await readFile(new URL('../src/screens/live.js', import.meta.url), 'utf8');
const appScreen = await readFile(new URL('../src/screens/app.ts', import.meta.url), 'utf8');
const appRuntime = await readFile(new URL('../src/screens/app.js', import.meta.url), 'utf8');
const tracking = await readFile(new URL('../src/tracking.ts', import.meta.url), 'utf8');

test('app menu button opens the full side menu and preserves the More action', () => {
  for (const source of [appScreen, appRuntime]) {
    assert.match(source, /aria-label="Open app menu"/);
    assert.match(source, /title="Open app menu"/);
    assert.match(source, /<path d="M4 6h16M4 12h16M4 18h16"\/>/);
    assert.match(source, /root\.querySelector\('#btn-menu'\)\.addEventListener\('click', openMenu\)/);
    assert.match(source, /id="btn-open-menu"[^>]*aria-label="\$\{t\('nav\.more'\)\}"[\s\S]*?<span>\$\{t\('nav\.more'\)\}<\/span>/);
    assert.match(source, /root\.querySelector\('#btn-open-menu'\)\.addEventListener\('click', openMoreMenu\)/);
    assert.match(source, /id="btn-hold"/);
    assert.match(source, /id="btn-quick-checkin"[^>]*>[\s\S]*?Check-in timer/);
    assert.match(source, /root\.querySelector\('#btn-quick-checkin'\)\?\.addEventListener/);
    assert.doesNotMatch(source, /store\.navigateTo\('live'\);\s*void startTracking\(\)/);
    assert.doesNotMatch(source, /Quick access|dashboard-grid|dashboard-trusted-circle/);
  }
});

test('live location button requests location and does not start camera capture', () => {
  for (const source of [liveScreen, liveRuntime]) {
    assert.match(source, /void startTracking\(\)/);
    assert.match(source, /getLocation\(12000\)/);
    assert.match(source, /capturedLocation =/);
    assert.doesNotMatch(source, /btn-share-location'\)\?\.addEventListener\('click', \(\) => \{\s*void startTracking/);
    assert.match(source, /class="screen live-location-screen"/);
    assert.match(source, /class="live-location-status" role="status" aria-live="polite"/);
    assert.match(source, /t\('trk\.off'\)/);
    assert.match(source, /t\('trk\.enable'\)/);
    assert.match(source, /Last location update:/);
    assert.match(source, /GPS coordinates: \$\{last\.lat\.toFixed\(6\)\}, \$\{last\.lng\.toFixed\(6\)\}/);
    assert.match(source, /Nearby mapped address \(approximate\):/);
    assert.doesNotMatch(source, /startEvidenceCapture|evidence\.js/);
    assert.match(source, /<button[^>]+data-live-contact=/);
    assert.match(source, /<a[^>]+data-live-whatsapp=/);
    assert.doesNotMatch(source, /data-share-whatsapp="[^"]+"[^>]*target="_blank"/);
    assert.doesNotMatch(source, /data-live-whatsapp="[^"]+"[^>]*target="_blank"/);
    assert.match(source, /data-share-sms=/);
    assert.match(source, /whatsappUri\(contact\.phone, locationShareBody\)/);
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
    assert.match(source, /Share GPS via SMS/);
    assert.match(source, /GPS captured; live link sync unavailable/);
    assert.doesNotMatch(source, /id="btn-live-login"/);
    assert.match(source, /on && err === null \? trackUrl\(\) : mapUrl/);
    assert.match(source, /: mapsUrl\(last\)/);
    assert.match(source, /My latest GPS fix is here: \$\{mapUrl\} \(not live tracking\)/);
    assert.match(source, /Waiting for a GPS fix before sharing a location/);
  }

  assert.match(tracking, /const INTERVAL_MS = 10_000/);
  assert.match(tracking, /navigator\.geolocation\.getCurrentPosition/);
});

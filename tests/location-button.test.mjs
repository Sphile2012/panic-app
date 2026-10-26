import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const locationScreen = await readFile(new URL('../src/screens/location.ts', import.meta.url), 'utf8');
const locationRuntime = await readFile(new URL('../src/screens/location.js', import.meta.url), 'utf8');
const alertService = await readFile(new URL('../src/alertService.ts', import.meta.url), 'utf8');
const storage = await readFile(new URL('../src/storage.ts', import.meta.url), 'utf8');
const netlifyConfig = await readFile(new URL('../netlify.toml', import.meta.url), 'utf8');

test('location screen shows and refreshes live position only after an explicit user action', () => {
  for (const source of [locationScreen, locationRuntime]) {
    assert.match(source, /id="btn-live-toggle"/);
    assert.match(source, />Allow location<\/button>/);
    assert.match(source, /liveToggle\.addEventListener\('click'/);
    assert.match(source, /id="btn-deny-location"/);
    assert.match(source, />Deny location<\/button>/);
    assert.match(source, /denyLocation\.addEventListener\('click'/);
    assert.match(source, /locationChoice !== 'allowed'/);
    assert.match(source, /locationChoice = 'denied'/);
    assert.match(source, /Tap Allow location before sharing coordinates/);
    assert.match(source, /navigator\.geolocation\.watchPosition/);
    assert.match(source, /navigator\.geolocation\.clearWatch/);
    assert.match(source, /Live location active/);
    assert.match(source, /state\.screen !== 'location'/);
    assert.match(source, /device Location is turned off/);
    assert.match(source, /id="btn-location-retry"/);
    assert.match(source, /id="location-permission-help"/);
    assert.match(source, /set Location to Allow/);
    assert.match(source, /Camera access is not needed/);
    assert.match(source, /id="btn-camera-start"/);
    assert.match(source, /navigator\.mediaDevices\.getUserMedia/);
    assert.match(source, /id="btn-camera-capture"/);
    assert.match(source, /Photo captured for your review/);
    assert.match(source, /id="btn-photo-share"/);
    assert.match(source, /navigator\.share\(\{ files: \[file\]/);
    assert.match(source, /getTracks\(\)\.forEach\(track => track\.stop\(\)\)/);
    assert.match(source, /geoError\.POSITION_UNAVAILABLE/);
    assert.match(source, /id="btn-share"/);
    assert.match(source, /id="btn-share-whatsapp"/);
    assert.match(source, /id="location-google-maps"/);
    assert.match(source, /maps\.google\.com\/maps\?q=\$\{lat\.toFixed\(6\)\},\$\{lng\.toFixed\(6\)\}&z=16&output=embed/);
    assert.match(source, /Open in Google Maps/);
    assert.doesNotMatch(source, /Current coordinates: \$\{lat\.toFixed/);
    assert.match(source, /shareBtn\.addEventListener\('click'/);
    assert.match(source, /whatsappBtn\.addEventListener\('click'/);
    assert.match(source, /getLocation\(12000\)/);
    assert.match(source, /result\.coords\.latitude/);
    assert.match(source, /store\.setLocationShared\(true, result\.text\)/);
    assert.match(source, /id="location-share-contact"/);
    assert.match(source, /id="btn-share-sms"/);
    assert.match(source, /store\.getState\(\)\.contacts\.find\(item => item\.id === shareContact\.value\)/);
    assert.match(source, /smsUri\(contact\.phone, message\)/);
    assert.match(source, /whatsappUri\(contact\.phone, message\)/);
    assert.match(source, /Review it and tap Send; delivery is not confirmed/);
    assert.doesNotMatch(source, /whatsappUri\('',/);
    assert.doesNotMatch(source, /Jane\s+Doe/);
    assert.doesNotMatch(source, /loc-address-card|loc-address-line|loc-maps-link/);
  }

  assert.match(alertService, /maximumAge:\s*0/);
  assert.match(alertService, /isSecureContext/);
  assert.match(netlifyConfig, /frame-src 'self' https:\/\/www\.openstreetmap\.org https:\/\/maps\.google\.com https:\/\/www\.google\.com/);
  assert.match(netlifyConfig, /Permissions-Policy = "geolocation=\(self\), camera=\(self\)/);
  assert.match(storage, /Please call the police now: SAPS 10111/);
});

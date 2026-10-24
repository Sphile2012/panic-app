import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const locationScreen = await readFile(new URL('../src/screens/location.ts', import.meta.url), 'utf8');
const locationRuntime = await readFile(new URL('../src/screens/location.js', import.meta.url), 'utf8');
const alertService = await readFile(new URL('../src/alertService.ts', import.meta.url), 'utf8');
const netlifyConfig = await readFile(new URL('../netlify.toml', import.meta.url), 'utf8');

test('location screen shows and refreshes live position only after an explicit user action', () => {
  for (const source of [locationScreen, locationRuntime]) {
    assert.match(source, /id="btn-live-toggle"/);
    assert.match(source, /liveToggle\.addEventListener\('click'/);
    assert.match(source, /navigator\.geolocation\.watchPosition/);
    assert.match(source, /navigator\.geolocation\.clearWatch/);
    assert.match(source, /Live location active/);
    assert.match(source, /state\.screen !== 'location'/);
    assert.match(source, /device Location is turned off/);
    assert.match(source, /id="btn-location-retry"/);
    assert.match(source, /geoError\.POSITION_UNAVAILABLE/);
    assert.match(source, /id="btn-share"/);
    assert.match(source, /shareBtn\.addEventListener\('click'/);
    assert.match(source, /getLocation\(12000\)/);
    assert.match(source, /result\.coords\.latitude/);
    assert.match(source, /store\.setLocationShared\(true, result\.text\)/);
    assert.doesNotMatch(source, /loc-address-card|loc-address-line|loc-maps-link/);
  }

  assert.match(alertService, /maximumAge:\s*0/);
  assert.match(alertService, /isSecureContext/);
  assert.match(netlifyConfig, /frame-src 'self' https:\/\/www\.openstreetmap\.org/);
});

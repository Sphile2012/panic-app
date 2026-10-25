import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const trackingSources = await Promise.all([
  readFile(new URL('../src/tracking.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/tracking.js', import.meta.url), 'utf8'),
]);
const liveSources = await Promise.all([
  readFile(new URL('../src/screens/live.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/screens/live.js', import.meta.url), 'utf8'),
]);

test('live location requests GPS immediately and reports browser security limitations', () => {
  for (const source of trackingSources) {
    assert.match(source, /function isSecureLocationContext\(\)/);
    assert.match(source, /window\.isSecureContext/);
    assert.match(source, /hostname\.endsWith\('\.localhost'\)/);
    assert.match(source, /function supportsGeolocation\(\)/);
    assert.match(source, /error = 'insecure'/);
    assert.match(source, /error = 'unsupported'/);
    assert.match(source, /error = 'pending'/);
    assert.match(source, /const firstLocationRequest = tick\(\)/);
    assert.match(source, /void initBattery\(\)\.then\(checkBattery\)/);
    assert.match(source, /if \(tickInProgress\)(?:\s*\{\s*return;?\s*\}|\s*return;)/);
    assert.match(source, /syncError\?\.code === '42501' \? 'auth' : 'network'/);
    assert.match(source, /if \(error === 'auth'\)[\s\S]*?stopTracking\(\)/);
  }

  for (const source of liveSources) {
    assert.match(source, /err === 'pending'/);
    assert.match(source, /err === 'insecure'/);
    assert.match(source, /t\('trk\.requesting'\)/);
    assert.match(source, /t\('trk\.insecure'\)/);
    assert.match(source, /err === 'auth'/);
    assert.match(source, /store\.navigateTo\('welcome'\)/);
  }
});

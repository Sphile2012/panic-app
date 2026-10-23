import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { hasValidCoordinates, isShareableAccuracy, MAX_SHARE_ACCURACY_METERS } from '../src/locationConfig.mjs';

const alertService = await readFile(new URL('../src/alertService.ts', import.meta.url), 'utf8');
const locationScreen = await readFile(new URL('../src/screens/location.ts', import.meta.url), 'utf8');

test('location sharing only accepts valid coordinates with GPS accuracy within 50 metres', () => {
  assert.equal(MAX_SHARE_ACCURACY_METERS, 50);
  assert.equal(hasValidCoordinates(-33.9, 18.4), true);
  assert.equal(hasValidCoordinates(-91, 18.4), false);
  assert.equal(hasValidCoordinates(-33.9, 181), false);
  assert.equal(isShareableAccuracy(50), true);
  assert.equal(isShareableAccuracy(50.1), false);
  assert.equal(isShareableAccuracy(0), false);
  assert.equal(isShareableAccuracy(Number.NaN), false);
});

test('location sharing requests a fresh GPS fix and labels mapped addresses as approximate', () => {
  assert.match(alertService, /maximumAge:\s*0/);
  assert.match(alertService, /hasValidCoordinates\(lat, lng\)/);
  assert.match(alertService, /isShareableAccuracy\(accuracy\)/);
  assert.match(alertService, /Nearby mapped address \(approximate\)/);
  assert.match(locationScreen, /Nearby mapped address/);
  assert.match(locationScreen, /device-reported accuracy/);
});

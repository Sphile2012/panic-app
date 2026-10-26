import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = await readFile(new URL('../mobile/app/live-location.tsx', import.meta.url), 'utf8');
const sosScreen = await readFile(new URL('../mobile/app/sos.tsx', import.meta.url), 'utf8');
const locationAddress = await readFile(new URL('../mobile/src/lib/location-address.ts', import.meta.url), 'utf8');

test('native WhatsApp drafts target a selected circle contact and share the live link', () => {
  assert.match(source, /listTrustedContacts\(\)/);
  assert.match(source, /contact\.display_name/);
  assert.match(source, /contact\.phone_number/);
  assert.match(source, /whatsappUrl = `https:\/\/wa\.me\/\$\{number\}\?text=/);
  assert.match(source, /Live location: \$\{trackingUrl\}/);
  assert.match(source, /contacts\.map\(\(contact\) => contact\.phone_number\)/);
  assert.match(source, /onPress=\{\(\) => void shareViaWhatsApp\(contact\)\}/);
  assert.doesNotMatch(source, /whatsapp:\/\/send|Linking\.canOpenURL/);
  assert.match(source, /SMS\.sendSMSAsync\(contacts\.map\(\(contact\) => contact\.phone_number\), message\)/);
  assert.match(source, /you must review and send it/);
  assert.match(source, /resolveStreetAddress\(location\.latitude, location\.longitude\)/);
  assert.match(source, /Approximate address: \$\{address\}/);
  assert.match(source, /Street address unavailable; GPS coordinates:/);
  assert.match(source, /timeInterval: 10000/);
  assert.match(source, /recordLiveLocation\(activeToken, newLocation\)/);
  assert.match(source, /stopLiveTracking\(token\)/);
  assert.doesNotMatch(source, /from\('live_locations'\)/);
});

test('native SOS SMS includes a resolved address or explicit GPS fallback', () => {
  assert.match(sosScreen, /resolveStreetAddress\(latitude, longitude\)/);
  assert.match(sosScreen, /Approximate address: \$\{location\.address\}/);
  assert.match(sosScreen, /Street address unavailable; GPS coordinates:/);
  assert.match(sosScreen, /Coordinates: \$\{location\.latitude\.toFixed\(6\)\}/);
  assert.match(locationAddress, /Location\.reverseGeocodeAsync/);
  assert.match(locationAddress, /address\.formattedAddress/);
  assert.match(locationAddress, /setTimeout\(\(\) => reject\(new Error\('Street address lookup timed out\.'\)\), 5000\)/);
});

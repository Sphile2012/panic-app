import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  formatCountdown,
  getCountdownSecondsLeft,
  parseCountdownDuration,
} from '../src/screens/disguise/clockTimer.js';

const clockScreen = await readFile(new URL('../src/screens/disguise/clock.js', import.meta.url), 'utf8');

test('clock timer accepts valid MM:SS durations and rejects invalid or empty times', () => {
  assert.equal(parseCountdownDuration('00:01'), 1);
  assert.equal(parseCountdownDuration('01:05'), 65);
  assert.equal(parseCountdownDuration('99:59'), 5999);
  assert.equal(parseCountdownDuration('00:00'), null);
  assert.equal(parseCountdownDuration('01:60'), null);
  assert.equal(parseCountdownDuration('1:05'), null);
  assert.equal(parseCountdownDuration('100:00'), null);
});

test('clock countdown uses the deadline, rounds up partial seconds, and never goes negative', () => {
  assert.equal(getCountdownSecondsLeft(10_000, 0), 10);
  assert.equal(getCountdownSecondsLeft(10_000, 9_001), 1);
  assert.equal(getCountdownSecondsLeft(10_000, 10_000), 0);
  assert.equal(getCountdownSecondsLeft(10_000, 11_000), 0);
});

test('clock countdown formats minutes and seconds consistently', () => {
  assert.equal(formatCountdown(0), '00:00');
  assert.equal(formatCountdown(65), '01:05');
  assert.equal(formatCountdown(-2), '00:00');
});

test('clock screen recalculates from a deadline and clears intervals when it closes', () => {
  assert.match(clockScreen, /countdownDeadline = Date\.now\(\) \+ durationSeconds \* 1000/);
  assert.match(clockScreen, /setInterval\(updateCountdown, 250\)/);
  assert.match(clockScreen, /export function disposeClock/);
  assert.match(clockScreen, /document\.removeEventListener\('visibilitychange', updateCountdown\)/);
  assert.match(clockScreen, /timerMessage\.textContent = t\('c\.clock\.timerDone'\)/);
});

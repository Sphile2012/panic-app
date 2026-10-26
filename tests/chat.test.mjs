import assert from 'node:assert/strict';
import { test } from 'node:test';

globalThis.document = { documentElement: { lang: 'en' } };
const { answer } = await import('../src/chatKnowledge.js');
test('assistant answers app feature questions with concrete navigation steps', () => {
  assert.match(answer('How do I start a check-in timer?'), /15, 30, 60 or 90 minutes/i);
  assert.match(answer('How can I write my safety plan?'), /More > Safety plan/i);
  assert.match(answer('How do I share a journey?'), /Journey Planner/i);
  assert.match(answer('Can I export my notes?'), /tap Export/i);
  assert.match(answer('How do I create a fake call?'), /simulated call/i);
  assert.match(answer('What is the Safety Companion?'), /reviewed information/i);
  assert.match(answer('How do I share evidence photos?'), /device share options.*not automatic/i);
  assert.match(answer('Where do I change the theme?'), /More > Settings/i);
  assert.match(answer('How do I find the menu?'), /hamburger icon/i);
  assert.match(answer('How do I sign out?'), /choose Sign out/i);
});

test('assistant distinguishes emergency contacts from emergency services', () => {
  assert.match(answer('How do I add an emergency contact?'), /trusted people/i);
  assert.match(answer('How do I call an ambulance?'), /10177 ambulance/i);
});

test('assistant does not mistake text inside another word for a greeting', () => {
  assert.match(answer('This feature is not listed'), /documented answer/i);
});

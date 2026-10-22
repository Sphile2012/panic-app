import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatAuthError, SIGNUP_CONFIRMATION_MESSAGE } from '../src/authMessages.js';

test('duplicate account errors are translated into sign-in guidance', () => {
  assert.match(formatAuthError('User already registered'), /signing in with an email link/i);
});

test('email-link authentication and confirmation errors are understandable', () => {
  assert.equal(formatAuthError('Invalid login credentials'), 'Could not authenticate this email. Request a new sign-in link.');
  assert.equal(formatAuthError('email_not_confirmed'), 'Please confirm your email using the link we sent.');
});

test('signup confirmation copy does not reveal whether an account exists', () => {
  assert.equal(SIGNUP_CONFIRMATION_MESSAGE, 'Email sent. Check your inbox for a secure sign-in link.');
});

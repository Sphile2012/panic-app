import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatAuthError, SIGNUP_CONFIRMATION_MESSAGE } from '../src/authMessages.js';

test('duplicate account errors are translated into sign-in guidance', () => {
  assert.match(formatAuthError('User already registered'), /signing in with a verification code/i);
});

test('email-code authentication and confirmation errors are understandable', () => {
  assert.equal(formatAuthError('Invalid login credentials'), 'Could not verify this code. Check it and try again.');
  assert.equal(formatAuthError('email_not_confirmed'), 'Please confirm your email using the code we sent.');
});

test('signup confirmation copy does not reveal whether an account exists', () => {
  assert.equal(SIGNUP_CONFIRMATION_MESSAGE, 'Enter the verification code sent to your email.');
});

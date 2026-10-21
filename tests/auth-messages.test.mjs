import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatAuthError, SIGNUP_CONFIRMATION_MESSAGE } from '../src/authMessages.js';

test('duplicate account errors are translated into sign-in guidance', () => {
  assert.match(formatAuthError('User already registered'), /signing in or resetting your password/i);
});

test('invalid credentials and email confirmation errors are understandable', () => {
  assert.equal(formatAuthError('Invalid login credentials'), 'Email or password is incorrect.');
  assert.equal(formatAuthError('email_not_confirmed'), 'Please confirm your email before signing in.');
});

test('signup confirmation copy does not reveal whether an account exists', () => {
  assert.match(SIGNUP_CONFIRMATION_MESSAGE, /if you already have an account/i);
});

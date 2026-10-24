import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatAuthError, SIGNUP_CONFIRMATION_MESSAGE } from '../src/authMessages.js';

test('duplicate account errors are translated into neutral guidance', () => {
  assert.equal(
    formatAuthError('User already registered'),
    'We could not complete that request. Check your details or try again.',
  );
});

test('email-code authentication and confirmation errors are understandable', () => {
  assert.equal(
    formatAuthError('Invalid login credentials', 'password'),
    'Email or password is incorrect. Check your details or sign in with an email code.',
  );
  assert.equal(
    formatAuthError('Token has expired or is invalid', 'otp'),
    'This code is invalid or expired. Request a new code and try again.',
  );
  assert.equal(
    formatAuthError('Invalid login credentials', 'otp'),
    'This code is invalid or expired. Request a new code and try again.',
  );
  assert.equal(formatAuthError('email_not_confirmed'), 'Please confirm your email using the code we sent.');
});

test('signup confirmation copy does not reveal whether an account exists', () => {
  assert.equal(SIGNUP_CONFIRMATION_MESSAGE, 'Enter the code we sent to your email to continue.');
});

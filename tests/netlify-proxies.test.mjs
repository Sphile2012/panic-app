import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { handler as supabaseProxy } from '../netlify/functions/supabase-proxy.mjs';
import { handler as what3wordsProxy } from '../netlify/functions/what3words.mjs';
import {
  getFrontendRedirectUrl,
  isRecoverySessionValid,
  parseRecoveryLink,
  resolveIdentifier,
} from '../src/authConfig.mjs';
import { readFile } from 'node:fs/promises';

const originalFetch = globalThis.fetch;
const originalEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  WHAT3WORDS_API_KEY: process.env.WHAT3WORDS_API_KEY,
};

beforeEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.WHAT3WORDS_API_KEY;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined)
      delete process.env[key];
    else
      process.env[key] = value;
  }
});

test('Supabase proxy uses the configured public project defaults when deployment variables are missing', async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url: new URL(url), options };
    return new Response('{"external":{"email":true},"disable_signup":false}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const result = await supabaseProxy({
    httpMethod: 'GET',
    path: '/api/auth/v1/settings',
    rawUrl: 'https://panic-ring.example/api/auth/v1/settings',
  });
  assert.equal(result.statusCode, 200);
  assert.equal(request.url.origin, 'https://bnmzydhlmhwxejfuydeb.supabase.co');
  assert.equal(request.url.pathname, '/auth/v1/settings');
  assert.match(request.options.headers.get('apikey'), /^sb_publishable_/);
  assert.deepEqual(JSON.parse(Buffer.from(result.body, 'base64').toString()), {
    external: { email: true },
    disable_signup: false,
  });
});

test('Supabase proxy rejects paths outside the Auth and REST APIs', async () => {
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'server-side-anon-key';
  globalThis.fetch = () => {
    throw new Error('Unexpected upstream request');
  };

  const result = await supabaseProxy({
    httpMethod: 'GET',
    path: '/api/functions/v1/admin',
    rawUrl: 'https://panic-ring.example/api/functions/v1/admin',
  });
  assert.equal(result.statusCode, 404);
});

test('Supabase proxy injects its anon key and substitutes only the placeholder bearer token', async () => {
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'server-side-anon-key';
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response('{"id":"created"}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const result = await supabaseProxy({
    httpMethod: 'POST',
    path: '/api/auth/v1/signup',
    rawUrl: 'https://panic-ring.example/api/auth/v1/signup?redirect_to=https%3A%2F%2Fpanic-ring.example',
    headers: {
      apikey: 'attacker-supplied-key',
      authorization: 'Bearer panic-ring-public-proxy-key',
      'content-type': 'application/json',
      host: 'attacker.example',
    },
    body: '{"email":"user@example.com"}',
  });

  assert.equal(result.statusCode, 200);
  assert.equal(request.url.toString(), 'https://project.supabase.co/auth/v1/signup?redirect_to=https%3A%2F%2Fpanic-ring.example');
  assert.equal(request.options.headers.get('apikey'), 'server-side-anon-key');
  assert.equal(request.options.headers.get('authorization'), 'Bearer server-side-anon-key');
  assert.equal(request.options.headers.get('host'), null);
  assert.deepEqual(JSON.parse(Buffer.from(result.body, 'base64').toString()), { id: 'created' });
});

test('Supabase proxy preserves a signed-in user token and sanitizes upstream server errors', async () => {
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'server-side-anon-key';
  globalThis.fetch = async () => new Response('database connection password leaked', { status: 500 });

  const result = await supabaseProxy({
    httpMethod: 'GET',
    path: '/api/rest/v1/devices',
    rawUrl: 'https://panic-ring.example/api/rest/v1/devices',
    headers: { authorization: 'Bearer user-session-token' },
  });

  assert.equal(result.statusCode, 502);
  assert.doesNotMatch(result.body, /password leaked/i);
});

test('Supabase proxy reports upstream timeouts without exposing exception details', async () => {
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'server-side-anon-key';
  globalThis.fetch = async () => {
    const error = new Error('private upstream details');
    error.name = 'TimeoutError';
    throw error;
  };

  const result = await supabaseProxy({
    httpMethod: 'GET',
    path: '/api/rest/v1/devices',
    rawUrl: 'https://panic-ring.example/api/rest/v1/devices',
  });
  assert.equal(result.statusCode, 504);
  assert.doesNotMatch(result.body, /private upstream details/i);
});

test('what3words proxy validates coordinates before contacting the provider', async () => {
  process.env.WHAT3WORDS_API_KEY = 'server-side-location-key';
  globalThis.fetch = () => {
    throw new Error('Unexpected upstream request');
  };

  const result = await what3wordsProxy({
    httpMethod: 'GET',
    rawQuery: 'coordinates=91%2C0',
  });
  assert.equal(result.statusCode, 400);
});

test('what3words proxy accepts only GET requests', async () => {
  const result = await what3wordsProxy({
    httpMethod: 'POST',
    rawQuery: 'coordinates=0%2C0',
  });
  assert.equal(result.statusCode, 405);
});

test('what3words proxy keeps its key server-side and sanitizes provider errors', async () => {
  process.env.WHAT3WORDS_API_KEY = 'server-side-location-key';
  let upstreamUrl;
  globalThis.fetch = async (url) => {
    upstreamUrl = new URL(url);
    return new Response('provider internal secret', { status: 500 });
  };

  const result = await what3wordsProxy({
    httpMethod: 'GET',
    rawQuery: 'coordinates=-33.9%2C18.4',
  });
  assert.equal(upstreamUrl.searchParams.get('key'), 'server-side-location-key');
  assert.equal(result.statusCode, 502);
  assert.doesNotMatch(result.body, /server-side-location-key|provider internal secret/i);
});

test('password recovery links use the configured deployed origin and recovery flow', () => {
  assert.equal(
    getFrontendRedirectUrl('https://panic-ring.example/path?old=yes', 'http://localhost:5173', 'recovery'),
    'https://panic-ring.example/?flow=recovery',
  );
});

test('auth email redirects use the current origin when no frontend URL is configured', () => {
  assert.equal(
    getFrontendRedirectUrl('', 'https://panic-ring.example', undefined),
    'https://panic-ring.example/',
  );
});

test('auth email redirects reject insecure remote origins and embedded credentials', () => {
  assert.throws(() => getFrontendRedirectUrl('http://panic-ring.example', 'https://safe.example'));
  assert.throws(() => getFrontendRedirectUrl('https://user:password@panic-ring.example', 'https://safe.example'));
});

test('auth email identifiers are trimmed, lowercased, and validated', () => {
  assert.equal(resolveIdentifier('  User@Example.com  '), 'user@example.com');
  assert.equal(resolveIdentifier('not-an-email'), null);
});

test('recovery callback recognizes query and hash links and provider errors', () => {
  assert.deepEqual(parseRecoveryLink('?flow=recovery', '#access_token=token'), {
    isRecoveryLink: true,
    hasError: false,
  });
  assert.deepEqual(parseRecoveryLink('', '#type=recovery&access_token=token'), {
    isRecoveryLink: true,
    hasError: false,
  });
  assert.deepEqual(parseRecoveryLink('?flow=recovery', '#error_code=otp_expired'), {
    isRecoveryLink: true,
    hasError: true,
  });
  assert.deepEqual(parseRecoveryLink('', ''), {
    isRecoveryLink: false,
    hasError: false,
  });
});

test('recovery requires an active session and rejects expired or malformed callbacks', () => {
  const validLink = parseRecoveryLink('?flow=recovery', '#access_token=token');
  const expiredLink = parseRecoveryLink('?flow=recovery', '#error_code=otp_expired');
  const normalLink = parseRecoveryLink('', '');
  assert.equal(isRecoverySessionValid(validLink, true), true);
  assert.equal(isRecoverySessionValid(validLink, false), false);
  assert.equal(isRecoverySessionValid(expiredLink, true), false);
  assert.equal(isRecoverySessionValid(normalLink, true), false);
});

test('forgot-password copy does not reveal whether the email is registered', async () => {
  const source = await readFile(new URL('../src/i18n.ts', import.meta.url), 'utf8');
  assert.match(source, /If an account exists with this email address, we will send a reset link/);
  assert.doesNotMatch(source, /No account found with this email address/i);
});

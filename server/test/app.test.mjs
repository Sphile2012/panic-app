import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { createApp } from '../dist/app.js';

async function withServer(app, run) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

async function withSupabaseMock(run) {
  const server = createServer((request, response) => {
    if (request.url === '/auth/v1/health') {
      response.writeHead(200, { 'content-type': 'application/json' }).end('{"status":"ok"}');
      return;
    }
    if (request.url === '/auth/v1/user' && request.headers.authorization === 'Bearer valid-token') {
      response.writeHead(200, { 'content-type': 'application/json' })
        .end('{"id":"user-123","email":"person@example.com"}');
      return;
    }
    response.writeHead(401, { 'content-type': 'application/json' }).end('{"message":"unauthorized"}');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('health checks the configured Supabase Auth service', async () => {
  await withSupabaseMock(async (supabaseUrl) => {
    const app = createApp({ supabaseUrl, supabaseAnonKey: 'test-anon-key' });
    await withServer(app, async (apiUrl) => {
      const response = await fetch(`${apiUrl}/api/health`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        status: 'ok',
        service: 'panic-ring-api',
        supabase: 'ok',
      });
    });
  });
});

test('health reports Supabase outages as unavailable', async () => {
  const app = createApp({
    supabaseUrl: 'https://project.example',
    supabaseAnonKey: 'test-anon-key',
    fetcher: async () => {
      throw new Error('upstream unavailable');
    },
  });
  await withServer(app, async (apiUrl) => {
    const response = await fetch(`${apiUrl}/api/health`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      status: 'unavailable',
      error: 'Supabase Auth is unavailable.',
    });
  });
});

test('account route requires a token and returns only the verified Supabase identity', async () => {
  await withSupabaseMock(async (supabaseUrl) => {
    const app = createApp({ supabaseUrl, supabaseAnonKey: 'test-anon-key' });
    await withServer(app, async (apiUrl) => {
      const missing = await fetch(`${apiUrl}/api/v1/me`);
      assert.equal(missing.status, 401);

      const valid = await fetch(`${apiUrl}/api/v1/me`, {
        headers: { authorization: 'Bearer valid-token' },
      });
      assert.equal(valid.status, 200);
      assert.deepEqual(await valid.json(), {
        user: { id: 'user-123', email: 'person@example.com' },
      });
    });
  });
});

test('account route rejects invalid Supabase tokens', async () => {
  await withSupabaseMock(async (supabaseUrl) => {
    const app = createApp({ supabaseUrl, supabaseAnonKey: 'test-anon-key' });
    await withServer(app, async (apiUrl) => {
      const response = await fetch(`${apiUrl}/api/v1/me`, {
        headers: { authorization: 'Bearer invalid-token' },
      });
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { error: 'The access token is invalid or expired.' });
    });
  });
});

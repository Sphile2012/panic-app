#!/usr/bin/env node
/**
 * Panic Ring — backend setup script
 *
 * Run once before starting Docker:
 *   node setup.js
 *
 * What it does:
 *   1. Generates a JWT secret, Postgres password, and realtime secret key
 *   2. Signs fresh ANON and SERVICE_ROLE JWTs with that secret
 *   3. Writes .env.docker.local  (Docker secrets — never committed)
 *   4. Writes .env               (Vite dev server — never committed)
 *   5. Prints the next steps
 */

const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

// ── Generate secrets ──────────────────────────────────────────────────────────
const jwtSecret    = crypto.randomBytes(40).toString('base64').replace(/[+/=]/g, x => ({'+':'-','/':'_','=':''}[x]));
const pgPassword   = crypto.randomBytes(20).toString('base64').replace(/[+/=]/g, '');
const secretKeyBase = crypto.randomBytes(32).toString('hex');
const dashPassword  = crypto.randomBytes(12).toString('base64').replace(/[+/=]/g, '');

// ── Sign JWTs ─────────────────────────────────────────────────────────────────
function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}
function signJwt(payload, secret) {
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const body   = b64url(payload);
  const sig    = crypto.createHmac('sha256', secret)
                        .update(`${header}.${body}`)
                        .digest('base64url');
  return `${header}.${body}.${sig}`;
}

const iat     = 1700000000;
const exp     = 2200000000; // ~year 2039
const anonKey = signJwt({ iss: 'supabase', role: 'anon',         iat, exp }, jwtSecret);
const svcKey  = signJwt({ iss: 'supabase', role: 'service_role', iat, exp }, jwtSecret);

// ── .env.docker.local ─────────────────────────────────────────────────────────
const dockerLocal = `# Panic Ring — generated Docker secrets
# DO NOT commit this file.
# Start the stack: docker compose --env-file .env.docker.local up -d --build

JWT_SECRET=${jwtSecret}

ANON_KEY=${anonKey}

SERVICE_ROLE_KEY=${svcKey}

POSTGRES_PASSWORD=${pgPassword}

SECRET_KEY_BASE=${secretKeyBase}

API_URL=http://localhost:8000
SITE_URL=http://localhost:8080

GOTRUE_MAILER_AUTOCONFIRM=true
ADDITIONAL_REDIRECT_URLS=

DASHBOARD_USERNAME=supabase
DASHBOARD_PASSWORD=${dashPassword}

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_ADMIN_EMAIL=no-reply@panicring.local

VITE_W3W_API_KEY=
`;

// ── .env (dev server) ─────────────────────────────────────────────────────────
const devEnv = `# Panic Ring — dev server environment (npm run dev)
# Keys match the local Docker stack. Start Docker first.

VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=${anonKey}

VITE_W3W_API_KEY=
`;

// ── Write files ───────────────────────────────────────────────────────────────
const root = path.resolve(__dirname);

fs.writeFileSync(path.join(root, '.env.docker.local'), dockerLocal);
fs.writeFileSync(path.join(root, '.env'), devEnv);

// ── Print summary ─────────────────────────────────────────────────────────────
console.log('\n✅  Panic Ring backend setup complete\n');
console.log('  Generated files:');
console.log('    .env.docker.local  — Docker secrets (never commit)');
console.log('    .env               — Vite dev env  (never commit)\n');
console.log('  Studio password:  ' + dashPassword);
console.log('  Postgres password: ' + pgPassword + '\n');
console.log('  Next steps:');
console.log('  1. Open Docker Desktop and make sure it is running');
console.log('  2. Start the backend:');
console.log('       docker compose --env-file .env.docker.local up -d --build');
console.log('  3. Wait ~2 minutes for first boot');
console.log('  4. Open the app:   http://localhost:8080');
console.log('  5. Open Studio:    http://localhost:3000');
console.log('     Username: supabase   Password: ' + dashPassword);
console.log('  6. Start the dev server (separate terminal):');
console.log('       npm run dev\n');

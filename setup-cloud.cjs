#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.resolve(__dirname);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = question => new Promise(resolve => rl.question(question, resolve));

const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const cyan = '\x1b[36m';
const bold = '\x1b[1m';
const reset = '\x1b[0m';

async function checkSupabase(projectUrl, anonKey) {
  const response = await fetch(`${projectUrl}/rest/v1/`, {
    headers: { apikey: anonKey },
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status !== 200 && response.status !== 400)
    throw new Error(`Supabase returned HTTP ${response.status}. Check the project URL and anon key.`);
}

async function main() {
  console.log(`${bold}${green}
╔═══════════════════════════════════════════════╗
║         Panic Ring — Supabase Setup           ║
╚═══════════════════════════════════════════════╝${reset}

Create a Supabase project, then provide its Project URL and anon public key.
This setup does not request or store a service-role key.
`);

  let projectUrl = (await ask('Supabase Project URL: ')).trim().replace(/\/+$/, '');
  let parsedUrl;
  try {
    parsedUrl = new URL(projectUrl);
  }
  catch {
    throw new Error('Enter a valid Supabase project URL.');
  }
  if (parsedUrl.protocol !== 'https:' || !parsedUrl.hostname.endsWith('.supabase.co') ||
      parsedUrl.username || parsedUrl.password || parsedUrl.pathname !== '/') {
    throw new Error('Use the HTTPS Project URL shown in Supabase Settings → API.');
  }

  const anonKey = (await ask('Supabase anon public key: ')).trim();
  if (anonKey.length < 100)
    throw new Error('The anon key appears incomplete. Copy the full anon public key from Supabase.');

  console.log(`${cyan}\nChecking Supabase connectivity...${reset}`);
  await checkSupabase(projectUrl, anonKey);

  const envContent = [
    'VITE_AUTH_ENABLED=true',
    `SUPABASE_URL=${projectUrl}`,
    `SUPABASE_ANON_KEY=${anonKey}`,
    'VITE_FRONTEND_URL=',
    'WHAT3WORDS_API_KEY=',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, '.env'), envContent, { mode: 0o600 });
  console.log(`${green}Supabase API connection verified; ignored local .env created.${reset}`);

  console.log(`
${bold}Database schema${reset}

For a brand-new empty project only:
  1. Open Supabase → SQL Editor.
  2. Run ${yellow}supabase/schema.sql${reset}.
  3. Configure DATABASE_URL with the direct TLS database connection and run:
     ${yellow}npm run db:check${reset}

For an existing project, first take a separate provider backup, then install
PostgreSQL client tools, configure DATABASE_URL, and run:
  ${yellow}npm run db:migrate${reset}

The migration runner creates and verifies a full pre-migration backup before
applying the versioned transaction. Do not paste the bootstrap schema into a
database that already contains application data.

Start the local app with ${yellow}npm run dev${reset}.
`);
}

main()
  .catch(error => {
    console.error(`${red}Setup failed: ${error.message}${reset}`);
    process.exitCode = 1;
  })
  .finally(() => rl.close());

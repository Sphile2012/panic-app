#!/usr/bin/env node

const https   = require('https');
const fs      = require('fs');
const path    = require('path');
const readline = require('readline');

const ROOT = path.resolve(__dirname);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

const G  = '\x1b[32m';  
const Y  = '\x1b[33m';  
const R  = '\x1b[31m';  
const B  = '\x1b[36m';  
const W  = '\x1b[1m';   
const RS = '\x1b[0m';   

const SCHEMA_SQL = fs.readFileSync(path.join(ROOT, 'supabase', 'init.sql'), 'utf8');

function post(url, body, token) {
  return new Promise((resolve, reject) => {
    const u   = new URL(url);
    const data = JSON.stringify(body);
    const opts = {
      hostname: u.hostname,
      port:     443,
      path:     u.pathname + (u.search || ''),
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { 'apikey': token, 'Authorization': `Bearer ${token}` } : {}),
      },
    };
    const req = https.request(opts, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port:     443,
      path:     u.pathname + (u.search || ''),
      method:   'GET',
      headers:  token ? { 'apikey': token, 'Authorization': `Bearer ${token}` } : {},
    };
    const req = https.request(opts, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.clear();
  console.log(`${W}${G}
╔═══════════════════════════════════════════════╗
║        Panic Ring — Backend Setup             ║
║        Supabase Cloud (free tier)             ║
╚═══════════════════════════════════════════════╝${RS}
`);

  console.log(`${B}This sets up your free Supabase database in ~2 minutes.${RS}
No Docker, no local server — it runs in the cloud.
`);

  console.log(`${W}STEP 1 — Create a free Supabase project${RS}
`);
  console.log(`  1. Open this URL in your browser:`);
  console.log(`     ${Y}https://app.supabase.com/new${RS}`);
  console.log(`  2. Sign in (GitHub login is fastest)`);
  console.log(`  3. Click "New project"`);
  console.log(`  4. Choose a name: ${Y}panic-ring${RS}`);
  console.log(`  5. Choose any region close to you`);
  console.log(`  6. Click "Create new project" and wait ~1 minute for it to start\n`);

  await ask(`${W}Press Enter when your project is ready...${RS} `);

  console.log(`\n${W}STEP 2 — Get your project credentials${RS}
`);
  console.log(`  In your Supabase project dashboard:`);
  console.log(`  1. Click ${Y}Settings${RS} (gear icon, bottom-left)`);
  console.log(`  2. Click ${Y}API${RS}`);
  console.log(`  3. Copy the ${Y}Project URL${RS} (looks like https://xxxx.supabase.co)`);
  console.log(`  4. Copy the ${Y}anon public${RS} key (long JWT string)\n`);

  let projectUrl = await ask(`${W}Paste your Project URL:${RS} `);
  projectUrl = projectUrl.trim().replace(/\/$/, '');

  if (!projectUrl.startsWith('https://') || !projectUrl.includes('supabase.co')) {
    console.log(`${R}That doesn't look like a Supabase URL. It should start with https:// and contain supabase.co${RS}`);
    projectUrl = await ask(`${W}Try again — Project URL:${RS} `);
    projectUrl = projectUrl.trim().replace(/\/$/, '');
  }

  let anonKey = await ask(`${W}Paste your anon public key:${RS} `);
  anonKey = anonKey.trim();

  if (anonKey.length < 100) {
    console.log(`${R}That key looks too short. Make sure you copied the full anon key.${RS}`);
    anonKey = await ask(`${W}Try again — anon key:${RS} `);
    anonKey = anonKey.trim();
  }

  console.log(`\n${W}STEP 3 — Get your service role key (for schema setup only)${RS}
`);
  console.log(`  Still in Settings → API:`);
  console.log(`  Copy the ${Y}service_role secret${RS} key (the one labelled "secret")\n`);
  console.log(`  ${R}This key has admin access. It is only used now to create the tables.${RS}`);
  console.log(`  ${R}It will NOT be saved to any file.${RS}\n`);

  let serviceKey = await ask(`${W}Paste your service role key:${RS} `);
  serviceKey = serviceKey.trim();

  console.log(`\n${B}Testing connection...${RS}`);

  try {
    const res = await get(`${projectUrl}/rest/v1/`, anonKey);
    if (res.status === 200 || res.status === 400) {
      console.log(`${G}✓ Connected to Supabase REST API${RS}`);
    } else {
      console.log(`${Y}⚠ Unexpected status ${res.status} — continuing anyway${RS}`);
    }
  } catch (e) {
    console.log(`${R}✗ Could not reach ${projectUrl} — check the URL and try again${RS}`);
    rl.close();
    process.exit(1);
  }

  console.log(`\n${B}Applying database schema...${RS}`);

  try {
    const res = await post(
      `${projectUrl}/rest/v1/rpc/exec_sql`,
      { query: SCHEMA_SQL },
      serviceKey,
    );

    if (res.status === 404 || (res.data && typeof res.data === 'object' && res.data.code === 'PGRST202')) {
      console.log(`${Y}Note: Use the SQL editor in Studio to apply the schema manually (instructions below).${RS}`);
    } else if (res.status === 200 || res.status === 204) {
      console.log(`${G}✓ Schema applied successfully${RS}`);
    } else {
      console.log(`${Y}Schema auto-apply returned status ${res.status} — manual step needed.${RS}`);
    }
  } catch {
    console.log(`${Y}Auto-apply skipped — manual step needed.${RS}`);
  }

  const envContent = `
VITE_SUPABASE_URL=${projectUrl}
VITE_SUPABASE_ANON_KEY=${anonKey}

VITE_W3W_API_KEY=
`;

  fs.writeFileSync(path.join(ROOT, '.env'), envContent);
  console.log(`\n${G}✓ .env written${RS}`);

  console.log(`
${W}STEP 4 — Apply the database schema${RS}

  1. Open ${Y}${projectUrl.replace('https://', 'https://app.supabase.com/project/').split('.')[0]}${RS}
     (or go to app.supabase.com → your project)
  2. Click ${Y}SQL Editor${RS} in the left sidebar
  3. Click ${Y}New query${RS}
  4. Paste the contents of ${Y}supabase/init.sql${RS}
  5. Click ${Y}Run${RS}

  You should see: "Success. No rows returned"
`);

  console.log(`${W}${G}
════════════════════════════════════════════
  ✅  Backend setup complete!
════════════════════════════════════════════${RS}

  ${W}Start the app:${RS}

    npm run dev

  Then open: ${Y}http://localhost:5173${RS}

  ${W}Sign up${RS} with your email to create an account.
  The database is live at: ${Y}${projectUrl}${RS}
`);

  rl.close();
}

main().catch(err => {
  console.error('\x1b[31mSetup failed:\x1b[0m', err.message);
  rl.close();
  process.exit(1);
});

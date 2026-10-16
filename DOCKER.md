# Panic Ring — Backend Setup

There are **two ways** to run the backend.
Choose the one that fits your situation.

---

## Option A — Supabase Cloud (recommended, no Docker needed)

Free hosted Postgres + Auth + REST API. Takes ~2 minutes.

### 1. Run the interactive setup script

```powershell
cd C:\Users\poome\Desktop\panic-ring
node setup-cloud.cjs
```

The script will:
- Ask you to create a free project at https://app.supabase.com
- Ask you to paste your project URL and API keys
- Write your `.env` file automatically
- Tell you how to apply the database schema

### 2. Apply the schema

- Open your Supabase project → **SQL Editor** → **New query**
- Paste the contents of `supabase/init.sql`
- Click **Run**

### 3. Start the dev server

```powershell
npm run dev
```

Open **http://localhost:5173** — sign up and the app is live.

---

## Option B — Self-hosted with Docker

Runs everything locally: Postgres, Auth, REST, Studio.
Requires Docker Desktop to be installed and running.

### Install Docker Desktop

Download from: **https://www.docker.com/products/docker-desktop**

After installing and starting Docker Desktop:

```powershell
cd C:\Users\poome\Desktop\panic-ring

# Generate secrets (run once)
node setup.cjs

# Start the full stack
docker compose --env-file .env.docker.local up -d --build
```

First boot takes 3–5 minutes. Then open:

| URL | What |
|-----|------|
| http://localhost:8080 | Panic Ring app |
| http://localhost:8080/dashboard.html | Dashboard |
| http://localhost:3000 | Supabase Studio |
| http://localhost:8000/auth/v1/health | `{"status":"UP"}` |

Apply schema in Studio → SQL Editor → paste `supabase/init.sql` → Run.

---

## Database schema

Tables in `supabase/init.sql`:

| Table | What it stores |
|---|---|
| `public.devices` | Hashed PIN, decoy PIN, auto-lock — no private data |
| `public.alert_logs` | Alert counts only — no contacts, no location, no message content |
| `public.alert_stats` | View — per-user totals used by the dashboard |

All tables have Row Level Security. Every user sees only their own rows.

**Private data (contacts, notes, safety plan) stays on the device — always.**
It is AES-GCM encrypted in the browser and never sent to any server.

---

## After setup

Once the backend is running:

1. Open **http://localhost:5173**
2. Click **Create account** — enter email + password
3. Set your secret PIN and decoy PIN
4. Add at least one trusted contact
5. The app is ready

---

## Useful commands (Docker option)

```powershell
# Check container health
docker ps

# View logs
docker compose --env-file .env.docker.local logs -f

# Stop (keeps data)
docker compose --env-file .env.docker.local down

# Wipe all data and start fresh
docker compose --env-file .env.docker.local down -v

# Rebuild app only (after code changes)
docker compose --env-file .env.docker.local up -d --build app
```

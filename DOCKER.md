# Panic Ring — Backend & Docker Setup

The full backend is self-hosted using Docker Compose. It runs:
PostgreSQL 15, Supabase Auth (GoTrue), PostgREST, Realtime, Storage,
Supabase Studio, Kong API gateway, and the Nginx-served Panic Ring app.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Docker Desktop | ≥ 4.25 | https://www.docker.com/products/docker-desktop |
| Node.js | ≥ 20 | https://nodejs.org |

---

## First-time setup (run once)

```bash
# 1. Clone the repo (skip if already cloned)
git clone https://github.com/Sphile2012/panic-app.git
cd panic-app

# 2. Install dependencies
npm install

# 3. Generate all secrets and write .env files automatically
node setup.cjs

# This creates two files (both are in .gitignore — never committed):
#   .env.docker.local   — secrets for the Docker stack
#   .env                — secrets for the Vite dev server
```

The script prints a summary including the Studio password. Save it.

---

## Start the backend

```bash
# Make sure Docker Desktop is open and running, then:
docker compose --env-file .env.docker.local up -d --build
```

First boot pulls ~1 GB of images and runs the database schema.
Allow 2–4 minutes. Watch progress with:

```bash
docker compose --env-file .env.docker.local logs -f
```

---

## Verify everything is running

| URL | Expected |
|-----|----------|
| http://localhost:8080 | Panic Ring app — login / signup |
| http://localhost:8080/health | `ok` |
| http://localhost:8080/dashboard.html | Dashboard |
| http://localhost:3000 | Supabase Studio |
| http://localhost:8000/auth/v1/health | `{"status":"UP"}` |
| http://localhost:8000/rest/v1/ | PostgREST root |

---

## Start the dev server (for local development)

In a **separate terminal** after the Docker stack is up:

```bash
npm run dev
```

Opens at http://localhost:5173 with hot-reload.
The Vite dev server proxies nothing — it talks directly to Kong at `localhost:8000`.

---

## Useful commands

```bash
# Rebuild only the app container after a code change
docker compose --env-file .env.docker.local up -d --build app

# Tail app logs
docker compose --env-file .env.docker.local logs -f app

# Stop (keeps all data)
docker compose --env-file .env.docker.local down

# Stop and wipe all data (fresh start — DESTRUCTIVE)
docker compose --env-file .env.docker.local down -v

# Re-run secret generation (creates new keys, overwrites .env files)
node setup.cjs
```

---

## Architecture

```
Browser  ──────────────────────────────────────────────────────────────
  │  (dev)  http://localhost:5173  ── Vite dev server
  │  (prod) http://localhost:8080  ── Nginx (serves dist/)
  │
  ├── /rest/v1/*     ──► Kong :8000 ──► PostgREST :3000
  ├── /auth/v1/*     ──► Kong :8000 ──► GoTrue    :9999
  ├── /storage/v1/*  ──► Kong :8000 ──► Storage   :5000
  └── /realtime/*    ──► Kong :8000 ──► Realtime  :4000
                                             │
                                       PostgreSQL :5432
```

**Private data stays on the device.**
Contacts, notes and safety plans are AES-GCM encrypted in the browser's
`localStorage`. They never reach the database in plaintext.
The database stores only: hashed PINs, anonymous alert counts, device IDs.

---

## Database schema

Tables created by `supabase/init.sql` (runs on first Postgres boot):

| Table / View | Purpose |
|---|---|
| `public.devices` | One row per browser install — PIN hash, decoy hash, auto-lock setting |
| `public.alert_logs` | One row per alert fired — counts only, no personal data |
| `public.alert_stats` | View used by the dashboard — aggregates per user |

All tables have Row Level Security — each user sees only their own rows.

To inspect or edit data, open **Supabase Studio → http://localhost:3000**.

---

## Production checklist

Before exposing to the internet:

- [ ] Put a **TLS-terminating reverse proxy** (Caddy, Traefik, or AWS ALB) in front of port 8080
- [ ] Uncomment `Strict-Transport-Security` in `nginx.conf` once HTTPS is live
- [ ] Set `GOTRUE_MAILER_AUTOCONFIRM=false` and configure real SMTP
- [ ] Set `ADDITIONAL_REDIRECT_URLS` to exact HTTPS callback URLs only — never `*`
- [ ] Change `SITE_URL` and `API_URL` to your real domains (HTTPS)
- [ ] Keep ports 3000 (Studio), 5432 (Postgres), 8000 (Kong) bound to `127.0.0.1` — not exposed publicly
- [ ] Set up volume backups for `panic-ring_db_data`

---

## Volumes

| Volume | Contains |
|--------|----------|
| `panic-ring_db_data` | Postgres data |
| `panic-ring_storage_data` | Supabase Storage files |

Back up before running `down -v`.

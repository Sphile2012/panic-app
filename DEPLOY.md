# Panic Ring — Deployment Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Docker Desktop | ≥ 4.25 | https://www.docker.com/products/docker-desktop |
| Docker Compose | v2 (bundled) | included with Docker Desktop |
| `openssl` | any | bundled with Git Bash / macOS / Linux |

---

## 1. Generate secrets

Run these commands and keep the output:

```bash
# JWT secret (32+ chars, base64)
openssl rand -base64 32

# Postgres password (24 chars)
openssl rand -base64 24

# Realtime secret key base (64 hex chars)
openssl rand -hex 32
```

---

## 2. Create your local env file

```bash
cp .env.docker .env.docker.local
```

Open `.env.docker.local` and fill in **every line marked `← CHANGE THIS`**:

| Variable | What to put |
|----------|-------------|
| `JWT_SECRET` | Output of `openssl rand -base64 32` |
| `POSTGRES_PASSWORD` | Strong password |
| `SECRET_KEY_BASE` | Output of `openssl rand -hex 32` |
| `DASHBOARD_PASSWORD` | Studio login password |
| `API_URL` | Public Kong URL (e.g. `https://api.yourdomain.com`) |
| `SITE_URL` | Public app URL (e.g. `https://app.yourdomain.com`) |
| `GOTRUE_MAILER_AUTOCONFIRM` | Set to `false` in production and configure SMTP |
| `ADDITIONAL_REDIRECT_URLS` | Optional comma-separated exact OAuth/email redirect URLs; never `*` |

After changing `JWT_SECRET`, regenerate `ANON_KEY` and `SERVICE_ROLE_KEY`:
→ https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys

---

## 3. Start everything

```bash
docker compose --env-file .env.docker.local up -d --build
```

First boot takes 2–4 minutes (image pulls + Postgres init).

---

## 4. Verify it's running

| URL | What you should see |
|-----|---------------------|
| http://localhost:8080 | Panic Ring app (login/signup) |
| http://localhost:8080/dashboard.html | Dashboard |
| http://localhost:8080/health | `ok` |
| http://localhost:3000 | Supabase Studio |

---

## 5. Run the database schema

Open Supabase Studio → **SQL Editor** → paste `supabase/init.sql` → **Run**.

This creates:
- `devices` table (PIN hashes, auto-lock preference)
- `alert_logs` table (delivery counts — no personal data)
- `alert_stats` view (used by the dashboard)
- Row Level Security policies

---

## 6. Production checklist

Before going live, complete every item:

### Security
- [ ] All `← CHANGE THIS` values replaced with real secrets
- [ ] `ANON_KEY` and `SERVICE_ROLE_KEY` regenerated for your `JWT_SECRET`
- [ ] TLS termination in front of Nginx (Caddy / Traefik / AWS ALB)
- [ ] `Strict-Transport-Security` header uncommented in `nginx.conf` (after TLS is live)
- [ ] `GOTRUE_MAILER_AUTOCONFIRM=false` set in `.env.docker.local`
- [ ] SMTP credentials filled in for email confirmation
- [ ] `ADDITIONAL_REDIRECT_URLS` contains only required, exact HTTPS redirect URLs
- [ ] Published Docker ports remain bound to loopback and are reachable only through the TLS proxy

### Data
- [ ] `supabase/init.sql` run in the SQL editor
- [ ] POPIA legal review complete (see `supabase/schema.sql` for checklist)
- [ ] Backup schedule configured for the `panic-ring_db_data` volume

### App
- [ ] `VITE_SUPABASE_URL` in `.env.docker.local` points to your public domain
- [ ] `SITE_URL` and `API_URL` both use HTTPS
- [ ] `npm run build` passes with zero errors and zero warnings
- [ ] Support directory contact numbers verified (see `src/screens/support.ts`)

### Docker volumes to back up
| Volume | Contains |
|--------|----------|
| `panic-ring_db_data` | Postgres data |
| `panic-ring_storage_data` | Supabase file storage |

---

## Useful commands

```bash
# Rebuild only the app after a code change
docker compose --env-file .env.docker.local up -d --build app

# Tail app logs
docker compose --env-file .env.docker.local logs -f app

# Stop (keep data)
docker compose --env-file .env.docker.local down

# Wipe all data (destructive — cannot be undone)
docker compose --env-file .env.docker.local down -v
```

---

## Architecture

```
Browser (HTTPS)
    │
    ▼
TLS proxy (Caddy / Traefik — your responsibility)
    │
    ▼
Nginx :80  ─── serves dist/ (Vite build)
    │
    ├── /rest/v1/*    ──► Kong :8000 ──► PostgREST :3000
    ├── /auth/v1/*    ──► Kong :8000 ──► GoTrue    :9999
    ├── /storage/v1/* ──► Kong :8000 ──► Storage   :5000
    └── /realtime/*   ──► Kong :8000 ──► Realtime  :4000
                                              │
                                        PostgreSQL :5432
```

Private data (contacts, notes, safety plan) is AES-GCM encrypted on the
device. It never leaves the browser in plaintext. The database only stores
PIN hashes and anonymous alert counts.

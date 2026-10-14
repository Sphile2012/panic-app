# Panic Ring — Docker setup

Everything runs in Docker. One command starts the full stack:
Postgres, Supabase Auth, PostgREST, Realtime, Storage, Studio, Kong,
and the Nginx-served Panic Ring app.

---

## Prerequisites

| Tool | Minimum version | Install |
|------|-----------------|---------|
| Docker Desktop | 4.25 | https://www.docker.com/products/docker-desktop |
| Docker Compose | v2 (bundled) | included with Docker Desktop |

---

## Quick start

### 1. Copy and edit the env file

```bash
cp .env.docker .env.docker.local
```

Open `.env.docker.local` and change **at minimum**:

| Variable | What to change |
|----------|---------------|
| `POSTGRES_PASSWORD` | Any strong password |
| `JWT_SECRET` | `openssl rand -base64 32` |
| `SECRET_KEY_BASE` | `openssl rand -hex 32` |
| `DASHBOARD_PASSWORD` | Studio login password |
| `GOTRUE_MAILER_AUTOCONFIRM` | `true` for local-only development; set `false` with SMTP in production |
| `ADDITIONAL_REDIRECT_URLS` | Optional comma-separated exact redirect URLs; never use `*` |

The `ANON_KEY` and `SERVICE_ROLE_KEY` in `.env.docker` are the standard
Supabase local-dev JWTs signed with the default secret. If you change
`JWT_SECRET`, regenerate them at:
https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys

### 2. Start everything

```bash
# Build the app image and start all services
docker compose --env-file .env.docker.local up -d --build

# Or use the npm shortcut (uses .env.docker.local):
npm run docker:up
```

First boot takes 2–3 minutes as Docker pulls all images and Postgres
runs the init SQL.

### 3. Open the app

| URL | What |
|-----|------|
| http://localhost:8080 | Panic Ring app |
| http://localhost:8080/dashboard.html | Dashboard |
| http://localhost:3000 | Supabase Studio |
| http://localhost:8000 | Kong API gateway |

---

## Useful commands

```bash
# Tail app logs
docker compose --env-file .env.docker.local logs -f app

# Tail all service logs
docker compose --env-file .env.docker.local logs -f

# Stop everything (keeps data)
docker compose --env-file .env.docker.local down

# Stop and delete all data (fresh start)
docker compose --env-file .env.docker.local down -v

# Rebuild only the app after code changes
docker compose --env-file .env.docker.local build app
docker compose --env-file .env.docker.local up -d app
```

---

## How it works

```
Browser
  │
  ▼
Nginx (port 8080) ──── serves dist/ (Vite-built app)
  │
  ├── /rest/v1/*    ──► Kong (8000) ──► PostgREST (3000)
  ├── /auth/v1/*    ──► Kong (8000) ──► GoTrue    (9999)
  ├── /storage/v1/* ──► Kong (8000) ──► Storage   (5000)
  └── /realtime/*   ──► Kong (8000) ──► Realtime  (4000)
                                            │
                                          PostgreSQL (5432)
```

The app's Supabase URL is set to `http://localhost:8000` (Kong) so all
API calls go through the gateway. RLS policies in Postgres ensure users
can only read their own data.

---

## Production deployment

1. Set `API_URL` and `SITE_URL` to your real domains in the env file.
2. Put a TLS-terminating reverse proxy (Caddy, Traefik, or AWS ALB)
   in front of the Nginx container.
3. Change all default passwords and regenerate JWT keys.
4. Set `GOTRUE_MAILER_AUTOCONFIRM=false`, configure real SMTP so
   users receive email confirmation.
5. Set `ADDITIONAL_REDIRECT_URLS` only to exact required HTTPS callback URLs.
   Do not use a wildcard redirect allow-list.
6. Point `ANON_KEY` and `SERVICE_ROLE_KEY` to JWTs signed with your
   production `JWT_SECRET`.
7. Keep the app and backend ports bound to localhost; expose them only through
   a TLS-terminating reverse proxy. Studio and Postgres should not be public.

---

## Schema

The database schema is in `supabase/init.sql` and runs automatically
on first Postgres boot. It creates:

- `public.devices` — one row per installed app, stores PIN hashes only
- `public.alert_logs` — audit log of alerts fired (no personal data)
- `public.alert_stats` — view used by the dashboard

Row Level Security ensures every user can only see their own rows.
**No private data (contacts, notes, safety plan) ever leaves the device** —
it is stored AES-GCM encrypted in the browser's localStorage.

---

## Volumes

| Volume | Contains |
|--------|----------|
| `panic-ring_db_data` | Postgres data directory |
| `panic-ring_storage_data` | Supabase Storage files |

Back these up before running `docker compose down -v`.

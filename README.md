# Panic Ring

## Requirements

- Node.js 20 or newer
- npm

## Run with Supabase

1. Install the dependencies:

   ```sh
   npm ci
   ```

2. Configure the Supabase connection and database schema:

   ```sh
   npm run setup:cloud
   ```

   Follow the prompts to provide your Supabase project URL and anon key.
   The setup script writes the ignored local `.env` file used by the local API proxy.
   It does not request a service-role key.

   On a brand-new empty project, apply `supabase/schema.sql` once in the
   Supabase SQL Editor. Do not run the bootstrap schema against an existing
   database. For existing installations, install PostgreSQL client tools and
   apply the versioned migration using the database's direct TLS connection:

   ```powershell
   $env:DATABASE_URL = 'postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require'
   npm run db:check
   npm run db:migrate
   Remove-Item Env:DATABASE_URL
   ```

   `db:migrate` first creates a full custom-format `pg_dump` backup outside the
   repository, verifies that it can be read, then applies the migration and
   records its checksum in the same transaction. It stops without altering
   schema when existing device, alert, or tracking data fails integrity checks.
   Keep the generated dump protected; it contains personal data. If migration
   recovery is necessary, restoring the pre-migration dump replaces the whole
   database and discards subsequent writes. The deliberately destructive
   restore command requires explicit confirmation:

   ```powershell
   npm run db:rollback -- 20261018103000 --confirm-data-loss
   ```

   Use this only after reviewing data loss impact and preferably testing
   restoration into an isolated staging database first. A migration failure
   before commit is rolled back transactionally; the verified dump remains for
   disaster recovery.

   Run `npm run db:check` after schema setup or migration to verify table
   existence, user foreign keys, row-level security, validated constraints,
   tracking RPC permissions, and query indexes. The migration runner requires
   a direct PostgreSQL connection; Supabase pooler connections may not support
   `pg_dump` and are not suitable for this workflow.

3. Configure password-reset links in the Supabase Dashboard:
   - Under **Authentication → URL Configuration**, set the Site URL to the
     deployed frontend origin and add `https://your-site.netlify.app/**` to the
     allowed Redirect URLs (and `http://localhost:5173/**` for local development).
   - Under **Authentication → Email Templates → Reset Password**, keep the
     confirmation link (`{{ .ConfirmationURL }}`) in the template.
   - Set the recovery token expiry under **Authentication → Settings** to the
     lifetime appropriate for your deployment. Supabase generates, stores,
     validates, and expires these one-time recovery tokens.

4. Start the development server:

   ```sh
   npm run dev
   ```

   Open `http://localhost:5173`.

To configure the environment manually, copy `.env.example` to `.env` and set
`SUPABASE_URL` and `SUPABASE_ANON_KEY` as server-side environment variables,
and set `VITE_AUTH_ENABLED=true`. Never use a `VITE_` prefix on API credentials.
The frontend sends Supabase requests to its same-origin `/api` proxy; set
`VITE_FRONTEND_URL` to
the deployed site's origin (for example, `https://your-site.netlify.app`) when
the build host differs from the deployed domain; otherwise the current site
origin is used. Add the same origin to Supabase's allowed Redirect URLs. The
reset link returns to the app's recovery screen rather than a provider or
browser error page. For Docker deployments, set `FRONTEND_URL` in
`.env.docker.local` to the deployed frontend origin before building.

For Netlify, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` as site environment
variables (not build-exposed `VITE_*` variables); set `WHAT3WORDS_API_KEY`
server-side if that optional feature is enabled. Supabase Auth owns account records,
password hashes, email verification, recovery tokens, and account status.
Application tables reference `auth.users` and use row-level security; do not
duplicate credentials, PIN hashes, or reset tokens in application tables. Supabase
intentionally responds to password-reset requests without confirming whether
an email is registered, preventing account enumeration. The app displays that
behavior clearly and sends no credentials or tokens to its logs.

The Netlify proxy only forwards Supabase Auth and REST API paths and injects the
server-side anon key. It does not expose the project URL in the frontend bundle.
For local development, the Vite development server runs the same-origin proxy
using the server-only values in `.env`. The self-hosted Docker configuration
uses Nginx as the proxy. Supabase's built-in Auth rate limits remain the
authoritative login/signup/reset throttles; configure restrictive provider
limits and enable CAPTCHA in the Supabase Auth dashboard before public launch.
The app does not implement a separate durable rate-limit store.

The Docker app listens on HTTP and binds to localhost by default. In production,
keep it behind a TLS-terminating reverse proxy; do not expose the app or Supabase
Kong ports directly to the internet.

Supabase Auth owns password hashing and recovery-token storage, expiry, and
single-use validation. Configure the project's password policy and recovery
expiry in Supabase; never store a second reset token or password hash in the app
database. Configure SMTP and verify the confirmation and recovery templates
and sender domain with your email provider before launch.

## Sign-in, languages and live location

The browser app supports email/password signup and sign-in plus Google OAuth.
To enable Google, configure the Google provider under Supabase Authentication >
Sign In / Providers, create a Web OAuth client in Google Cloud, and add the
callback URL shown by Supabase to the client's authorized redirect URIs. Add the
frontend origin to Supabase's allowed Redirect URLs. The app displays a clear
message if the Google provider has not been enabled.

- Users sign in with an email address. Email confirmation can remain enabled;
  users must confirm their address before signing in.
- The interface is available in English, isiZulu, Sesotho and Afrikaans
  (language buttons on the sign-in screen and in Settings).
- The fresh-database bootstrap schema includes the `live_tracks` table and
  token-scoped `push_track` and `get_track` functions. Existing projects should
  apply the versioned migration, not re-run the bootstrap file.
- The Live screen asks for location permission, updates every 10 seconds and
  gives a tracking link (`/track.html#token`) to share with beneficiaries. At
  20% and 10% battery (when not charging) the app prompts the user to message
  their beneficiaries; the tracking page also shows the battery level.
  Browsers can only do this while the app stays open, and SMS always needs a
  tap to send.

## Safety features and PWA limits

- On first use, create a secret PIN and a different decoy PIN; there are no
  preset PINs. The secret PIN opens the app, while the decoy opens a Notes
  screen with a shopping list. PINs and the encrypted vault stay in that
  browser; only device auto-lock settings and alert history are synchronized.
  A new browser or cleared site data requires setup again.
- Trusted contacts have one role: Level 1 contacts can receive emergency SMS
  drafts with location only when you choose to share it; Level 2 contacts are
  for referral requests; Level 3 contacts are for check-in requests.
- Safe-word messages, referral requests, and check-in requests open an SMS
  composer. You choose the recipient and must review and send each message.
  Incoming safe words are not detected by the app.
- The on-device Safety Readiness checklist, encrypted Safety Plan, menu-led
  Safety Companion, and voice-free interface help with preparation. Larger
  controls can be enabled in Settings.
- Circle Check appears when you open the app for the first time each local day.
  It does not run or send notifications while the app is closed; only the
  completion date is stored on this device.
- Check-in timers run in the browser and can be delayed when the app is
  suspended. A missed timer prompts you to prepare an alert; it does not send
  automatically. A Safety Walk can use the same timer and a manual Level 3
  check-in request, but does not provide live tracking.

This browser-based PWA cannot reliably send silent messages or run timers and
location tracking in the background. Native power/volume-button triggers,
secret hardware gestures, duress alerts, automatic check-in notifications,
live Safety Walk tracking, continuous location breadcrumbs, verified nearby
safe-place maps, OS/device-compromise checks, trusted-device sign-in alerts,
custom hardware accessibility triggers, and self-destructing private notes are
not implemented. They require native OS capabilities, verified service data,
backend support, or a separately reviewed data-erasure design. In particular,
notes currently share a PIN-encrypted vault with contacts and the safety plan,
so deleting only notes after failed PIN attempts needs a separate encryption
migration. Do not rely on these deferred
features for safety.

## Run with Docker

Install and start Docker Desktop, then run:

```sh
npm ci
npm run setup
npm run docker:up
```

The setup script creates local Docker and Vite environment files. The app is
available at `http://localhost:8080`; the development server can be started in
a separate terminal with `npm run dev`.

The Docker database initializes from `supabase/schema.sql` only when its
database volume is first created. Existing Docker volumes are never auto-migrated;
back them up and apply `npm run db:migrate` with a direct PostgreSQL connection.

Daily backups, point-in-time recovery, failover, and alerting depend on the
chosen Supabase plan or self-hosted PostgreSQL operations; they are not
automatically provisioned by this application. Enable and test provider
backups/PITR, restrict backup access, and run a scheduled restore drill before
launch. Do not interpret a successful local build as a live database migration
or disaster-recovery test.

Stop the Docker services with:

```sh
npm run docker:down
```

## Build

```sh
npm run build
npm run preview
```

The preview server runs at `http://localhost:4173`.

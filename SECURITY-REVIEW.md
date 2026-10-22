# Panic Ring Authentication and Data-Security Review

## Scope

Reviewed the latest repository history (`0d7c4d4` and surrounding authentication
changes), password signup/login/reset and email callbacks, frontend/backend
configuration, Supabase schema and policies, Docker and Netlify routing, local
safety-data synchronization, and the database migration/backup workflow.

## Findings and changes

| Severity | Finding | Change or disposition |
|---|---|---|
| High | Password-reset redirects previously depended on a hard-coded deployment URL and could send users to the wrong host. | Reset and verification redirects now use the public `VITE_FRONTEND_URL` setting or the current site origin, validate the origin, and use the recovery callback. Configure the production origin in the deployment environment and Supabase redirect allowlist. |
| Medium | The browser previously had direct Supabase configuration and optional what3words API configuration. | Browser requests now use same-origin `/api` routes. Netlify Functions, the local Vite proxy, and Docker/Nginx inject server-side configuration. The Supabase proxy allows only Auth and REST paths, has request timeouts, and sanitizes upstream server failures. |
| Medium | A tracked Docker environment file contained reusable sample credentials. | Removed `.env.docker` from version control and added a placeholder-only `.env.docker.example`. Rotate those credentials if they were ever used outside local development. |
| Medium | Device records could contain PIN hashes despite the app not needing them to restore the local vault. | Removed PIN/decoy hashes from database synchronization and the schema; device synchronization is limited to device ID and auto-lock settings. |
| Medium | Live-location writes did not reliably establish account ownership, and API failures could appear successful to the user. | Tracking writes now require an authenticated owner, token and coordinate constraints are enforced, old records are pruned when tracking functions run, and location-sharing failures are surfaced. Direct table access is revoked. |
| Low | Signup/dashboard copy implied local vault data was backed up or synchronized. | Corrected the English and supported translations to explain that the encrypted vault remains on the device. |
| Low | Netlify did not define browser security headers. | Added clickjacking, MIME-sniffing, referrer, permissions, HSTS, and CSP headers. The CSP retains `unsafe-inline` because the app currently needs inline code/styles. |
| Informational | Reset requests must not disclose whether an address is registered. | Per the requested privacy choice, the app displays a generic “if an account exists” response. Supabase Auth remains responsible for password hashes and secure, expiring, one-time recovery tokens. |
| High | The previous migration approach had no version history, preflight backup, or migration runner; bootstrap SQL could be mistaken for an upgrade. | Added a checksummed, advisory-locked migration runner that makes and verifies a full database dump before each migration, applies each migration and ledger update in one transaction, validates constraints and postconditions, and provides an explicitly destructive restore-based rollback. The bootstrap schema is now reserved for empty databases and is shared with fresh Docker initialization. |
| Medium | Existing migration constraints could silently remain unvalidated, while stricter token constraints could fail on legacy rows. | Migration preflights duplicate/invalid records, aborts rather than deleting them, recreates and validates checks in the transaction, and verifies key access/index postconditions. Existing bad data requires manual review before retrying. |

Authentication persistence, account status, verification, and recovery remain
owned by Supabase Auth; the app does not maintain a duplicate password or reset
token store. Database tables use user ownership policies and foreign keys to
`auth.users`. Supabase Auth supplies duplicate-account handling and password
hashing.

## PIN Edge Function hardening status

PIN hashes and security-answer hashes are handled by the `pin-setup`,
`pin-verify`, and `pin-change` Supabase Edge Functions. The follow-up migration
`20261022130000_harden_pin_edge_functions.sql` revokes direct app-role access
to the two credential tables and adds service-role-only transactional setup and
atomic lockout RPCs. PIN changes require a Supabase JWT with `auth_time` within
five minutes and count incorrect security answers toward the same lockout.

The primary app now routes authenticated sessions through account PIN setup or
two-PIN verification before opening the local vault. Guests retain the existing
device-local PIN flow. Account PIN changes require password reauthentication,
both security answers, server-side PIN confirmations, and a recent Supabase
`auth_time`; the local vault is re-encrypted only after the server accepts the
change. Account PIN credentials are not read directly by frontend roles.

Automated tests cover proxy configuration and path allowlisting, key injection
and bearer-token forwarding, timeouts and sanitized failures, what3words input
validation, production/local redirect construction, invalid recovery callbacks,
email identifier validation, generic reset messaging, and static migration/
backup/rollback safety requirements.

## Remaining risks and deployment work

1. **High — weak local PIN derivation:** the four-digit local PIN is hashed with
   SHA-256 and directly used to derive the vault-encryption key. A copied browser
   profile or local-storage database permits offline guessing. Changing this
   safely requires a versioned key-derivation and vault migration so existing
   encrypted user data remains recoverable; that migration was not attempted.
   Do not treat the PIN as a strong substitute for account authentication.
2. **Medium — no application-owned durable rate limiter:** the app relies on
   Supabase Auth limits. Set appropriate provider limits and enable CAPTCHA
   before public launch; these provider settings were not verifiable here.
3. **High — production migration and functions are not deployed:** the local
   Supabase database has the migrations applied and its RLS/grant postconditions
   verified, but the production site still serves an older frontend and returns
   404 for `pin-status`. Apply the migration to the production project using its
   backup-first process, deploy all four Edge Functions, deploy the frontend,
   then verify the production status endpoint and account flows.
4. **Medium — deployment and email delivery not exercised:** no production
   Netlify project, SMTP account, or deployed Supabase instance was available.
   Configure `SUPABASE_URL` and `SUPABASE_ANON_KEY` as server-side environment
   variables, set the build-time `VITE_FRONTEND_URL` to the deployed origin,
   add that origin to Supabase's allowed redirects, configure the Site URL,
   recovery expiry, email templates and SMTP sender, then test actual signup,
   verification, login, reset, expired-link and reused-link behavior.
5. **Medium — local vault is not backed up:** contacts, profile, safety plan,
   notes, and PIN remain in the browser's encrypted local storage. Clearing
   browser data or losing the device loses this data. Account sign-in does not
   synchronize the vault.
6. **Medium — limited safety capabilities:** there is no duress PIN, automatic
   SMS fallback, or guaranteed background/offline location sharing. SMS
   handoff requires user interaction, and live location depends on an open
   browser and a working network. Do not depend on these absent features for
   emergency response.
7. **Low — CSP permits inline scripts and styles:** CSP headers reduce exposure
   but are not a substitute for safe DOM handling. Removing `unsafe-inline`
   needs an app change and browser testing.
8. **Low — logging and operational monitoring are provider-dependent:** the app
   logs sanitized auth/database failure codes and service outage categories,
   but production email delivery, provider-side authentication events, and
   alert failures still need monitoring configured in Supabase and the email
   provider.
9. **Deployment boundary:** Netlify is served over HTTPS. The self-hosted
   Nginx container serves HTTP and binds to localhost by default; place it behind
   a correctly configured TLS-terminating reverse proxy and do not expose
   Supabase Kong or the app's HTTP port directly to the internet.

## Validation performed

- `npm test` — 29 tests passed.
- `npm run build:web` — TypeScript check and Vite production build passed.
- Built once with sentinel backend URL/key environment values and confirmed
  those values did not appear in `dist`.
- `git diff --check` — passed.
- Applied the three versioned migrations to the local Supabase database after
   verifying full custom-format backups outside the repository.
- Verified local RLS, denied `anon`/`authenticated` table reads, service-role-only
   setup/lockout RPC grants, validated constraints, and the migration ledger.
- The local migration runner's transaction-wrapper handling was corrected and
   regression-tested. A production database connection was not available.

No production migration, deployed Edge Function, live account/PIN flow, SMTP
delivery, mobile-browser, penetration, or emergency-response test was possible
in this workspace. Treat production deployment and verification as launch
blockers.

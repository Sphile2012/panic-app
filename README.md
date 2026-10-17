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

   Follow the prompts to provide your Supabase project URL and public anon key.
   The setup script writes the local `.env` file.

3. To enable password-reset codes, open the Supabase Dashboard and go to
   **Authentication → Email Templates → Reset Password**. Set the email body
   to include the one-time code variable `{{ .Token }}` and save the template.
   The app accepts a six-digit recovery code; use the default six-digit OTP
   length under **Authentication → Settings**.

4. Start the development server:

   ```sh
   npm run dev
   ```

   Open `http://localhost:5173`.

To configure the environment manually, copy `.env.example` to `.env` and set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. `VITE_W3W_API_KEY` is
optional.

## Safety features and PWA limits

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
notes currently share an encrypted vault and recovery record with contacts and
the safety plan, so deleting only notes after failed PIN attempts needs a
separate encryption and recovery migration. Do not rely on these deferred
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

# Panic Ring

This repository contains a separate web app and an Expo/React Native Android app. The web app has a local PIN vault; the native app uses Supabase Auth. Their account and data flows are separate.

## Run locally

```sh
npm install
npm run dev
```

The development server prints the local URL. To validate the web app:

```sh
npm run build:web
npm test
```

## Run the Android app

```sh
cd mobile
copy .env.example .env
npm install
npm run start -- --lan
```

Set the Supabase URL and public anon key in `mobile/.env`. Set `EXPO_PUBLIC_API_URL` to an API hostname reachable from the device (a physical phone cannot reach the development computer through `localhost`). Set `EXPO_PUBLIC_TRACKING_URL` to the deployed web app's `track.html` URL to include a live-share link in emergency messages. These `EXPO_PUBLIC_` values are included in the client bundle; never put service-role keys or other secrets there.

The mobile app requires a development build for native configuration changes; Expo Go is suitable only when its bundled native modules match the project. Metro export (`npm run build:mobile`) is not an APK build.

## PIN and recovery flow

- Sign up by entering and confirming a 4-digit secret PIN and a different 4-digit decoy PIN.
- Each PIN must use four different digits; repeated digits are rejected.
- Set two security questions after creating the PINs.
- Login uses the PIN only. An incorrect PIN is reported, with a create-account option.
- PIN recovery and PIN changes require both security answers. New PINs must also be confirmed.

The app keeps its PIN-protected profile, contacts, notes, and safety plan in the device's encrypted local vault. It does not use email or Google sign-in in the main app flow.

The unlocked home screen keeps the decorated safety greeting, emergency PANIC button, location-sharing shortcut, and navigation. Feature cards and the trusted-contact preview are available from the menu instead of the home screen.

## Emergency alerts

- Hold the red **PANIC** button for 1.5 seconds to begin an alert.
- The location step can add one fresh GPS snapshot to the message.
- The app opens a prefilled SMS composer for each trusted contact. Review and tap **Send** in the Messages app; SMS availability and airtime depend on the device and carrier. The app cannot verify that a message was sent or delivered.
- Saved notes are included in the prepared alert message with their creation and last-edited date and time. Review the contents before sending.
- On browsers that expose battery status, an in-app warning appears at 20% while Panic Ring is open. It offers an SMS draft per trusted contact; the user must review and tap Send.
- A discreet **WhatsApp backup** link opens WhatsApp with the same prepared text. The user still needs to review and send it.
- The **Live location** screen shows a readable on/off status without exposing raw coordinates. While tracking is active, each trusted contact can receive the live link through an SMS draft or a WhatsApp draft. The location screen also offers separate one-time SMS and WhatsApp location drafts.
- The rounded two-line button at the top of the dashboard opens Live location and requests browser location permission. After a GPS fix, choose a trusted contact to open an SMS or WhatsApp draft; review and send it there. Use **More** in the bottom navigation for the app menu.

### Current platform limitations

The web app does not automatically send SMS or WhatsApp messages. Browser messaging links open the relevant app for user confirmation. Battery monitoring depends on browser support and may stop when the app is suspended or closed. Photos are not attached to these links, and the current alert flow does not capture or send photos. Location is a single snapshot in emergency alert messages; live location is a separate opt-in feature that updates while the page remains open and may pause when the browser is backgrounded.

## Backend integration

The native app stores trusted contacts, emergency sessions, and foreground GPS updates in Supabase under owner-only row-level security. The versioned native-emergency migration must be applied to the intended database before using those screens. Existing databases should use the backup-first migration runner (`npm run db:migrate`) with a secured `DATABASE_URL` and PostgreSQL client tools; the app does not apply migrations.

SOS sharing opens the device's SMS composer or a WhatsApp share link for the user to review. Neither flow proves delivery. Live tracking runs only while the app stays in the foreground; the existing web tracking page uses a bearer link, so anyone who receives or obtains that link can view its current location until the session is stopped. Background tracking, native photo capture/upload, provider-backed message delivery, and recipient-account access controls are not implemented.

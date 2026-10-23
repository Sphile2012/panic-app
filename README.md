# Panic Ring

Panic Ring is a mobile-first personal safety app. Its main flow uses local PINs and a trusted contact list.

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

## PIN and recovery flow

- Sign up by entering and confirming a 4-digit secret PIN and a different 4-digit decoy PIN.
- Each PIN must use four different digits; repeated digits are rejected.
- Set two security questions after creating the PINs.
- Login uses the PIN only. An incorrect PIN is reported, with a create-account option.
- PIN recovery and PIN changes require both security answers. New PINs must also be confirmed.

The app keeps its PIN-protected profile, contacts, notes, and safety plan in the device's encrypted local vault. It does not use email or Google sign-in in the main app flow.

## Emergency alerts

- Hold the red **PANIC** button for 1.5 seconds to begin an alert.
- The location step can add one fresh GPS snapshot to the message.
- The app opens a prefilled SMS composer for each trusted contact. Review and tap **Send** in the Messages app; SMS availability and airtime depend on the device and carrier. The app cannot verify that a message was sent or delivered.
- Saved notes are included in the prepared alert message with their creation and last-edited date and time. Review the contents before sending.
- On browsers that expose battery status, an in-app warning appears at 20% while Panic Ring is open. It offers an SMS draft per trusted contact; the user must review and tap Send.
- A discreet **WhatsApp backup** link opens WhatsApp with the same prepared text. The user still needs to review and send it.

### Current platform limitations

The web app does not automatically send SMS or WhatsApp messages. Browser messaging links open the relevant app for user confirmation. Battery monitoring depends on browser support and may stop when the app is suspended or closed. Photos are not attached to these links, and the current alert flow does not capture or send photos. Location is a single snapshot; automatic 10-second updates are not supported while the SMS composer is open or the browser is backgrounded. These capabilities require a native app or an authorized messaging/location backend and are not implemented here.

## Backend integration

The current UI changes do not modify the backend or database. Supabase integration is used for optional account/device and alert-log operations; it does not dispatch SMS/WhatsApp messages or sync the encrypted local notes vault.

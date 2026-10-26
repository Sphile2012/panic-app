# Panic Ring

Panic Ring is a mobile-first personal safety app providing emergency alerts, location tracking, and safety planning features.

## Quick Start

### Web App
```sh
npm install
npm run dev
```

To validate the web app:
```sh
npm run build:web
npm test
```

### In-app help assistant

Open **Safety assistant** from the dashboard's **More** menu to get built-in guidance for PINs, trusted contacts, alerts, location, check-in timers, journeys, safety plans, notes, records, settings, privacy, and other app features. The assistant does not access your account data or send alerts. It is not a live emergency service; use the Emergency dialer or local emergency services if you need urgent help.

### Mobile App (React Native/Expo)
```sh
cd mobile
npm install
npm start
```

Scan the QR code with **Expo Go** app on your Android device.

---

## Mobile App Features

The mobile app (`com.phumeh.mypanicring`) includes 6 core safety features:

### 1. SOS Alert System
- Hold-to-activate button (1.5 second press)
- Silent alert mechanism
- SMS sending to trusted contacts
- Optional location sharing (off by default)
- Message composer preparation status; delivery must be confirmed in the messaging app
- Cancel alert functionality
- Google Maps integration

### 2. Trusted Circle Management
- Add up to 5 trusted contacts
- Name and phone number tracking
- Status monitoring (accepted/pending)
- Remove contacts with confirmation
- Database persistence with RLS security

### 3. Live Location Tracking
- Location tracking updates every 10 seconds while the app is open
- Location accuracy reporting
- WhatsApp and SMS sharing
- Google Maps link generation
- Start/stop controls
- Messaging apps open drafts; the user must review and send

### 4. Private Notes/Evidence
- Create encrypted notes
- Title and content fields
- Timestamp tracking
- Secure deletion with confirmation
- Private storage with RLS

### 5. Safety Plan
Six categories for comprehensive safety planning:
- Trusted People
- Safe Places
- Emergency Numbers
- Important Documents
- Transport Options
- Things to Remember

### 6. Emergency Services Dialer
One-tap calling to South African emergency services:
- **General Emergency**: 112
- **Police SAPS**: 10111
- **Ambulance**: 10177
- **GBV Command Centre**: 0800 428 428
- **Childline**: 116

---

## Database Schema

All tables use Supabase with Row-Level Security (RLS) enabled:

### Tables:
1. **contacts** - Trusted circle members (up to 5 per user)
2. **live_locations** - Real-time location tracking
3. **notes** - Private encrypted notes
4. **safety_plans** - User safety planning data
5. **sos_alerts** - SOS alert history
6. **alert_deliveries** - SMS delivery tracking

### Security:
- Row-Level Security is enabled on applicable tables
- Users can only access their own records
- Location messages are addressed only to trusted-circle contacts and require the user to send
- Cross-user access is restricted by row-level policies

---

## Android Permissions

Configured in `mobile/app.json`:
- ACCESS_FINE_LOCATION
- ACCESS_COARSE_LOCATION
- ACCESS_BACKGROUND_LOCATION
- FOREGROUND_SERVICE
- FOREGROUND_SERVICE_LOCATION
- SEND_SMS
- READ_PHONE_STATE

iOS permissions also configured for location services.

---

## Verification Status

Latest local checks:
- `npm test`: 60 tests passed
- `npm run typecheck`: passed for web, mobile, and API
- `npm run test:api`: 4 tests passed
- Web build: passed with Vite 6.4.4
- Android Expo export: passed
- API build: passed
- Root and API dependency audits: no reported vulnerabilities
- Mobile dependency audit: 5 high-severity Expo toolchain advisories remain; resolving them automatically requires a breaking Expo version change

Physical-device checks and live Supabase integration checks are still required. These results do not certify every feature on every device or network.

---

## Testing Guide

### Manual Testing Checklist:

#### 1. Authentication Flow
- [ ] Sign up new user
- [ ] Sign in existing user
- [ ] Sign out
- [ ] Session persistence

#### 2. Trusted Circle
- [ ] Add contact (name + phone)
- [ ] Add up to 5 contacts
- [ ] Try adding 6th (should warn)
- [ ] Remove contact
- [ ] Verify persistence

#### 3. SOS Alert
- [ ] Hold button for 1.5 seconds
- [ ] Send without location
- [ ] Send with location
- [ ] Verify SMS opens
- [ ] Check delivery status
- [ ] Cancel alert

#### 4. Live Location
- [ ] Request permissions
- [ ] Start tracking
- [ ] View updates (every 10s)
- [ ] Share via WhatsApp
- [ ] Share via SMS
- [ ] Stop tracking

#### 5. Private Notes
- [ ] Create note
- [ ] View notes list
- [ ] Delete note
- [ ] Verify persistence

#### 6. Safety Plan
- [ ] Edit each category
- [ ] Save changes
- [ ] Cancel changes
- [ ] Verify persistence

#### 7. Emergency Dialer
- [ ] Tap each service
- [ ] Verify confirmation dialog
- [ ] Phone dialer opens
- [ ] Cancel works

### Security Testing:
- [ ] Sign in as different users
- [ ] Verify data isolation
- [ ] Test permission handling
- [ ] Deny/grant location access

### Error Scenarios:
- [ ] No internet connection
- [ ] Invalid data input
- [ ] Battery low during tracking
- [ ] App in background

---

## Environment Setup

### Mobile App (.env file)
Create `mobile/.env` with:
```
EXPO_PUBLIC_SUPABASE_URL=https://bnmzydhlmhwxejfuydeb.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### Web App (.env file)
Already configured in root `.env`

---

## Deployment

### Mobile App:
```bash
cd mobile
# For Android
eas build --platform android

# For iOS
eas build --platform ios
```

### Web App:
```bash
npm run build:web
```

Deploy to Netlify or similar platform.

---

## Dependencies

### Mobile App (Expo SDK ~58):
- expo-location (v58.0.18)
- expo-sms (v58.0.2)
- expo-linking (v58.0.13)
- @supabase/supabase-js (v2.118.0)
- expo-router (v58.0.24)
- react-native (v0.88.0)

---

## Known Limitations

### SMS Behavior:
- **iOS**: User must manually tap "Send" in message composer
- **Android**: SMS composer opens, user confirms send

### Background Location:
- Requires testing on physical device
- May need additional config for production builds

### Platform Limitations:
- Web app uses SMS links (browser opens messaging app)
- Web location sharing targets a selected trusted-circle phone number and pre-fills the SMS or WhatsApp composer
- Mobile SMS drafts include trusted-circle numbers, and mobile WhatsApp drafts target the selected trusted contact
- Mobile messaging shares the current map pin, not a continuously updating recipient link
- The user must review and tap Send; neither app can confirm message delivery
- Battery monitoring depends on browser support
- Mobile messaging is snapshot-based; the web app shares a live link only while tracking and sync are active
- No automatic SMS/WhatsApp dispatch from web or mobile

---

## Security & Privacy

- All data encrypted at rest
- No data shared without explicit user action
- Location sharing is opt-in
- Notes are private to user
- No cross-user data access
- RLS enforced on all tables

---

## License

MIT License

---

## Emergency Services (South Africa)

These are real emergency numbers. Use responsibly.

- **General Emergency**: 112
- **Police SAPS**: 10111
- **Ambulance**: 10177
- **GBV Command Centre**: 0800 428 428
- **Childline**: 116

---

## Current Status

Type checks, automated tests, and platform builds pass locally. Physical-device and configured backend integration testing remain necessary.

**Last Updated:** 2026-10-25  
**Version:** 1.0.0  
**Package:** com.phumeh.mypanicring

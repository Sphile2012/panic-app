# Supabase Two-PIN Authentication Implementation

## Current Architecture

The app supports guest/device-local use and authenticated accounts. Authenticated
users pass through Supabase email-link authentication and then a separate two-PIN
gate before the app opens. The local encrypted vault remains device-local; the
account PIN records are credentials, not cloud backup or vault synchronization.

## 📋 Implementation Overview

### Database Schema Changes

**New Tables:**
- `user_pins`: Stores bcrypt-hashed PINs with rate limiting
- `security_questions`: Stores security Q&A for PIN recovery

**Security Features:**
- Bcrypt hashing (cost factor 12) for PIN storage
- Rate limiting: 5 failed attempts = 15-minute lockout
- Row Level Security (RLS) enabled
- No direct table access for clients

### Supabase Edge Functions

Four serverless functions handle all account PIN operations:

1. **pin-status**: Return setup status, security-question IDs, and lockout expiry; never returns hashes
2. **pin-setup**: Create PINs and security questions once; existing credentials cannot be overwritten
3. **pin-verify**: Verify both PINs and enforce lockout
4. **pin-change**: Change both PINs after recent email-link reauthentication and both security answers

## 🚀 Deployment Steps

### 1. Apply Database Migration

```bash
# Navigate to project
cd c:\Users\Phumeh\Luyanda1\panic-app

# Apply migration (requires Supabase CLI)
npx supabase link --project-ref <project-ref>
npx supabase db push
```

### 2. Deploy Edge Functions

```bash
# Deploy all functions
npx supabase functions deploy pin-setup
npx supabase functions deploy pin-verify
npx supabase functions deploy pin-change
npx supabase functions deploy pin-status

# Set required secrets
npx supabase secrets set SUPABASE_URL=https://azirifnakrxmuiqpqwbc.supabase.co
npx supabase secrets set SUPABASE_ANON_KEY=<your-anon-key>
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

Deploy `20261022130000_harden_pin_edge_functions.sql` as part of `db push`.
It removes direct app-role access to the hash tables and adds service-role-only
transactional setup and atomic lockout RPCs. Never set the service-role key as a
frontend/build variable.

### 3. Environment Variables

Update `.env`:

```env
VITE_AUTH_ENABLED=true
VITE_PIN_CLOUD_BACKUP=true
SUPABASE_URL=https://azirifnakrxmuiqpqwbc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🔧 Frontend Integration

### Current Implementation

The account PIN gate is separate from the device vault's legacy local PIN
derivation. The UI calls the same-origin Supabase proxy; PIN and answer hashes
are computed server-side by the Edge Functions and are never returned to the
browser. Signup and sign-in use Supabase email OTP links; no account password is
requested or stored by this app. PIN changes use a fresh email link for recent
authentication, then require both security answers.

### API Integration Examples

#### 1. Set Up PINs (During Registration)

```typescript
import { getClient, getUser } from './db.js'

async function setupPins(pin1: string, pin2: string, question1_id: string, answer1: string, question2_id: string, answer2: string) {
  const user = await getUser()
  if (!user) throw new Error('User not authenticated')

  const response = await fetch(`${SUPABASE_URL}/functions/v1/pin-setup`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${user.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pin1,
      pin2,
      question1_id,
      question1_answer: answer1,
      question2_id,
      question2_answer: answer2,
    }),
  })

  const result = await response.json()
  if (!response.ok) throw new Error(result.error)
  return result
}
```

#### 2. Verify PINs (Login)

```typescript
async function verifyPins(pin1: string, pin2: string) {
  const user = await getUser()
  if (!user) throw new Error('User not authenticated')

  const response = await fetch(`${SUPABASE_URL}/functions/v1/pin-verify`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${user.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pin1, pin2 }),
  })

  const result = await response.json()
  
  if (!response.ok) {
    if (result.locked) {
      throw new Error(`Account locked for ${result.minutesRemaining} minutes`)
    }
    throw new Error(result.error)
  }

  return result
}
```

#### 3. Change PINs (Using Security Questions)

```typescript
async function changePins(answer1: string, answer2: string, newPin1: string, newPin2: string) {
  const user = await getUser()
  if (!user) throw new Error('User not authenticated')

  const response = await fetch(`${SUPABASE_URL}/functions/v1/pin-change`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${user.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      answer1,
      answer2,
      new_pin1: newPin1,
      new_pin2: newPin2,
    }),
  })

  const result = await response.json()
  if (!response.ok) throw new Error(result.error)
  return result
}
```

## 🔐 Security Features

### PIN Storage
- **Never stored in plain text**
- Bcrypt with cost factor 12
- Separate hashes for each PIN
- Server-side hashing only

### Rate Limiting
- Max 5 failed attempts
- 15-minute lockout after max attempts
- Automatic reset on successful login

### Security Questions
- Answers normalized (lowercase, trimmed, spaces collapsed)
- Bcrypt hashed with cost factor 12
- Must answer both correctly to change PINs
- Case-insensitive matching

### Database Security
- Row Level Security (RLS) enabled
- Users can only access their own records
- No direct client access to PIN tables
- All operations through Edge Functions

## 📱 UI Flow

### Setup Flow
1. User creates account (or signs in)
2. **Create Your PINs**
   - Enter PIN 1 (4-6 digits)
   - Confirm PIN 1
   - Enter PIN 2 (4-6 digits, must differ)
   - Confirm PIN 2
3. **Update Your Profile**
   - Name and phone
4. **Create Your Recovery Questions**
   - Select question 1
   - Enter answer 1 (min 8 chars)
   - Select question 2
   - Enter answer 2 (min 8 chars)
5. **Add Contacts**
   - Emergency contacts

### Login Flow
1. User signs into the Supabase account with the existing account password.
2. The app checks PIN setup status.
3. User enters both 4–6 digit PINs.
4. The server verifies both and returns success only when both match.
5. Five failures cause a 15-minute lockout.

### PIN Change Flow
1. User opens Settings and enters the current account password.
2. User answers both configured security questions.
3. User enters and confirms both new PINs.
4. The Edge Function requires a recent authentication timestamp and correct answers.
5. Incorrect answers count toward the same temporary lockout.

## 🧪 Testing Checklist

- [ ] Create two custom PINs during setup
- [ ] Confirm PINs must match
- [ ] Verify PINs must be different from each other
- [ ] Verify 4-6 digit validation
- [ ] Login with correct PINs
- [ ] Login with incorrect PIN 1
- [ ] Login with incorrect PIN 2
- [ ] Trigger rate limiting (5 failed attempts)
- [ ] Verify 15-minute lockout
- [ ] Answer security questions correctly
- [ ] Answer security questions incorrectly
- [ ] Change PINs successfully
- [ ] Verify new PINs work
- [ ] Test with multiple users (no cross-access)
- [ ] Test offline mode (local storage fallback)
- [ ] Test deployment (not just localhost)

## 🚨 Migration Strategy for Existing Users

Current users have PINs in local storage (SHA-256). You need to:

1. **Detect existing local PINs** on app load
2. **Prompt user**: "Upgrade to cloud backup?"
3. **If yes**:
   - Ask user to confirm existing PINs
   - Ask user to set up security questions
   - Upload to Supabase
4. **If no**:
   - Continue using local storage

## 📝 TODO: Frontend Implementation

You still need to:

1. ✅ Create UI screens for:
   - PIN setup with confirmation
   - PIN verification
   - Security question setup
   - PIN change flow

2. ✅ Integrate API calls into existing code:
   - Update `src/screens/setup.ts`
   - Update `src/screens/calculator.ts`
   - Update `src/db.ts` with new functions

3. ✅ Add error handling and user feedback

4. ✅ Implement hybrid local/cloud storage

5. ✅ Test all flows thoroughly

## 🔗 Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Supabase CLI Setup](https://supabase.com/docs/guides/cli)
- [Bcrypt Security Best Practices](https://auth0.com/blog/hashing-in-action-understanding-bcrypt/)

## 📧 Support

Issues with deployment? Contact Supabase support or check the Edge Functions logs:

```bash
npx supabase functions logs pin-verify
```

# Supabase Two-PIN Authentication Implementation

## ⚠️ CRITICAL ARCHITECTURAL NOTE

**Your current app uses local-only PIN storage with NO user accounts required.**

This implementation adds **optional Supabase-backed PIN authentication** for users who want cloud backup and multi-device sync. The app will work in two modes:

1. **Local Mode** (current): PINs stored on device only, no account needed
2. **Cloud Mode** (new): PINs backed up to Supabase, requires user account

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

Three serverless functions handle all PIN operations:

1. **pin-setup**: Create/update PINs and security questions
2. **pin-verify**: Verify both PINs for login
3. **pin-change**: Change PINs after answering security questions

## 🚀 Deployment Steps

### 1. Apply Database Migration

```bash
# Navigate to project
cd c:\Users\Phumeh\Luyanda1\panic-app

# Apply migration (requires Supabase CLI)
npx supabase db push
```

### 2. Deploy Edge Functions

```bash
# Deploy all functions
npx supabase functions deploy pin-setup
npx supabase functions deploy pin-verify
npx supabase functions deploy pin-change

# Set required secrets
npx supabase secrets set SUPABASE_URL=https://azirifnakrxmuiqpqwbc.supabase.co
npx supabase secrets set SUPABASE_ANON_KEY=<your-anon-key>
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

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

The app currently stores PINs locally using SHA-256. You need to decide:

**Option A: Hybrid Approach (Recommended)**
- Keep local storage for offline-first operation
- Optionally sync to Supabase for backup
- User can choose "Cloud Backup" during setup

**Option B: Cloud-Only Approach**
- Require user account and authentication
- All PIN operations go through Supabase
- No offline access

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
1. User opens app (sees calculator)
2. Enters PIN 1
3. Enters PIN 2
4. System verifies both PINs
5. If correct: Access granted
6. If incorrect: Error + remaining attempts shown

### PIN Change Flow
1. User clicks "Forgot PIN?" on calculator
2. Answers security question 1
3. Answers security question 2
4. If correct:
   - Enter new PIN 1 + confirm
   - Enter new PIN 2 + confirm
   - PINs updated
5. If incorrect: Error message

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

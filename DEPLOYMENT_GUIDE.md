# Panic Ring - Complete Deployment Guide

## 🚀 Quick Start Deployment

### Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Supabase project created at https://supabase.com/dashboard
- Project URL: `https://azirifnakrxmuiqpqwbc.supabase.co`

### Step 1: Link to Your Supabase Project

```bash
cd c:\Users\Phumeh\Luyanda1\panic-app

# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref azirifnakrxmuiqpqwbc
```

### Step 2: Apply Database Migration

```bash
# Push migration to create PIN tables
npx supabase db push

# Or manually via SQL Editor in Supabase Dashboard:
# Copy contents of: supabase/migrations/20261021120000_add_pin_authentication.sql
# Paste and run in SQL Editor
```

**What this creates:**
- `user_pins` table with bcrypt hashes
- `security_questions` table
- Row Level Security policies
- Indexes for performance

### Step 3: Deploy Edge Functions

```bash
# Deploy all three PIN functions
npx supabase functions deploy pin-setup
npx supabase functions deploy pin-verify
npx supabase functions deploy pin-change
```

### Step 4: Set Environment Secrets

Get your Service Role Key from: https://supabase.com/dashboard/project/azirifnakrxmuiqpqwbc/settings/api

```bash
# Set the service role key (required for PIN functions)
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

# Verify secrets are set
npx supabase secrets list
```

### Step 5: Update Environment Variables

Update your `.env` file:

```env
# Enable authentication
VITE_AUTH_ENABLED=true

# Supabase Configuration
VITE_SUPABASE_URL=https://azirifnakrxmuiqpqwbc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6aXJpZm5ha3J4bXVpcXBxd2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0OTAwOTEsImV4cCI6MjEwODA2NjA5MX0.2UUopaCoYyD2kvCQ2_ggiH70fwRSIDnTMgETShQj5P4

# Frontend URL
VITE_FRONTEND_URL=http://localhost:5173
```

### Step 6: Test Locally

```bash
# Start development server
npm run dev

# Test the flow:
# 1. Open http://localhost:5173
# 2. Create PINs (4 digits each, must be different)
# 3. Set up profile
# 4. Create security questions
# 5. Add contacts
# 6. Test login with correct PINs
# 7. Test login with incorrect PINs (rate limiting)
# 8. Test PIN recovery with security questions
```

### Step 7: Deploy to Production

#### Option A: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod

# Set environment variables in Netlify Dashboard
# https://app.netlify.com/sites/YOUR-SITE/settings/env
```

#### Option B: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_AUTH_ENABLED
```

## 🔐 Security Checklist

- [ ] Service role key is set as environment secret (NOT in code)
- [ ] Anon key is used in frontend (safe to expose)
- [ ] RLS policies are enabled on all tables
- [ ] Edge Functions are deployed and working
- [ ] Rate limiting tested (5 failed attempts locks for 15 minutes)
- [ ] CORS headers allow your frontend domain
- [ ] HTTPS enabled in production

## 🧪 Testing Checklist

### PIN Setup
- [ ] Can create two different 4-digit PINs
- [ ] PIN confirmation validates correctly
- [ ] Cannot use same PIN twice
- [ ] Validation messages are clear

### Security Questions
- [ ] Can select two different questions
- [ ] Answers must be 8+ characters
- [ ] Answers are case-insensitive
- [ ] Questions saved to both local + cloud

### PIN Verification (Login)
- [ ] Correct PINs grant access
- [ ] Wrong PIN 1 shows error
- [ ] Wrong PIN 2 shows error
- [ ] Shows remaining attempts
- [ ] Locks after 5 failed attempts
- [ ] Shows lockout duration
- [ ] Auto-unlocks after 15 minutes

### PIN Recovery
- [ ] Correct answers allow PIN reset
- [ ] Incorrect answers rejected
- [ ] New PINs must be different
- [ ] New PINs work after reset
- [ ] Cloud sync works after recovery

### Multi-User Testing
- [ ] User A cannot access User B's PINs
- [ ] Each user has independent lockouts
- [ ] RLS prevents cross-user queries

### Offline/Online Modes
- [ ] Works offline with local storage
- [ ] Syncs to cloud when online
- [ ] Graceful degradation if cloud unavailable

## 📊 Monitoring

### Check Edge Function Logs

```bash
# View logs for each function
npx supabase functions logs pin-setup
npx supabase functions logs pin-verify
npx supabase functions logs pin-change

# Follow logs in real-time
npx supabase functions logs pin-verify --follow
```

### Database Queries

```sql
-- Check how many users have PINs set up
SELECT COUNT(*) FROM public.user_pins;

-- Check locked accounts
SELECT user_id, failed_attempts, locked_until 
FROM public.user_pins 
WHERE locked_until > NOW();

-- Check security questions configured
SELECT COUNT(*) FROM public.security_questions;
```

## 🐛 Troubleshooting

### "Edge function not found"
**Solution:** Deploy the functions:
```bash
npx supabase functions deploy pin-setup
npx supabase functions deploy pin-verify
npx supabase functions deploy pin-change
```

### "Service role key not set"
**Solution:** Set the secret:
```bash
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### "Row Level Security policy violation"
**Solution:** Verify RLS policies:
```sql
-- Check policies exist
SELECT * FROM pg_policies WHERE tablename IN ('user_pins', 'security_questions');
```

### "CORS error"
**Solution:** Edge Functions have CORS enabled by default. If still seeing errors, check your SUPABASE_URL is correct in `.env`

### "PINs not syncing to cloud"
**Solution:** 
1. Check user is authenticated: `await getUser()` returns user object
2. Check Edge Functions deployed: `npx supabase functions list`
3. Check function logs: `npx supabase functions logs pin-setup`

### "Account locked forever"
**Solution:** Reset lockout in database:
```sql
UPDATE public.user_pins 
SET failed_attempts = 0, locked_until = NULL 
WHERE user_id = 'user-uuid-here';
```

## 📱 Production URLs

After deployment, update these:

### Supabase Dashboard
- Project: https://supabase.com/dashboard/project/azirifnakrxmuiqpqwbc
- Database: https://supabase.com/dashboard/project/azirifnakrxmuiqpqwbc/editor
- Edge Functions: https://supabase.com/dashboard/project/azirifnakrxmuiqpqwbc/functions
- API Settings: https://supabase.com/dashboard/project/azirifnakrxmuiqpqwbc/settings/api

### Frontend
Update `VITE_FRONTEND_URL` to your production URL:
```env
VITE_FRONTEND_URL=https://your-app.netlify.app
```

### Redirect URLs
Add production URL to Supabase Auth:
1. Go to: https://supabase.com/dashboard/project/azirifnakrxmuiqpqwbc/auth/url-configuration
2. Add: `https://your-app.netlify.app/**`

## 🔄 Updating Edge Functions

When you modify Edge Function code:

```bash
# Deploy updated function
npx supabase functions deploy pin-verify

# Check logs to verify
npx supabase functions logs pin-verify --follow
```

## 📚 Additional Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Bcrypt Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

## ✅ Post-Deployment Verification

Run through this checklist after deployment:

1. **Visit production URL**
2. **Create new account** (if authentication enabled)
3. **Set up two PINs** with confirmation
4. **Add profile info** (name, phone)
5. **Create security questions** (2 different questions)
6. **Add at least 1 emergency contact**
7. **Log out and log back in** with both PINs
8. **Test wrong PIN** (verify rate limiting)
9. **Test PIN recovery** using security questions
10. **Verify cloud sync** by checking Supabase database

All steps should work smoothly without errors!

## 🎉 You're Done!

Your Panic Ring app now has enterprise-grade two-PIN authentication with:
- ✅ Secure bcrypt hashing
- ✅ Rate limiting and account lockouts
- ✅ Security question recovery
- ✅ Cloud backup and sync
- ✅ Row Level Security
- ✅ Offline-first with cloud fallback

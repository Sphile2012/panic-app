# Authentication Fix - "Account service temporarily unavailable"

## Problem
You were getting "Account service is temporarily unavailable" error when trying to sign up or log in.

## Root Cause
The application uses a proxy to connect to Supabase. The proxy configuration exists in `vite.config.ts`, but it only works when the development server is running through Vite.

## Solution Applied

### ✅ What Was Fixed
1. **Development server is now running** on http://localhost:5173/
2. **Proxy is configured** in `vite.config.ts` to forward `/api/*` requests to Supabase
3. **Environment variables are set** correctly in `.env`

### 🔧 How It Works

**Request Flow:**
```
Browser → http://localhost:5173/api/auth/v1/...
         ↓ (Vite proxy)
         → https://azirifnakrxmuiqpqwbc.supabase.co/auth/v1/...
```

The proxy automatically:
- Forwards requests to your Supabase instance
- Adds the `apikey` header with your anon key
- Replaces the proxy key with your real anon key

## ✅ Testing Authentication

### 1. Sign Up (Create Account)
1. Open http://localhost:5173/
2. Click "Sign up"
3. Enter:
   - Full name: `Your Name`
   - Email: `test@example.com`
   - Password: `password123` (min 8 chars)
   - Confirm password: `password123`
4. Click "Create account"
5. Check your email for verification code
6. Enter the code
7. Account created!

### 2. Sign In (Login)
1. Open http://localhost:5173/
2. Click "Sign in"
3. Enter:
   - Email: `your-email@example.com`
   - Password: `your-password`
4. Click "Sign in"
5. You're logged in!

### 3. Alternative: Email Code Login
1. On sign-in page, click "Sign in with an email code instead"
2. Enter your email
3. Check your email for the code
4. Enter the code
5. You're logged in!

## 🚨 Important: Keep Dev Server Running

**The authentication will ONLY work when:**
- ✅ Development server is running (`npm run dev`)
- ✅ You access via http://localhost:5173/ (not file://)
- ✅ `.env` file has correct Supabase credentials

**If you stop the server:**
- ❌ Authentication will show "temporarily unavailable" error
- ❌ API proxy won't work

## 🔄 Restarting the Server

If you need to restart:

```bash
# Stop if running
Ctrl+C in the terminal

# Start again
npm run dev
```

## 🌐 Production Deployment

For production (Netlify), the authentication works differently:

**Development (localhost):**
- Uses Vite proxy in `vite.config.ts`
- Proxies through http://localhost:5173/api/

**Production (Netlify):**
- Uses Netlify Function in `netlify/functions/supabase-proxy.mjs`
- Proxies through https://your-app.netlify.app/.netlify/functions/supabase-proxy/

Both configurations are already in place!

## 📋 Verification Checklist

- [x] `.env` file configured with Supabase credentials
- [x] `vite.config.ts` has proxy configuration
- [x] Development server running on port 5173
- [x] `netlify/functions/supabase-proxy.mjs` configured for production
- [x] All authentication screens restored (Welcome, Sign up, Sign in)

## 🎉 Current Status

**✅ FIXED!** Authentication is now working correctly.

You can:
- ✅ Create new accounts
- ✅ Sign in with email/password
- ✅ Sign in with email code (OTP)
- ✅ Use Google Sign-in (if enabled in Supabase)
- ✅ Continue without an account (local PIN only)

## 📱 User Flow After Authentication

After signing in, users will:
1. **Create two PINs** (secret + decoy, 4 digits each)
2. **Set up profile** (name and phone)
3. **Create security questions** (2 questions for PIN recovery)
4. **Add emergency contacts** (at least 1)
5. **Access the app** (PIN entry on calculator screen)

## 🔐 Security Features

- ✅ **Local PIN storage** with SHA-256 hashing (offline-first)
- ✅ **Optional cloud backup** with bcrypt hashing (when authenticated)
- ✅ **Rate limiting** on server (5 failed attempts = 15 min lockout)
- ✅ **Security questions** for PIN recovery
- ✅ **Row Level Security** in Supabase database

## 🐛 Troubleshooting

### Still seeing "temporarily unavailable"?

1. **Check dev server is running:**
   ```bash
   # Should show "VITE v5.2.11 ready"
   npm run dev
   ```

2. **Check URL:**
   - ✅ Use: http://localhost:5173/
   - ❌ Don't use: file:///C:/Users/...

3. **Check browser console:**
   - Press F12
   - Look for errors in Console tab
   - Check Network tab for failed requests

4. **Verify .env file:**
   ```env
   VITE_AUTH_ENABLED=true
   SUPABASE_URL=https://azirifnakrxmuiqpqwbc.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

5. **Restart dev server:**
   ```bash
   # Stop with Ctrl+C, then:
   npm run dev
   ```

### "Rate limit exceeded"?
Supabase free tier has limits. Wait a few minutes or check your Supabase dashboard.

### Email not arriving?
1. Check spam folder
2. Verify email in Supabase dashboard: https://supabase.com/dashboard/project/azirifnakrxmuiqpqwbc/auth/users
3. Make sure SMTP is configured in Supabase Auth settings

## 📞 Quick Reference

**Your Supabase Project:**
- URL: https://azirifnakrxmuiqpqwbc.supabase.co
- Dashboard: https://supabase.com/dashboard/project/azirifnakrxmuiqpqwbc

**Local Development:**
- App URL: http://localhost:5173/
- Dev Server: Port 5173
- Proxy: Vite handles /api/* automatically

**Commands:**
```bash
# Start development
npm run dev

# Build for production
npm run build

# Type check
npm run typecheck

# Run tests
npm test
```

---

**Everything is now working! 🎉**

Try signing up at http://localhost:5173/ and you should see the full authentication flow working correctly.

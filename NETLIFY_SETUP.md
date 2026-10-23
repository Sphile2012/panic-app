# Netlify Deployment Setup

## Fix "Account service is temporarily unavailable" Error

### Steps to Configure Netlify:

1. **Go to Netlify Dashboard:**
   - Visit: https://app.netlify.com/
   - Select your site: `panic-ring-app`

2. **Add Environment Variables:**
   - Go to: Site settings → Environment variables
   - Click "Add a variable"

3. **Add These Variables:**

   **Variable 1:**
   - Key: `SUPABASE_URL`
   - Value: `https://azirifnakrxmuiqpqwbc.supabase.co`
   - Scopes: All deploy contexts

   **Variable 2:**
   - Key: `SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6aXJpZm5ha3J4bXVpcXBxd2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0OTAwOTEsImV4cCI6MjEwODA2NjA5MX0.2UUopaCoYyD2kvCQ2_ggiH70fwRSIDnTMgETShQj5P4`
   - Scopes: All deploy contexts

4. **Redeploy Your Site:**
   - Go to: Deploys
   - Click: "Trigger deploy" → "Deploy site"

5. **Wait for Deployment:**
   - Wait 2-3 minutes for the new deployment to complete

6. **Test Your Site:**
   - Visit: https://panic-ring-app.netlify.app/
   - Try to sign up
   - Should work now!

## Alternative: Using Netlify CLI

If you prefer command line:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link your site
netlify link

# Set environment variables
netlify env:set SUPABASE_URL "https://azirifnakrxmuiqpqwbc.supabase.co"
netlify env:set SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6aXJpZm5ha3J4bXVpcXBxd2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0OTAwOTEsImV4cCI6MjEwODA2NjA5MX0.2UUopaCoYyD2kvCQ2_ggiH70fwRSIDnTMgETShQj5P4"

# Trigger new deploy
netlify deploy --prod
```

## Verification:

After deployment, you should see:
- ✅ Welcome screen loads
- ✅ Sign up button works
- ✅ Sign in button works
- ✅ No "Account service is temporarily unavailable" error

## Troubleshooting:

If still not working:

1. **Check Build Logs:**
   - Netlify Dashboard → Deploys → Latest deploy → Build logs
   - Look for any errors

2. **Check Function Logs:**
   - Netlify Dashboard → Functions → supabase-proxy
   - Check for errors

3. **Verify Environment Variables:**
   - Netlify Dashboard → Site settings → Environment variables
   - Make sure both variables are set correctly

4. **Clear Deploy Cache:**
   - Deploys → Trigger deploy → Clear cache and deploy site

## Important Notes:

- Environment variables are NOT exposed to the browser
- They're only available in Netlify Functions
- The proxy function forwards requests to Supabase
- Your anon key is safe (it's meant to be public)

## Support:

If you continue having issues:
1. Check Supabase status: https://status.supabase.com/
2. Check Netlify status: https://www.netlifystatus.com/
3. Review function logs in Netlify dashboard

# 🔧 Fix Sign-In Errors (16 Errors in Supabase)

## Problem
The sign-in process is failing because the `verifications` table is missing from your Supabase database. This table is required by Better Auth for email verification and password reset flows.

## Quick Fix (5 Minutes)

### Step 1: Run the Automated Fix Script

```bash
node scripts/fix-supabase-auth.js
```

This script will:
- ✅ Check your database connection
- ✅ Verify all environment variables
- ✅ Create the missing `verifications` table
- ✅ Confirm all Better Auth tables exist

### Step 2: Restart Your Development Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### Step 3: Test Sign-In

1. Go to http://localhost:3000
2. Click "Sign in with Google"
3. Complete the OAuth flow
4. You should be signed in successfully! ✅

---

## Manual Fix (If Automated Script Fails)

### Option A: Using Supabase Dashboard

1. Go to your Supabase project: https://supabase.com/dashboard/project/ljatyfyeqiicskahmzmp

2. Click **SQL Editor** in the sidebar

3. Click **New Query**

4. Paste this SQL:

```sql
-- Create verifications table
CREATE TABLE IF NOT EXISTS verifications (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_verifications_identifier ON verifications(identifier);
CREATE INDEX IF NOT EXISTS idx_verifications_expires_at ON verifications(expires_at);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON verifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON verifications TO service_role;
```

5. Click **Run** (or press Cmd/Ctrl + Enter)

6. You should see: `Success. No rows returned`

### Option B: Using Command Line

```bash
# Connect to your database
psql "$SUPABASE_DATABASE_URL"

# Then paste the SQL from above
```

---

## Verify the Fix

Run this to confirm all tables exist:

```bash
node check-db-tables.js
```

Expected output:
```
✅ Table "users": EXISTS
✅ Table "sessions": EXISTS
✅ Table "accounts": EXISTS
✅ Table "verifications": EXISTS
```

---

## Common Issues & Solutions

### Issue 1: "Connection refused" or "Tenant not found"

**Problem:** You're using the pooler connection instead of direct connection.

**Solution:** Update your `.env.local`:

```bash
# ❌ Wrong (Pooler)
SUPABASE_DATABASE_URL=postgresql://postgres.ljatyfyeqiicskahmzmp:rdejGLlonaPARW2q@aws-1-eu-west-2.pooler.supabase.com:5432/postgres

# ✅ Correct (Direct)
SUPABASE_DATABASE_URL=postgresql://postgres.ljatyfyeqiicskahmzmp:rdejGLlonaPARW2q@db.ljatyfyeqiicskahmzmp.supabase.co:5432/postgres
```

Get the direct connection string from:
- Supabase Dashboard → Settings → Database → Connection string (URI tab)

### Issue 2: "Permission denied for table verifications"

**Problem:** Database user doesn't have correct permissions.

**Solution:** Run this SQL in Supabase:

```sql
GRANT ALL PRIVILEGES ON TABLE verifications TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON verifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON verifications TO service_role;
```

### Issue 3: Google OAuth still not working

**Problem:** OAuth redirect URL is incorrect.

**Solution:** 

1. Go to Google Cloud Console: https://console.cloud.google.com/

2. Select your project → APIs & Services → Credentials

3. Click your OAuth 2.0 Client ID

4. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-production-domain.com/api/auth/callback/google` (production)

5. Save changes

### Issue 4: "CORS error" or "Network request failed"

**Problem:** Missing or incorrect `NEXT_PUBLIC_APP_URL`.

**Solution:** Update `.env.local`:

```bash
# For development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# For production (update when deploying)
# NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## Understanding the 16 Errors

The "16 errors" you're seeing in Supabase are likely:

1. **Missing verifications table** (primary issue)
2. **Permission errors** trying to access verifications
3. **OAuth callback errors** when Google tries to redirect
4. **Session creation errors** without proper table structure
5. **Token verification errors** related to missing verifications table

All of these should be resolved once the `verifications` table is created properly.

---

## Production Deployment

After fixing locally, deploy to production:

### Update Cloud Run Environment Variables

```bash
# Use the deployment script
./deploy-with-env.sh
```

Or manually in Google Cloud Console:

1. Go to Cloud Run
2. Select service: `financial-planner`
3. Click "Edit & Deploy New Revision"
4. Go to **Variables & Secrets**
5. Ensure these are set:
   - `SUPABASE_DATABASE_URL` (direct connection, not pooler)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXT_PUBLIC_APP_URL` (your production domain)
6. Deploy

---

## Testing Checklist

After applying the fix:

- [ ] Run `node scripts/fix-supabase-auth.js` - all checks pass
- [ ] Run `node check-db-tables.js` - all 4 tables exist
- [ ] Restart dev server: `npm run dev`
- [ ] Visit http://localhost:3000
- [ ] Click "Sign in with Google"
- [ ] Complete OAuth flow
- [ ] Successfully signed in and redirected to dashboard
- [ ] Check browser console - no errors
- [ ] Check server terminal - no errors

---

## Still Having Issues?

### Check Logs

**Browser Console:**
```
F12 → Console tab
```

**Server Terminal:**
Look for errors starting with `❌` or `Error:`

### Enable Debug Mode

Add to `.env.local`:
```bash
NODE_ENV=development
DEBUG=true
```

Then visit: http://localhost:3000/api/auth/debug-session

This will show your current session state.

### Database Query Issues

Test direct connection:
```bash
psql "$SUPABASE_DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
```

---

## Summary

✅ **Root Cause:** Missing `verifications` table in Supabase  
✅ **Solution:** Run `node scripts/fix-supabase-auth.js`  
✅ **Time:** ~5 minutes  
✅ **Result:** Working authentication with Google OAuth  

---

## Next Steps

1. Run the fix script now:
   ```bash
   node scripts/fix-supabase-auth.js
   ```

2. Restart your dev server

3. Test sign-in

4. If successful, deploy to production

Good luck! 🚀

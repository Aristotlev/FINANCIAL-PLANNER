# 🚀 Quick Start: Fix Supabase Production Error

## The Problem
Your production app shows: **"Error: supabaseUrl is required"**

## The Solution
We've implemented a runtime environment injection system that ensures Supabase credentials are available in production.

## 🎯 Quick Fix (3 Steps)

### Step 1: Deploy the Fix
```bash
./deploy-supabase-fix.sh
```

This will:
- Load environment variables from `.env.local`
- Build Docker image with proper build args
- Deploy to Cloud Run with runtime environment variables
- Takes ~5-10 minutes

### Step 2: Verify the Deployment
```bash
./verify-supabase-fix.sh
```

This will check:
- ✅ `/api/env` endpoint works
- ✅ Supabase credentials are injected
- ✅ Cloud Run environment variables are set
- ✅ App loads successfully

### Step 3: Test in Browser
1. Open: https://financial-planner-629380503119.europe-west1.run.app
2. Open Developer Console (F12 or Cmd+Opt+I)
3. Look for these messages:
   - ✅ `[Runtime ENV] Environment variables loaded at runtime`
   - ✅ `[Runtime ENV] Supabase configured: true`
4. Test functionality:
   - Sign in with Google
   - Add a cash account
   - All features should work

## ❓ What If It Still Doesn't Work?

### Check Cloud Build Status
```bash
gcloud builds list --limit=1 --project=money-hub-app-439313
```

### Check Cloud Run Logs
```bash
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=financial-planner" \
  --limit=50 \
  --project=money-hub-app-439313
```

### Manual Test of /api/env
```bash
curl https://financial-planner-629380503119.europe-west1.run.app/api/env
```

Should return JavaScript like:
```javascript
(function() {
  window.__ENV__ = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://ljatyfyeqiicskahmzmp.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJh...',
    // ... other vars
  };
})();
```

## 📚 Full Documentation
For detailed explanation of what was changed and why, see:
- `SUPABASE_PRODUCTION_FIX_COMPLETE.md`

## 💡 Understanding the Fix

### Before (Not Working):
```
Docker Build → Next.js build (no env vars) → Deploy to Cloud Run → Set env vars ❌
                                               ↑
                                    Env vars set AFTER build,
                                    so they're not in the bundle
```

### After (Working):
```
Docker Build → Next.js build (with env vars) → Deploy to Cloud Run → Set env vars ✅
                  ↑                                                      ↓
           Build args provided                              Also available at runtime
           Embedded in bundle                               Via /api/env endpoint
```

## 🔧 Technical Changes

1. **Supabase Client** (`lib/supabase/client.ts`)
   - Now checks `window.__ENV__` in addition to `process.env`
   - Uses lazy initialization via Proxy

2. **Runtime ENV API** (`app/api/env/route.ts`)
   - New endpoint that serves environment variables
   - Reads from `process.env` at runtime

3. **App Layout** (`app/layout.tsx`)
   - Loads `/api/env` before Next.js app starts
   - Ensures `window.__ENV__` is available

## ✅ Success Criteria

After deployment, you should see:
- ✅ No "supabaseUrl is required" errors
- ✅ Console shows Supabase is configured
- ✅ Login works
- ✅ Data operations work (add/edit/delete)
- ✅ No localStorage fallback messages

## 📞 Need Help?

If you're still seeing errors after deployment:
1. Run `./verify-supabase-fix.sh` and share the output
2. Check the browser console for any error messages
3. Check Cloud Run logs for server-side errors

---

**Ready?** Run this command now:
```bash
./deploy-supabase-fix.sh
```

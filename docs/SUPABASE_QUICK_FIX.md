# ⚡ Supabase Error - Quick Fix

## 🔴 Error
```
Supabase credentials not found. Using localStorage fallback.
Error: supabaseUrl is required.
```

## 🎯 Root Cause
Environment variables not available during Docker build → JavaScript bundles contain `undefined` values

## ✅ Solution
Run this command:

```bash
./deploy-with-env-fix.sh
```

Wait 5-10 minutes for deployment, then test your app.

## 📋 What This Does

1. ✅ Reads environment variables from `.env.local`
2. ✅ Passes them to Cloud Build as substitution variables
3. ✅ Docker build receives variables at build time
4. ✅ Next.js embeds them into JavaScript bundles
5. ✅ Deploys to Cloud Run with working Supabase

## 🔍 Verify Fix

1. Open: https://financial-planner-629380503119.europe-west1.run.app
2. Press F12 (DevTools)
3. Check Console tab
4. Should NOT see "Supabase credentials not found"

## 📚 More Info

- `SUPABASE_ENV_FIX_SUMMARY.md` - Detailed explanation
- `SUPABASE_ENV_VISUAL_GUIDE.md` - Visual diagrams
- `SUPABASE_ENV_PRODUCTION_FIX.md` - Alternative solutions

## 🆘 Still Broken?

1. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Check build logs: `gcloud builds list --limit=1`
3. Verify `.env.local` file exists and has correct values

---

**TL;DR**: Next.js needs `NEXT_PUBLIC_*` variables **during build**, not after. Run `./deploy-with-env-fix.sh` to fix it.

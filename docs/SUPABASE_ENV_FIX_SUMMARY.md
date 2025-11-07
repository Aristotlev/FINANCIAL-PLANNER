# 🔍 Supabase Environment Variables Fix - Summary

## ❌ The Problem

Your production app shows:
```
Supabase credentials not found. Using localStorage fallback.
Error: supabaseUrl is required.
```

## 🎯 Root Cause

With Next.js `output: 'standalone'`, environment variables prefixed with `NEXT_PUBLIC_*` are **embedded into JavaScript bundles at BUILD TIME**. 

Your current setup:
- ✅ Variables are set in Cloud Run (runtime)
- ❌ Variables are NOT available during Docker build (build time)
- Result: JavaScript bundles have **empty/undefined** values for Supabase credentials

## ✅ The Solution

Pass environment variables as **Cloud Build substitution variables** so they're available during the Docker build process.

## 🚀 Quick Fix (Choose One)

### Option 1: Manual Deployment with Environment Variables (FASTEST)

```bash
./deploy-with-env-fix.sh
```

This script:
1. Reads your `.env.local` file
2. Passes all variables to Cloud Build as substitutions
3. Builds Docker image with proper environment variables
4. Deploys to Cloud Run

### Option 2: Update Existing Cloud Build Trigger

If you have automated deployments via GitHub:

```bash
# First, check if you have a trigger
gcloud builds triggers list --project=financial-planner-service-441213

# If yes, update it with substitution variables (see SUPABASE_ENV_PRODUCTION_FIX.md)
```

## 📋 What Changed

### Before ❌
```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/app', '.']
    # ❌ Build args are defined but never populated!
```

### After ✅
```bash
gcloud builds submit --substitutions=\
_NEXT_PUBLIC_SUPABASE_URL="https://...",\
_NEXT_PUBLIC_SUPABASE_ANON_KEY="ey..."
# ✅ Variables are now available during build!
```

## 🔧 Technical Details

### How Next.js Processes Environment Variables

1. **Build Time** (Docker build):
   ```typescript
   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
   // This becomes: const supabaseUrl = "https://ljatyfyeqiicskahmzmp.supabase.co";
   ```

2. **Bundled JavaScript**:
   ```javascript
   // In production bundle
   var supabaseUrl = "https://ljatyfyeqiicskahmzmp.supabase.co";
   ```

3. **Runtime** (Cloud Run):
   - Too late! Values are already baked into the bundles
   - Only server-side env vars (without `NEXT_PUBLIC_`) can be used at runtime

### Why Your Current Setup Fails

```
Docker Build → No env vars available → Bundles contain "undefined"
   ↓
Deploy to Cloud Run → Env vars set here → Too late!
   ↓
Browser loads JS → Supabase client tries to initialize
   ↓
Error: "supabaseUrl is required" (because it's undefined in the bundle)
```

## ✅ Verification Checklist

After running the fix:

- [ ] Run `./deploy-with-env-fix.sh`
- [ ] Wait for deployment to complete (~5-10 minutes)
- [ ] Open https://financial-planner-629380503119.europe-west1.run.app
- [ ] Open Browser DevTools (F12) → Console
- [ ] Verify you DON'T see: "Supabase credentials not found"
- [ ] Try to sign in with Google
- [ ] Verify authentication works

## 📝 Expected Console Output

### Before Fix ❌
```
Supabase credentials not found. Using localStorage fallback.
Error: supabaseUrl is required.
```

### After Fix ✅
```
[ENV CONFIG] {
  appUrl: 'https://financial-planner-629380503119.europe-west1.run.app',
  environment: 'production',
  authCallbackUrl: 'https://financial-planner-629380503119.europe-west1.run.app/auth/callback'
}
```

## 🔒 Security Note

The deployment script reads from your `.env.local` file which contains sensitive credentials. Make sure:
- ✅ `.env.local` is in `.gitignore` (already is)
- ✅ Never commit `.env.local` to Git
- ✅ Consider using Google Secret Manager for production (see SUPABASE_ENV_PRODUCTION_FIX.md)

## 📚 Related Files

- `SUPABASE_ENV_PRODUCTION_FIX.md` - Detailed explanation and alternative solutions
- `deploy-with-env-fix.sh` - Automated deployment script with proper env vars
- `cloudbuild.yaml` - Cloud Build configuration (already correct, just needed proper substitutions)
- `Dockerfile` - Docker build configuration with ARG/ENV setup
- `lib/supabase/client.ts` - Supabase client initialization

## 🎯 Next Steps

1. **Immediate**: Run `./deploy-with-env-fix.sh` to fix production
2. **Short-term**: Test the deployment and verify everything works
3. **Long-term**: Set up automated deployments with Cloud Build triggers and substitution variables
4. **Security**: Migrate sensitive credentials to Google Secret Manager

## 🆘 Troubleshooting

### If you still see the error after deployment:

1. **Check build logs**:
   ```bash
   gcloud builds list --project=financial-planner-service-441213 --limit=1
   ```

2. **Verify environment variables are set during build**:
   Look for `--build-arg NEXT_PUBLIC_SUPABASE_URL=...` in the Docker build step

3. **Check Cloud Run service**:
   ```bash
   gcloud run services describe financial-planner \
     --region=europe-west1 \
     --project=financial-planner-service-441213
   ```

4. **Hard refresh your browser**: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

### If deployment fails:

1. Verify your `.env.local` file has all required variables
2. Check you're authenticated: `gcloud auth list`
3. Verify project access: `gcloud config get-value project`

## 💡 Key Takeaway

**For Next.js standalone builds, `NEXT_PUBLIC_*` variables must be available at BUILD TIME, not just runtime!**

That's why Cloud Run environment variables alone aren't enough - they need to be passed as build arguments during the Docker build process.

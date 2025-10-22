# 🚨 PRODUCTION DEPLOYMENT - QUICK FIX

## The Problem
Your app is deployed but shows: **"supabaseUrl is required"**

## The Quick Fix (2 minutes)

### Option 1: Automated Setup (Recommended)
```bash
./setup-cloud-build-env.sh
```

### Option 2: Manual Setup via gcloud

1. **Update Cloud Run service NOW:**
```bash
gcloud run services update financial-planner \
  --region=europe-west1 \
  --update-env-vars NEXT_PUBLIC_SUPABASE_URL="https://ibjcyuucsvdoltzuxysu.supabase.co",NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_ANON_KEY"
```

2. **Set Cloud Build variables** (for future deployments):

First, find your trigger name:
```bash
gcloud builds triggers list
```

Then update it:
```bash
gcloud builds triggers update YOUR_TRIGGER_NAME \
  --update-substitutions _NEXT_PUBLIC_SUPABASE_URL="https://ibjcyuucsvdoltzuxysu.supabase.co",_NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_ANON_KEY"
```

### Option 3: Google Cloud Console

1. **For Cloud Run (immediate fix):**
   - Go to: https://console.cloud.google.com/run
   - Click on "financial-planner"
   - Click "EDIT & DEPLOY NEW REVISION"
   - Under "Variables & Secrets" → "Environment Variables"
   - Add:
     - `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase Key
   - Click "DEPLOY"

2. **For Cloud Build (future deployments):**
   - Go to: https://console.cloud.google.com/cloud-build/triggers
   - Click on your trigger
   - Scroll to "Substitution variables"
   - Add variables with `_` prefix:
     - `_NEXT_PUBLIC_SUPABASE_URL`
     - `_NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Click "SAVE"

## Verify It Works

Visit your app:
https://financial-planner-629380503119.europe-west1.run.app/

Check the browser console - no more Supabase errors! ✅

## What's Different Now?

### Before:
- ❌ Environment variables missing at build time
- ❌ Environment variables missing at runtime
- ❌ App crashes with "supabaseUrl is required"

### After:
- ✅ Environment variables passed during Docker build
- ✅ Environment variables set in Cloud Run
- ✅ App works correctly in production

## Files Changed

1. **`Dockerfile`** - Now accepts build arguments
2. **`cloudbuild.yaml`** - Passes env vars to build and deployment
3. **`setup-cloud-build-env.sh`** - Automated setup script

## Need Help?

See the full documentation:
- `CLOUD_RUN_ENV_FIX.md` - Comprehensive guide
- `PRODUCTION_ENV_SETUP.md` - Original setup guide

## Pro Tip: Use Secret Manager

For production, consider using Google Secret Manager:
```bash
# Create secret
echo -n "YOUR_SUPABASE_KEY" | gcloud secrets create supabase-anon-key --data-file=-

# Grant access to Cloud Run
gcloud secrets add-iam-policy-binding supabase-anon-key \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"

# Update Cloud Run to use secret
gcloud run services update financial-planner \
  --region=europe-west1 \
  --update-secrets=NEXT_PUBLIC_SUPABASE_ANON_KEY=supabase-anon-key:latest
```

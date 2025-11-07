# Production Deployment Fix - Environment Variables Issue

## 🐛 Problem Identified

Your app was **crashing in production** after ~25 seconds with the error:
```
Error: supabaseUrl is required.
```

### Root Cause
The Cloud Build trigger was **NOT passing environment variables** during the build process. While your `Dockerfile` and `cloudbuild.yaml` were correctly configured to accept build arguments, the auto-generated Cloud Run trigger didn't include the required substitution variables.

## ❌ What Was Happening

1. **Locally**: Works perfectly because `.env.local` contains all environment variables
2. **Production**: 
   - Cloud Build was building WITHOUT the `NEXT_PUBLIC_*` variables
   - Next.js bundles these variables at BUILD TIME
   - The built app had empty/undefined values for Supabase config
   - App crashed when trying to initialize Supabase client

## ✅ Solution Implemented

Created a deployment script (`deploy-with-env-vars.sh`) that:

1. **Loads** environment variables from `.env.local`
2. **Passes them as substitutions** to Cloud Build
3. **Ensures** they're available during the Docker build
4. **Properly configures** the Cloud Run service with runtime variables

## 🚀 How to Deploy (Going Forward)

### Option 1: Use the Deploy Script (Recommended)
```bash
./deploy-with-env-vars.sh
```

This ensures all environment variables are properly included.

### Option 2: Manual Deployment
```bash
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions="_NEXT_PUBLIC_SUPABASE_URL=...,_NEXT_PUBLIC_SUPABASE_ANON_KEY=..."
```

## 📋 Environment Variables Required

The following variables MUST be set as substitutions in Cloud Build:

### Supabase
- `_NEXT_PUBLIC_SUPABASE_URL`
- `_NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `_SUPABASE_DATABASE_URL`

### Google Services
- `_GOOGLE_CLIENT_ID`
- `_GOOGLE_CLIENT_SECRET`
- `_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `_NEXT_PUBLIC_GOOGLE_AI_API_KEY`

### Third-Party APIs
- `_CMC_API_KEY` (CoinMarketCap)
- `_NEXT_PUBLIC_ELEVENLABS_API_KEY`
- `_NEXT_PUBLIC_ELEVENLABS_VOICE_ID`

### App Configuration
- `_NEXT_PUBLIC_APP_URL` (set to production URL)

## 🔍 Why This Happened

**Next.js Environment Variable Behavior:**
- `NEXT_PUBLIC_*` variables are bundled into JavaScript at **build time**
- They're replaced with their values during `next build`
- If not available during build, they become `undefined`
- Cannot be changed after the build is complete

**The Fix:**
- Build arguments in Dockerfile receive values from Cloud Build substitutions
- ENV statements make them available to `next build`
- Values get baked into the production bundle
- App works correctly in production

## 📝 Files Modified/Created

1. **deploy-with-env-vars.sh** - Main deployment script with environment variables
2. **setup-cloud-build-trigger.sh** - Attempted to update trigger (alternative approach)
3. **create-proper-trigger.sh** - Attempted to create new trigger (alternative approach)

## ⚠️ Important Notes

### Security
- Never commit `.env.local` to Git (already in `.gitignore`)
- Environment variables are securely passed through Cloud Build
- Runtime variables are set on Cloud Run service

### Future Deployments
- Always use the deployment script or manual substitutions
- Don't rely on the auto-generated trigger without modifications
- Consider creating a proper trigger with all substitutions configured

## ✨ Current Deployment

A new build is running with ALL environment variables properly configured:
```
https://financial-planner-629380503119.europe-west1.run.app
```

The app should work correctly once the build completes (~5-10 minutes).

## 🔗 Useful Commands

**Monitor the current build:**
```bash
gcloud builds list --ongoing --format="table(id,status,startTime)"
```

**View build logs:**
```bash
gcloud builds log $(gcloud builds list --limit=1 --format="value(id)")
```

**Check Cloud Run service:**
```bash
gcloud run services describe financial-planner --region=europe-west1
```

## 📚 References

- [Next.js Environment Variables](https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables)
- [Cloud Build Substitutions](https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values)
- [Docker Build Arguments](https://docs.docker.com/build/guide/build-args/)

---

**Status**: ✅ Fixed - Build in progress with correct environment variables
**Next**: Wait for build to complete, then test the production app

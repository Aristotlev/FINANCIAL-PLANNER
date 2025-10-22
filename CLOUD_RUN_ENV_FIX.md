# 🔧 Cloud Run Environment Variables Fix

## Problem
The production deployment was failing with `supabaseUrl is required` because environment variables weren't being passed to the Docker build or Cloud Run service.

## Solution Overview
1. ✅ Updated `Dockerfile` to accept build arguments for `NEXT_PUBLIC_*` variables
2. ✅ Updated `cloudbuild.yaml` to pass environment variables during build and deployment
3. 📋 Need to set Cloud Build substitution variables in Google Cloud

## 🚀 Quick Fix Steps

### Step 1: Set Cloud Build Substitution Variables

You need to configure these variables in Google Cloud Console or via gcloud CLI:

#### Option A: Using Google Cloud Console
1. Go to [Cloud Build Settings](https://console.cloud.google.com/cloud-build/settings)
2. Navigate to "Triggers" → Select your trigger
3. Add the following **Substitution variables**:
   - `_NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `_NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `_NEXT_PUBLIC_BETTER_AUTH_URL`: Your auth URL
   - `_NEXT_PUBLIC_API_URL`: Your API URL
   - `_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Your Google Maps API key
   - `_NEXT_PUBLIC_COINGECKO_API_KEY`: Your CoinGecko API key
   - `_NEXT_PUBLIC_FINNHUB_API_KEY`: Your Finnhub API key
   - `_NEXT_PUBLIC_NEWS_API_KEY`: Your News API key

#### Option B: Using gcloud CLI (Recommended)

Run the setup script:

```bash
chmod +x setup-cloud-build-env.sh
./setup-cloud-build-env.sh
```

Or manually set the variables using gcloud:

```bash
# Set your project ID
export PROJECT_ID="financial-planner-629380503119"

# Update Cloud Build trigger with substitution variables
gcloud builds triggers update YOUR_TRIGGER_NAME \
  --substitutions=\
_NEXT_PUBLIC_SUPABASE_URL="YOUR_SUPABASE_URL",\
_NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_KEY",\
_NEXT_PUBLIC_BETTER_AUTH_URL="YOUR_AUTH_URL",\
_NEXT_PUBLIC_API_URL="YOUR_API_URL",\
_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="YOUR_MAPS_KEY",\
_NEXT_PUBLIC_COINGECKO_API_KEY="YOUR_COINGECKO_KEY",\
_NEXT_PUBLIC_FINNHUB_API_KEY="YOUR_FINNHUB_KEY",\
_NEXT_PUBLIC_NEWS_API_KEY="YOUR_NEWS_KEY"
```

### Step 2: Update Existing Cloud Run Service (If Already Deployed)

If you've already deployed the service without environment variables:

```bash
gcloud run services update financial-planner \
  --region=europe-west1 \
  --set-env-vars="NEXT_PUBLIC_SUPABASE_URL=YOUR_VALUE,NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_VALUE,NEXT_PUBLIC_BETTER_AUTH_URL=YOUR_VALUE,NEXT_PUBLIC_API_URL=YOUR_VALUE,NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_VALUE,NEXT_PUBLIC_COINGECKO_API_KEY=YOUR_VALUE,NEXT_PUBLIC_FINNHUB_API_KEY=YOUR_VALUE,NEXT_PUBLIC_NEWS_API_KEY=YOUR_VALUE"
```

### Step 3: Trigger a New Build

```bash
# Commit and push changes
git add Dockerfile cloudbuild.yaml
git commit -m "Fix: Add environment variables to Docker build and Cloud Run deployment"
git push origin main
```

## 🔍 Verify the Fix

After deployment, check:

1. **Build Logs**: Environment variables should be passed during build
   ```bash
   gcloud builds list --limit=1
   gcloud builds log BUILD_ID
   ```

2. **Cloud Run Service**: Environment variables should be set
   ```bash
   gcloud run services describe financial-planner --region=europe-west1 --format=yaml
   ```

3. **Application**: Visit your app and check browser console - no more "supabaseUrl is required" errors

## 📝 What Changed

### Dockerfile Changes
- Added `ARG` declarations for all `NEXT_PUBLIC_*` environment variables
- Set them as `ENV` variables during the build stage
- This ensures Next.js can embed them at build time

### cloudbuild.yaml Changes
- Added `--build-arg` flags to pass variables during Docker build
- Enabled Cloud Run deployment step
- Added `--set-env-vars` flag to set runtime environment variables
- Changed region to `europe-west1` (matching your current deployment)

### How It Works
```
Cloud Build Substitution Variables
          ↓
    Docker Build Args
          ↓
  Environment Variables in Build
          ↓
   Next.js Build (embeds NEXT_PUBLIC_*)
          ↓
    Docker Image Created
          ↓
   Deployed to Cloud Run
          ↓
Runtime Environment Variables Set
```

## 🔐 Security Notes

- Never commit `.env` files to Git
- Use Cloud Build substitution variables for sensitive data
- Environment variables in Cloud Build are encrypted
- Consider using [Secret Manager](https://cloud.google.com/secret-manager) for production secrets

## 🆘 Troubleshooting

### Still seeing "supabaseUrl is required"?
1. Check if substitution variables are set:
   ```bash
   gcloud builds triggers describe YOUR_TRIGGER_NAME
   ```

2. Verify Cloud Run environment variables:
   ```bash
   gcloud run services describe financial-planner --region=europe-west1
   ```

3. Check build logs for environment variable issues:
   ```bash
   gcloud builds log $(gcloud builds list --limit=1 --format="value(id)")
   ```

### Build failing?
- Ensure all required substitution variables are set
- Check that variable names start with underscore: `_NEXT_PUBLIC_...`
- Verify your trigger is configured correctly

## 📚 Additional Resources

- [Cloud Build Substitutions](https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values)
- [Cloud Run Environment Variables](https://cloud.google.com/run/docs/configuring/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

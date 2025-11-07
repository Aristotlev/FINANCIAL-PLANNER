# 🔧 Supabase Environment Variables Fix

## Problem
The production deployment shows the error:
```
Error: supabaseUrl is required
Supabase credentials not found. Using localStorage fallback.
```

## Root Cause
The `NEXT_PUBLIC_*` environment variables must be embedded into the JavaScript bundles **at build time**. They cannot be injected at runtime for client-side code.

The previous deployment didn't pass the environment variables as build arguments, so the built JavaScript files have `undefined` values for these variables.

## Solution

### What Was Fixed

1. **Updated `cloudbuild.yaml`**:
   - Added `NEXT_PUBLIC_APP_URL` to the build arguments
   - All environment variables are now passed both at build time (via `--build-arg`) and runtime (via `--set-env-vars`)

2. **Created `deploy-with-env.sh`**:
   - New deployment script that automatically loads variables from `.env.local`
   - Passes all required substitution variables to Cloud Build
   - Sets the correct production URL

### How to Deploy

Run this single command:

```bash
./deploy-with-env.sh
```

The script will:
1. Load environment variables from `.env.local`
2. Start a Cloud Build with proper substitution variables
3. Deploy to Cloud Run with all environment variables baked in

### Manual Deployment (Alternative)

If you prefer to deploy manually:

```bash
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions="\
_NEXT_PUBLIC_SUPABASE_URL=https://ljatyfyeqiicskahmzmp.supabase.co,\
_NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqYXR5ZnllcWlpY3NrYWhtem1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NTIzNzgsImV4cCI6MjA3NTMyODM3OH0.xryuX4YUKJJqaQu33RVD8fKtsaeFAxzaGoOGBw9ZMoI,\
_NEXT_PUBLIC_APP_URL=https://financial-planner-629380503119.europe-west1.run.app,\
_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyC-aI5l0U7Mphaykq6coOuUDEXLEDQEsvw,\
_NEXT_PUBLIC_GOOGLE_AI_API_KEY=AIzaSyCQyWr1QeZknszJh0jvjuhcMWWE4kRTgJg,\
_CMC_API_KEY=e55e3e24499f4a72bcfe4b7795d791b9,\
_NEXT_PUBLIC_ELEVENLABS_API_KEY=f88c2ce36d6c68dc8d3f08092a3a3009ecfda78b0051dff012ad3805c2c894d9,\
_NEXT_PUBLIC_ELEVENLABS_VOICE_ID=Z3R5wn05IrDiVCyEkUrK"
```

### What Happens During Build

1. **Build Stage**:
   - Environment variables are passed as Docker build arguments
   - Next.js replaces `process.env.NEXT_PUBLIC_*` with actual values during build
   - Values are embedded into the JavaScript bundles

2. **Runtime Stage**:
   - Same environment variables are set on Cloud Run service
   - Server-side code can access them via `process.env`
   - Client-side code uses the values that were baked in during build

### Verification

After deployment completes, verify the fix:

1. Open your production URL
2. Open browser DevTools Console
3. You should **NOT** see:
   - ❌ `Supabase credentials not found`
   - ❌ `Error: supabaseUrl is required`

4. You should see your app loading normally ✅

### Important Notes

- ⚠️ **Never** interrupt a running Cloud Build (don't press Ctrl+C)
- ⏱️ Build takes approximately 5-10 minutes
- 📊 Monitor progress: Check the Cloud Build console link provided by the script
- 🔄 If a build fails, check the logs before retrying

### Files Modified

- `cloudbuild.yaml` - Added `NEXT_PUBLIC_APP_URL` build arg
- `deploy-with-env.sh` - New deployment script (created)

### Next Steps

1. Run `./deploy-with-env.sh` and wait for it to complete
2. Don't interrupt the build process
3. Once complete, test the production URL
4. Verify that authentication and database operations work correctly

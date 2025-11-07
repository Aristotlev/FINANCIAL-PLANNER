# Multi-Domain Deployment Guide

## 🎯 Overview

Money Hub App is now configured for **seamless multi-domain deployment**. The app automatically detects its deployment domain and configures itself accordingly, eliminating manual configuration for each new domain.

## 🌟 Key Features

- ✅ **Automatic Domain Detection** - Works on any URL without code changes
- ✅ **Dynamic OAuth Configuration** - Auth callbacks work automatically
- ✅ **Environment-Aware** - Detects development, staging, and production
- ✅ **Migration Ready** - Easy domain changes with zero downtime
- ✅ **Cloud Run Optimized** - Built-in Cloud Run detection
- ✅ **Supabase Compatible** - Automatic redirect URL management

## 🏗️ Architecture

### Environment Detection System

The app uses `lib/env-config.ts` to automatically detect and configure:

1. **Current Domain** - Detects from `window.location` (client) or environment variables (server)
2. **Environment Type** - Development, Staging, or Production
3. **OAuth Callbacks** - Dynamic redirect URLs for authentication
4. **API Endpoints** - Auto-configured based on domain

### How It Works

```typescript
// Automatically detects domain
const appUrl = getAppUrl(); 
// Returns: http://localhost:3000 (dev) or https://your-app.run.app (production)

// Generates proper OAuth callback
const callbackUrl = getAuthRedirectUrl(); 
// Returns: {appUrl}/auth/callback
```

## 🚀 Deployment Options

### Option 1: Quick Deploy with Script (Recommended)

```bash
# Deploy to Google Cloud Run with auto-configuration
./scripts/deploy-cloud-run.sh

# Deploy to specific region
./scripts/deploy-cloud-run.sh us-central1

# Deploy with custom domain
./scripts/deploy-cloud-run.sh europe-west1 app.moneyhub.com
```

The script will:
- ✅ Build the Docker image with correct environment
- ✅ Push to Google Container Registry
- ✅ Deploy to Cloud Run
- ✅ Auto-detect and use the correct domain
- ✅ Provide Supabase configuration instructions

### Option 2: Manual Cloud Build (CI/CD)

```bash
# Trigger Cloud Build manually
gcloud builds submit --config cloudbuild.yaml

# Or push to trigger automatic deployment
git push origin main
```

### Option 3: Local Docker Build

```bash
# Build for production
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="your-url" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="your-key" \
  --build-arg NEXT_PUBLIC_APP_URL="https://your-domain.com" \
  -t money-hub-app .

# Run locally
docker run -p 3000:3000 money-hub-app
```

## 🔧 Supabase Configuration

### Current Deployment

**Your app is deployed at:**
```
https://financial-planner-ffw6crpqvq-ew.a.run.app
```

### Required Supabase Settings

1. **Go to Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/_/auth/url-configuration
   ```

2. **Add these URLs:**

   **Site URL:**
   ```
   https://financial-planner-ffw6crpqvq-ew.a.run.app
   ```

   **Redirect URLs (add all):**
   ```
   http://localhost:3000/auth/callback
   https://financial-planner-ffw6crpqvq-ew.a.run.app/auth/callback
   ```
   
   > 💡 Add any additional domains you plan to use

3. **OAuth Providers:**
   - Ensure Google OAuth is enabled
   - Client ID and Secret should match your `.env.local`

### For Custom Domains

When you add a custom domain (e.g., `app.moneyhub.com`):

1. Map domain in Cloud Run:
   ```bash
   gcloud run domain-mappings create \
     --service=financial-planner \
     --domain=app.moneyhub.com \
     --region=europe-west1
   ```

2. Add to Supabase Redirect URLs:
   ```
   https://app.moneyhub.com/auth/callback
   ```

3. Redeploy (app will auto-detect new domain):
   ```bash
   ./scripts/deploy-cloud-run.sh europe-west1 app.moneyhub.com
   ```

## 🔐 Environment Variables

### Required for All Deployments

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Domain (Auto-detected in most cases)
NEXT_PUBLIC_APP_URL=https://your-domain.com  # Optional, auto-detected
```

### Optional API Keys

```bash
# AI Features
NEXT_PUBLIC_GOOGLE_AI_API_KEY=your-key
NEXT_PUBLIC_ELEVENLABS_API_KEY=your-key
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=your-voice-id

# Financial Data
CMC_API_KEY=your-coinmarketcap-key

# Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-key
```

## 📝 Cloud Build Configuration

The app is configured in Google Cloud Build with these substitution variables:

```bash
# Set in Cloud Build Triggers
_NEXT_PUBLIC_SUPABASE_URL
_NEXT_PUBLIC_SUPABASE_ANON_KEY
_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
_NEXT_PUBLIC_GOOGLE_AI_API_KEY
_CMC_API_KEY
_NEXT_PUBLIC_ELEVENLABS_API_KEY
_NEXT_PUBLIC_ELEVENLABS_VOICE_ID
```

### Update Cloud Build Variables

1. Go to Cloud Build Triggers
2. Edit your trigger
3. Add/Update substitution variables
4. Trigger a new build

## 🧪 Testing Multi-Domain Setup

### Test Locally

```bash
# Test with development environment
npm run dev

# Should auto-detect: http://localhost:3000
```

### Test Production Domain

```bash
# Deploy to Cloud Run
./scripts/deploy-cloud-run.sh

# Visit the deployed URL
# Check browser console for: [ENV CONFIG] log
```

### Verify OAuth Flow

1. Click "Sign in with Google"
2. Authenticate
3. Should redirect to: `{your-domain}/auth/callback`
4. Then redirect to: `{your-domain}/`

## 🔄 Migration Checklist

When migrating to a new domain:

- [ ] Deploy app to new domain
- [ ] Update Supabase Redirect URLs
- [ ] Update Supabase Site URL
- [ ] Test OAuth login flow
- [ ] Update DNS records (if custom domain)
- [ ] Update any API webhooks
- [ ] Test all authentication features
- [ ] Monitor logs for errors

## 🆘 Troubleshooting

### OAuth Redirect Mismatch

**Error:** "Redirect URL mismatch"

**Solution:**
1. Check browser URL after OAuth
2. Add that exact URL to Supabase Redirect URLs
3. Include `/auth/callback` path

### Domain Not Auto-Detected

**Error:** App uses wrong domain

**Solution:**
```bash
# Manually set the domain
gcloud run services update financial-planner \
  --region=europe-west1 \
  --update-env-vars NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Build Fails

**Error:** "Missing environment variable"

**Solution:**
Check Cloud Build substitution variables are set:
```bash
gcloud builds triggers describe [TRIGGER-NAME]
```

### Session Not Persisting

**Error:** User logged out after redirect

**Solution:**
1. Ensure Supabase Site URL matches deployment domain
2. Check browser console for errors
3. Verify cookies are not blocked

## 📊 Monitoring

### Check Current Configuration

```bash
# Get service environment variables
gcloud run services describe financial-planner \
  --region=europe-west1 \
  --format="value(spec.template.spec.containers[0].env)"

# Get service URL
gcloud run services describe financial-planner \
  --region=europe-west1 \
  --format="value(status.url)"
```

### View Logs

```bash
# Cloud Run logs
gcloud logs read \
  --service=financial-planner \
  --region=europe-west1 \
  --limit=50

# Filter for auth issues
gcloud logs read \
  --service=financial-planner \
  --region=europe-west1 \
  --filter="[AUTH CALLBACK]" \
  --limit=20
```

## 🎓 Best Practices

1. **Always Add Localhost** - Keep `http://localhost:3000/auth/callback` in Supabase for development
2. **Use Scripts** - Prefer `./scripts/deploy-cloud-run.sh` over manual commands
3. **Test OAuth First** - Always test login immediately after domain change
4. **Document Domains** - Keep a list of all domains in use
5. **Monitor Logs** - Check logs after deployment for environment detection

## 📚 Related Files

- `lib/env-config.ts` - Environment detection and configuration
- `lib/supabase/client.ts` - Supabase client with dynamic config
- `app/auth/callback/route.ts` - OAuth callback handler
- `scripts/deploy-cloud-run.sh` - Deployment automation
- `scripts/setup-environment.sh` - Environment setup helper
- `cloudbuild.yaml` - CI/CD configuration
- `Dockerfile` - Container build configuration

## 🚢 Ready for Beta Launch!

Your app is now configured for:
- ✅ Current Cloud Run URL
- ✅ Future custom domains
- ✅ Multiple staging environments
- ✅ Easy domain migrations

**Next Steps:**
1. Update Supabase with current Cloud Run URL (see above)
2. Test authentication flow
3. Launch beta! 🎉

---

**Questions?** Check the logs or contact your development team.

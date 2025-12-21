# Deployment Status

**Date:** 2025-12-21
**Build ID:** `c573460e-5d9a-4c15-b883-5ffc02179941`
**Commit SHA:** `3eb266a`
**Trigger:** Manual trigger via `gcloud builds triggers run`

## Status
- [x] Code pushed to `main`
- [x] Build triggered
- [ ] Build success
- [ ] Deployment success

## Changes Deployed
1. **Stripe Integration**: Full checkout and webhook flow.
2. **Google Analytics/Ads**: Tags added to `layout.tsx`.
3. **CSP Updates**: `middleware.ts` updated to allow Google scripts.
4. **Build Fix**: Conditional Stripe and Supabase initialization to prevent build-time crashes.

## Action Items
- Monitor the build at: [Cloud Build Logs](https://console.cloud.google.com/cloud-build/builds/c573460e-5d9a-4c15-b883-5ffc02179941?project=629380503119)
- **Important**: Ensure `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are set in the Cloud Run environment variables.

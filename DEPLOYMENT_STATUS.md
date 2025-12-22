# Deployment Status

**Date:** 2025-12-22
**Status:** Pending Deployment

## Recent Changes
1. **CORS Fix for Auth**:
   - **CRITICAL**: Removed `api/auth` from middleware exclusion list.
   - This ensures CORS headers are applied to auth requests, fixing the "blocked by CORS policy" error when accessing from `omnifolio.app` to `www.omnifolio.app`.
2. **Google Analytics/Ads Fixes**: 
   - **MIGRATED**: Switched to `@next/third-parties/google` for robust SPA tracking.
   - **CONSENT**: Added explicit default consent state (denied) via `beforeInteractive` script.
   - **ADS**: Added manual config for Google Ads ID `AW-17821905669`.
   - **CSP**: Updated `middleware.ts` to allow all Google Analytics and Ads domains.
   - IDs: `G-6CJBH3X6XC` (GA), `AW-17821905669` (Ads).

## Verification Steps
1. Visit `https://www.omnifolio.app`.
2. Open Developer Tools (Console).
3. Type `dataLayer` and check for:
   - `consent` `default` event (should be denied).
   - `config` event for `G-6CJBH3X6XC`.
4. Accept Cookies in the banner.
5. Check `dataLayer` for `consent` `update` event (should be granted).
6. Check Google Analytics Realtime Dashboard.

## Previous Deployments
- **2025-12-21**: Stripe Integration & Initial GA Setup.

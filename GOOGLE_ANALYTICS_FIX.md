# Google Analytics Fix

## Issue
Google Analytics was not working properly. The implementation was:
1. Hardcoded in `layout.tsx`.
2. Not tracking page views on route changes (SPA navigation).
3. Potentially conflicting with the Consent Banner.

## Fix Implemented

1. **Created `components/google-analytics.tsx`**:
   - A dedicated client component to handle Google Analytics.
   - Uses `next/script` to load the GA script.
   - Uses `usePathname` and `useSearchParams` to track page views on route changes.
   - Sets default consent to 'denied' for GDPR compliance.
   - Supports both GA Measurement ID and Google Ads ID.

2. **Updated `app/layout.tsx`**:
   - Removed inline GA scripts.
   - Imported and used the `GoogleAnalytics` component.
   - Passed the IDs: `GA_MEASUREMENT_ID="G-6CJBH3X6XC"` and `GA_ADS_ID="AW-17821905669"`.

3. **Updated `components/ui/consent-banner.tsx`**:
   - Added a robust `updateConsent` helper function.
   - Ensures `gtag` is defined before calling it (creates a temporary `gtag` function pushing to `dataLayer` if the script hasn't loaded yet).
   - This prevents race conditions where the consent banner might try to update consent before GA is fully initialized.

4. **Updated `.env.local`**:
   - Added `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-6CJBH3X6XC` for reference (though currently passed as prop).

## Verification
- The `GoogleAnalytics` component is correctly included in the build.
- The script is preloaded.
- Page views will now be tracked on every navigation.
- Consent updates will work reliably.

## Next Steps
- Verify in the Google Analytics dashboard that real-time data is appearing.
- Verify that consent mode is working (e.g., using Google Tag Assistant).

# Performance Fix Summary

## Issue
The user reported "Avoid chaining critical requests" and "LCP Unscored" with a "Maximum critical path latency: 847 ms". The error specifically pointed to chaining of CSS files:
- `…chunks/app_globals_....css`
- `…chunks/node_modules_%40xyflow_react_dist_style_....css`

And unused preconnect warnings for Google Tag Manager and Google Analytics.

## Changes Made

1.  **Optimized CSS Loading**:
    -   Moved the import of `@xyflow/react/dist/style.css` from `components/financial/net-worth-flow.tsx` to `app/layout.tsx`.
    -   **Reason**: Importing CSS in a component that is part of the critical rendering path can cause the browser to discover the CSS file late (chaining), delaying the First Contentful Paint (FCP) and Largest Contentful Paint (LCP). Moving it to `layout.tsx` ensures it is bundled with the global styles or loaded immediately in the `<head>`, preventing the chain.

2.  **Removed Unused Preconnects**:
    -   Removed `<link rel="preconnect" ... />` for `googletagmanager.com` and `google-analytics.com` in `app/layout.tsx`.
    -   **Reason**: The browser reported these as unused (likely because the connection wasn't used within 10 seconds or the `GoogleAnalytics` component handles it efficiently). Removing them reduces head size and unnecessary DNS/connection overhead.

## Verification
-   Checked `app/layout.tsx` for correct import order.
-   Checked `components/financial/net-worth-flow.tsx` to ensure the import was removed.
-   Verified `next.config.mjs` has `optimizePackageImports` for `@xyflow/react`.

These changes should resolve the "chaining critical requests" warning and improve the LCP score.

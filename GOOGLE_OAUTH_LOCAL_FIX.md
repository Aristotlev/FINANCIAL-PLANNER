# Google OAuth Local Fix

## Issue
You were encountering a `state_mismatch` error when trying to use Google OAuth locally.

## Cause
The issue was caused by two configurations in `lib/auth.ts` that were optimized for production but incompatible with `localhost`:

1.  **Cross-Subdomain Cookies**: The configuration was forcing cookies to be set on `.omnifolio.app`. Browsers do not allow `localhost` to access cookies set for a specific domain like `.omnifolio.app`. This meant the "state" cookie used to verify the OAuth flow was missing when Google redirected back to your local app.
2.  **Redirect URI**: The redirect URI was hardcoded to the production URL `https://www.omnifolio.app/...`.

## Fix Applied
I have updated `lib/auth.ts` to be environment-aware:

1.  **Dynamic Redirect URI**:
    ```typescript
    redirectURI: process.env.NODE_ENV === "production" 
      ? "https://www.omnifolio.app/api/auth/callback/google"
      : "http://localhost:3000/api/auth/callback/google",
    ```

2.  **Conditional Cookie Domain**:
    ```typescript
    crossSubDomainCookies: {
      enabled: process.env.NODE_ENV === "production",
      domain: process.env.NODE_ENV === "production" ? ".omnifolio.app" : undefined, 
    },
    ```

## Action Required
1.  **Restart your development server**:
    ```bash
    npm run dev
    ```
    (Stop the current one with `Ctrl+C` and start it again to pick up the code changes).

2.  **Clear Cookies**:
    It is recommended to clear your browser cookies for `localhost` to remove any old/invalid cookies.

3.  **Verify Google Cloud Console**:
    Ensure that `http://localhost:3000/api/auth/callback/google` is added to the **Authorized redirect URIs** in your Google Cloud Console project for the Client ID you are using.

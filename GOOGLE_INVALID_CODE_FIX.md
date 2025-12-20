# Google OAuth "Invalid Code" Fix

## The Issue
You are seeing `invalid_code` errors on `https://www.omnifolio.app/...` while trying to run the app locally.

## The Cause
Your local environment was configured to use the production URL (`https://www.omnifolio.app`) as the base URL for authentication. This caused the OAuth flow to:
1.  Start on `localhost`.
2.  Redirect to Google.
3.  Google redirects back to **Production** (`https://www.omnifolio.app`) instead of `localhost`.
4.  Production tries to verify the code but fails because the initial request (and the state cookie) originated from `localhost`.

## The Fix
I have updated `lib/auth.ts` and `lib/auth-client.ts` to **FORCE** `http://localhost:3000` when running in development mode, ignoring any `NEXT_PUBLIC_APP_URL` environment variable that might be pointing to production.

## Action Required
1.  **Restart your development server**:
    ```bash
    npm run dev
    ```
2.  **Clear Cookies**:
    Clear cookies for `localhost:3000` AND `omnifolio.app` to ensure a clean state.
3.  **Try Logging in Again**:
    It should now redirect you back to `http://localhost:3000/api/auth/callback/google` instead of the production URL.

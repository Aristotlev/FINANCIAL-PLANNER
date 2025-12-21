# Localhost OAuth Fix - Step 2

I have updated `lib/auth.ts` to remove the hardcoded `redirectURI` and rely on the `baseURL` which is now correctly forced to `http://localhost:3000`. This should eliminate any mismatch errors.

## Action Required

1.  **Stop the development server** (Ctrl+C).
2.  **Restart the server**: `npm run dev`.
3.  **Check the Terminal Output**:
    You should see logs like:
    ```
    Auth Config Debug:
    NODE_ENV: development
    Base URL: http://localhost:3000
    BETTER_AUTH_URL (env): http://localhost:3000
    ```
4.  **Verify Google Cloud Console**:
    *   Go to [Google Cloud Console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials).
    *   Edit your OAuth 2.0 Client ID.
    *   Ensure **Authorized redirect URIs** includes EXACTLY:
        `http://localhost:3000/api/auth/callback/google`
    *   (Note: No trailing slash).
5.  **Clear Cookies**:
    *   Go to `localhost:3000`.
    *   Open DevTools (F12) > Application > Cookies.
    *   Clear all cookies for `localhost`.
6.  **Try Logging in Again**.

If you still see `invalid_code`, it is almost certainly because the URL in Google Cloud Console does not match `http://localhost:3000/api/auth/callback/google`.

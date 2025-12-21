# Final Localhost Fix

I have applied two critical fixes:

1.  **Disabled React Strict Mode**: In `next.config.mjs`, I set `reactStrictMode: false`.
    *   *Why?* In development, Strict Mode runs effects twice. This causes the OAuth callback code to be used twice. The first time succeeds (silently), and the second time fails with `invalid_code` because the code is one-time use only.

2.  **Created Cookie Clearing Tool**: I created a page at `/clear-cookies` to wipe all local cookies.

## Action Required

1.  **Restart Development Server**:
    ```bash
    npm run dev
    ```
    (You MUST restart for the `next.config.mjs` change to take effect).

2.  **Clear Cookies & Reset**:
    *   Visit: [http://localhost:3000/clear-cookies](http://localhost:3000/clear-cookies)
    *   This will automatically clear your cookies and redirect you to login.

3.  **Login**:
    *   Try logging in with Google again.

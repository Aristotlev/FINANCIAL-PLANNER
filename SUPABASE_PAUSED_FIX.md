# Why Was My Supabase Project Paused?

## The Reason
Supabase automatically pauses projects on the **Free Tier** after **7 days of inactivity** to conserve resources.
"Inactivity" means no API calls, database queries, or dashboard logins occurred during that period.

This is standard behavior for the free plan. It does **not** mean your data is lost.

## How to Fix It (Unpause)

1.  **Log in** to the [Supabase Dashboard](https://supabase.com/dashboard).
2.  You will see your project listed with a status of **"PAUSED"**.
3.  Click on the project.
4.  You will see a screen asking if you want to **Restore** the project.
5.  Click **"Restore Project"**.

## What Happens Next?
- The restoration process usually takes a few minutes.
- Once the status changes to **"Active"** (green), your database is back online.
- **Your data is safe** and will be available again.

## Important: Check Your Connection String
Sometimes, after unpausing, you might need to verify your database password or connection details.

1.  After the project is active, run the diagnostic script again:
    ```bash
    node scripts/diagnose-auth.js
    ```
2.  If it connects successfully (`✅ Successfully connected`), you are good to go!
3.  If it still fails, you might need to reset your database password in the Supabase Dashboard (Settings -> Database -> Reset Password) and update your `.env.local` file.

## How to Prevent This?
- **Upgrade to Pro**: Paid projects are never paused.
- **Activity**: Ensure your app makes at least one request per week, or log into the dashboard occasionally.

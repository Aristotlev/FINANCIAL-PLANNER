# Update Connection String Required

## The Issue
Even though the project is unpaused, the application is still getting this error:
```
❌ Database connection failed: Tenant or user not found
```

This means the **Connection String** in your `.env.local` file is incorrect. It might be pointing to an old project ID or using an invalid user.

## How to Fix It

1.  **Go to Supabase Dashboard**:
    - Navigate to [Supabase Dashboard](https://supabase.com/dashboard).
    - Click on your **Active** project.

2.  **Get the Connection String**:
    - Go to **Project Settings** (gear icon at the bottom left).
    - Select **Database**.
    - Under **Connection string**, make sure **Node.js** is selected.
    - **Copy** the entire string. It looks like:
      `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres`

3.  **Update `.env.local`**:
    - Open the file `.env.local` in your VS Code.
    - Find the line starting with `SUPABASE_DATABASE_URL=`.
    - **Delete** the old value and **Paste** the new one.
    - **Replace `[YOUR-PASSWORD]`** with your actual database password.
      - *Note: If you don't remember your password, click "Reset Database Password" in the Supabase Database settings.*

4.  **Restart the Server**:
    - Stop the current server (Ctrl+C in the terminal).
    - Run `npm run dev` again.

5.  **Verify**:
    - Run `node scripts/diagnose-auth.js` to confirm it works.

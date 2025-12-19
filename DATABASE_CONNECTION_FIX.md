# Database Connection Error Fix

## Problem
The application is failing with a **500 Internal Server Error** during authentication.
The diagnostic script revealed the root cause:
```
❌ Database connection failed: Tenant or user not found
```

This means the `SUPABASE_DATABASE_URL` in your `.env.local` file is incorrect, expired, or the database user/tenant no longer exists.

## Solution

### 1. Get the Correct Connection String
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. Go to **Project Settings** -> **Database**.
4. Under **Connection string**, select **Node.js**.
5. Copy the connection string. It should look like this:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```

### 2. Update `.env.local`
1. Open `.env.local` in your editor.
2. Find `SUPABASE_DATABASE_URL`.
3. Replace the value with the new connection string.
4. **Important**: Replace `[YOUR-PASSWORD]` with your actual database password.

### 3. Verify the Fix
Run the diagnostic script again to verify the connection:
```bash
node scripts/diagnose-auth.js
```
Or run the table check script:
```bash
node check-db-tables.js
```

If it says `✅ Successfully connected to the database`, then the issue is resolved.

### 4. Restart the Server
After updating `.env.local`, you must restart the development server:
```bash
npm run dev
```

## Common Issues
- **Wrong Password**: If you forgot your database password, you can reset it in Supabase Dashboard -> Project Settings -> Database -> Reset Database Password.
- **Special Characters**: If your password has special characters, you might need to URL encode them (e.g., `#` becomes `%23`).

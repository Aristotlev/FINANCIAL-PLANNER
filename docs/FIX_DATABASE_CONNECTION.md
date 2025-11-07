# 🔧 Fix Database Connection for Better Auth

## Problem
```
Error: Tenant or user not found
```

Your current connection string uses the **pooler**:
```
postgresql://postgres.ljatyfyeqiicskahmzmp:rdejGLlonaPARW2q@aws-1-eu-west-2.pooler.supabase.com:5432/postgres
```

Better Auth with PostgreSQL **needs the direct connection** string.

---

## Solution

### Step 1: Get the Direct Connection String

1. Go to your Supabase project: https://supabase.com/dashboard/project/ljatyfyeqiicskahmzmp

2. Click **Settings** → **Database**

3. Scroll to **Connection string** section

4. Select **URI** tab

5. **IMPORTANT:** Look for the **direct connection** (not session pooler)
   - Should look like: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
   - NOT: `aws-1-eu-west-2.pooler.supabase.com` ❌

6. Copy the connection string

---

### Step 2: Update Your `.env.local`

Replace the `SUPABASE_DATABASE_URL` with the direct connection:

```bash
# OLD (Pooler - doesn't work with Better Auth)
SUPABASE_DATABASE_URL=postgresql://postgres.ljatyfyeqiicskahmzmp:rdejGLlonaPARW2q@aws-1-eu-west-2.pooler.supabase.com:5432/postgres

# NEW (Direct connection - use this!)
SUPABASE_DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@db.ljatyfyeqiicskahmzmp.supabase.co:5432/postgres
```

**Note:** Replace `[YOUR-PASSWORD]` with your actual database password.

---

### Step 3: Verify Connection

Run this test:

```bash
node check-db-tables.js
```

You should see:
```
✅ Table "users": EXISTS
✅ Table "sessions": EXISTS
✅ Table "accounts": EXISTS
✅ Table "verifications": EXISTS
```

---

### Step 4: Update Cloud Run Deployment

Update your `deploy-with-env.sh` with the new connection string:

```bash
./deploy-with-env.sh
```

Or update manually in Google Cloud Console:
1. Go to Cloud Run
2. Select your service: `financial-planner`
3. Click "Edit & Deploy New Revision"
4. Go to **Variables & Secrets** tab
5. Find `SUPABASE_DATABASE_URL`
6. Update with the direct connection string
7. Deploy

---

## Alternative: Use Supabase Client Instead

If you can't use direct PostgreSQL connection, you can switch to using Supabase's client library for Better Auth.

Update `lib/auth.ts`:

\`\`\`typescript
import { betterAuth } from "better-auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // You'll need this from Supabase settings
);

export const auth = betterAuth({
  database: {
    // Use Supabase client adapter
    type: "postgres",
    client: supabase,
  },
  // ... rest of your config
});
\`\`\`

But this requires the service role key, which has elevated privileges.

---

## Expected Result

After fixing the connection string:

✅ `node check-db-tables.js` shows all tables  
✅ Google OAuth sign-in works without 500 errors  
✅ Users can successfully authenticate  
✅ Sessions persist properly  

---

## Need Help?

If you're unsure about your Supabase credentials:

1. Check Supabase dashboard Settings → Database
2. Reset your database password if needed
3. Make sure you're using the **direct connection**, not pooler
4. Test locally first with `npm run dev`
5. Then deploy to production

---

**Next Steps:**
1. Get direct connection string from Supabase
2. Update `.env.local`
3. Test locally: `node check-db-tables.js`
4. Deploy: `./deploy-with-env.sh`

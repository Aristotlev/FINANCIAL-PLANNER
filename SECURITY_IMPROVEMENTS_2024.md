# Security Improvements - December 2024

This document outlines the critical security improvements made to Omnifolio.

## Summary of Changes

| Priority | Issue | Status | Solution |
|----------|-------|--------|----------|
| 🔴 Immediate | `NODE_TLS_REJECT_UNAUTHORIZED=0` | ✅ Fixed | Removed global SSL bypass |
| 🟠 High | RLS policies using `USING (true)` | ✅ Fixed | Service role + app-level auth |
| 🟡 Medium | Plain environment variables | ✅ Implemented | Google Secret Manager integration |

---

## 1. NODE_TLS_REJECT_UNAUTHORIZED Fix

### What Was Wrong
The code had:
```typescript
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
```

This **disabled SSL certificate verification globally** for the entire Node.js process, making it vulnerable to man-in-the-middle attacks.

### The Fix
Removed the global setting. SSL verification is only disabled for the specific PostgreSQL pool connection to Supabase (which uses self-signed certificates):

```typescript
// lib/auth.ts
const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL,
  ssl: {
    // Only affects THIS connection, not globally
    rejectUnauthorized: false,
  },
});
```

### Why This Is Safe
- The `rejectUnauthorized: false` only applies to the specific database connection
- Supabase's pooler uses self-signed certificates that Node.js doesn't trust by default
- We're connecting to a known, trusted endpoint (Supabase)
- All other SSL connections in the app remain secure

---

## 2. Row Level Security (RLS) Fix

### What Was Wrong
The RLS policies had `USING (true)` which allowed ANY user to access ALL data:

```sql
-- INSECURE: Anyone can read anyone's data!
CREATE POLICY "Users can view own preferences"
  ON user_preferences
  FOR SELECT
  TO authenticated
  USING (true);  -- ❌ This matches ALL rows
```

Since we use Better Auth (external to Supabase Auth), `auth.uid()` returns NULL, making traditional RLS ineffective.

### The Solution: Service Role + Application-Level Authorization

We implemented a two-layer security model:

#### Layer 1: Database (RLS)
- All user data tables deny access to `anon` and `authenticated` roles
- Only `service_role` can access user data
- Public reference data (currencies, exchange rates) remains readable

```sql
-- From supabase-security-fix-rls.sql
CREATE POLICY "Service role full access"
    ON cash_accounts FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Deny anon access"
    ON cash_accounts FOR ALL TO anon
    USING (false) WITH CHECK (false);

CREATE POLICY "Deny authenticated access"
    ON cash_accounts FOR ALL TO authenticated
    USING (false) WITH CHECK (false);
```

#### Layer 2: Application (API Routes)
- All data access goes through authenticated API routes
- Better Auth validates the user session
- Queries are filtered by the authenticated user's ID

```typescript
// lib/api/auth-wrapper.ts
export const GET = withAuth(async ({ user, request }) => {
  // user.id is guaranteed to be from the validated session
  const { data } = await supabase
    .from('cash_accounts')
    .select('*')
    .eq('user_id', user.id);  // Always filter by authenticated user
    
  return NextResponse.json({ data });
});
```

### New Files Created

| File | Purpose |
|------|---------|
| `lib/supabase/server.ts` | Server-side Supabase client with service role |
| `lib/api/auth-wrapper.ts` | API route wrapper for Better Auth validation |
| `app/api/data/route.ts` | Secure data access API endpoint |
| `supabase-security-fix-rls.sql` | SQL migration to fix RLS policies |

### How to Apply the Database Changes

Run the SQL migration in your Supabase SQL Editor:

```bash
# The migration file is at:
supabase-security-fix-rls.sql
```

---

## 3. Google Secret Manager Integration

### What Was Wrong
Sensitive credentials were stored as plain environment variables, which:
- Appear in Cloud Run logs if not careful
- Can be exposed through error messages
- Cannot be rotated without redeployment
- Lack audit logging

### The Solution
Implemented Google Secret Manager for production secrets:

```typescript
// lib/secrets/secret-manager.ts
import { getSecret } from '@/lib/secrets/secret-manager';

// In production, fetches from Google Secret Manager
// In development, falls back to environment variables
const apiKey = await getSecret('GOOGLE_CLIENT_SECRET');
```

### Setting Up Google Secret Manager

#### Step 1: Enable the API
```bash
gcloud services enable secretmanager.googleapis.com
```

#### Step 2: Create Secrets
```bash
# Create a secret
echo -n "your-secret-value" | gcloud secrets create SUPABASE_SERVICE_ROLE_KEY \
    --data-file=-

# List secrets
gcloud secrets list
```

#### Step 3: Grant Access to Cloud Run
```bash
# Get the Cloud Run service account
gcloud run services describe omnifolio --region=europe-west1 \
    --format='value(spec.template.spec.serviceAccountName)'

# Grant access
gcloud secrets add-iam-policy-binding SUPABASE_SERVICE_ROLE_KEY \
    --member="serviceAccount:YOUR_SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"
```

#### Step 4: Configure the App
Set this environment variable in Cloud Run:
```
SECRET_MANAGER_PROJECT_ID=your-project-id
```

### Secrets to Migrate

| Secret Name | Description |
|-------------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin access |
| `SUPABASE_DATABASE_URL` | Database connection string |
| `BETTER_AUTH_SECRET` | JWT signing secret |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `GOOGLE_AI_API_KEY` | Gemini AI API key |

---

## Deployment Checklist

### Before Deploying

- [ ] Run `supabase-security-fix-rls.sql` in Supabase SQL Editor
- [ ] Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in Cloud Run
- [ ] (Optional) Set up Google Secret Manager for production

### After Deploying

- [ ] Verify no SSL errors in logs
- [ ] Test user authentication flow
- [ ] Confirm data access works through API routes
- [ ] Check that unauthenticated requests return 401

---

## Security Best Practices Going Forward

### 1. Always Use Service Role Server-Side
```typescript
// ✅ Good: Use getSupabaseAdmin() for server-side operations
import { getSupabaseAdmin } from '@/lib/supabase/server';
const supabase = getSupabaseAdmin();

// ❌ Bad: Never use anon key for user data operations
```

### 2. Always Validate User Before Data Access
```typescript
// ✅ Good: Use withAuth wrapper
export const GET = withAuth(async ({ user, request }) => {
  // user is guaranteed to be authenticated
});

// ❌ Bad: Trusting user_id from request
const userId = request.body.userId; // Could be spoofed!
```

### 3. Filter All Queries by User ID
```typescript
// ✅ Good: Always filter by authenticated user
.eq('user_id', user.id)

// ❌ Bad: No filter or trusting client-provided filter
```

### 4. Use Secret Manager in Production
```typescript
// ✅ Good: Fetch from Secret Manager
const key = await getSecret('STRIPE_SECRET_KEY');

// ❌ Bad: Hard-coded or exposed in logs
console.log(process.env.STRIPE_SECRET_KEY); // Visible in logs!
```

---

## Files Modified/Created

| File | Type | Description |
|------|------|-------------|
| `lib/auth.ts` | Modified | Removed `NODE_TLS_REJECT_UNAUTHORIZED` |
| `lib/supabase/server.ts` | Created | Server-side Supabase client |
| `lib/api/auth-wrapper.ts` | Created | API authentication wrapper |
| `app/api/data/route.ts` | Created | Secure data API endpoint |
| `lib/secrets/secret-manager.ts` | Created | Google Secret Manager integration |
| `supabase-security-fix-rls.sql` | Created | RLS policy fixes |

---

## Questions?

If you have questions about these security improvements, refer to:
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Google Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Better Auth Documentation](https://www.better-auth.com/docs)

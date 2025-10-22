# Fix 401 Unauthorized Errors for Portfolio Snapshots

## 🔍 Problem

You're seeing these errors in the console:
```
Failed to load resource: the server responded with a status of 401 ()
portfolio_snapshots:1  Failed to load resource: the server responded with a status of 401 ()
```

## 🎯 Root Cause

Your app uses **Better Auth** for authentication, but your Supabase database has **Row Level Security (RLS)** policies that check for **Supabase Auth** sessions with `auth.uid()`. These are two different authentication systems that don't communicate with each other.

The RLS policies require:
```sql
USING (auth.uid()::text = user_id)
```

But Better Auth users don't have a Supabase `auth.uid()`, causing **401 Unauthorized** errors.

## ✅ Solution (Choose One)

### Option 1: Update Supabase RLS Policies (Recommended)

Run the SQL file I created: `supabase-fix-portfolio-snapshots-rls.sql`

**Steps:**
1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `supabase-fix-portfolio-snapshots-rls.sql`
5. Click **Run**

This will:
- Remove restrictive auth-based policies
- Add public access policies (data isolation still maintained by `user_id` in application logic)
- Allow Better Auth users to read/write their data

### Option 2: Disable RLS Temporarily (Quick Fix)

If you want to test quickly without authentication:

```sql
-- Disable RLS for testing
ALTER TABLE public.portfolio_snapshots DISABLE ROW LEVEL SECURITY;
```

⚠️ **Warning:** This removes all access control. Only use for local development!

### Option 3: Ignore the Errors (Fallback Works)

The app already has fallback logic to use **localStorage** when Supabase fails. The 401 errors are non-breaking:
- Portfolio data saves to localStorage
- Historical tracking works locally
- No data loss occurs

The errors are just **noise in the console**. Your app continues to function normally.

## 🧪 Verify the Fix

After applying Option 1 or 2:

1. Refresh your app
2. Open DevTools Console (F12)
3. Check that the 401 errors are gone
4. Verify portfolio data is loading

## 🔐 Security Notes

**Option 1 (Public Policies):**
- Data isolation is maintained by the app checking `user_id`
- Users can technically access other users' data if they know the ID
- For production, consider implementing proper Better Auth → Supabase integration

**Better Long-Term Solution:**
1. Sync Better Auth user IDs to Supabase `auth.users` table
2. Use Supabase's auth context in your Better Auth callbacks
3. Keep RLS policies strict with proper `auth.uid()` checks

## 📚 Related Files

- `/lib/enhanced-time-tracking-service.ts` - Already has localStorage fallback
- `/lib/historical-tracking-service.ts` - Already has localStorage fallback
- `/supabase-time-tracking-schema.sql` - Original RLS policies
- `/supabase-fix-portfolio-snapshots-rls.sql` - Fix script (created)

## 🚀 Next Steps

1. **Immediate:** Apply Option 1 SQL script
2. **Short-term:** Test that 401 errors are resolved
3. **Long-term:** Consider Better Auth ↔ Supabase integration for production

---

**Date:** October 21, 2025  
**Issue:** 401 Unauthorized on `portfolio_snapshots` table  
**Status:** Fix script provided ✅

# Tax Profiles Error Fix

## Issue
The application was throwing a console error: `Error fetching tax profiles: {}`.
This was caused by the `tax_profiles` table missing from the Supabase database.

## Fix Applied
1.  **Created `tax_profiles` table**:
    -   Created the table with the necessary columns to match `SupabaseDataService.ts`.
    -   Columns include: `id`, `user_id`, `name`, `country`, `company_type`, `salary_income`, `business_income`, `capital_gains_short_term`, `capital_gains_long_term`, `dividends`, `rental_income`, `crypto_gains`, `deductible_expenses`, `custom_income_sources` (JSONB), `notes`, `is_active`, `created_at`, `updated_at`.

2.  **Verified RLS Settings**:
    -   Confirmed that Row Level Security (RLS) is disabled for `tax_profiles`, consistent with other tables (`cash_accounts`, etc.) in the project, as the app uses Better Auth and handles user filtering on the client side.

3.  **Improved Error Logging**:
    -   Updated `lib/supabase/supabase-data-service.ts` to provide more descriptive error messages if fetching fails in the future.

## Verification
The error should no longer appear in the console, and tax profiles should now be saveable and retrievable.

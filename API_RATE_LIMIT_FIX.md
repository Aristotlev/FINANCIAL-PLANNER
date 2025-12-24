# API Rate Limit Fix Summary

## Issue
The application was encountering "API rate limit exceeded" errors, particularly when fetching `expense_categories`. This was caused by the client-side `SupabaseDataService` making frequent API calls to the Next.js API routes without any caching mechanism, triggering the server-side rate limiter (100 requests/minute).

## Solution
Implemented a comprehensive client-side caching strategy in `lib/supabase/supabase-data-service.ts`.

### Key Changes
1.  **Added Caching Infrastructure**:
    *   Introduced a static `dataCache` map to store fetched data.
    *   Added `getCachedData`, `setCachedData`, and `invalidateCache` helper methods.
    *   Set a default cache TTL (Time To Live) of 20 seconds.

2.  **Updated Data Fetching Logic**:
    *   Modified all `get[Entity]` methods (e.g., `getExpenseCategories`, `getCashAccounts`) to check the cache before making an API request.
    *   If valid cached data exists, it is returned immediately, bypassing the API call.
    *   If no cache exists, the data is fetched from the API, stored in the cache, and then returned.

3.  **Implemented Cache Invalidation**:
    *   Modified all `save[Entity]` and `delete[Entity]` methods to invalidate the specific cache key upon successful operation.
    *   This ensures that the UI always displays the most up-to-date data after a modification.

### Affected Entities
The caching logic has been applied to all data types managed by `SupabaseDataService`:
*   Cash Accounts
*   Income Sources
*   Crypto Holdings
*   Stock Holdings
*   Trading Accounts
*   Real Estate
*   Savings Accounts
*   Expense Categories
*   Subscriptions
*   Debt Accounts
*   Valuable Items
*   Tax Profiles
*   User Preferences

## Verification
*   The development server has been restarted to apply the changes.
*   The application should now be significantly more efficient with network requests and avoid hitting the API rate limits during normal usage.

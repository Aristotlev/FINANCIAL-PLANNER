# Crypto Disappearing Fix

## Problem
When adding, updating, or deleting crypto holdings, the item would appear immediately (optimistic update) but then disappear after 2-3 seconds.

## Root Cause
1. **Race Condition**: The app uses optimistic updates to show changes immediately.
2. **Event Dispatch**: It would immediately dispatch `cryptoDataChanged` after the `upsert` call returned.
3. **Stale Read**: Other components (and the context) would listen to this event and fetch data from Supabase. Due to eventual consistency or replication lag, this fetch often returned the *old* data (missing the new item).
4. **State Overwrite**: The components would then update their state with this stale data, overwriting the optimistic update and causing the item to "disappear".
5. **Previous Attempt**: Increasing the debounce to 2000ms only delayed the disappearance, confirming the fetch was still returning stale data.

## Solution: "Verify Loop" Pattern
We implemented a verification step that ensures data is actually persisted and visible in the database *before* notifying the rest of the application.

### 1. Verify Data Consistency
In `components/financial/crypto-card.tsx`, we added a `verifyDataConsistency` helper:
- After a save/delete operation, it enters a loop.
- It fetches data from Supabase.
- It checks if the expected change (item exists/removed/updated) is reflected in the fetched data.
- It retries up to 5 times with a 500ms delay.
- Only when the data is verified (or max retries reached) does it dispatch `cryptoDataChanged`.

### 2. Reduced Debounce
Since the event is now only fired when data is ready, we reduced the defensive debounce times in listeners from **2000ms** back to **500ms** (or removed them where appropriate) to make the UI more responsive.

- `components/financial/crypto-card.tsx` (CryptoCardWithPrices & CryptoHoverContent)
- `contexts/portfolio-context.tsx`
- `hooks/use-portfolio.ts`

## Result
- **Immediate Feedback**: Optimistic updates still show the change instantly.
- **Data Integrity**: The app waits for the DB to catch up before refreshing global state.
- **No Disappearing**: The re-fetch now returns the correct data, merging seamlessly with the optimistic state.

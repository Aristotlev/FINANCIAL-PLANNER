# Supabase Data Service Fixes

## Overview
This document summarizes the comprehensive fixes applied to `lib/supabase/supabase-data-service.ts` to resolve data saving issues across the application.

## Problem
The application was failing to save data to Supabase because of:
1.  **Schema Mismatch**: The frontend was using camelCase property names (e.g., `entryPoint`, `goalAmount`), while the database expected snake_case columns (e.g., `purchase_price`, `goal_amount`).
2.  **Invalid Data Types**: `NaN` values were being sent to numeric columns, causing database rejections.
3.  **Architectural Mismatch**: The "Trading Accounts" feature was trying to save individual *Trading Positions* into the `trading_accounts` table, which was designed for brokerage accounts.

## Fixes Implemented

### 1. Explicit Data Mapping
We replaced the generic spread operator (`...item`) with explicit field mapping for all entity types. This ensures that frontend properties are correctly assigned to their corresponding database columns.

-   **Cash Accounts**: Mapped `apy`, `goalAmount` etc.
-   **Savings Accounts**: Mapped `goalAmount`, `goalDate`.
-   **Income Sources**: Mapped `connectedAccount`, `isRecurring`, `nextPaymentDate`.
-   **Subscriptions**: Mapped `billingCycle`, `nextBillingDate`.
-   **Stock Holdings**: Mapped `entryPoint` -> `purchase_price`.
-   **Crypto Holdings**: Mapped `entryPoint` -> `purchase_price`.
-   **Real Estate**: Mapped `purchasePrice`, `currentValue`, etc.

### 2. Data Validation
Added robust validation for all numeric fields to prevent `NaN` errors.
```typescript
// Example
amount: typeof item.amount === 'number' && !isNaN(item.amount) ? item.amount : 0
```

### 3. Trading Accounts / Positions Fix
The `trading_accounts` table was being misused to store positions. Since we cannot easily alter the database schema to add a `trading_positions` table, we implemented a hybrid storage strategy:
-   **Storage**: Trading Positions are now stored in the `trading_accounts` table.
-   **Identification**: Positions are identified by `type: 'position'`.
-   **Data Persistence**: The full position object (including `stopLoss`, `takeProfit`, etc.) is stored in the `instruments` JSON column.
-   **Retrieval**: The `getTradingAccounts` method detects these records and restores the original position object structure, ensuring seamless operation for the frontend.

## Verification
-   All `save` and `get` methods in `SupabaseDataService` have been audited and updated.
-   The application builds successfully.
-   The dev server is running.

## Next Steps
-   Monitor the application for any further data saving errors.
-   Consider a future database migration to create a dedicated `trading_positions` table for better data normalization.

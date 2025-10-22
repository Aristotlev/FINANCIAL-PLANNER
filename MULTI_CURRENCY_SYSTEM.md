# Multi-Currency System - Complete Guide

## 🌍 Overview

The Money Hub App now features a comprehensive multi-currency system that handles different assets realistically based on how they work in the real world. When you change your main currency via the selector at the top, the entire app adapts intelligently.

## 🎯 Key Features

### 1. **Smart Currency Handling**

Different asset types are handled differently to reflect real-world behavior:

#### **Assets That Keep Their Original Currency** 
These assets show their value in their native currency with a converted amount displayed as secondary information:

- **💰 Cryptocurrencies** (BTC, ETH, etc.)
  - Always priced in USD/USDT
  - Requires USD stablecoins to purchase
  - Shows: `$45,234` with `≈€41.2K` below it

- **📈 Stocks & ETFs** (AAPL, VOO, etc.)
  - Always priced in USD (or exchange-specific currency)
  - Shows: `$1,234.56` with `≈¥185K` below it

- **🏦 Bank Accounts**
  - Each account has its own currency
  - Reflects international banking reality (EUR account, GBP account, etc.)
  - Shows: `£12,500` with `≈$15.8K` below it

- **📊 Trading Accounts** (Forex, Commodities)
  - Base currency depends on broker
  - Shows: `€8,450` with `≈$9.2K` below it

#### **Assets That Convert Fully**
These assets are displayed entirely in your selected main currency:

- **🏠 Real Estate**
- **💎 Valuable Items**
- **💵 Savings Goals**
- **📉 Expenses**
- **🧾 Tax Calculations**

### 2. **Global Currency Selector**

Located in the top navigation bar, the currency selector allows you to:
- Choose from 30+ major world currencies
- See real-time exchange rates
- Refresh rates manually
- View last update time

**Supported Currencies:**
- 🇺🇸 USD - US Dollar
- 🇪🇺 EUR - Euro
- 🇬🇧 GBP - British Pound
- 🇯🇵 JPY - Japanese Yen
- 🇨🇭 CHF - Swiss Franc
- 🇨🇦 CAD - Canadian Dollar
- 🇦🇺 AUD - Australian Dollar
- 🇨🇳 CNY - Chinese Yuan
- 🇮🇳 INR - Indian Rupee
- 🇧🇷 BRL - Brazilian Real
- 🇲🇽 MXN - Mexican Peso
- And 20+ more...

### 3. **Dual Currency Display Component**

The system uses a smart display component that automatically shows:
- **Primary**: Original currency (bold, larger)
- **Secondary**: Converted amount (smaller, gray, with ≈ symbol)

**Display Layouts:**
```
Stacked:
$45,234
≈€41.2K

Inline:
$1,234.56 (≈€1.1K)

Inline-Reversed:
€1,100 ($1,234.56)
```

### 4. **Real-Time Exchange Rates**

- Fetches rates from [exchangerate-api.com](https://www.exchangerate-api.com/)
- Updates automatically every hour
- Cached locally for performance
- Manual refresh available
- Fallback rates if API is unavailable

## 🔧 Implementation Details

### Currency Context

The `CurrencyContext` provides:

```typescript
{
  mainCurrency: Currency;           // Selected main currency
  exchangeRates: ExchangeRates;     // Live exchange rates
  setMainCurrency: (currency) => void;
  convert: (amount, from, to) => number;
  formatCurrency: (amount, currency?) => string;
  formatCurrencyWithConversion: (...) => {...}; // Dual display
  refreshRates: () => Promise<void>;
  lastUpdated: Date | null;
  isLoading: boolean;
}
```

### DualCurrencyDisplay Component

```tsx
<DualCurrencyDisplay 
  amount={1234.56}
  originalCurrency="USD"
  layout="stacked"      // or "inline", "inline-reversed"
  size="md"             // sm, md, lg, xl
  compactConversion={true}  // Use K/M/B format
/>
```

### Cash Account with Currency

```typescript
interface CashAccount {
  id: string;
  name: string;
  bank: string;
  balance: number;
  currency: string;  // 'USD', 'EUR', 'GBP', etc.
  // ... other fields
}
```

## 📊 Database Schema

All financial tables now include a `currency` column:

```sql
-- Example: Cash Accounts
ALTER TABLE cash_accounts 
  ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';

-- Supports ISO 4217 currency codes
ALTER TABLE cash_accounts 
  ADD CONSTRAINT valid_currency_cash 
  CHECK (currency ~ '^[A-Z]{3}$');
```

**Tables with Currency Support:**
- `cash_accounts` - Native currency per account
- `savings_accounts` - Native currency
- `trading_accounts` - Base currency
- `real_estate` - Purchase currency
- `valuable_items` - Valuation currency
- `stock_holdings` - Price currency (usually USD)
- `crypto_holdings` - Price currency (usually USD)
- `expense_categories` - Expense currency
- `income_sources` - Income currency

## 🎨 User Experience

### When Changing Currency

1. **Instant Global Update**
   - Dashboard totals recalculate
   - 3D visualizations update
   - All cards refresh
   - Charts re-render with new values

2. **Persistent Selection**
   - Currency choice saved to localStorage
   - Persists across sessions
   - User preferences table (optional)

3. **Visual Feedback**
   - Loading states during rate fetch
   - Last updated timestamp
   - Conversion indicators (≈ symbol)
   - Color coding for different currencies

### Real-World Example Scenarios

#### **Scenario 1: Digital Nomad**
- Main currency: EUR (living in Europe)
- US Bank Account: $10,000 → Shows as `$10,000 (≈€9.2K)`
- UK Bank Account: £5,000 → Shows as `£5,000 (≈€5.8K)`
- Crypto Portfolio: $25,000 BTC → Shows as `$25,000 (≈€23K)`
- Total shown in EUR everywhere

#### **Scenario 2: International Investor**
- Main currency: USD (home country)
- All crypto in USD (native)
- Swiss bank account in CHF
- Japanese stocks in JPY
- Everything converts to show USD equivalents

#### **Scenario 3: Currency Trader**
- Multiple forex trading accounts
- Each account in different currency
- Real-time conversion to main currency
- Easy comparison of account performance

## 🚀 Quick Start

### 1. Select Your Main Currency

Click the currency selector (💵 icon) in the top navigation:
- Search for your currency
- Click to select
- Exchange rates fetch automatically

### 2. Add Multi-Currency Accounts

When adding a bank account:
1. Fill in account details
2. **Select the account's currency** (new dropdown)
3. Enter balance in that currency
4. System automatically shows conversions

### 3. View Portfolio

- Crypto: Always in USD with conversion
- Stocks: Always in USD with conversion  
- Bank accounts: Show native currency + conversion
- Total: Converted to your main currency

## 🔍 Technical Features

### Smart Conversion Logic

```typescript
// Example: Convert crypto value (USD) to main currency (EUR)
const { convertToMain, formatMain } = useCurrencyConversion();
const convertedValue = convertToMain(cryptoValue, 'USD');
const displayValue = formatMain(convertedValue);
```

### Compact Number Formatting

Large numbers use K/M/B notation in conversions:
- `$1,234,567` → `≈€1.1M`
- `$45,678` → `≈€41.8K`
- `$123,456,789` → `≈€113M`

### Zero-Conversion Optimization

When original currency = main currency:
- No conversion shown
- Single currency display only
- Performance optimized

## 📱 Where Currency Conversion Appears

### ✅ Already Implemented

1. **Crypto Card**
   - Individual holdings show USD + conversion
   - Total portfolio value
   - Pie chart tooltips

2. **Stocks Card**
   - Individual stocks show USD + conversion
   - Total portfolio value
   - Holdings list

3. **Cash Card**
   - Bank accounts show native currency + conversion
   - Account summary totals
   - Add/Edit modals with currency selector

4. **Currency Context**
   - Global state management
   - Real-time rate fetching
   - Smart conversion logic

5. **DualCurrencyDisplay Component**
   - Reusable across entire app
   - Multiple layout options
   - Responsive sizing

### 🚧 To Be Implemented

6. **Trading Account Card**
   - Show account currency + conversion

7. **Other Financial Cards**
   - Savings (full conversion)
   - Expenses (full conversion)
   - Real Estate (full conversion)
   - Valuable Items (full conversion)

8. **Dashboard**
   - Net worth in main currency
   - 3D visualization updates
   - Portfolio distribution charts

9. **All Detail Modals**
   - Transaction histories
   - Historical charts
   - Reports and exports

## 🎯 Best Practices

### For Users

1. **Set your main currency first** before adding accounts
2. **Use the correct currency** when adding bank accounts
3. **Crypto is always USD** (that's how exchanges work)
4. **Stocks are always USD** (unless on foreign exchange)
5. **Refresh rates** if you see stale data

### For Developers

1. Always use `DualCurrencyDisplay` for multi-currency assets
2. Use `formatCurrency` for single-currency amounts
3. Store original currency in database
4. Never perform manual conversions - use context
5. Test with multiple currencies

## 🐛 Troubleshooting

### Exchange Rates Not Loading?
- Check internet connection
- Click refresh button manually
- System uses fallback rates if API fails

### Wrong Currency Showing?
- Check account's native currency setting
- Verify main currency selection
- Clear localStorage if needed: `localStorage.clear()`

### Conversion Seems Off?
- Rates update every hour
- Manual refresh available
- Rates are from exchangerate-api.com

## 🔗 Related Files

### Core System
- `/contexts/currency-context.tsx` - Main currency logic
- `/components/ui/currency-selector.tsx` - Currency picker
- `/components/ui/dual-currency-display.tsx` - Display component
- `/hooks/use-currency-conversion.ts` - Conversion utilities

### Implementation Examples
- `/components/financial/crypto-card.tsx` - Crypto with dual currency
- `/components/financial/stocks-card.tsx` - Stocks with dual currency
- `/components/financial/cash-card.tsx` - Bank accounts with native currency

### Database
- `/supabase-currency-migration.sql` - Database schema
- Includes all currency columns and constraints

## 🎉 Summary

The Money Hub App's multi-currency system provides a **realistic, intuitive experience** that mirrors how different financial assets actually work in the real world:

- 💱 **30+ currencies supported**
- 🔄 **Real-time exchange rates**
- 🎨 **Beautiful dual-currency displays**
- 🏦 **Multi-currency bank accounts**
- 💰 **Crypto in USD (reality-based)**
- 📈 **Stocks in trading currency**
- 🌐 **Global currency selector**
- ⚡ **Instant app-wide updates**

Perfect for international users, digital nomads, and anyone managing finances across multiple currencies!

---

**Last Updated:** October 22, 2025
**Version:** 1.0.0

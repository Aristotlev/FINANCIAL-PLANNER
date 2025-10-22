# Multi-Currency System - Quick Start Guide

## 🚀 Getting Started

The multi-currency system is now live! Here's how to use it:

## For Users

### Changing Your Main Currency

1. **Click the Currency Button** in the top-right navbar
   - Look for the button with a dollar sign 💵 and flag emoji
   - Shows your current currency (e.g., "🇺🇸 USD")

2. **Search for Your Currency**
   - Type the currency code (USD, EUR, GBP, etc.) or name
   - 30+ currencies supported

3. **Select Your Preferred Currency**
   - Click on your desired currency
   - All values update instantly

### Supported Features

✅ All financial cards automatically convert to your main currency:
- Cash accounts
- Savings goals
- Crypto portfolios
- Stock holdings
- Trading accounts
- Real estate properties
- Valuable items
- Expenses

✅ Real-time exchange rates (updated hourly)

✅ Manual refresh button available

✅ Your preference persists across sessions

## For Developers

### Adding Currency to a Component

**Option 1: Simple Display (Recommended)**
```tsx
import { useCurrencyConversion } from '@/hooks/use-currency-conversion';

function MyComponent() {
  const { formatMain } = useCurrencyConversion();
  
  const amount = 1000;
  return <div>{formatMain(amount)}</div>;
  // Shows: $1,000 or €1.000 or £1,000 (based on user's choice)
}
```

**Option 2: With Conversion**
```tsx
import { useCurrencyConversion } from '@/hooks/use-currency-conversion';

function MyComponent() {
  const { convertAndFormat } = useCurrencyConversion();
  
  const euroAmount = 1000;
  return <div>{convertAndFormat(euroAmount, 'EUR')}</div>;
  // Converts 1000 EUR to user's main currency and formats
}
```

**Option 3: Using Component**
```tsx
import { CurrencyAmount } from '@/components/ui/currency-display';

function MyComponent() {
  return (
    <CurrencyAmount 
      amount={1000} 
      sourceCurrency="EUR"
      showOriginal={true}
    />
  );
  // Shows: $1,092 (1000 EUR)
}
```

### Converting Multiple Accounts

```tsx
import { useCurrencyConversion } from '@/hooks/use-currency-conversion';

function AccountsList({ accounts }) {
  const { convertToMain, formatMain } = useCurrencyConversion();
  
  // Each account has: { balance: number, currency: string }
  const total = accounts.reduce((sum, account) => {
    return sum + convertToMain(account.balance, account.currency);
  }, 0);
  
  return <div>Total: {formatMain(total)}</div>;
}
```

### Database Updates (Optional but Recommended)

Add currency field to your tables:

```sql
-- Add currency column
ALTER TABLE your_table ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';

-- Add constraint
ALTER TABLE your_table ADD CONSTRAINT valid_currency 
  CHECK (currency ~ '^[A-Z]{3}$');
```

Update TypeScript interfaces:

```typescript
interface Account {
  id: string;
  name: string;
  balance: number;
  currency: string; // NEW: Add this
}
```

## Available Hooks

### `useCurrency()`
Main hook for currency context
```typescript
const {
  mainCurrency,      // Current currency object
  exchangeRates,     // All exchange rates
  setMainCurrency,   // Change main currency
  convert,           // Convert between currencies
  formatCurrency,    // Format with symbol
  refreshRates,      // Refresh exchange rates
  lastUpdated,       // Last update timestamp
  isLoading,         // Loading state
} = useCurrency();
```

### `useCurrencyConversion()`
Simplified hook for conversions (recommended)
```typescript
const {
  convertToMain,     // Convert to main currency
  convertFromMain,   // Convert from main currency
  formatMain,        // Format in main currency
  convertAndFormat,  // Convert & format in one step
  getExchangeRate,   // Get exchange rate
  mainCurrency,      // Current currency
} = useCurrencyConversion();
```

## Components

### `<CurrencySelector />`
Already added to navbar - no action needed!

### `<CurrencyAmount />`
Display amounts with automatic conversion:
```tsx
<CurrencyAmount 
  amount={1000}
  sourceCurrency="EUR"
  showOriginal={true}  // Optional: show original amount
  className="text-lg"  // Optional: custom classes
/>
```

### `<CurrencyInput />`
Input field with conversion indicator:
```tsx
<CurrencyInput
  value={amount}
  onChange={setAmount}
  currency="EUR"
  className="w-full px-3 py-2 border rounded"
  placeholder="0.00"
/>
```

## Examples

See `/components/examples/currency-integration-examples.tsx` for:
- Bank account display with currency
- Portfolio calculations across currencies
- Trading with multiple currencies
- Real estate with purchase and current value currencies
- Input forms with currency selection
- And more!

## Testing Checklist

- [ ] Change main currency in navbar
- [ ] Verify all cards update immediately
- [ ] Check exchange rates are loading
- [ ] Test manual refresh button
- [ ] Verify currency persists after page reload
- [ ] Test with different currencies (EUR, GBP, JPY, etc.)

## Common Issues

**Q: Exchange rates not loading?**
A: Check internet connection and browser console. Fallback rates are used if API unavailable.

**Q: Currency selection not saving?**
A: Check localStorage is enabled in your browser.

**Q: Conversions seem incorrect?**
A: Click refresh button to update exchange rates. Rates update hourly automatically.

## Next Steps

1. Add `currency` field to your data models
2. Update database schema (optional)
3. Integrate currency conversion in your cards
4. Test with different currencies
5. Collect user feedback

## Support

For questions or issues:
- Check `/Docks/MULTI_CURRENCY_SYSTEM.md` for detailed documentation
- Review examples in `/components/examples/currency-integration-examples.tsx`
- Check browser console for errors

---

**Ready to use!** The currency selector is already in the navbar. Start using it now! 🎉

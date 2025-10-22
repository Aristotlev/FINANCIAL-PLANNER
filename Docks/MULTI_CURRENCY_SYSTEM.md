# Multi-Currency System Implementation

## Overview

Money Hub now includes a comprehensive multi-currency system that allows users to:
- Select their main currency for the entire app
- View all financial data converted to their chosen currency
- Enter amounts in different currencies (with automatic conversion)
- Track exchange rates with automatic updates
- Support for 30+ major world currencies

## Features

### 1. Currency Selector Button
Located in the navbar (top-right), the currency selector allows users to:
- Choose from 30+ supported currencies
- Search currencies by code or name
- See currency flags and symbols
- View last update time for exchange rates
- Manually refresh exchange rates

### 2. Automatic Conversion
All financial values are automatically converted to the user's main currency:
- Cash accounts
- Savings accounts
- Crypto holdings
- Stock portfolios
- Trading accounts
- Real estate values
- Valuable items
- Bank accounts

### 3. Multi-Currency Support
Users can:
- Enter amounts in any supported currency
- The system automatically converts to main currency
- View original amounts alongside converted values
- Track exchange rates in real-time

## Supported Currencies

| Code | Currency | Symbol | Flag |
|------|----------|--------|------|
| USD | US Dollar | $ | 🇺🇸 |
| EUR | Euro | € | 🇪🇺 |
| GBP | British Pound | £ | 🇬🇧 |
| JPY | Japanese Yen | ¥ | 🇯🇵 |
| CHF | Swiss Franc | CHF | 🇨🇭 |
| CAD | Canadian Dollar | C$ | 🇨🇦 |
| AUD | Australian Dollar | A$ | 🇦🇺 |
| CNY | Chinese Yuan | ¥ | 🇨🇳 |
| INR | Indian Rupee | ₹ | 🇮🇳 |
| BRL | Brazilian Real | R$ | 🇧🇷 |
| MXN | Mexican Peso | MX$ | 🇲🇽 |
| ZAR | South African Rand | R | 🇿🇦 |
| SGD | Singapore Dollar | S$ | 🇸🇬 |
| HKD | Hong Kong Dollar | HK$ | 🇭🇰 |
| SEK | Swedish Krona | kr | 🇸🇪 |
| NOK | Norwegian Krone | kr | 🇳🇴 |
| DKK | Danish Krone | kr | 🇩🇰 |
| NZD | New Zealand Dollar | NZ$ | 🇳🇿 |
| KRW | South Korean Won | ₩ | 🇰🇷 |
| TRY | Turkish Lira | ₺ | 🇹🇷 |
| RUB | Russian Ruble | ₽ | 🇷🇺 |
| PLN | Polish Zloty | zł | 🇵🇱 |
| THB | Thai Baht | ฿ | 🇹🇭 |
| IDR | Indonesian Rupiah | Rp | 🇮🇩 |
| MYR | Malaysian Ringgit | RM | 🇲🇾 |
| PHP | Philippine Peso | ₱ | 🇵🇭 |
| CZK | Czech Koruna | Kč | 🇨🇿 |
| ILS | Israeli Shekel | ₪ | 🇮🇱 |
| AED | UAE Dirham | د.إ | 🇦🇪 |
| SAR | Saudi Riyal | ﷼ | 🇸🇦 |

## Technical Implementation

### Files Created

1. **contexts/currency-context.tsx**
   - Main currency management context
   - Exchange rate fetching and caching
   - Currency conversion logic
   - Persistent storage of user preference

2. **components/ui/currency-selector.tsx**
   - Currency selector button component
   - Dropdown with search functionality
   - Exchange rate refresh button
   - Last updated indicator

3. **hooks/use-currency-conversion.ts**
   - Hook for easy currency conversion in components
   - Utility functions for formatting and converting
   - Exchange rate lookups

4. **components/ui/currency-display.tsx**
   - Reusable components for displaying currency amounts
   - CurrencyAmount: Display with automatic conversion
   - CurrencyInput: Input with conversion indicator

### Usage Examples

#### Display an amount in main currency
```tsx
import { useCurrencyConversion } from '@/hooks/use-currency-conversion';

function MyComponent() {
  const { formatMain } = useCurrencyConversion();
  
  return <div>{formatMain(1000)}</div>; // Shows $1,000 (or €1.000, £1,000, etc.)
}
```

#### Convert from another currency
```tsx
import { useCurrencyConversion } from '@/hooks/use-currency-conversion';

function MyComponent() {
  const { convertAndFormat } = useCurrencyConversion();
  
  // Convert 100 EUR to main currency and format
  return <div>{convertAndFormat(100, 'EUR')}</div>;
}
```

#### Use CurrencyAmount component
```tsx
import { CurrencyAmount } from '@/components/ui/currency-display';

function MyComponent() {
  return (
    <CurrencyAmount 
      amount={5000} 
      sourceCurrency="JPY"
      showOriginal={true} // Shows: $33.42 (5000 JPY)
    />
  );
}
```

#### Use CurrencyInput component
```tsx
import { CurrencyInput } from '@/components/ui/currency-display';

function MyComponent() {
  const [amount, setAmount] = useState(0);
  
  return (
    <CurrencyInput
      value={amount}
      onChange={setAmount}
      currency="EUR" // Input in EUR, shows conversion to main currency
      className="px-3 py-2 border rounded"
    />
  );
}
```

## Exchange Rates

### Rate Provider
- Uses exchangerate-api.com free tier
- 1,500 requests per month
- Updates hourly
- Falls back to approximate rates if API unavailable

### Caching
- Rates cached in localStorage
- Cache duration: 1 hour
- Automatic refresh when stale
- Manual refresh button available

### Conversion Logic
All conversions use USD as base currency:
1. Convert source amount to USD
2. Convert USD to target currency
3. Formula: `(amount / sourceRate) * targetRate`

## Integration with Financial Cards

To integrate currency conversion into financial cards:

```tsx
import { useCurrencyConversion } from '@/hooks/use-currency-conversion';

function CashCard() {
  const { convertToMain, formatMain } = useCurrencyConversion();
  
  // If account has currency property
  const accounts = [
    { balance: 1000, currency: 'EUR' },
    { balance: 5000, currency: 'USD' },
  ];
  
  const totalInMainCurrency = accounts.reduce((sum, account) => {
    return sum + convertToMain(account.balance, account.currency);
  }, 0);
  
  return <div>Total: {formatMain(totalInMainCurrency)}</div>;
}
```

## Database Schema Updates (Recommended)

To fully support multi-currency, consider adding currency fields:

```sql
-- Add currency column to existing tables
ALTER TABLE cash_accounts ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE savings_accounts ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE trading_accounts ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE real_estate ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE valuable_items ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';

-- Create index for currency lookups
CREATE INDEX idx_cash_accounts_currency ON cash_accounts(currency);
CREATE INDEX idx_savings_accounts_currency ON savings_accounts(currency);
```

## User Experience

### First-time Setup
1. User logs in
2. Default currency is USD
3. User can click currency selector in navbar
4. Select their preferred currency
5. All values automatically update

### Daily Usage
1. Enter amounts in any supported currency
2. System converts to main currency automatically
3. View original amounts with tooltips
4. Exchange rates update hourly
5. Manual refresh available anytime

### Currency Change
When user changes main currency:
1. Selection persists across sessions
2. All displayed values update immediately
3. Event dispatched to notify all components
4. No data loss or recalculation needed

## Performance Considerations

1. **Exchange Rate Caching**: Rates cached for 1 hour to minimize API calls
2. **Lazy Loading**: Rates fetched only when needed
3. **Optimistic Updates**: UI updates immediately, rates fetch in background
4. **Fallback Rates**: Approximate rates used if API unavailable
5. **Event-Driven**: Components update via event listeners, not polling

## Future Enhancements

1. **Historical Rates**: Track exchange rate history for better analytics
2. **Rate Alerts**: Notify users of significant rate changes
3. **Multi-Currency Accounts**: Allow single account to have multiple currencies
4. **Currency Conversion Fees**: Add transaction fee calculations
5. **Cryptocurrency Integration**: Include crypto prices in multiple fiat currencies
6. **Custom Exchange Rates**: Allow manual rate overrides for specific use cases

## Troubleshooting

### Exchange rates not updating
1. Check internet connection
2. Click refresh button in currency selector
3. Check browser console for API errors
4. Verify exchangerate-api.com is accessible

### Incorrect conversions
1. Check if exchange rates are current (last updated time)
2. Verify source and target currencies are supported
3. Clear localStorage and refresh rates
4. Check if amounts are in correct currency

### Currency selector not showing
1. Verify CurrencyProvider is in layout.tsx
2. Check component import paths
3. Ensure user is authenticated
4. Check z-index conflicts

## API Reference

### useCurrency Hook
```typescript
const {
  mainCurrency,      // Current main currency object
  exchangeRates,     // Object with all exchange rates
  setMainCurrency,   // Function to change main currency
  convert,           // Convert between any two currencies
  formatCurrency,    // Format amount with currency symbol
  refreshRates,      // Manually refresh exchange rates
  lastUpdated,       // Date of last rate update
  isLoading,         // Loading state for rate fetching
} = useCurrency();
```

### useCurrencyConversion Hook
```typescript
const {
  convertToMain,     // Convert from any currency to main
  convertFromMain,   // Convert from main to any currency
  formatMain,        // Format amount in main currency
  convertAndFormat,  // Convert and format in one step
  getExchangeRate,   // Get rate between two currencies
  isCurrencySupported, // Check if currency is supported
  mainCurrency,      // Current main currency object
} = useCurrencyConversion();
```

## Conclusion

The multi-currency system provides a robust foundation for global financial management. Users can now track their finances in their preferred currency while maintaining the flexibility to work with multiple currencies across all features.

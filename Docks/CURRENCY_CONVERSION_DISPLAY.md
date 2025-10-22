# Currency Conversion Display on Cards

## Overview

All financial cards now support displaying the equivalent value in your selected currency on top of the card. This feature works exactly like cryptocurrency cards - when you select a different currency, each card will show the converted amount above the original amount.

## How It Works

### Visual Display

When you select a currency different from USD (or the card's source currency), the card's hologram display will show:

1. **Top**: Converted amount in your selected currency (≈ €XX,XXX)
2. **Middle**: Original amount in source currency ($XX,XXX)
3. **Bottom**: Source currency indicator ("in USD")

### Example

If you have:
- Cash: $10,000 USD
- Selected Currency: EUR (€)

The card will display:
```
≈ €9,200
$10,000
in USD
```

## Implementation Guide

### For Component Developers

To add currency conversion to any financial card, follow these steps:

#### 1. Import the Currency Hook

```tsx
import { useCurrencyConversion } from "../../hooks/use-currency-conversion";
```

#### 2. Use the Hook in Your Component

```tsx
export function YourCard() {
  const { convertToMain, formatMain, mainCurrency } = useCurrencyConversion();
  
  // Your existing logic to calculate card value...
  const totalValue = calculateYourValue();
  
  // Add currency conversion
  const convertedValue = convertToMain(totalValue, 'USD'); // Replace 'USD' with your source currency
  const convertedAmount = formatMain(convertedValue);
  const originalAmount = `$${totalValue.toLocaleString()}`;
  
  return (
    <EnhancedFinancialCard
      // ... other props
      amount={originalAmount}
      convertedAmount={convertedAmount}
      sourceCurrency="USD" // Replace with your source currency
    />
  );
}
```

#### 3. Pass Props to EnhancedFinancialCard

Two new props are available:

- **`convertedAmount?: string`** - The converted amount formatted in the selected currency
- **`sourceCurrency?: string`** - The source currency code (e.g., 'USD', 'EUR', 'GBP')

### Complete Example - Cash Card

```tsx
export function CashCard() {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const { convertToMain, formatMain, mainCurrency } = useCurrencyConversion();

  // Load accounts...
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  
  // Currency conversion
  const convertedBalance = convertToMain(totalBalance, 'USD');
  const convertedAmount = formatMain(convertedBalance);
  const originalAmount = `$${Math.round(totalBalance).toLocaleString()}`;

  return (
    <EnhancedFinancialCard
      title="Cash & Liquid Assets"
      amount={originalAmount}
      convertedAmount={convertedAmount}
      sourceCurrency="USD"
      // ... other props
    />
  );
}
```

### Complete Example - Crypto Card

```tsx
function CryptoCardWithPrices() {
  const [cryptoHoldings, setCryptoHoldings] = useState<CryptoHolding[]>([]);
  const { convertToMain, formatMain, mainCurrency } = useCurrencyConversion();
  
  const totalValue = portfolioData.reduce((sum, holding) => sum + holding.value, 0);
  
  // Currency conversion
  const convertedValue = convertToMain(totalValue, 'USD');
  const convertedAmount = formatMain(convertedValue);
  const originalAmount = `$${formatNumber(totalValue)}`;

  return (
    <EnhancedFinancialCard
      title="Crypto Portfolio"
      amount={originalAmount}
      convertedAmount={convertedAmount}
      sourceCurrency="USD"
      // ... other props
    />
  );
}
```

## Supported Features

### Currency Hook Functions

The `useCurrencyConversion` hook provides:

- **`convertToMain(amount, fromCurrency)`** - Convert any amount to the main currency
- **`convertFromMain(amount, toCurrency)`** - Convert from main currency to another
- **`formatMain(amount)`** - Format amount with the main currency symbol
- **`convertAndFormat(amount, fromCurrency)`** - Convert and format in one call
- **`getExchangeRate(from, to)`** - Get exchange rate between two currencies
- **`mainCurrency`** - The currently selected main currency object

### Supported Currencies

30+ currencies including:
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
- And 20+ more...

## Cards Already Updated

✅ **Cash Card** - Shows converted cash balance
✅ **Crypto Card** - Shows converted crypto portfolio value

## Cards To Update

Apply the same pattern to these cards:

- [ ] Savings Card
- [ ] Stocks Card
- [ ] Real Estate Card
- [ ] Trading Account Card
- [ ] Valuable Items Card
- [ ] Net Worth Card

## Technical Details

### Component Architecture

1. **EnhancedFinancialCard** - Accepts `convertedAmount` and `sourceCurrency` props
2. **Visual3** - Passes these to hologram data
3. **Layer2** - Displays the converted amount in the hologram popup

### Display Logic

The converted amount is only shown when:
- `convertedAmount` prop is provided
- `convertedAmount` differs from `amount` (i.e., not the same currency)

This prevents redundant display when source and target currencies are the same.

### Styling

The converted amount appears with:
- Smaller font size (text-xs)
- Muted color (gray-500/400)
- "≈" symbol to indicate approximation
- Positioned above the main amount

## Best Practices

1. **Always specify source currency** - Use the actual currency your data is stored in
2. **Handle loading states** - Don't convert while data is loading
3. **Validate numbers** - Ensure values are valid before conversion
4. **Use consistent formatting** - Use the hook's `formatMain()` function

## Example User Flow

1. User selects EUR (€) from currency selector
2. All cards automatically recalculate and display converted amounts
3. Cash card shows: ≈ €25,000 (above) and $27,500 (below)
4. Crypto card shows: ≈ €18,400 (above) and $20,000 (below)
5. User switches to GBP (£)
6. All cards update instantly to show GBP equivalents

## Troubleshooting

### Converted amount not showing

Check:
1. Both `convertedAmount` and `sourceCurrency` props are passed
2. The source currency differs from selected main currency
3. Exchange rates are loaded (check `lastUpdated` in currency context)

### Incorrect conversion

Verify:
1. Source currency code is correct (3-letter ISO code)
2. Exchange rates are up to date (refresh if needed)
3. Amount is a valid number before conversion

## Future Enhancements

- [ ] Add historical exchange rate tracking
- [ ] Show conversion rate tooltip
- [ ] Add multi-currency support for mixed portfolios
- [ ] Cache conversions for performance
- [ ] Add offline exchange rate support

## Related Documentation

- [Multi-Currency System](./MULTI_CURRENCY_SYSTEM.md)
- [Currency Context](./CURRENCY_README.md)
- [Currency Migration Guide](./CURRENCY_MIGRATION_GUIDE.md)
- [Quick Start Guide](./CURRENCY_QUICK_START.md)

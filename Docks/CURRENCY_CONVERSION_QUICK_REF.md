# 🚀 Quick Reference - Add Currency Conversion to Any Card

## Copy-Paste Template

```tsx
// 1. ADD IMPORT
import { useCurrencyConversion } from "../../hooks/use-currency-conversion";

export function YourCard() {
  // 2. ADD HOOK
  const { convertToMain, formatMain } = useCurrencyConversion();
  
  // Your existing code to calculate total value...
  const totalValue = 10000; // Example
  
  // 3. ADD THESE 3 LINES
  const convertedValue = convertToMain(totalValue, 'USD');
  const convertedAmount = formatMain(convertedValue);
  const originalAmount = `$${totalValue.toLocaleString()}`;
  
  // 4. UPDATE RETURN
  return (
    <EnhancedFinancialCard
      amount={originalAmount}           // Use originalAmount
      convertedAmount={convertedAmount} // ADD THIS
      sourceCurrency="USD"              // ADD THIS (or your currency)
      // ... rest of your props
    />
  );
}
```

## Source Currency by Card Type

| Card Type | Source Currency | Notes |
|-----------|----------------|-------|
| Cash | USD | Or user's local currency |
| Crypto | USD | Crypto prices in USD |
| Stocks | USD | Stock prices in USD |
| Real Estate | USD | Property values in USD |
| Trading | USD | Trading account in USD |
| Savings | USD | Or user's local currency |
| Net Worth | USD | Aggregated in USD |

**Change 'USD' to match your actual data source!**

## Full Examples

### Cash Card (Already Done ✅)
```tsx
import { useCurrencyConversion } from "../../hooks/use-currency-conversion";

export function CashCard() {
  const { convertToMain, formatMain } = useCurrencyConversion();
  const totalBalance = 30000; // From your data
  
  const convertedBalance = convertToMain(totalBalance, 'USD');
  const convertedAmount = formatMain(convertedBalance);
  const originalAmount = `$${totalBalance.toLocaleString()}`;

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

### Stocks Card (To Do)
```tsx
import { useCurrencyConversion } from "../../hooks/use-currency-conversion";

export function StocksCard() {
  const { convertToMain, formatMain } = useCurrencyConversion();
  const totalPortfolio = 50000; // From your data
  
  const convertedValue = convertToMain(totalPortfolio, 'USD');
  const convertedAmount = formatMain(convertedValue);
  const originalAmount = `$${totalPortfolio.toLocaleString()}`;

  return (
    <EnhancedFinancialCard
      title="Stock Portfolio"
      amount={originalAmount}
      convertedAmount={convertedAmount}
      sourceCurrency="USD"
      // ... other props
    />
  );
}
```

### Savings Card (To Do)
```tsx
import { useCurrencyConversion } from "../../hooks/use-currency-conversion";

export function SavingsCard() {
  const { convertToMain, formatMain } = useCurrencyConversion();
  const totalSavings = 75000; // From your data
  
  const convertedValue = convertToMain(totalSavings, 'USD');
  const convertedAmount = formatMain(convertedValue);
  const originalAmount = `$${totalSavings.toLocaleString()}`;

  return (
    <EnhancedFinancialCard
      title="Savings & Investments"
      amount={originalAmount}
      convertedAmount={convertedAmount}
      sourceCurrency="USD"
      // ... other props
    />
  );
}
```

## Testing After Implementation

1. Open the app
2. Select a currency (🇪🇺 EUR, 🇬🇧 GBP, etc.)
3. Hover over your updated card
4. **Check hologram** - should show:
   ```
   ≈ €XX,XXX  ← Converted
   $XX,XXX    ← Original
   in USD     ← Source
   ```

## Troubleshooting

### ❌ Converted amount not showing?

**Check:**
- [ ] Added `convertedAmount` prop
- [ ] Added `sourceCurrency` prop
- [ ] Source currency ≠ selected currency
- [ ] Value is not 0 or loading

### ❌ Wrong conversion?

**Check:**
- [ ] Source currency code is correct ('USD', 'EUR', etc.)
- [ ] Amount is a valid number
- [ ] Exchange rates are loaded

### ❌ TypeScript errors?

**Check:**
- [ ] Import statement is correct
- [ ] Hook is called inside component
- [ ] Props match interface

## Hook Functions Reference

```tsx
const {
  convertToMain,      // (amount, from) => converted number
  formatMain,         // (amount) => formatted string
  mainCurrency        // Current selected currency object
} = useCurrencyConversion();
```

### convertToMain(amount, fromCurrency)
- **Input**: `(10000, 'USD')`
- **Output**: `9200` (if EUR selected)

### formatMain(amount)
- **Input**: `9200`
- **Output**: `"€9,200"` (if EUR selected)

## Cards Status

| Card | Status | Lines Changed |
|------|--------|---------------|
| Cash Card | ✅ Done | 3 lines |
| Crypto Card | ✅ Done | 3 lines |
| Savings Card | ⏳ Todo | 3 lines |
| Stocks Card | ⏳ Todo | 3 lines |
| Real Estate Card | ⏳ Todo | 3 lines |
| Trading Card | ⏳ Todo | 3 lines |
| Valuable Items | ⏳ Todo | 3 lines |
| Net Worth Card | ⏳ Todo | 3 lines |

**Each card needs exactly 3 lines of code!**

## Git Commit Message Template

```
feat: add currency conversion to [CardName]

- Import useCurrencyConversion hook
- Calculate converted amount in selected currency
- Pass convertedAmount and sourceCurrency to card
- Display converted value in hologram popup

Follows same pattern as Cash and Crypto cards.
```

## Need Help?

See full documentation:
- 📘 [Implementation Guide](./CURRENCY_CONVERSION_DISPLAY.md)
- 🎨 [Visual Guide](./CURRENCY_CONVERSION_VISUAL_GUIDE.md)
- ✅ [Complete Summary](./CURRENCY_CONVERSION_COMPLETE.md)

---

**That's it! Just 3 lines of code per card. Happy coding! 🎉**

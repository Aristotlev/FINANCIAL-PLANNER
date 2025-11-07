# Currency Integration Migration Guide

## Step-by-Step: Adding Currency Support to Financial Cards

This guide shows how to add multi-currency support to existing financial cards.

---

## 📋 Pre-Migration Checklist

- [ ] Currency system is installed and working
- [ ] Currency selector appears in navbar
- [ ] You can select different currencies
- [ ] Exchange rates are loading

---

## 🔧 Step 1: Update TypeScript Interfaces

### Before
```typescript
interface CashAccount {
  id: string;
  name: string;
  balance: number;
  bank?: string;
}
```

### After
```typescript
interface CashAccount {
  id: string;
  name: string;
  balance: number;
  currency: string;  // NEW: ISO 4217 code (e.g., "USD", "EUR")
  bank?: string;
}
```

**Apply to:**
- Cash accounts
- Savings accounts
- Trading accounts
- Real estate properties
- Valuable items
- Any financial data with amounts

---

## 🗄️ Step 2: Update Database Schema (Optional but Recommended)

### SQL Migration
```sql
-- Add currency column with default
ALTER TABLE cash_accounts ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE savings_accounts ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE trading_accounts ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE real_estate ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE valuable_items ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';

-- Add constraint to ensure valid currency codes
ALTER TABLE cash_accounts ADD CONSTRAINT valid_currency_code 
  CHECK (currency ~ '^[A-Z]{3}$');

-- Create index for currency queries
CREATE INDEX idx_cash_accounts_currency ON cash_accounts(currency);
```

### Supabase Migration File
```sql
-- File: supabase-currency-migration.sql

-- Cash Accounts
ALTER TABLE cash_accounts 
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Savings Accounts
ALTER TABLE savings_accounts 
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Trading Accounts
ALTER TABLE trading_accounts 
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Real Estate
ALTER TABLE real_estate 
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Valuable Items
ALTER TABLE valuable_items 
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Add constraints
ALTER TABLE cash_accounts 
  ADD CONSTRAINT valid_currency_cash CHECK (currency ~ '^[A-Z]{3}$');

ALTER TABLE savings_accounts 
  ADD CONSTRAINT valid_currency_savings CHECK (currency ~ '^[A-Z]{3}$');

ALTER TABLE trading_accounts 
  ADD CONSTRAINT valid_currency_trading CHECK (currency ~ '^[A-Z]{3}$');

ALTER TABLE real_estate 
  ADD CONSTRAINT valid_currency_realestate CHECK (currency ~ '^[A-Z]{3}$');

ALTER TABLE valuable_items 
  ADD CONSTRAINT valid_currency_valuable CHECK (currency ~ '^[A-Z]{3}$');
```

---

## 💻 Step 3: Update Card Component

### Example: Cash Card

#### Before
```tsx
function CashCard() {
  const [accounts, setAccounts] = useState([]);
  
  const total = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  
  return (
    <div>
      <h2>Cash</h2>
      <div>Total: ${total.toFixed(2)}</div>
      {accounts.map(account => (
        <div key={account.id}>
          {account.name}: ${account.balance.toFixed(2)}
        </div>
      ))}
    </div>
  );
}
```

#### After
```tsx
import { useCurrencyConversion } from '@/hooks/use-currency-conversion';
import { CurrencyAmount } from '@/components/ui/currency-display';

function CashCard() {
  const [accounts, setAccounts] = useState([]);
  const { convertToMain, formatMain } = useCurrencyConversion();
  
  // Calculate total in main currency
  const total = accounts.reduce((sum, acc) => {
    return sum + convertToMain(acc.balance, acc.currency || 'USD');
  }, 0);
  
  return (
    <div>
      <h2>Cash</h2>
      <div>Total: {formatMain(total)}</div>
      {accounts.map(account => (
        <div key={account.id}>
          {account.name}: <CurrencyAmount 
            amount={account.balance}
            sourceCurrency={account.currency || 'USD'}
            showOriginal={account.currency !== 'USD'}
          />
        </div>
      ))}
    </div>
  );
}
```

---

## 📝 Step 4: Update Form Inputs

### Example: Add Account Form

#### Before
```tsx
function AddAccountForm() {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState(0);
  
  return (
    <form>
      <input 
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Account name"
      />
      <input 
        type="number"
        value={balance}
        onChange={(e) => setBalance(parseFloat(e.target.value))}
        placeholder="Balance"
      />
      <button type="submit">Add</button>
    </form>
  );
}
```

#### After
```tsx
import { SUPPORTED_CURRENCIES } from '@/contexts/currency-context';

function AddAccountForm() {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('USD');  // NEW
  
  return (
    <form>
      <input 
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Account name"
      />
      
      {/* NEW: Currency selector */}
      <select 
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        className="w-full p-2 border rounded"
      >
        {SUPPORTED_CURRENCIES.map(curr => (
          <option key={curr.code} value={curr.code}>
            {curr.flag} {curr.code} - {curr.name}
          </option>
        ))}
      </select>
      
      <input 
        type="number"
        value={balance}
        onChange={(e) => setBalance(parseFloat(e.target.value))}
        placeholder="Balance"
      />
      
      <button type="submit">Add</button>
    </form>
  );
}
```

---

## 📊 Step 5: Update Data Service

### Example: Supabase Data Service

#### Before
```typescript
async addCashAccount(account: Omit<CashAccount, 'id'>) {
  const { data, error } = await supabase
    .from('cash_accounts')
    .insert({
      name: account.name,
      balance: account.balance,
      bank: account.bank,
    });
  
  return data;
}
```

#### After
```typescript
async addCashAccount(account: Omit<CashAccount, 'id'>) {
  const { data, error } = await supabase
    .from('cash_accounts')
    .insert({
      name: account.name,
      balance: account.balance,
      currency: account.currency || 'USD',  // NEW: Include currency
      bank: account.bank,
    });
  
  return data;
}
```

---

## 🔄 Step 6: Handle Currency Changes

Add event listener to refresh data when currency changes:

```tsx
function CashCard() {
  const [refreshKey, setRefreshKey] = useState(0);
  
  useEffect(() => {
    const handleCurrencyChange = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('currencyChanged', handleCurrencyChange);
    
    return () => {
      window.removeEventListener('currencyChanged', handleCurrencyChange);
    };
  }, []);
  
  // Rest of component...
  // Use refreshKey as dependency or in key prop
}
```

---

## 📈 Step 7: Update Charts and Visualizations

### Example: Portfolio Chart

#### Before
```tsx
const chartData = [
  { name: 'Cash', value: 5000 },
  { name: 'Savings', value: 10000 },
  { name: 'Crypto', value: 15000 },
];
```

#### After
```tsx
import { useCurrencyConversion } from '@/hooks/use-currency-conversion';

function PortfolioChart() {
  const { convertToMain } = useCurrencyConversion();
  
  const accounts = [
    { name: 'Cash', value: 5000, currency: 'USD' },
    { name: 'Savings', value: 9000, currency: 'EUR' },
    { name: 'Crypto', value: 20000, currency: 'USD' },
  ];
  
  const chartData = accounts.map(acc => ({
    name: acc.name,
    value: convertToMain(acc.value, acc.currency),
  }));
  
  return <PieChart data={chartData} />;
}
```

---

## 🧪 Testing Your Integration

### Test Checklist

1. **Display Test**
   - [ ] Amounts display in selected currency
   - [ ] Currency symbols are correct
   - [ ] Decimal places appropriate for currency

2. **Conversion Test**
   - [ ] Switch currency in navbar
   - [ ] All values update immediately
   - [ ] Totals recalculate correctly
   - [ ] Original amounts preserved

3. **Input Test**
   - [ ] Can select currency in forms
   - [ ] Can enter amounts in different currencies
   - [ ] Conversion indicators work
   - [ ] Data saves with correct currency

4. **Persistence Test**
   - [ ] Currency selection persists after reload
   - [ ] Account currencies save correctly
   - [ ] Exchange rates cache properly

5. **Edge Cases**
   - [ ] Zero amounts display correctly
   - [ ] Large numbers format properly
   - [ ] Negative amounts work (if applicable)
   - [ ] Missing currency defaults to USD

---

## 🎯 Common Patterns

### Pattern 1: Display Single Amount
```tsx
<CurrencyAmount 
  amount={value}
  sourceCurrency={currency}
/>
```

### Pattern 2: Calculate Total
```tsx
const { convertToMain } = useCurrencyConversion();
const total = items.reduce((sum, item) => 
  sum + convertToMain(item.amount, item.currency), 0
);
```

### Pattern 3: Format for Display
```tsx
const { formatMain } = useCurrencyConversion();
<div>{formatMain(amount)}</div>
```

### Pattern 4: Input with Currency
```tsx
<select value={currency} onChange={e => setCurrency(e.target.value)}>
  {SUPPORTED_CURRENCIES.map(c => (
    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
  ))}
</select>
<input type="number" value={amount} onChange={e => setAmount(+e.target.value)} />
```

---

## 🚨 Common Pitfalls

### ❌ Don't: Store converted values
```tsx
// BAD - Don't save converted values
const convertedBalance = convertToMain(balance, currency);
await saveAccount({ balance: convertedBalance, currency: mainCurrency });
```

### ✅ Do: Store original values with currency
```tsx
// GOOD - Save original amount with its currency
await saveAccount({ balance, currency });
```

### ❌ Don't: Hardcode currency symbols
```tsx
// BAD
<div>${amount}</div>
```

### ✅ Do: Use currency utilities
```tsx
// GOOD
<div>{formatMain(amount)}</div>
```

### ❌ Don't: Convert during data fetching
```tsx
// BAD - Don't modify data in fetch
const accounts = await fetchAccounts();
return accounts.map(acc => ({
  ...acc,
  balance: convertToMain(acc.balance, acc.currency)
}));
```

### ✅ Do: Convert during display
```tsx
// GOOD - Convert when displaying
const accounts = await fetchAccounts();
return accounts.map(acc => (
  <div>
    <CurrencyAmount amount={acc.balance} sourceCurrency={acc.currency} />
  </div>
));
```

---

## 📦 Complete Example: Cash Card

Here's a complete example of a currency-enabled card:

```tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useCurrencyConversion } from '@/hooks/use-currency-conversion';
import { CurrencyAmount } from '@/components/ui/currency-display';
import { SUPPORTED_CURRENCIES } from '@/contexts/currency-context';
import { SupabaseDataService } from '@/lib/supabase/supabase-data-service';

interface CashAccount {
  id: string;
  name: string;
  balance: number;
  currency: string;
  bank?: string;
}

export function CashCard() {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const { convertToMain, formatMain } = useCurrencyConversion();

  // Load accounts
  useEffect(() => {
    loadAccounts();
  }, []);

  // Refresh on currency change
  useEffect(() => {
    const handleCurrencyChange = () => {
      // Force re-render
      loadAccounts();
    };
    window.addEventListener('currencyChanged', handleCurrencyChange);
    return () => window.removeEventListener('currencyChanged', handleCurrencyChange);
  }, []);

  const loadAccounts = async () => {
    const data = await SupabaseDataService.getCashAccounts([]);
    setAccounts(data);
  };

  // Calculate total in main currency
  const total = accounts.reduce((sum, account) => {
    return sum + convertToMain(account.balance, account.currency);
  }, 0);

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Cash Accounts</h2>
        <button 
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Add Account
        </button>
      </div>

      {/* Total */}
      <div className="text-3xl font-bold mb-6">
        {formatMain(total)}
      </div>

      {/* Account List */}
      <div className="space-y-3">
        {accounts.map(account => (
          <div key={account.id} className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <div>
              <div className="font-semibold">{account.name}</div>
              {account.bank && <div className="text-sm text-gray-500">{account.bank}</div>}
            </div>
            <div className="text-right">
              <CurrencyAmount 
                amount={account.balance}
                sourceCurrency={account.currency}
                showOriginal={true}
                className="font-semibold"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <AddAccountForm 
          onSuccess={() => {
            setShowAddForm(false);
            loadAccounts();
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}

function AddAccountForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [bank, setBank] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await SupabaseDataService.addCashAccount({
      name,
      balance,
      currency,
      bank,
    });
    
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full space-y-4">
        <h3 className="text-xl font-bold">Add Cash Account</h3>
        
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Account name"
          className="w-full p-2 border rounded"
          required
        />
        
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full p-2 border rounded"
        >
          {SUPPORTED_CURRENCIES.map(curr => (
            <option key={curr.code} value={curr.code}>
              {curr.flag} {curr.code} - {curr.name}
            </option>
          ))}
        </select>
        
        <input
          type="number"
          value={balance}
          onChange={(e) => setBalance(parseFloat(e.target.value))}
          placeholder="Balance"
          step="0.01"
          className="w-full p-2 border rounded"
          required
        />
        
        <input
          type="text"
          value={bank}
          onChange={(e) => setBank(e.target.value)}
          placeholder="Bank (optional)"
          className="w-full p-2 border rounded"
        />
        
        <div className="flex gap-2">
          <button type="submit" className="flex-1 px-4 py-2 bg-blue-500 text-white rounded">
            Add Account
          </button>
          <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
```

---

## ✅ Migration Complete!

After following this guide, your financial cards will:
- ✓ Display amounts in user's preferred currency
- ✓ Support multiple currencies per card
- ✓ Calculate totals across currencies
- ✓ Update automatically when currency changes
- ✓ Persist currency information in database

---

## 📚 Additional Resources

- **Technical Docs:** `/Docks/MULTI_CURRENCY_SYSTEM.md`
- **Quick Start:** `/CURRENCY_QUICK_START.md`
- **Code Examples:** `/components/examples/currency-integration-examples.tsx`
- **Summary:** `/MULTI_CURRENCY_SUMMARY.md`

/**
 * Example: How to add multi-currency support to financial cards
 * 
 * This file demonstrates the patterns for integrating the currency system
 * into existing financial cards like Cash, Savings, Crypto, etc.
 */

import React from 'react';
import { useCurrencyConversion } from '../../hooks/use-currency-conversion';
import { CurrencyAmount, CurrencyInput } from '../ui/currency-display';

// EXAMPLE 1: Display account balance with currency conversion
// ============================================================

interface BankAccount {
  id: string;
  name: string;
  balance: number;
  currency: string; // NEW: Add currency field to your data models
}

function BankAccountDisplay({ account }: { account: BankAccount }) {
  const { convertToMain, formatMain } = useCurrencyConversion();
  
  // Convert account balance to main currency
  const balanceInMainCurrency = convertToMain(account.balance, account.currency);
  
  return (
    <div className="p-4 border rounded">
      <h3>{account.name}</h3>
      
      {/* Option 1: Manual conversion and formatting */}
      <p>Balance: {formatMain(balanceInMainCurrency)}</p>
      
      {/* Option 2: Use CurrencyAmount component (recommended) */}
      <p>
        Balance: <CurrencyAmount 
          amount={account.balance} 
          sourceCurrency={account.currency}
          showOriginal={true} // Shows: $1,092 (1000 EUR)
        />
      </p>
    </div>
  );
}

// EXAMPLE 2: Calculate total across multiple currencies
// ======================================================

function TotalBalance({ accounts }: { accounts: BankAccount[] }) {
  const { convertToMain, formatMain } = useCurrencyConversion();
  
  // Sum all accounts in main currency
  const total = accounts.reduce((sum, account) => {
    return sum + convertToMain(account.balance, account.currency);
  }, 0);
  
  return (
    <div className="text-2xl font-bold">
      Total: {formatMain(total)}
    </div>
  );
}

// EXAMPLE 3: Input form with currency selection
// ==============================================

function AddAccountForm() {
  const [formData, setFormData] = React.useState({
    name: '',
    balance: 0,
    currency: 'USD', // Default to USD or user's main currency
  });
  
  return (
    <form className="space-y-4">
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Account name"
        className="w-full p-2 border rounded"
      />
      
      {/* Currency selection */}
      <select
        value={formData.currency}
        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
        className="w-full p-2 border rounded"
      >
        <option value="USD">🇺🇸 USD ($)</option>
        <option value="EUR">🇪🇺 EUR (€)</option>
        <option value="GBP">🇬🇧 GBP (£)</option>
        <option value="JPY">🇯🇵 JPY (¥)</option>
        {/* Add more currencies as needed */}
      </select>
      
      {/* Balance input with conversion indicator */}
      <CurrencyInput
        value={formData.balance}
        onChange={(value: number) => setFormData({ ...formData, balance: value })}
        currency={formData.currency}
        className="w-full p-2 border rounded"
        placeholder="0.00"
      />
      
      <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">
        Add Account
      </button>
    </form>
  );
}

// EXAMPLE 4: Crypto/Stock portfolio with multiple currencies
// ===========================================================

interface CryptoHolding {
  symbol: string;
  amount: number;
  priceUSD: number; // Price in USD
  // Prices from APIs are usually in USD
}

function CryptoPortfolio({ holdings }: { holdings: CryptoHolding[] }) {
  const { convertToMain, formatMain, mainCurrency } = useCurrencyConversion();
  
  const totalValue = holdings.reduce((sum, holding) => {
    // Calculate value in USD first
    const valueInUSD = holding.amount * holding.priceUSD;
    // Convert to main currency
    return sum + convertToMain(valueInUSD, 'USD');
  }, 0);
  
  return (
    <div className="space-y-2">
      <h2>Crypto Portfolio</h2>
      
      {holdings.map(holding => {
        const valueInUSD = holding.amount * holding.priceUSD;
        const valueInMain = convertToMain(valueInUSD, 'USD');
        
        return (
          <div key={holding.symbol} className="flex justify-between p-2 border rounded">
            <span>{holding.amount} {holding.symbol}</span>
            <span>{formatMain(valueInMain)}</span>
          </div>
        );
      })}
      
      <div className="flex justify-between font-bold text-lg pt-2 border-t">
        <span>Total</span>
        <span>{formatMain(totalValue)}</span>
      </div>
    </div>
  );
}

// EXAMPLE 5: Trading with different currencies
// =============================================

interface Trade {
  symbol: string;
  shares: number;
  pricePerShare: number;
  currency: string; // Currency the trade was executed in
  date: Date;
}

function TradeHistory({ trades }: { trades: Trade[] }) {
  const { convertToMain, formatMain, getExchangeRate } = useCurrencyConversion();
  
  return (
    <div className="space-y-2">
      {trades.map((trade, idx) => {
        const tradeValue = trade.shares * trade.pricePerShare;
        const valueInMain = convertToMain(tradeValue, trade.currency);
        const exchangeRate = getExchangeRate(trade.currency);
        
        return (
          <div key={idx} className="p-3 border rounded">
            <div className="flex justify-between">
              <span>{trade.shares} shares of {trade.symbol}</span>
              <span>{formatMain(valueInMain)}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Original: {tradeValue.toFixed(2)} {trade.currency}
              {exchangeRate && ` (Rate: ${exchangeRate.toFixed(4)})`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// EXAMPLE 6: Real Estate with currency
// =====================================

interface Property {
  address: string;
  purchasePrice: number;
  purchaseCurrency: string;
  currentValue: number;
  currentCurrency: string;
}

function PropertyCard({ property }: { property: Property }) {
  const { convertToMain, formatMain } = useCurrencyConversion();
  
  const purchasePriceInMain = convertToMain(
    property.purchasePrice, 
    property.purchaseCurrency
  );
  const currentValueInMain = convertToMain(
    property.currentValue,
    property.currentCurrency
  );
  
  const gainLoss = currentValueInMain - purchasePriceInMain;
  const gainLossPercent = (gainLoss / purchasePriceInMain) * 100;
  
  return (
    <div className="p-4 border rounded">
      <h3 className="font-bold">{property.address}</h3>
      
      <div className="mt-2 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Purchase Price:</span>
          <CurrencyAmount 
            amount={property.purchasePrice}
            sourceCurrency={property.purchaseCurrency}
            showOriginal={property.purchaseCurrency !== 'USD'}
          />
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Current Value:</span>
          <CurrencyAmount 
            amount={property.currentValue}
            sourceCurrency={property.currentCurrency}
            showOriginal={property.currentCurrency !== 'USD'}
          />
        </div>
        
        <div className="flex justify-between font-bold pt-2 border-t">
          <span>Gain/Loss:</span>
          <span className={gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
            {formatMain(gainLoss)} ({gainLossPercent.toFixed(2)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

// EXAMPLE 7: Listen for currency changes
// =======================================

function MyFinancialCard() {
  const [refreshKey, setRefreshKey] = React.useState(0);
  
  React.useEffect(() => {
    const handleCurrencyChange = () => {
      // Currency changed - refresh your data display
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('currencyChanged', handleCurrencyChange);
    
    return () => {
      window.removeEventListener('currencyChanged', handleCurrencyChange);
    };
  }, []);
  
  return (
    <div key={refreshKey}>
      {/* Your card content - will re-render when currency changes */}
    </div>
  );
}

// DATABASE MIGRATION EXAMPLE
// ==========================

/**
 * SQL to add currency support to existing tables:
 * 
 * ALTER TABLE cash_accounts ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
 * ALTER TABLE savings_accounts ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
 * ALTER TABLE trading_accounts ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
 * ALTER TABLE real_estate ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
 * ALTER TABLE valuable_items ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
 * 
 * -- For new records, use the user's main currency as default
 * -- Add check constraint
 * ALTER TABLE cash_accounts ADD CONSTRAINT valid_currency 
 *   CHECK (currency ~ '^[A-Z]{3}$');
 */

// TYPESCRIPT INTERFACE UPDATE EXAMPLE
// ===================================

// Before:
interface OldCashAccount {
  id: string;
  name: string;
  balance: number;
}

// After:
interface NewCashAccount {
  id: string;
  name: string;
  balance: number;
  currency: string; // NEW: Three-letter currency code (ISO 4217)
}

export {
  BankAccountDisplay,
  TotalBalance,
  AddAccountForm,
  CryptoPortfolio,
  TradeHistory,
  PropertyCard,
  MyFinancialCard,
};

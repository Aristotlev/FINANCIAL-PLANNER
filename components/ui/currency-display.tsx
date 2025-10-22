"use client";

import React from 'react';
import { useCurrencyConversion } from '../../hooks/use-currency-conversion';
import { Info } from 'lucide-react';

interface CurrencyAmountProps {
  amount: number;
  sourceCurrency?: string; // If not provided, assumes it's already in main currency
  showOriginal?: boolean; // Show original amount alongside converted amount
  className?: string;
}

/**
 * Component that displays an amount in the user's main currency
 * Automatically converts if the amount is in a different currency
 */
export function CurrencyAmount({ 
  amount, 
  sourceCurrency, 
  showOriginal = false,
  className = ''
}: CurrencyAmountProps) {
  const { formatMain, convertAndFormat, mainCurrency, getExchangeRate } = useCurrencyConversion();

  // If no source currency provided, assume it's already in main currency
  if (!sourceCurrency || sourceCurrency === mainCurrency.code) {
    return <span className={className}>{formatMain(amount)}</span>;
  }

  const convertedAmount = convertAndFormat(amount, sourceCurrency);
  const rate = getExchangeRate(sourceCurrency, mainCurrency.code);

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span>{convertedAmount}</span>
      {showOriginal && rate && (
        <span 
          className="text-xs text-gray-500 dark:text-gray-400 group relative cursor-help"
          title={`Original: ${amount.toLocaleString()} ${sourceCurrency}\nRate: 1 ${sourceCurrency} = ${rate.toFixed(4)} ${mainCurrency.code}`}
        >
          ({amount.toLocaleString()} {sourceCurrency})
        </span>
      )}
    </span>
  );
}

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  currency?: string; // Currency of the input value
  allowCurrencySelection?: boolean; // Allow user to select different currency
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Input component for entering currency amounts
 * Can display and work with different currencies, with conversion indicator
 */
export function CurrencyInput({
  value,
  onChange,
  currency,
  allowCurrencySelection = false,
  className = '',
  placeholder = '0.00',
  disabled = false,
}: CurrencyInputProps) {
  const { mainCurrency, formatMain, convertToMain } = useCurrencyConversion();
  const activeCurrency = currency || mainCurrency.code;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || 0;
    onChange(newValue);
  };

  const isConverted = activeCurrency !== mainCurrency.code;
  const convertedValue = isConverted ? convertToMain(value, activeCurrency) : value;

  return (
    <div className="relative">
      <input
        type="number"
        value={value || ''}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full ${className}`}
        step="0.01"
      />
      {isConverted && value > 0 && (
        <div className="absolute right-2 top-full mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Info className="w-3 h-3" />
          ≈ {formatMain(convertedValue)} ({mainCurrency.code})
        </div>
      )}
    </div>
  );
}

"use client";

import React from 'react';
import { useCurrency } from '../../contexts/currency-context';
import { cn } from '../../lib/utils';

interface DualCurrencyDisplayProps {
  amount: number;
  originalCurrency: string;
  className?: string;
  originalClassName?: string;
  convertedClassName?: string;
  layout?: 'stacked' | 'inline' | 'inline-reversed'; // stacked: original on top, converted below; inline: original (converted); inline-reversed: converted (original)
  showConversionAlways?: boolean; // Force show conversion even if same currency
  compactConversion?: boolean; // Use K/M/B format for converted amount
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * DualCurrencyDisplay Component
 * Displays an amount in its original currency with optional conversion to the main currency
 * Perfect for crypto, stocks, trading accounts, and multi-currency bank accounts
 * 
 * Examples:
 * - Crypto: $45,234 (€41.2K) - USD to EUR
 * - Bank Account: £12,500 ($15.8K) - GBP to USD
 * - Stock: $1,234.56 (¥185K) - USD to JPY
 */
export function DualCurrencyDisplay({
  amount,
  originalCurrency,
  className,
  originalClassName,
  convertedClassName,
  layout = 'stacked',
  showConversionAlways = false,
  compactConversion = true,
  size = 'md',
}: DualCurrencyDisplayProps) {
  const { formatCurrencyWithConversion } = useCurrency();

  const result = formatCurrencyWithConversion(amount, originalCurrency, {
    showConversion: showConversionAlways,
    compactConversion,
  });

  // Size classes
  const sizeClasses = {
    sm: {
      original: 'text-sm',
      converted: 'text-xs',
    },
    md: {
      original: 'text-base',
      converted: 'text-sm',
    },
    lg: {
      original: 'text-lg',
      converted: 'text-sm',
    },
    xl: {
      original: 'text-2xl font-bold',
      converted: 'text-base',
    },
  };

  const currentSize = sizeClasses[size];

  // If no conversion needed, just show original
  if (!result.shouldShowConversion || !result.converted) {
    return (
      <span className={cn('font-medium text-gray-900 dark:text-white', currentSize.original, originalClassName, className)}>
        {result.original}
      </span>
    );
  }

  // Stacked layout: original on top, converted below
  if (layout === 'stacked') {
    return (
      <div className={cn('flex flex-col', className)}>
        <span className={cn('font-semibold text-gray-900 dark:text-white', currentSize.original, originalClassName)}>
          {result.original}
        </span>
        <span className={cn(
          'text-gray-500 dark:text-gray-400 font-medium',
          currentSize.converted,
          convertedClassName
        )}>
          ≈ {result.converted}
        </span>
      </div>
    );
  }

  // Inline layout: original (converted)
  if (layout === 'inline') {
    return (
      <span className={cn('inline-flex items-baseline gap-1.5', className)}>
        <span className={cn('font-semibold text-gray-900 dark:text-white', currentSize.original, originalClassName)}>
          {result.original}
        </span>
        <span className={cn(
          'text-gray-500 dark:text-gray-400 font-medium',
          currentSize.converted,
          convertedClassName
        )}>
          (≈{result.converted})
        </span>
      </span>
    );
  }

  // Inline-reversed layout: converted (original)
  if (layout === 'inline-reversed') {
    return (
      <span className={cn('inline-flex items-baseline gap-1.5', className)}>
        <span className={cn('font-semibold text-gray-900 dark:text-white', currentSize.original, originalClassName)}>
          {result.converted}
        </span>
        <span className={cn(
          'text-gray-500 dark:text-gray-400 font-medium',
          currentSize.converted,
          convertedClassName
        )}>
          ({result.original})
        </span>
      </span>
    );
  }

  return null;
}

/**
 * Compact version for use in lists and tables
 */
export function CompactDualCurrency({
  amount,
  originalCurrency,
  className,
}: {
  amount: number;
  originalCurrency: string;
  className?: string;
}) {
  return (
    <DualCurrencyDisplay
      amount={amount}
      originalCurrency={originalCurrency}
      layout="inline"
      size="sm"
      compactConversion={true}
      className={className}
    />
  );
}

/**
 * Large display for card headers and totals
 */
export function LargeDualCurrency({
  amount,
  originalCurrency,
  className,
}: {
  amount: number;
  originalCurrency: string;
  className?: string;
}) {
  return (
    <DualCurrencyDisplay
      amount={amount}
      originalCurrency={originalCurrency}
      layout="stacked"
      size="xl"
      compactConversion={true}
      className={className}
    />
  );
}

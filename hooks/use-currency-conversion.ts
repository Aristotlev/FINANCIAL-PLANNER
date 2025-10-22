import { useCurrency } from '../contexts/currency-context';

/**
 * Hook for currency conversion and formatting in components
 * Provides utilities for converting amounts and displaying them in the user's main currency
 */
export function useCurrencyConversion() {
  const { convert, formatCurrency, mainCurrency, exchangeRates } = useCurrency();

  /**
   * Convert an amount from one currency to the main currency
   * @param amount - The amount to convert
   * @param fromCurrency - The source currency code (e.g., 'USD', 'EUR')
   * @returns The converted amount in the main currency
   */
  const convertToMain = (amount: number, fromCurrency: string): number => {
    return convert(amount, fromCurrency, mainCurrency.code);
  };

  /**
   * Convert an amount from the main currency to another currency
   * @param amount - The amount to convert
   * @param toCurrency - The target currency code
   * @returns The converted amount in the target currency
   */
  const convertFromMain = (amount: number, toCurrency: string): number => {
    return convert(amount, mainCurrency.code, toCurrency);
  };

  /**
   * Format an amount in the main currency
   * @param amount - The amount to format
   * @returns Formatted string with currency symbol
   */
  const formatMain = (amount: number): string => {
    return formatCurrency(amount, mainCurrency.code);
  };

  /**
   * Convert and format an amount from any currency to the main currency
   * @param amount - The amount to convert
   * @param fromCurrency - The source currency code
   * @returns Formatted string in the main currency
   */
  const convertAndFormat = (amount: number, fromCurrency: string): string => {
    const converted = convertToMain(amount, fromCurrency);
    return formatMain(converted);
  };

  /**
   * Get exchange rate from one currency to another
   * @param fromCurrency - Source currency code
   * @param toCurrency - Target currency code (defaults to main currency)
   * @returns Exchange rate, or null if not available
   */
  const getExchangeRate = (fromCurrency: string, toCurrency?: string): number | null => {
    const target = toCurrency || mainCurrency.code;
    
    if (fromCurrency === target) {
      return 1;
    }

    if (!exchangeRates[fromCurrency] || !exchangeRates[target]) {
      return null;
    }

    // Calculate rate: how many units of target currency equals 1 unit of source currency
    const rate = exchangeRates[target] / exchangeRates[fromCurrency];
    return rate;
  };

  /**
   * Check if a currency is supported
   * @param currencyCode - Currency code to check
   * @returns True if the currency is supported
   */
  const isCurrencySupported = (currencyCode: string): boolean => {
    return currencyCode in exchangeRates;
  };

  return {
    convertToMain,
    convertFromMain,
    formatMain,
    convertAndFormat,
    getExchangeRate,
    isCurrencySupported,
    mainCurrency,
  };
}

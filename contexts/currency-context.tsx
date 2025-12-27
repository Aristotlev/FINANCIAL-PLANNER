"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Popular currencies with their symbols and names
export interface Currency {
  code: string;
  symbol: string;
  name: string;
  flag: string; // Emoji flag
  countryCode: string; // ISO 3166-1 alpha-2 code for flag image
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', countryCode: 'us' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', countryCode: 'eu' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', countryCode: 'gb' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵', countryCode: 'jp' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', flag: '🇨🇭', countryCode: 'ch' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦', countryCode: 'ca' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺', countryCode: 'au' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', flag: '🇨🇳', countryCode: 'cn' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', countryCode: 'in' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷', countryCode: 'br' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', flag: '🇲🇽', countryCode: 'mx' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', flag: '🇿🇦', countryCode: 'za' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬', countryCode: 'sg' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', flag: '🇭🇰', countryCode: 'hk' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', flag: '🇸🇪', countryCode: 'se' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', flag: '🇳🇴', countryCode: 'no' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', flag: '🇩🇰', countryCode: 'dk' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', flag: '🇳🇿', countryCode: 'nz' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', flag: '🇰🇷', countryCode: 'kr' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', flag: '🇹🇷', countryCode: 'tr' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', flag: '🇷🇺', countryCode: 'ru' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', flag: '🇵🇱', countryCode: 'pl' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', flag: '🇹🇭', countryCode: 'th' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', flag: '🇮🇩', countryCode: 'id' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', flag: '🇲🇾', countryCode: 'my' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', flag: '🇵🇭', countryCode: 'ph' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', flag: '🇨🇿', countryCode: 'cz' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', flag: '🇮🇱', countryCode: 'il' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', flag: '🇦🇪', countryCode: 'ae' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', flag: '🇸🇦', countryCode: 'sa' },
];

interface ExchangeRates {
  [key: string]: number;
}

interface CurrencyContextType {
  mainCurrency: Currency;
  exchangeRates: ExchangeRates;
  setMainCurrency: (currency: Currency) => void;
  convert: (amount: number, fromCurrency: string, toCurrency?: string) => number;
  formatCurrency: (amount: number, currencyCode?: string) => string;
  formatCurrencyWithConversion: (
    amount: number,
    originalCurrency: string,
    options?: {
      showConversion?: boolean;
      inline?: boolean;
      compactConversion?: boolean;
    }
  ) => {
    original: string;
    converted: string | null;
    shouldShowConversion: boolean;
    originalCurrencyCode: string;
    mainCurrencyCode: string;
  };
  refreshRates: () => Promise<void>;
  lastUpdated: Date | null;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const STORAGE_KEY = 'moneyHub_mainCurrency';
const RATES_STORAGE_KEY = 'moneyHub_exchangeRates';
const RATES_TIMESTAMP_KEY = 'moneyHub_ratesTimestamp';

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [mainCurrency, setMainCurrencyState] = useState<Currency>(SUPPORTED_CURRENCIES[0]); // Default to USD
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved currency preference and rates
  useEffect(() => {
    const savedCurrencyCode = localStorage.getItem(STORAGE_KEY);
    if (savedCurrencyCode) {
      const currency = SUPPORTED_CURRENCIES.find(c => c.code === savedCurrencyCode);
      if (currency) {
        setMainCurrencyState(currency);
      }
    }

    const savedRates = localStorage.getItem(RATES_STORAGE_KEY);
    const savedTimestamp = localStorage.getItem(RATES_TIMESTAMP_KEY);
    
    if (savedRates && savedTimestamp) {
      const timestamp = new Date(savedTimestamp);
      const hoursSinceUpdate = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60);
      
      // Use cached rates if less than 1 hour old
      if (hoursSinceUpdate < 1) {
        setExchangeRates(JSON.parse(savedRates));
        setLastUpdated(timestamp);
      } else {
        // Rates are stale, fetch new ones
        fetchExchangeRates();
      }
    } else {
      // No cached rates, fetch them
      fetchExchangeRates();
    }
  }, []);

  const fetchExchangeRates = async () => {
    setIsLoading(true);
    try {
      // Using exchangerate-api.com free tier (1500 requests/month)
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates');
      }

      const data = await response.json();
      const rates = data.rates as ExchangeRates;
      
      setExchangeRates(rates);
      const now = new Date();
      setLastUpdated(now);
      
      // Cache the rates
      localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(rates));
      localStorage.setItem(RATES_TIMESTAMP_KEY, now.toISOString());
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      // Fallback to approximate rates if API fails
      const fallbackRates: ExchangeRates = {
        USD: 1,
        EUR: 0.92,
        GBP: 0.79,
        JPY: 149.50,
        CHF: 0.88,
        CAD: 1.36,
        AUD: 1.53,
        CNY: 7.24,
        INR: 83.12,
        BRL: 4.97,
        MXN: 17.12,
        ZAR: 18.75,
        SGD: 1.34,
        HKD: 7.83,
        SEK: 10.87,
        NOK: 10.68,
        DKK: 6.88,
        NZD: 1.65,
        KRW: 1320.45,
        TRY: 28.67,
        RUB: 92.50,
        PLN: 4.02,
        THB: 35.43,
        IDR: 15678.90,
        MYR: 4.67,
        PHP: 56.12,
        CZK: 22.89,
        ILS: 3.65,
        AED: 3.67,
        SAR: 3.75,
      };
      setExchangeRates(fallbackRates);
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  };

  const setMainCurrency = (currency: Currency) => {
    setMainCurrencyState(currency);
    localStorage.setItem(STORAGE_KEY, currency.code);
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('currencyChanged', { detail: currency }));
  };

  const convert = (amount: number, fromCurrency: string, toCurrency?: string): number => {
    const target = toCurrency || mainCurrency.code;
    
    if (fromCurrency === target) {
      return amount;
    }

    if (!exchangeRates[fromCurrency] || !exchangeRates[target]) {
      console.warn(`Exchange rate not available for ${fromCurrency} or ${target}`);
      return amount; // Return original amount if rates not available
    }

    // Convert from source currency to USD, then to target currency
    const amountInUSD = amount / exchangeRates[fromCurrency];
    const amountInTarget = amountInUSD * exchangeRates[target];
    
    return amountInTarget;
  };

  const formatCurrency = (amount: number, currencyCode?: string): string => {
    const currency = currencyCode 
      ? SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || mainCurrency
      : mainCurrency;

    // Handle invalid inputs
    if (amount === undefined || amount === null || isNaN(amount)) {
      return `${currency.symbol}0.00`;
    }

    // Format with appropriate decimal places
    const decimals = ['JPY', 'KRW', 'IDR'].includes(currency.code) ? 0 : 2;
    
    const formatted = amount.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    return `${currency.symbol}${formatted}`;
  };

  /**
   * Format currency with conversion display for multi-currency assets
   * Used for assets that keep their original currency (crypto, stocks, trading accounts, bank accounts)
   * @param amount - The amount in the original currency
   * @param originalCurrency - The asset's native currency (e.g., 'USD' for crypto)
   * @param options - Display options
   * @returns Object with formatted original and converted display strings
   */
  const formatCurrencyWithConversion = (
    amount: number,
    originalCurrency: string,
    options?: {
      showConversion?: boolean; // Default true if currencies differ
      inline?: boolean; // Display inline vs stacked (default false)
      compactConversion?: boolean; // Use compact format for conversion (default true)
    }
  ): {
    original: string;
    converted: string | null;
    shouldShowConversion: boolean;
    originalCurrencyCode: string;
    mainCurrencyCode: string;
  } => {
    const originalCurrencyObj = SUPPORTED_CURRENCIES.find(c => c.code === originalCurrency);
    const shouldShowConversion = options?.showConversion ?? (originalCurrency !== mainCurrency.code);
    
    // Ensure amount is a valid number
    const numericAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    
    // Format original amount
    const originalDecimals = ['JPY', 'KRW', 'IDR'].includes(originalCurrency) ? 0 : 2;
    const originalFormatted = numericAmount.toLocaleString(undefined, {
      minimumFractionDigits: originalDecimals,
      maximumFractionDigits: originalDecimals,
    });
    const originalSymbol = originalCurrencyObj?.symbol || originalCurrency;
    const original = `${originalSymbol}${originalFormatted}`;

    // Convert and format if needed
    let converted: string | null = null;
    if (shouldShowConversion && originalCurrency !== mainCurrency.code) {
      const convertedAmount = convert(numericAmount, originalCurrency, mainCurrency.code);
      const mainDecimals = ['JPY', 'KRW', 'IDR'].includes(mainCurrency.code) ? 0 : 2;
      
      // Use compact format for conversion display
      const useCompact = options?.compactConversion ?? true;
      let convertedFormatted: string;
      
      if (useCompact && convertedAmount >= 1000) {
        // Compact format: 1.2K, 1.5M, etc.
        if (convertedAmount >= 1_000_000_000) {
          convertedFormatted = `${(convertedAmount / 1_000_000_000).toFixed(1)}B`;
        } else if (convertedAmount >= 1_000_000) {
          convertedFormatted = `${(convertedAmount / 1_000_000).toFixed(1)}M`;
        } else {
          convertedFormatted = `${(convertedAmount / 1_000).toFixed(1)}K`;
        }
      } else {
        convertedFormatted = convertedAmount.toLocaleString(undefined, {
          minimumFractionDigits: mainDecimals,
          maximumFractionDigits: mainDecimals,
        });
      }
      
      converted = `${mainCurrency.symbol}${convertedFormatted}`;
    }

    return {
      original,
      converted,
      shouldShowConversion,
      originalCurrencyCode: originalCurrency,
      mainCurrencyCode: mainCurrency.code,
    };
  };

  const refreshRates = async () => {
    await fetchExchangeRates();
  };

  return (
    <CurrencyContext.Provider
      value={{
        mainCurrency,
        exchangeRates,
        setMainCurrency,
        convert,
        formatCurrency,
        formatCurrencyWithConversion,
        refreshRates,
        lastUpdated,
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

/**
 * Smart Amount Parser
 * Parses various amount formats including shorthand notation (1m, 1kk, 1k, etc.)
 * Handles both cryptocurrency amounts and fiat currency amounts
 */

export interface ParsedAmount {
  value: number;
  originalText: string;
  format: 'standard' | 'k' | 'm' | 'kk' | 'b';
  isValid: boolean;
}

/**
 * Parse amount with support for:
 * - Standard numbers: 1000, 1000.50
 * - K notation: 1k = 1,000; 10k = 10,000; 500k = 500,000
 * - M notation: 1m = 1,000,000; 2.5m = 2,500,000
 * - KK notation (European): 1kk = 1,000,000
 * - B notation: 1b = 1,000,000,000
 * - Comma-separated: 1,000,000
 * - Decimal notation: 0.5, 1.25, etc.
 */
export function parseAmount(input: string | number): ParsedAmount {
  // If already a number, return it
  if (typeof input === 'number') {
    return {
      value: input,
      originalText: input.toString(),
      format: 'standard',
      isValid: !isNaN(input) && isFinite(input) && input >= 0,
    };
  }

  const originalText = input;
  
  // Clean the input: remove spaces, currency symbols, and convert to lowercase
  let cleaned = input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[$€£¥₹,\s]/g, ''); // Remove currency symbols, commas, spaces

  // Handle empty or invalid input
  if (!cleaned || cleaned === '') {
    return {
      value: 0,
      originalText,
      format: 'standard',
      isValid: false,
    };
  }

  let value: number;
  let format: 'standard' | 'k' | 'm' | 'kk' | 'b' = 'standard';

  // Check for B (billion) notation: 1b, 2.5b
  if (cleaned.endsWith('b')) {
    const numPart = cleaned.slice(0, -1);
    const parsed = parseFloat(numPart);
    if (!isNaN(parsed)) {
      value = parsed * 1_000_000_000;
      format = 'b';
    } else {
      return { value: 0, originalText, format: 'standard', isValid: false };
    }
  }
  // Check for KK (European million) notation: 1kk, 2.5kk
  else if (cleaned.endsWith('kk')) {
    const numPart = cleaned.slice(0, -2);
    const parsed = parseFloat(numPart);
    if (!isNaN(parsed)) {
      value = parsed * 1_000_000;
      format = 'kk';
    } else {
      return { value: 0, originalText, format: 'standard', isValid: false };
    }
  }
  // Check for M (million) notation: 1m, 2.5m
  else if (cleaned.endsWith('m')) {
    const numPart = cleaned.slice(0, -1);
    const parsed = parseFloat(numPart);
    if (!isNaN(parsed)) {
      value = parsed * 1_000_000;
      format = 'm';
    } else {
      return { value: 0, originalText, format: 'standard', isValid: false };
    }
  }
  // Check for K (thousand) notation: 1k, 10k, 500k
  else if (cleaned.endsWith('k')) {
    const numPart = cleaned.slice(0, -1);
    const parsed = parseFloat(numPart);
    if (!isNaN(parsed)) {
      value = parsed * 1_000;
      format = 'k';
    } else {
      return { value: 0, originalText, format: 'standard', isValid: false };
    }
  }
  // Standard number (with possible decimals)
  else {
    value = parseFloat(cleaned);
    format = 'standard';
  }

  // Validate the final value
  const isValid = !isNaN(value) && isFinite(value) && value >= 0;

  return {
    value,
    originalText,
    format,
    isValid,
  };
}

/**
 * Format amount back to human-readable string
 */
export function formatAmount(value: number, decimals: number = 2): string {
  if (!isFinite(value) || isNaN(value)) {
    return '0';
  }

  const abs = Math.abs(value);

  // Billions
  if (abs >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(decimals)}B`;
  }
  // Millions
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(decimals)}M`;
  }
  // Thousands
  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(decimals)}K`;
  }
  // Standard
  return value.toFixed(decimals);
}

/**
 * Parse amount from natural language text
 * Examples:
 * - "add 1m usdt" → 1,000,000
 * - "buy 500k btc" → 500,000
 * - "invest 2.5 million" → 2,500,000
 * - "add 1kk to savings" → 1,000,000
 */
export function parseAmountFromText(text: string): ParsedAmount | null {
  // Patterns to match amounts in text
  const patterns = [
    // 1m, 2.5m, 500k, 1kk, etc.
    /(\d+\.?\d*)\s*(m|k|kk|b)\b/i,
    // "1 million", "2.5 million"
    /(\d+\.?\d*)\s*million/i,
    // "500 thousand", "1.5 thousand"
    /(\d+\.?\d*)\s*thousand/i,
    // "1 billion"
    /(\d+\.?\d*)\s*billion/i,
    // Just numbers: "1000", "1,000", "1000.50"
    /\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let amountStr = match[0];
      
      // Handle "million", "thousand", "billion" text
      if (/million/i.test(amountStr)) {
        amountStr = amountStr.replace(/million/i, 'm');
      } else if (/thousand/i.test(amountStr)) {
        amountStr = amountStr.replace(/thousand/i, 'k');
      } else if (/billion/i.test(amountStr)) {
        amountStr = amountStr.replace(/billion/i, 'b');
      }
      
      const parsed = parseAmount(amountStr);
      if (parsed.isValid) {
        return parsed;
      }
    }
  }

  return null;
}

/**
 * Test if an amount is a stablecoin amount (typically larger numbers for value storage)
 */
export function isStablecoinContext(symbol: string, amount: number): boolean {
  const stablecoins = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'FRAX', 'GUSD'];
  return stablecoins.includes(symbol.toUpperCase());
}

/**
 * Validate amount makes sense for the asset type
 */
export function validateAmount(amount: number, assetType: 'crypto' | 'stock' | 'cash', symbol?: string): {
  isValid: boolean;
  warning?: string;
  suggestion?: number;
} {
  // Crypto validation
  if (assetType === 'crypto' && symbol) {
    const isStablecoin = isStablecoinContext(symbol, amount);
    
    // Stablecoins: typically $1 each, so amounts like 1,000,000 USDT make sense
    if (isStablecoin) {
      if (amount < 1) {
        return {
          isValid: false,
          warning: `${amount} ${symbol} seems too small for a stablecoin. Did you mean ${amount * 1000}?`,
          suggestion: amount * 1000,
        };
      }
      // No upper limit warning for stablecoins
      return { isValid: true };
    }
    
    // Non-stablecoins (BTC, ETH, etc.): amounts are usually smaller
    // BTC: 0.001 - 100 typical
    // ETH: 0.1 - 1000 typical
    // Other altcoins: 1 - 1,000,000 typical
    
    if (amount > 1_000_000 && !['SHIB', 'DOGE', 'PEPE'].includes(symbol.toUpperCase())) {
      return {
        isValid: false,
        warning: `${amount} ${symbol} seems unusually high. Did you mean ${amount / 1_000_000}M or ${amount / 1000}K?`,
        suggestion: amount / 1000,
      };
    }
  }
  
  // Stock validation
  if (assetType === 'stock') {
    // Most retail investors buy 1-1000 shares
    if (amount > 100_000) {
      return {
        isValid: false,
        warning: `${amount} shares seems unusually high. Did you mean ${amount / 1000} shares?`,
        suggestion: amount / 1000,
      };
    }
  }
  
  // Cash validation
  if (assetType === 'cash') {
    // Cash amounts are typically in thousands to millions
    // No specific validation needed
  }
  
  return { isValid: true };
}

// Export shorthand functions for common use cases
export const parseK = (input: string | number) => parseAmount(input);
export const parseM = (input: string | number) => parseAmount(input);
export const parseKK = (input: string | number) => parseAmount(input);
export const parseB = (input: string | number) => parseAmount(input);

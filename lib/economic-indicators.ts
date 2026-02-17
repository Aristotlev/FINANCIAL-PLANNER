/**
 * OmniFolio Economic Indicators Library
 * 
 * Proprietary database of global economic indicators with metadata.
 * All descriptions, categorization, and impact ratings are original content.
 * 
 * Copyright OmniFolio. All rights reserved.
 */

// ─── Types ────────────────────────────────────────────────────────────

export type ImpactLevel = 'high' | 'medium' | 'low';
export type IndicatorCategory = 
  | 'interest-rates'
  | 'employment'
  | 'inflation'
  | 'gdp-growth'
  | 'trade'
  | 'consumer'
  | 'manufacturing'
  | 'housing'
  | 'government'
  | 'central-bank'
  | 'business'
  | 'monetary';

export interface IndicatorMeta {
  /** Short readable name */
  name: string;
  /** Original description of what this indicator measures */
  description: string;
  /** Category grouping */
  category: IndicatorCategory;
  /** Which currency/country this primarily affects */
  primaryCurrency: string;
  /** Default impact if not provided by data source */
  defaultImpact: ImpactLevel;
  /** Unit of measurement */
  unit: string;
  /** Whether higher values are generally positive for the economy */
  higherIsBetter: boolean;
  /** Typical release frequency */
  frequency: 'monthly' | 'quarterly' | 'weekly' | 'daily' | 'irregular';
}

// ─── Country Metadata ─────────────────────────────────────────────────

export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
  currency: string;
  region: 'americas' | 'europe' | 'asia-pacific' | 'middle-east-africa';
}

export const COUNTRIES: Record<string, CountryInfo> = {
  US: { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', region: 'americas' },
  GB: { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', region: 'europe' },
  EU: { code: 'EU', name: 'European Union', flag: '🇪🇺', currency: 'EUR', region: 'europe' },
  DE: { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR', region: 'europe' },
  FR: { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR', region: 'europe' },
  IT: { code: 'IT', name: 'Italy', flag: '🇮🇹', currency: 'EUR', region: 'europe' },
  ES: { code: 'ES', name: 'Spain', flag: '🇪🇸', currency: 'EUR', region: 'europe' },
  JP: { code: 'JP', name: 'Japan', flag: '🇯🇵', currency: 'JPY', region: 'asia-pacific' },
  CN: { code: 'CN', name: 'China', flag: '🇨🇳', currency: 'CNY', region: 'asia-pacific' },
  CA: { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD', region: 'americas' },
  AU: { code: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'AUD', region: 'asia-pacific' },
  NZ: { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', currency: 'NZD', region: 'asia-pacific' },
  CH: { code: 'CH', name: 'Switzerland', flag: '🇨🇭', currency: 'CHF', region: 'europe' },
  IN: { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', region: 'asia-pacific' },
  KR: { code: 'KR', name: 'South Korea', flag: '🇰🇷', currency: 'KRW', region: 'asia-pacific' },
  BR: { code: 'BR', name: 'Brazil', flag: '🇧🇷', currency: 'BRL', region: 'americas' },
  MX: { code: 'MX', name: 'Mexico', flag: '🇲🇽', currency: 'MXN', region: 'americas' },
  ZA: { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currency: 'ZAR', region: 'middle-east-africa' },
  RU: { code: 'RU', name: 'Russia', flag: '🇷🇺', currency: 'RUB', region: 'europe' },
  SE: { code: 'SE', name: 'Sweden', flag: '🇸🇪', currency: 'SEK', region: 'europe' },
  NO: { code: 'NO', name: 'Norway', flag: '🇳🇴', currency: 'NOK', region: 'europe' },
  SG: { code: 'SG', name: 'Singapore', flag: '🇸🇬', currency: 'SGD', region: 'asia-pacific' },
  HK: { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', currency: 'HKD', region: 'asia-pacific' },
  TR: { code: 'TR', name: 'Turkey', flag: '🇹🇷', currency: 'TRY', region: 'europe' },
  PL: { code: 'PL', name: 'Poland', flag: '🇵🇱', currency: 'PLN', region: 'europe' },
  IL: { code: 'IL', name: 'Israel', flag: '🇮🇱', currency: 'ILS', region: 'middle-east-africa' },
  SA: { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR', region: 'middle-east-africa' },
  AE: { code: 'AE', name: 'UAE', flag: '🇦🇪', currency: 'AED', region: 'middle-east-africa' },
  TW: { code: 'TW', name: 'Taiwan', flag: '🇹🇼', currency: 'TWD', region: 'asia-pacific' },
  TH: { code: 'TH', name: 'Thailand', flag: '🇹🇭', currency: 'THB', region: 'asia-pacific' },
  ID: { code: 'ID', name: 'Indonesia', flag: '🇮🇩', currency: 'IDR', region: 'asia-pacific' },
  PH: { code: 'PH', name: 'Philippines', flag: '🇵🇭', currency: 'PHP', region: 'asia-pacific' },
  CL: { code: 'CL', name: 'Chile', flag: '🇨🇱', currency: 'CLP', region: 'americas' },
  CO: { code: 'CO', name: 'Colombia', flag: '🇨🇴', currency: 'COP', region: 'americas' },
  AR: { code: 'AR', name: 'Argentina', flag: '🇦🇷', currency: 'ARS', region: 'americas' },
  PT: { code: 'PT', name: 'Portugal', flag: '🇵🇹', currency: 'EUR', region: 'europe' },
  IE: { code: 'IE', name: 'Ireland', flag: '🇮🇪', currency: 'EUR', region: 'europe' },
  NL: { code: 'NL', name: 'Netherlands', flag: '🇳🇱', currency: 'EUR', region: 'europe' },
  BE: { code: 'BE', name: 'Belgium', flag: '🇧🇪', currency: 'EUR', region: 'europe' },
  AT: { code: 'AT', name: 'Austria', flag: '🇦🇹', currency: 'EUR', region: 'europe' },
  FI: { code: 'FI', name: 'Finland', flag: '🇫🇮', currency: 'EUR', region: 'europe' },
  GR: { code: 'GR', name: 'Greece', flag: '🇬🇷', currency: 'EUR', region: 'europe' },
  DK: { code: 'DK', name: 'Denmark', flag: '🇩🇰', currency: 'DKK', region: 'europe' },
  CZ: { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', currency: 'CZK', region: 'europe' },
  HU: { code: 'HU', name: 'Hungary', flag: '🇭🇺', currency: 'HUF', region: 'europe' },
  RO: { code: 'RO', name: 'Romania', flag: '🇷🇴', currency: 'RON', region: 'europe' },
  MY: { code: 'MY', name: 'Malaysia', flag: '🇲🇾', currency: 'MYR', region: 'asia-pacific' },
  VN: { code: 'VN', name: 'Vietnam', flag: '🇻🇳', currency: 'VND', region: 'asia-pacific' },
  NG: { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN', region: 'middle-east-africa' },
  EG: { code: 'EG', name: 'Egypt', flag: '🇪🇬', currency: 'EGP', region: 'middle-east-africa' },
  KE: { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES', region: 'middle-east-africa' },
  PK: { code: 'PK', name: 'Pakistan', flag: '🇵🇰', currency: 'PKR', region: 'asia-pacific' },
  PE: { code: 'PE', name: 'Peru', flag: '🇵🇪', currency: 'PEN', region: 'americas' },
  UA: { code: 'UA', name: 'Ukraine', flag: '🇺🇦', currency: 'UAH', region: 'europe' },
  BD: { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', currency: 'BDT', region: 'asia-pacific' },
  BO: { code: 'BO', name: 'Bolivia', flag: '🇧🇴', currency: 'BOB', region: 'americas' },
  LK: { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', currency: 'LKR', region: 'asia-pacific' },
  IS: { code: 'IS', name: 'Iceland', flag: '🇮🇸', currency: 'ISK', region: 'europe' },
  QA: { code: 'QA', name: 'Qatar', flag: '🇶🇦', currency: 'QAR', region: 'middle-east-africa' },
  JM: { code: 'JM', name: 'Jamaica', flag: '🇯🇲', currency: 'JMD', region: 'americas' },
  HR: { code: 'HR', name: 'Croatia', flag: '🇭🇷', currency: 'EUR', region: 'europe' },
  RS: { code: 'RS', name: 'Serbia', flag: '🇷🇸', currency: 'RSD', region: 'europe' },
  BG: { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', currency: 'BGN', region: 'europe' },
  SK: { code: 'SK', name: 'Slovakia', flag: '🇸🇰', currency: 'EUR', region: 'europe' },
  SI: { code: 'SI', name: 'Slovenia', flag: '🇸🇮', currency: 'EUR', region: 'europe' },
  LT: { code: 'LT', name: 'Lithuania', flag: '🇱🇹', currency: 'EUR', region: 'europe' },
  LV: { code: 'LV', name: 'Latvia', flag: '🇱🇻', currency: 'EUR', region: 'europe' },
  EE: { code: 'EE', name: 'Estonia', flag: '🇪🇪', currency: 'EUR', region: 'europe' },
};

/**
 * Get country info by code, with fallback
 */
export function getCountryInfo(code: string): CountryInfo {
  const upper = code?.toUpperCase() || '';
  return COUNTRIES[upper] || {
    code: upper,
    name: upper,
    flag: '🏳️',
    currency: upper,
    region: 'europe' as const,
  };
}

// ─── Impact Classification ───────────────────────────────────────────

/**
 * Classify the impact of an economic event based on its name.
 * This is our proprietary classification logic — original work.
 */
export function classifyImpact(eventName: string, providedImpact?: string): ImpactLevel {
  // If a valid impact is provided, use it
  if (providedImpact) {
    const normalized = providedImpact.toLowerCase().trim();
    if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
      return normalized;
    }
  }

  const name = eventName.toLowerCase();

  // ── High Impact ─────────────────────────────────────
  const highImpactPatterns = [
    'interest rate', 'rate decision', 'fed fund',
    'non-farm', 'nonfarm', 'payroll',
    'gdp', 'gross domestic',
    'cpi', 'consumer price index', 'inflation rate',
    'unemployment rate',
    'fomc', 'monetary policy', 'ecb press', 'boe rate', 'boj rate',
    'central bank rate',
    'retail sales',
    'trade balance',
    'pce price', 'core pce',
    'ism manufacturing', 'ism services',
    'employment change',
  ];

  for (const pattern of highImpactPatterns) {
    if (name.includes(pattern)) return 'high';
  }

  // ── Medium Impact ───────────────────────────────────
  const mediumImpactPatterns = [
    'pmi', 'purchasing manager',
    'housing start', 'building permit', 'existing home', 'new home',
    'industrial production', 'factory order',
    'producer price', 'ppi',
    'consumer confidence', 'consumer sentiment',
    'durable goods', 'core durable',
    'jobless claims', 'initial claims', 'continuing claims',
    'current account',
    'import price', 'export price',
    'business confidence', 'business inventory',
    'leading indicator', 'leading index',
    'crude oil', 'natural gas', 'gasoline',
    'wage growth', 'average earnings', 'average hourly',
    'personal income', 'personal spending',
    'government budget',
    'bond auction', 'treasury auction',
  ];

  for (const pattern of mediumImpactPatterns) {
    if (name.includes(pattern)) return 'medium';
  }

  // Default to low
  return 'low';
}

// ─── Indicator Category Classification ────────────────────────────────

/**
 * Classify indicator category from event name. Original classification logic.
 */
export function classifyCategory(eventName: string): IndicatorCategory {
  const name = eventName.toLowerCase();

  if (/interest rate|fed fund|rate decision|central bank rate|deposit rate|lending rate|overnight rate/.test(name)) return 'interest-rates';
  if (/payroll|employment|unemployment|jobless|job|labor|labour|wage|earning|nonfarm|non-farm/.test(name)) return 'employment';
  if (/cpi|ppi|inflation|consumer price|producer price|pce price|core pce|deflator|import price|export price/.test(name)) return 'inflation';
  if (/gdp|gross domestic|growth rate/.test(name)) return 'gdp-growth';
  if (/trade balance|current account|import|export|balance of payment/.test(name)) return 'trade';
  if (/retail|consumer confidence|consumer sentiment|consumer spending|personal spending|personal income/.test(name)) return 'consumer';
  if (/pmi|purchasing|ism|manufacturing|industrial|factory|durable/.test(name)) return 'manufacturing';
  if (/housing|home|building permit|construction|mortgage/.test(name)) return 'housing';
  if (/fomc|ecb|boe|boj|rba|rbnz|snb|monetary policy|quantitative|minute/.test(name)) return 'central-bank';
  if (/budget|spending|fiscal|government|treasury|bond auction|debt/.test(name)) return 'government';
  if (/business|inventory|order|capacity|utilization/.test(name)) return 'business';
  if (/money supply|m2|m3|credit|loan/.test(name)) return 'monetary';

  return 'business';
}

// ─── Category Display Info ────────────────────────────────────────────

export const CATEGORY_INFO: Record<IndicatorCategory, { label: string; color: string; icon: string }> = {
  'interest-rates': { label: 'Interest Rates', color: '#ef4444', icon: '🏛️' },
  'employment': { label: 'Employment', color: '#f59e0b', icon: '👷' },
  'inflation': { label: 'Inflation', color: '#f97316', icon: '📈' },
  'gdp-growth': { label: 'GDP & Growth', color: '#22c55e', icon: '📊' },
  'trade': { label: 'Trade', color: '#3b82f6', icon: '🚢' },
  'consumer': { label: 'Consumer', color: '#8b5cf6', icon: '🛒' },
  'manufacturing': { label: 'Manufacturing', color: '#6366f1', icon: '🏭' },
  'housing': { label: 'Housing', color: '#ec4899', icon: '🏠' },
  'central-bank': { label: 'Central Bank', color: '#14b8a6', icon: '🏦' },
  'government': { label: 'Government', color: '#64748b', icon: '🏛️' },
  'business': { label: 'Business', color: '#a855f7', icon: '💼' },
  'monetary': { label: 'Monetary', color: '#06b6d4', icon: '💰' },
};

// ─── Surprise Calculation ─────────────────────────────────────────────

export interface SurpriseResult {
  /** Difference between actual and estimate */
  difference: number;
  /** Percentage surprise */
  percent: number;
  /** Whether the surprise is positive for the economy */
  isPositive: boolean;
  /** Display label */
  label: string;
}

/**
 * Calculate the surprise between actual and estimated values.
 * Returns null if either value is missing.
 */
export function calculateSurprise(
  actual: number | null | undefined,
  estimate: number | null | undefined,
  _eventName?: string
): SurpriseResult | null {
  if (actual == null || estimate == null || isNaN(actual) || isNaN(estimate)) {
    return null;
  }

  const difference = actual - estimate;
  const percent = estimate !== 0 ? (difference / Math.abs(estimate)) * 100 : 0;

  // For most economic indicators, beating estimates (actual > estimate) is positive
  // Exceptions: unemployment, jobless claims (lower is better)
  const name = (_eventName || '').toLowerCase();
  const lowerIsBetter = /unemployment|jobless|claims|deficit/.test(name);
  const isPositive = lowerIsBetter ? difference < 0 : difference > 0;

  const sign = difference >= 0 ? '+' : '';
  const label = `${sign}${percent.toFixed(1)}%`;

  return { difference, percent, isPositive, label };
}

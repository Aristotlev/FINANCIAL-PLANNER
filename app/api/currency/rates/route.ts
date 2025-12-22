/**
 * Currency Rates API
 * 
 * Provides real-time exchange rates with aggressive caching.
 * Used by the hybrid data system for currency conversions.
 */

import { NextRequest, NextResponse } from 'next/server';

// Cache duration
const CACHE_DURATION = 300; // 5 minutes
const STALE_WHILE_REVALIDATE = 600; // 10 minutes

// In-memory cache
let cachedRates: { rates: Record<string, number>; timestamp: number } | null = null;
const CACHE_TTL = 300000; // 5 minutes

// Supported currencies
const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD',
  'CNY', 'HKD', 'SGD', 'KRW', 'INR', 'BRL', 'MXN', 'ZAR',
  'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'TRY', 'RUB',
  'THB', 'MYR', 'IDR', 'PHP', 'VND', 'AED', 'SAR', 'ILS'
];

interface RatesResponse {
  rates: Record<string, number>;
  base: string;
  timestamp: number;
  source: string;
  cached: boolean;
}

async function fetchRatesFromProvider(): Promise<Record<string, number> | null> {
  try {
    // Try Exchange Rate API (free tier)
    const response = await fetch(
      'https://api.exchangerate-api.com/v4/latest/USD',
      { next: { revalidate: CACHE_DURATION } }
    );
    
    if (!response.ok) {
      console.error('Exchange Rate API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return null;
  }
}

async function fetchRatesFromFallback(): Promise<Record<string, number> | null> {
  try {
    // Fallback to Open Exchange Rates (if configured)
    const apiKey = process.env.OPEN_EXCHANGE_RATES_API_KEY;
    if (!apiKey) return null;
    
    const response = await fetch(
      `https://openexchangerates.org/api/latest.json?app_id=${apiKey}`,
      { next: { revalidate: CACHE_DURATION } }
    );
    
    if (!response.ok) {
      console.error('Open Exchange Rates API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.rates;
  } catch (error) {
    console.error('Error fetching fallback exchange rates:', error);
    return null;
  }
}

// Fallback rates (updated periodically as backup)
const FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  CHF: 0.88,
  CAD: 1.36,
  AUD: 1.53,
  NZD: 1.64,
  CNY: 7.24,
  HKD: 7.82,
  SGD: 1.34,
  KRW: 1310,
  INR: 83.4,
  BRL: 4.97,
  MXN: 17.15,
  ZAR: 18.9,
  SEK: 10.42,
  NOK: 10.58,
  DKK: 6.87,
  PLN: 4.02,
  CZK: 22.8,
  HUF: 358,
  TRY: 29.5,
  RUB: 92.5,
  THB: 35.2,
  MYR: 4.72,
  IDR: 15650,
  PHP: 55.8,
  VND: 24500,
  AED: 3.67,
  SAR: 3.75,
  ILS: 3.68,
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const base = searchParams.get('base') || 'USD';
  const symbols = searchParams.get('symbols')?.split(',') || SUPPORTED_CURRENCIES;
  
  // Check in-memory cache
  if (cachedRates && Date.now() - cachedRates.timestamp < CACHE_TTL) {
    const filteredRates: Record<string, number> = {};
    
    // Convert rates to requested base currency
    const baseRate = cachedRates.rates[base] || 1;
    
    for (const symbol of symbols) {
      const rate = cachedRates.rates[symbol];
      if (rate !== undefined) {
        filteredRates[symbol] = rate / baseRate;
      }
    }
    
    const response: RatesResponse = {
      rates: filteredRates,
      base,
      timestamp: cachedRates.timestamp,
      source: 'cache',
      cached: true,
    };
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
        'X-Cache': 'HIT',
      },
    });
  }
  
  // Fetch fresh rates
  let rates = await fetchRatesFromProvider();
  let source = 'exchangerate-api';
  
  // Try fallback if primary fails
  if (!rates) {
    rates = await fetchRatesFromFallback();
    source = 'openexchangerates';
  }
  
  // Use hardcoded fallback as last resort
  if (!rates) {
    rates = FALLBACK_RATES;
    source = 'fallback';
  }
  
  // Update cache
  cachedRates = {
    rates,
    timestamp: Date.now(),
  };
  
  // Convert to requested base
  const baseRate = rates[base] || 1;
  const filteredRates: Record<string, number> = {};
  
  for (const symbol of symbols) {
    const rate = rates[symbol];
    if (rate !== undefined) {
      filteredRates[symbol] = rate / baseRate;
    }
  }
  
  const response: RatesResponse = {
    rates: filteredRates,
    base,
    timestamp: Date.now(),
    source,
    cached: false,
  };
  
  return NextResponse.json(response, {
    headers: {
      'Cache-Control': `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
      'X-Cache': 'MISS',
      'X-Source': source,
    },
  });
}

// POST endpoint for currency conversion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, from, to } = body;
    
    if (!amount || !from || !to) {
      return NextResponse.json(
        { error: 'amount, from, and to are required' },
        { status: 400 }
      );
    }
    
    // Get rates
    let rates = cachedRates?.rates;
    
    if (!rates || Date.now() - (cachedRates?.timestamp || 0) > CACHE_TTL) {
      rates = await fetchRatesFromProvider() || FALLBACK_RATES;
      cachedRates = { rates, timestamp: Date.now() };
    }
    
    const fromRate = rates[from] || 1;
    const toRate = rates[to] || 1;
    
    const convertedAmount = (amount / fromRate) * toRate;
    
    return NextResponse.json({
      amount,
      from,
      to,
      convertedAmount,
      rate: toRate / fromRate,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Currency conversion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

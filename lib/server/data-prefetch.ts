/**
 * Server-Side Data Prefetching Service
 * 
 * This module provides server-side data fetching with caching and revalidation.
 * Used for SSR to deliver data on first paint, improving perceived performance.
 */

import { cache } from 'react';
import { Pool } from 'pg';

// Connection pool for database access (server-side only)
const getPool = cache(() => {
  if (!process.env.SUPABASE_DATABASE_URL) {
    console.warn('SUPABASE_DATABASE_URL not configured');
    return null;
  }
  
  return new Pool({
    connectionString: process.env.SUPABASE_DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
});

// Cache durations (in seconds)
export const CACHE_DURATIONS = {
  REALTIME: 30,           // 30 seconds - real-time prices
  SHORT: 60,              // 1 minute - frequently changing data
  MEDIUM: 300,            // 5 minutes - moderately stable data
  LONG: 3600,             // 1 hour - stable data
  STATIC: 86400,          // 24 hours - static data
} as const;

/**
 * Cached user portfolio data fetcher
 * Uses React cache() for request deduplication
 */
export const prefetchUserPortfolio = cache(async (userId: string) => {
  const pool = getPool();
  if (!pool) return null;

  try {
    const client = await pool.connect();
    
    try {
      // Fetch all portfolio data in parallel for maximum speed
      const [
        cryptoResult,
        stocksResult,
        cashResult,
        savingsResult,
        realEstateResult,
        valuableItemsResult,
        expensesResult,
      ] = await Promise.all([
        client.query(`
          SELECT * FROM crypto_holdings 
          WHERE user_id = $1 
          ORDER BY value DESC
        `, [userId]),
        client.query(`
          SELECT * FROM stock_holdings 
          WHERE user_id = $1 
          ORDER BY value DESC
        `, [userId]),
        client.query(`
          SELECT * FROM cash_accounts 
          WHERE user_id = $1 
          ORDER BY balance DESC
        `, [userId]),
        client.query(`
          SELECT * FROM savings_accounts 
          WHERE user_id = $1 
          ORDER BY current DESC
        `, [userId]),
        client.query(`
          SELECT * FROM real_estate 
          WHERE user_id = $1 
          ORDER BY current_value DESC
        `, [userId]),
        client.query(`
          SELECT * FROM valuable_items 
          WHERE user_id = $1 
          ORDER BY current_value DESC
        `, [userId]),
        client.query(`
          SELECT * FROM expense_categories 
          WHERE user_id = $1 
          ORDER BY amount DESC
        `, [userId]),
      ]);

      return {
        crypto: cryptoResult.rows || [],
        stocks: stocksResult.rows || [],
        cash: cashResult.rows || [],
        savings: savingsResult.rows || [],
        realEstate: realEstateResult.rows || [],
        valuableItems: valuableItemsResult.rows || [],
        expenses: expensesResult.rows || [],
        fetchedAt: Date.now(),
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error prefetching portfolio:', error);
    return null;
  }
});

/**
 * Cached market prices fetcher for portfolio symbols
 */
export const prefetchMarketPrices = cache(async (symbols: string[]) => {
  if (!symbols.length) return {};

  try {
    // Batch fetch prices from our internal API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/market-data/batch`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
        next: { revalidate: CACHE_DURATIONS.REALTIME },
      }
    );

    if (!response.ok) return {};
    
    const data = await response.json();
    return data.prices || {};
  } catch (error) {
    console.error('Error prefetching market prices:', error);
    return {};
  }
});

/**
 * Cached news fetcher
 */
export const prefetchNews = cache(async (category: string = 'general') => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/news?category=${category}`,
      { next: { revalidate: CACHE_DURATIONS.MEDIUM } }
    );

    if (!response.ok) return [];
    
    const data = await response.json();
    return data.articles || [];
  } catch (error) {
    console.error('Error prefetching news:', error);
    return [];
  }
});

/**
 * Cached currency rates fetcher
 */
export const prefetchCurrencyRates = cache(async () => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/currency/rates`,
      { next: { revalidate: CACHE_DURATIONS.MEDIUM } }
    );

    if (!response.ok) return null;
    
    const data = await response.json();
    return data.rates || null;
  } catch (error) {
    console.error('Error prefetching currency rates:', error);
    return null;
  }
});

/**
 * Aggregate prefetch function - fetches all initial data
 */
export const prefetchDashboardData = cache(async (userId: string | null) => {
  const startTime = Date.now();

  // Prefetch in parallel for maximum speed
  const [portfolio, currencyRates, news] = await Promise.all([
    userId ? prefetchUserPortfolio(userId) : null,
    prefetchCurrencyRates(),
    prefetchNews('general'),
  ]);

  // If we have portfolio data, prefetch market prices for holdings
  let marketPrices = {};
  if (portfolio) {
    const cryptoSymbols = portfolio.crypto.map((c: any) => c.symbol);
    const stockSymbols = portfolio.stocks.map((s: any) => s.symbol);
    const allSymbols = [...cryptoSymbols, ...stockSymbols];
    
    if (allSymbols.length > 0) {
      marketPrices = await prefetchMarketPrices(allSymbols);
    }
  }

  const fetchTime = Date.now() - startTime;
  console.log(`⚡ Dashboard data prefetched in ${fetchTime}ms`);

  return {
    portfolio,
    marketPrices,
    currencyRates,
    news,
    fetchedAt: Date.now(),
    fetchTime,
  };
});

export type PrefetchedDashboardData = Awaited<ReturnType<typeof prefetchDashboardData>>;

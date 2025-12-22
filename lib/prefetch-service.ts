/**
 * Intelligent Prefetch Service
 * 
 * Predicts and prefetches data based on user behavior patterns.
 * Uses intersection observer, route prediction, and user activity analysis.
 */

"use client";

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import enhancedCache, { cacheKeys, cacheConfigs } from './enhanced-cache-service';

// Prefetch priorities
type PrefetchPriority = 'critical' | 'high' | 'medium' | 'low';

interface PrefetchTask {
  key: string;
  fetcher: () => Promise<any>;
  priority: PrefetchPriority;
  cacheConfig: typeof cacheConfigs[keyof typeof cacheConfigs];
}

// Global prefetch queue
const prefetchQueue: PrefetchTask[] = [];
let isProcessing = false;

// User behavior tracking
const userBehavior = {
  lastVisitedRoutes: [] as string[],
  lastViewedSymbols: [] as string[],
  interactionPatterns: new Map<string, number>(),
};

/**
 * Add task to prefetch queue
 */
function queuePrefetch(task: PrefetchTask): void {
  // Don't queue if already cached and fresh
  if (enhancedCache.isFresh(task.key)) return;
  
  // Check for duplicates
  if (prefetchQueue.some(t => t.key === task.key)) return;
  
  prefetchQueue.push(task);
  processQueue();
}

/**
 * Process prefetch queue with priority ordering
 */
async function processQueue(): Promise<void> {
  if (isProcessing || prefetchQueue.length === 0) return;
  
  isProcessing = true;
  
  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  prefetchQueue.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  while (prefetchQueue.length > 0) {
    const task = prefetchQueue.shift();
    if (!task) continue;
    
    // Skip if now cached
    if (enhancedCache.isFresh(task.key)) continue;
    
    try {
      // Use requestIdleCallback for low priority tasks
      if (task.priority === 'low' && typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        await new Promise<void>(resolve => {
          (window as any).requestIdleCallback(async () => {
            await enhancedCache.swr(task.key, task.fetcher, task.cacheConfig);
            resolve();
          });
        });
      } else {
        await enhancedCache.swr(task.key, task.fetcher, task.cacheConfig);
      }
    } catch (error) {
      console.error(`Prefetch failed for ${task.key}:`, error);
    }
    
    // Small delay between prefetches to not overwhelm
    await new Promise(r => setTimeout(r, 50));
  }
  
  isProcessing = false;
}

/**
 * Prefetch market prices for symbols
 */
export function prefetchPrices(symbols: string[]): void {
  if (!symbols.length) return;
  
  queuePrefetch({
    key: cacheKeys.prices(symbols),
    fetcher: async () => {
      const response = await fetch('/api/market-data/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
      });
      return response.json();
    },
    priority: 'high',
    cacheConfig: cacheConfigs.realtime,
  });
}

/**
 * Prefetch news for a category
 */
export function prefetchNews(category: string = 'general'): void {
  queuePrefetch({
    key: cacheKeys.news(category),
    fetcher: async () => {
      const response = await fetch(`/api/news?category=${category}`);
      return response.json();
    },
    priority: 'medium',
    cacheConfig: cacheConfigs.standard,
  });
}

/**
 * Prefetch currency rates
 */
export function prefetchCurrencyRates(): void {
  queuePrefetch({
    key: cacheKeys.currencyRates(),
    fetcher: async () => {
      const response = await fetch('/api/currency/rates');
      return response.json();
    },
    priority: 'high',
    cacheConfig: cacheConfigs.slow,
  });
}

/**
 * Prefetch based on route navigation prediction
 */
export function predictAndPrefetch(currentRoute: string): void {
  // Track route visit
  userBehavior.lastVisitedRoutes.unshift(currentRoute);
  userBehavior.lastVisitedRoutes = userBehavior.lastVisitedRoutes.slice(0, 10);
  
  // Route-based prefetching
  const predictions: Record<string, () => void> = {
    '/': () => {
      // On dashboard, prefetch common data
      prefetchCurrencyRates();
      prefetchNews('general');
    },
    '/billing': () => {
      // Prefetch subscription data
      queuePrefetch({
        key: 'subscription:plans',
        fetcher: async () => {
          const response = await fetch('/api/subscription-pricing');
          return response.json();
        },
        priority: 'medium',
        cacheConfig: cacheConfigs.slow,
      });
    },
    '/settings': () => {
      // User settings are usually already loaded
    },
  };
  
  const handler = predictions[currentRoute];
  if (handler) handler();
}

/**
 * Track symbol interaction for smart prefetching
 */
export function trackSymbolInteraction(symbol: string): void {
  const count = userBehavior.interactionPatterns.get(symbol) || 0;
  userBehavior.interactionPatterns.set(symbol, count + 1);
  
  // Add to recently viewed
  userBehavior.lastViewedSymbols.unshift(symbol);
  userBehavior.lastViewedSymbols = [...new Set(userBehavior.lastViewedSymbols)].slice(0, 20);
  
  // Prefetch related data for frequently viewed symbols
  if (count >= 3) {
    queuePrefetch({
      key: `symbol:${symbol}:detailed`,
      fetcher: async () => {
        const response = await fetch(`/api/market-data?symbol=${symbol}&detailed=true`);
        return response.json();
      },
      priority: 'low',
      cacheConfig: cacheConfigs.frequent,
    });
  }
}

/**
 * Get frequently accessed symbols for priority prefetching
 */
export function getFrequentSymbols(): string[] {
  const entries = Array.from(userBehavior.interactionPatterns.entries());
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([symbol]) => symbol);
}

/**
 * React hook for automatic prefetching based on visibility
 */
export function usePrefetchOnVisible(
  ref: React.RefObject<HTMLElement>,
  prefetchFn: () => void,
  options: { rootMargin?: string; threshold?: number } = {}
) {
  const hasPrefetched = useRef(false);
  
  useEffect(() => {
    if (!ref.current || hasPrefetched.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasPrefetched.current) {
            hasPrefetched.current = true;
            prefetchFn();
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: options.rootMargin || '100px',
        threshold: options.threshold || 0,
      }
    );
    
    observer.observe(ref.current);
    
    return () => observer.disconnect();
  }, [ref, prefetchFn, options.rootMargin, options.threshold]);
}

/**
 * React hook for route-based prefetching
 */
export function useRoutePrefetch() {
  const router = useRouter();
  
  const prefetchRoute = useCallback((route: string) => {
    // Next.js route prefetch
    router.prefetch(route);
    
    // Data prefetch based on route
    predictAndPrefetch(route);
  }, [router]);
  
  return { prefetchRoute };
}

/**
 * React hook for automatic initial prefetching
 */
export function useInitialPrefetch(symbols: string[]) {
  useEffect(() => {
    // Prefetch on mount
    if (symbols.length > 0) {
      prefetchPrices(symbols);
    }
    
    prefetchCurrencyRates();
    
    // Prefetch frequent symbols
    const frequent = getFrequentSymbols();
    if (frequent.length > 0) {
      prefetchPrices(frequent);
    }
  }, [symbols]);
}

/**
 * Prefetch hook for link hover
 */
export function useLinkPrefetch() {
  const prefetchOnHover = useCallback((href: string) => {
    predictAndPrefetch(href);
  }, []);
  
  return { prefetchOnHover };
}

/**
 * Clear prefetch cache (for testing/debugging)
 */
export function clearPrefetchCache(): void {
  enhancedCache.clear();
  prefetchQueue.length = 0;
  userBehavior.lastVisitedRoutes = [];
  userBehavior.lastViewedSymbols = [];
  userBehavior.interactionPatterns.clear();
}

// Auto-prefetch on window focus (refresh stale data)
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => {
    const frequent = getFrequentSymbols();
    if (frequent.length > 0) {
      prefetchPrices(frequent);
    }
    prefetchCurrencyRates();
  });
}

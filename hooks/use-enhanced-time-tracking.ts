/**
 * Enhanced Time Tracking Hook
 * Automatically tracks portfolio and asset prices at regular intervals
 * Supports 1h, 4h, 24h, 7d, 30d, 365d timeframe analysis
 */

import { useEffect, useRef } from 'react';
import { useBetterAuth } from '../contexts/better-auth-context';
import { EnhancedTimeTrackingService } from '../lib/enhanced-time-tracking-service';

export interface UseEnhancedTimeTrackingOptions {
  /**
   * Enable automatic snapshot creation (default: true)
   */
  enabled?: boolean;
  
  /**
   * Snapshot interval in milliseconds (default: 1 hour = 3600000ms)
   */
  snapshotInterval?: number;
  
  /**
   * Enable price tracking for individual assets (default: true)
   */
  trackAssetPrices?: boolean;
}

/**
 * Hook to automatically track portfolio and asset prices over time
 * Creates hourly snapshots for intraday analysis (1h, 4h)
 * Maintains daily snapshots for longer-term analysis (7d, 30d, 365d)
 */
export function useEnhancedTimeTracking(
  portfolioData: any,
  options: UseEnhancedTimeTrackingOptions = {}
) {
  const {
    enabled = true,
    snapshotInterval = 60 * 60 * 1000, // 1 hour default
    trackAssetPrices = true
  } = options;

  const { user } = useBetterAuth();
  const lastSnapshotRef = useRef<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !user?.id || !portfolioData) {
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.debug('[Time Tracking] Starting...');
    }

    // Create initial snapshot on mount
    const createSnapshot = async () => {
      try {
        const now = new Date();
        
        // Check if enough time has passed since last snapshot
        if (lastSnapshotRef.current) {
          const timeSinceLastSnapshot = now.getTime() - lastSnapshotRef.current.getTime();
          if (timeSinceLastSnapshot < snapshotInterval) {
            return; // Silently skip
          }
        }

        await EnhancedTimeTrackingService.autoEnhancedSnapshot(user.id, portfolioData);
        lastSnapshotRef.current = now;
        
        if (process.env.NODE_ENV === 'development') {
          console.debug('[Time Tracking] Snapshot created');
        }
      } catch (error) {
        // Silently fail - snapshots are not critical
        if (process.env.NODE_ENV === 'development') {
          console.debug('[Time Tracking] Snapshot failed:', error);
        }
      }
    };

    // Create immediate snapshot
    createSnapshot();

    // Set up interval for periodic snapshots
    intervalRef.current = setInterval(() => {
      createSnapshot();
    }, snapshotInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (process.env.NODE_ENV === 'development') {
        console.debug('[Time Tracking] Stopped');
      }
    };
  }, [enabled, user?.id, portfolioData, snapshotInterval, trackAssetPrices]);

  // Provide manual snapshot trigger
  const triggerSnapshot = async () => {
    if (!user?.id || !portfolioData) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Cannot trigger snapshot: missing user or portfolio data');
      }
      return;
    }

    try {
      await EnhancedTimeTrackingService.autoEnhancedSnapshot(user.id, portfolioData);
      lastSnapshotRef.current = new Date();
      if (process.env.NODE_ENV === 'development') {
        console.debug('Manual snapshot triggered');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Manual snapshot failed:', error);
      }
      throw error;
    }
  };

  return {
    triggerSnapshot,
    lastSnapshot: lastSnapshotRef.current
  };
}

/**
 * Hook to track price snapshots for specific assets
 * Useful for tracking individual assets outside of full portfolio snapshots
 */
export function useAssetPriceTracking(
  symbol: string,
  assetType: 'crypto' | 'stock',
  currentPrice: number,
  enabled: boolean = true,
  interval: number = 60 * 60 * 1000 // 1 hour default
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !symbol || !currentPrice) {
      return;
    }

    const savePrice = async () => {
      try {
        await EnhancedTimeTrackingService.savePriceSnapshot(
          symbol,
          assetType,
          currentPrice
        );
      } catch (error) {
        console.error(`Error saving price snapshot for ${symbol}:`, error);
      }
    };

    // Save initial price
    savePrice();

    // Set up interval
    intervalRef.current = setInterval(savePrice, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, symbol, assetType, currentPrice, interval]);
}

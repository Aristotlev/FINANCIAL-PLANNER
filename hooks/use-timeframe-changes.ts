/**
 * Hook for tracking portfolio changes across multiple timeframes
 * Provides 24h, weekly, monthly, and yearly changes
 */

import { useState, useEffect } from 'react';
import { HistoricalTrackingService, TimeframeChanges } from '../lib/historical-tracking-service';
import { useBetterAuth } from '../contexts/better-auth-context';

export interface AssetWithChanges {
  symbol: string;
  name: string;
  currentValue: number;
  quantity: number;
  assetType: 'crypto' | 'stock';
  changes: TimeframeChanges;
}

export function usePortfolioTimeframeChanges(currentNetWorth: number) {
  const { user } = useBetterAuth();
  const [changes, setChanges] = useState<TimeframeChanges>({
    change24h: 0,
    change24hPercent: 0,
    changeWeekly: 0,
    changeWeeklyPercent: 0,
    changeMonthly: 0,
    changeMonthlyPercent: 0,
    changeYearly: 0,
    changeYearlyPercent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !currentNetWorth) {
      setLoading(false);
      return;
    }

    const fetchChanges = async () => {
      try {
        const portfolioChanges = await HistoricalTrackingService.calculatePortfolioChanges(
          user.id,
          currentNetWorth
        );
        setChanges(portfolioChanges);
      } catch (error) {
        console.error('Error fetching portfolio timeframe changes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChanges();
  }, [user?.id, currentNetWorth]);

  return { changes, loading };
}

export function useAssetTimeframeChanges(
  symbol: string,
  assetType: 'crypto' | 'stock',
  currentValue: number,
  quantity: number
) {
  const { user } = useBetterAuth();
  const [changes, setChanges] = useState<TimeframeChanges>({
    change24h: 0,
    change24hPercent: 0,
    changeWeekly: 0,
    changeWeeklyPercent: 0,
    changeMonthly: 0,
    changeMonthlyPercent: 0,
    changeYearly: 0,
    changeYearlyPercent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !symbol || !currentValue) {
      setLoading(false);
      return;
    }

    const fetchChanges = async () => {
      try {
        const assetChanges = await HistoricalTrackingService.calculateAssetChanges(
          user.id,
          symbol,
          assetType,
          currentValue,
          quantity
        );
        setChanges(assetChanges);
      } catch (error) {
        console.error(`Error fetching timeframe changes for ${symbol}:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchChanges();
  }, [user?.id, symbol, assetType, currentValue, quantity]);

  return { changes, loading };
}

/**
 * Hook to automatically create portfolio snapshots
 */
export function useAutoSnapshot(portfolioData: any) {
  const { user } = useBetterAuth();

  useEffect(() => {
    if (!user?.id || !portfolioData) return;

    const createSnapshot = async () => {
      try {
        await HistoricalTrackingService.autoSnapshot(user.id, portfolioData);
      } catch (error) {
        console.error('Error creating auto-snapshot:', error);
      }
    };

    // Create snapshot on mount and every 24 hours
    createSnapshot();
    const interval = setInterval(createSnapshot, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.id, portfolioData]);
}

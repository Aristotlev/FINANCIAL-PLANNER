/**
 * Historical Tracking Service
 * Tracks portfolio values and asset prices over time for 24h, weekly, monthly, yearly analysis
 */

import { supabase } from './supabase/client';

export interface HistoricalSnapshot {
  id?: string;
  user_id: string;
  snapshot_date: Date;
  
  // Portfolio totals
  total_net_worth: number;
  total_assets: number;
  total_liabilities: number;
  
  // Individual categories
  cash: number;
  savings: number;
  crypto_value: number;
  stocks_value: number;
  real_estate_value: number;
  valuable_items_value: number;
  trading_account_value: number;
  
  // Asset breakdown (JSON)
  crypto_holdings: any[];
  stock_holdings: any[];
  
  created_at?: Date;
}

export interface AssetPriceHistory {
  id?: string;
  symbol: string;
  asset_type: 'crypto' | 'stock' | 'forex' | 'index';
  price: number;
  timestamp: Date;
  volume?: number;
  market_cap?: number;
}

export interface TimeframeChanges {
  change24h: number;
  change24hPercent: number;
  changeWeekly: number;
  changeWeeklyPercent: number;
  changeMonthly: number;
  changeMonthlyPercent: number;
  changeYearly: number;
  changeYearlyPercent: number;
}

export class HistoricalTrackingService {
  
  /**
   * Create a snapshot of current portfolio state
   */
  static async createSnapshot(userId: string, portfolioData: any): Promise<void> {
    try {
      const snapshot: HistoricalSnapshot = {
        user_id: userId,
        snapshot_date: new Date(),
        total_net_worth: portfolioData.netWorth || 0,
        total_assets: portfolioData.totalAssets || 0,
        total_liabilities: portfolioData.totalLiabilities || 0,
        cash: portfolioData.cash || 0,
        savings: portfolioData.savings || 0,
        crypto_value: portfolioData.cryptoValue || 0,
        stocks_value: portfolioData.stocksValue || 0,
        real_estate_value: portfolioData.realEstateValue || 0,
        valuable_items_value: portfolioData.valuableItemsValue || 0,
        trading_account_value: portfolioData.tradingAccountValue || 0,
        crypto_holdings: portfolioData.cryptoHoldings || [],
        stock_holdings: portfolioData.stockHoldings || [],
      };

      const { error } = await supabase
        .from('portfolio_snapshots')
        .insert(snapshot as any);

      if (error) {
        // Check if it's an auth error (401)
        if (error.message?.includes('401') || error.message?.includes('JWT')) {
          console.warn('⚠️ Portfolio snapshot requires authentication. Using localStorage fallback.');
        } else {
          console.warn('⚠️ Error creating portfolio snapshot:', error.message);
        }
        // Fallback to localStorage if Supabase fails
        this.saveSnapshotToLocalStorage(portfolioData);
        return;
      }
    } catch (error: any) {
      // Check if it's an auth error
      if (error?.message?.includes('401') || error?.message?.includes('JWT')) {
        console.warn('⚠️ Portfolio snapshot requires authentication. Using localStorage fallback.');
      } else {
        console.warn('⚠️ Exception creating portfolio snapshot:', error?.message);
      }
      // Store in localStorage as fallback
      this.saveSnapshotToLocalStorage(portfolioData);
    }
  }

  /**
   * Get historical snapshots for a time range
   */
  static async getSnapshots(userId: string, daysBack: number): Promise<HistoricalSnapshot[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data, error } = await supabase
        .from('portfolio_snapshots')
        .select('*')
        .eq('user_id', userId)
        .gte('snapshot_date', startDate.toISOString())
        .order('snapshot_date', { ascending: false });

      // If Supabase fails, return localStorage data
      if (error) {
        // Suppress repetitive 401 auth warnings
        if (error.message?.includes('401') || error.message?.includes('JWT')) {
          // Silent fallback for auth issues
        } else {
          console.warn('⚠️ Error fetching snapshots:', error.message);
        }
        return this.getSnapshotsFromLocalStorage(daysBack);
      }

      return (data as HistoricalSnapshot[]) || [];
    } catch (error: any) {
      // Suppress repetitive 401 warnings
      if (!(error?.message?.includes('401') || error?.message?.includes('JWT'))) {
        console.warn('⚠️ Exception fetching snapshots:', error?.message);
      }
      // Return localStorage data on error
      return this.getSnapshotsFromLocalStorage(daysBack);
    }
  }

  /**
   * Calculate timeframe changes for portfolio
   */
  static async calculatePortfolioChanges(
    userId: string,
    currentValue: number
  ): Promise<TimeframeChanges> {
    try {
      // Get snapshots for different timeframes
      const [snapshot24h, snapshotWeek, snapshotMonth, snapshotYear] = await Promise.all([
        this.getSnapshotAt(userId, 1),
        this.getSnapshotAt(userId, 7),
        this.getSnapshotAt(userId, 30),
        this.getSnapshotAt(userId, 365),
      ]);

      const value24hAgo = snapshot24h?.total_net_worth || currentValue;
      const valueWeekAgo = snapshotWeek?.total_net_worth || currentValue;
      const valueMonthAgo = snapshotMonth?.total_net_worth || currentValue;
      const valueYearAgo = snapshotYear?.total_net_worth || currentValue;

      return {
        change24h: currentValue - value24hAgo,
        change24hPercent: value24hAgo > 0 ? ((currentValue - value24hAgo) / value24hAgo) * 100 : 0,
        changeWeekly: currentValue - valueWeekAgo,
        changeWeeklyPercent: valueWeekAgo > 0 ? ((currentValue - valueWeekAgo) / valueWeekAgo) * 100 : 0,
        changeMonthly: currentValue - valueMonthAgo,
        changeMonthlyPercent: valueMonthAgo > 0 ? ((currentValue - valueMonthAgo) / valueMonthAgo) * 100 : 0,
        changeYearly: currentValue - valueYearAgo,
        changeYearlyPercent: valueYearAgo > 0 ? ((currentValue - valueYearAgo) / valueYearAgo) * 100 : 0,
      };
    } catch (error) {
      console.error('❌ Error calculating portfolio changes:', error);
      return {
        change24h: 0,
        change24hPercent: 0,
        changeWeekly: 0,
        changeWeeklyPercent: 0,
        changeMonthly: 0,
        changeMonthlyPercent: 0,
        changeYearly: 0,
        changeYearlyPercent: 0,
      };
    }
  }

  /**
   * Get snapshot closest to N days ago
   */
  private static async getSnapshotAt(userId: string, daysAgo: number): Promise<HistoricalSnapshot | null> {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from('portfolio_snapshots')
        .select('*')
        .eq('user_id', userId)
        .lte('snapshot_date', targetDate.toISOString())
        .order('snapshot_date', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data?.[0] || null;
    } catch (error: any) {
      // Suppress repetitive 401 auth errors in console
      if (!(error?.message?.includes('401') || error?.message?.includes('JWT'))) {
        console.error(`❌ Error fetching snapshot ${daysAgo} days ago:`, error?.message);
      }
      return null;
    }
  }

  /**
   * Calculate changes for individual asset
   */
  static async calculateAssetChanges(
    userId: string,
    symbol: string,
    assetType: 'crypto' | 'stock',
    currentValue: number,
    quantity: number
  ): Promise<TimeframeChanges> {
    try {
      const [snapshot24h, snapshotWeek, snapshotMonth, snapshotYear] = await Promise.all([
        this.getAssetValueAt(userId, symbol, assetType, 1),
        this.getAssetValueAt(userId, symbol, assetType, 7),
        this.getAssetValueAt(userId, symbol, assetType, 30),
        this.getAssetValueAt(userId, symbol, assetType, 365),
      ]);

      const value24hAgo = snapshot24h || currentValue;
      const valueWeekAgo = snapshotWeek || currentValue;
      const valueMonthAgo = snapshotMonth || currentValue;
      const valueYearAgo = snapshotYear || currentValue;

      return {
        change24h: currentValue - value24hAgo,
        change24hPercent: value24hAgo > 0 ? ((currentValue - value24hAgo) / value24hAgo) * 100 : 0,
        changeWeekly: currentValue - valueWeekAgo,
        changeWeeklyPercent: valueWeekAgo > 0 ? ((currentValue - valueWeekAgo) / valueWeekAgo) * 100 : 0,
        changeMonthly: currentValue - valueMonthAgo,
        changeMonthlyPercent: valueMonthAgo > 0 ? ((currentValue - valueMonthAgo) / valueMonthAgo) * 100 : 0,
        changeYearly: currentValue - valueYearAgo,
        changeYearlyPercent: valueYearAgo > 0 ? ((currentValue - valueYearAgo) / valueYearAgo) * 100 : 0,
      };
    } catch (error) {
      console.error(`❌ Error calculating asset changes for ${symbol}:`, error);
      return {
        change24h: 0,
        change24hPercent: 0,
        changeWeekly: 0,
        changeWeeklyPercent: 0,
        changeMonthly: 0,
        changeMonthlyPercent: 0,
        changeYearly: 0,
        changeYearlyPercent: 0,
      };
    }
  }

  /**
   * Get asset value from historical snapshot
   */
  private static async getAssetValueAt(
    userId: string,
    symbol: string,
    assetType: 'crypto' | 'stock',
    daysAgo: number
  ): Promise<number | null> {
    const snapshot = await this.getSnapshotAt(userId, daysAgo);
    if (!snapshot) return null;

    const holdings = assetType === 'crypto' ? snapshot.crypto_holdings : snapshot.stock_holdings;
    const holding = holdings?.find((h: any) => h.symbol === symbol);
    
    return holding?.value || null;
  }

  /**
   * Auto-snapshot: Creates snapshots at regular intervals
   * Call this on app load or periodically
   */
  static async autoSnapshot(userId: string, portfolioData: any): Promise<void> {
    try {
      // Check if we already have a snapshot today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('portfolio_snapshots')
        .select('id')
        .eq('user_id', userId)
        .gte('snapshot_date', today.toISOString())
        .limit(1);

      // If error occurs (e.g., table doesn't exist, RLS issue), use localStorage fallback
      if (error) {
        this.saveSnapshotToLocalStorage(portfolioData);
        return;
      }

      // Only create snapshot if we don't have one today
      if (!data || data.length === 0) {
        await this.createSnapshot(userId, portfolioData);
      }
    } catch (error) {
      // Silently fail and use localStorage - don't spam console
      this.saveSnapshotToLocalStorage(portfolioData);
    }
  }

  /**
   * LocalStorage fallback methods
   */
  private static saveSnapshotToLocalStorage(portfolioData: any): void {
    try {
      const snapshots = JSON.parse(localStorage.getItem('moneyHub_snapshots') || '[]');
      snapshots.push({
        ...portfolioData,
        snapshot_date: new Date().toISOString(),
      });
      
      // Keep only last 365 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 365);
      const filtered = snapshots.filter((s: any) => new Date(s.snapshot_date) > cutoffDate);
      
      localStorage.setItem('moneyHub_snapshots', JSON.stringify(filtered));
    } catch (error) {
      console.error('❌ Error saving snapshot to localStorage:', error);
    }
  }

  private static getSnapshotsFromLocalStorage(daysBack: number): HistoricalSnapshot[] {
    try {
      const snapshots = JSON.parse(localStorage.getItem('moneyHub_snapshots') || '[]');
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      
      return snapshots.filter((s: any) => new Date(s.snapshot_date) > cutoffDate);
    } catch (error) {
      console.error('❌ Error getting snapshots from localStorage:', error);
      return [];
    }
  }

  /**
   * Get formatted change display
   */
  static formatChange(value: number, percent: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${Math.abs(value).toFixed(2)} (${sign}${percent.toFixed(2)}%)`;
  }

  /**
   * Get emoji indicator for change
   */
  static getChangeEmoji(percent: number): string {
    if (percent > 5) return '🚀';
    if (percent > 0) return '📈';
    if (percent === 0) return '➡️';
    if (percent > -5) return '📉';
    return '⚠️';
  }
}

/**
 * Enhanced Time Tracking Service
 * Comprehensive tracking of portfolio and asset price changes across multiple timeframes:
 * - 1 Hour
 * - 4 Hours  
 * - Daily (24h)
 * - Weekly (7d)
 * - Monthly (30d)
 * - Yearly (365d)
 */

import { supabase } from './supabase/client';

export type Timeframe = '1h' | '4h' | '24h' | '7d' | '30d' | '365d';

export interface TimeframeData {
  value: number;
  change: number;
  changePercent: number;
  timestamp: Date;
}

export interface EnhancedTimeframeChanges {
  change1h: number;
  change1hPercent: number;
  change4h: number;
  change4hPercent: number;
  change24h: number;
  change24hPercent: number;
  change7d: number;
  change7dPercent: number;
  change30d: number;
  change30dPercent: number;
  change365d: number;
  change365dPercent: number;
}

export interface PriceSnapshot {
  id?: string;
  symbol: string;
  asset_type: 'crypto' | 'stock' | 'forex' | 'index';
  price: number;
  volume?: number;
  market_cap?: number;
  timestamp: Date;
  created_at?: Date;
}

export interface PortfolioSnapshot {
  id?: string;
  user_id: string;
  snapshot_date: Date;
  total_net_worth: number;
  total_assets: number;
  total_liabilities: number;
  cash: number;
  savings: number;
  crypto_value: number;
  stocks_value: number;
  real_estate_value: number;
  valuable_items_value: number;
  trading_account_value: number;
  crypto_holdings: any[];
  stock_holdings: any[];
  created_at?: Date;
}

export class EnhancedTimeTrackingService {
  private static readonly TIMEFRAMES = {
    '1h': 60 * 60 * 1000,           // 1 hour in milliseconds
    '4h': 4 * 60 * 60 * 1000,       // 4 hours in milliseconds
    '24h': 24 * 60 * 60 * 1000,     // 24 hours in milliseconds
    '7d': 7 * 24 * 60 * 60 * 1000,  // 7 days in milliseconds
    '30d': 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
    '365d': 365 * 24 * 60 * 60 * 1000 // 365 days in milliseconds
  };

  /**
   * Save a price snapshot for historical tracking
   */
  static async savePriceSnapshot(
    symbol: string,
    assetType: 'crypto' | 'stock' | 'forex' | 'index',
    price: number,
    volume?: number,
    marketCap?: number
  ): Promise<void> {
    try {
      const snapshot: PriceSnapshot = {
        symbol: symbol.toUpperCase(),
        asset_type: assetType,
        price,
        volume,
        market_cap: marketCap,
        timestamp: new Date()
      };

      const { error } = await supabase
        .from('price_snapshots')
        .insert(snapshot as any);

      if (error) {
        // Silently fallback to localStorage
        this.savePriceSnapshotToLocalStorage(snapshot);
        return;
      }

      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.debug(`Saved price snapshot for ${symbol}: $${price}`);
      }
    } catch (error) {
      // Silently use localStorage fallback
      this.savePriceSnapshotToLocalStorage({
        symbol: symbol.toUpperCase(),
        asset_type: assetType,
        price,
        volume,
        market_cap: marketCap,
        timestamp: new Date()
      });
    }
  }

  /**
   * Get price at specific timeframe
   */
  static async getPriceAtTimeframe(
    symbol: string,
    assetType: 'crypto' | 'stock',
    timeframe: Timeframe
  ): Promise<number | null> {
    try {
      const targetTime = new Date(Date.now() - this.TIMEFRAMES[timeframe]);
      
      // Try Supabase first
      const { data, error } = await supabase
        .from('price_snapshots')
        .select('price')
        .eq('symbol', symbol.toUpperCase())
        .eq('asset_type', assetType)
        .lte('timestamp', targetTime.toISOString())
        .order('timestamp', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        return (data[0] as any).price;
      }

      // Fallback to localStorage
      return this.getPriceFromLocalStorage(symbol, assetType, timeframe);
    } catch (error) {
      console.error(`Error getting ${timeframe} price for ${symbol}:`, error);
      return this.getPriceFromLocalStorage(symbol, assetType, timeframe);
    }
  }

  /**
   * Calculate comprehensive timeframe changes for a portfolio
   */
  static async calculatePortfolioTimeframeChanges(
    userId: string,
    currentValue: number
  ): Promise<EnhancedTimeframeChanges> {
    try {
      const [value1h, value4h, value24h, value7d, value30d, value365d] = await Promise.all([
        this.getPortfolioValueAt(userId, '1h'),
        this.getPortfolioValueAt(userId, '4h'),
        this.getPortfolioValueAt(userId, '24h'),
        this.getPortfolioValueAt(userId, '7d'),
        this.getPortfolioValueAt(userId, '30d'),
        this.getPortfolioValueAt(userId, '365d'),
      ]);

      return {
        change1h: currentValue - (value1h || currentValue),
        change1hPercent: value1h ? ((currentValue - value1h) / value1h) * 100 : 0,
        change4h: currentValue - (value4h || currentValue),
        change4hPercent: value4h ? ((currentValue - value4h) / value4h) * 100 : 0,
        change24h: currentValue - (value24h || currentValue),
        change24hPercent: value24h ? ((currentValue - value24h) / value24h) * 100 : 0,
        change7d: currentValue - (value7d || currentValue),
        change7dPercent: value7d ? ((currentValue - value7d) / value7d) * 100 : 0,
        change30d: currentValue - (value30d || currentValue),
        change30dPercent: value30d ? ((currentValue - value30d) / value30d) * 100 : 0,
        change365d: currentValue - (value365d || currentValue),
        change365dPercent: value365d ? ((currentValue - value365d) / value365d) * 100 : 0,
      };
    } catch (error) {
      console.error('Error calculating portfolio timeframe changes:', error);
      return this.getEmptyChanges();
    }
  }

  /**
   * Calculate comprehensive timeframe changes for an individual asset
   */
  static async calculateAssetTimeframeChanges(
    symbol: string,
    assetType: 'crypto' | 'stock',
    currentPrice: number,
    quantity: number
  ): Promise<EnhancedTimeframeChanges> {
    try {
      const currentValue = currentPrice * quantity;

      const [price1h, price4h, price24h, price7d, price30d, price365d] = await Promise.all([
        this.getPriceAtTimeframe(symbol, assetType, '1h'),
        this.getPriceAtTimeframe(symbol, assetType, '4h'),
        this.getPriceAtTimeframe(symbol, assetType, '24h'),
        this.getPriceAtTimeframe(symbol, assetType, '7d'),
        this.getPriceAtTimeframe(symbol, assetType, '30d'),
        this.getPriceAtTimeframe(symbol, assetType, '365d'),
      ]);

      const value1h = (price1h || currentPrice) * quantity;
      const value4h = (price4h || currentPrice) * quantity;
      const value24h = (price24h || currentPrice) * quantity;
      const value7d = (price7d || currentPrice) * quantity;
      const value30d = (price30d || currentPrice) * quantity;
      const value365d = (price365d || currentPrice) * quantity;

      return {
        change1h: currentValue - value1h,
        change1hPercent: value1h > 0 ? ((currentValue - value1h) / value1h) * 100 : 0,
        change4h: currentValue - value4h,
        change4hPercent: value4h > 0 ? ((currentValue - value4h) / value4h) * 100 : 0,
        change24h: currentValue - value24h,
        change24hPercent: value24h > 0 ? ((currentValue - value24h) / value24h) * 100 : 0,
        change7d: currentValue - value7d,
        change7dPercent: value7d > 0 ? ((currentValue - value7d) / value7d) * 100 : 0,
        change30d: currentValue - value30d,
        change30dPercent: value30d > 0 ? ((currentValue - value30d) / value30d) * 100 : 0,
        change365d: currentValue - value365d,
        change365dPercent: value365d > 0 ? ((currentValue - value365d) / value365d) * 100 : 0,
      };
    } catch (error) {
      console.error(`Error calculating asset timeframe changes for ${symbol}:`, error);
      return this.getEmptyChanges();
    }
  }

  /**
   * Get portfolio value at specific timeframe
   */
  private static async getPortfolioValueAt(
    userId: string,
    timeframe: Timeframe
  ): Promise<number | null> {
    try {
      const targetTime = new Date(Date.now() - this.TIMEFRAMES[timeframe]);

      const { data, error } = await supabase
        .from('portfolio_snapshots')
        .select('total_net_worth')
        .eq('user_id', userId)
        .lte('snapshot_date', targetTime.toISOString())
        .order('snapshot_date', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        return (data[0] as any).total_net_worth;
      }

      // Fallback to localStorage
      return this.getPortfolioValueFromLocalStorage(userId, timeframe);
    } catch (error) {
      console.error(`Error getting portfolio value at ${timeframe}:`, error);
      return null;
    }
  }

  /**
   * Create comprehensive portfolio snapshot (includes hourly snapshots)
   */
  static async createEnhancedSnapshot(userId: string, portfolioData: any): Promise<void> {
    try {
      const snapshot: PortfolioSnapshot = {
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
        // Silently fallback to localStorage
        this.savePortfolioSnapshotToLocalStorage(snapshot);
        return;
      }

      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.debug('Created portfolio snapshot');
      }
    } catch (error) {
      // Silently use localStorage fallback
      this.savePortfolioSnapshotToLocalStorage({
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
      });
    }
  }

  /**
   * Auto-snapshot system that creates snapshots at appropriate intervals
   * - Every hour for intraday tracking (1h, 4h data)
   * - Keep last 48 hours of hourly data
   * - Keep daily snapshots for longer-term analysis
   */
  static async autoEnhancedSnapshot(userId: string, portfolioData: any): Promise<void> {
    try {
      const now = new Date();
      const lastSnapshotKey = `lastSnapshot_${userId}`;
      const lastSnapshot = localStorage.getItem(lastSnapshotKey);
      
      let shouldSnapshot = true;

      if (lastSnapshot) {
        const lastTime = new Date(lastSnapshot);
        const hoursSinceLastSnapshot = (now.getTime() - lastTime.getTime()) / (60 * 60 * 1000);
        
        // Create snapshot every hour for intraday tracking
        shouldSnapshot = hoursSinceLastSnapshot >= 1;
      }

      if (shouldSnapshot) {
        await this.createEnhancedSnapshot(userId, portfolioData);
        localStorage.setItem(lastSnapshotKey, now.toISOString());
        
        // Also save price snapshots for all holdings
        if (portfolioData.cryptoHoldings) {
          for (const holding of portfolioData.cryptoHoldings) {
            if (holding.currentPrice) {
              await this.savePriceSnapshot(
                holding.symbol,
                'crypto',
                holding.currentPrice,
                holding.volume,
                holding.marketCap
              );
            }
          }
        }

        if (portfolioData.stockHoldings) {
          for (const holding of portfolioData.stockHoldings) {
            if (holding.currentPrice) {
              await this.savePriceSnapshot(
                holding.symbol,
                'stock',
                holding.currentPrice,
                holding.volume,
                holding.marketCap
              );
            }
          }
        }
      }

      // Cleanup old snapshots (keep last 48 hours of hourly data)
      await this.cleanupOldSnapshots(userId);
    } catch (error) {
      console.error('Error in auto enhanced snapshot:', error);
    }
  }

  /**
   * Cleanup old snapshots to prevent database bloat
   */
  private static async cleanupOldSnapshots(userId: string): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - (48 * 60 * 60 * 1000)); // 48 hours ago

      // Get daily snapshot IDs to preserve
      const dailySnapshotIds = await this.getDailySnapshotIds(userId, cutoffDate);

      // Delete old snapshots, keeping daily ones
      if (dailySnapshotIds.length > 0) {
        const { error } = await supabase
          .from('portfolio_snapshots')
          .delete()
          .eq('user_id', userId)
          .lt('snapshot_date', cutoffDate.toISOString())
          .not('id', 'in', `(${dailySnapshotIds.map(id => `"${id}"`).join(',')})`);

        if (error) {
          // Only log cleanup errors in development
          if (process.env.NODE_ENV === 'development') {
            console.debug('Cleanup skipped:', error.message);
          }
        }
      } else {
        // No daily snapshots to keep, delete all old ones
        const { error } = await supabase
          .from('portfolio_snapshots')
          .delete()
          .eq('user_id', userId)
          .lt('snapshot_date', cutoffDate.toISOString());

        if (error && process.env.NODE_ENV === 'development') {
          console.debug('Cleanup skipped:', error.message);
        }
      }
    } catch (error) {
      // Silently fail - cleanup is not critical
      if (process.env.NODE_ENV === 'development') {
        console.debug('Cleanup error:', error);
      }
    }
  }

  /**
   * Get IDs of daily snapshots to preserve
   */
  private static async getDailySnapshotIds(userId: string, afterDate: Date): Promise<string[]> {
    try {
      // Get one snapshot per day
      const { data, error } = await supabase
        .from('portfolio_snapshots')
        .select('id, snapshot_date')
        .eq('user_id', userId)
        .gte('snapshot_date', afterDate.toISOString())
        .order('snapshot_date', { ascending: true });

      if (error || !data) return [];

      // Group by day and keep one per day
      const dailySnapshots = new Map<string, string>();
      data.forEach((snapshot: any) => {
        const day = snapshot.snapshot_date.split('T')[0];
        if (!dailySnapshots.has(day)) {
          dailySnapshots.set(day, snapshot.id);
        }
      });

      return Array.from(dailySnapshots.values());
    } catch (error) {
      console.error('Error getting daily snapshot IDs:', error);
      return [];
    }
  }

  /**
   * Format timeframe changes for display
   */
  static formatTimeframeChange(value: number, percent: number): string {
    const sign = value >= 0 ? '+' : '';
    const emoji = percent >= 0 ? '🟢' : '🔴';
    return `${emoji} ${sign}$${Math.abs(value).toFixed(2)} (${sign}${percent.toFixed(2)}%)`;
  }

  /**
   * Get timeframe label
   */
  static getTimeframeLabel(timeframe: Timeframe): string {
    const labels = {
      '1h': '1 Hour',
      '4h': '4 Hours',
      '24h': '24 Hours',
      '7d': '7 Days',
      '30d': '30 Days',
      '365d': '1 Year'
    };
    return labels[timeframe];
  }

  /**
   * LocalStorage fallback methods
   */
  private static savePriceSnapshotToLocalStorage(snapshot: PriceSnapshot): void {
    try {
      const key = 'moneyHub_priceSnapshots';
      const snapshots = JSON.parse(localStorage.getItem(key) || '[]');
      snapshots.push(snapshot);
      
      // Keep only last 48 hours
      const cutoff = Date.now() - (48 * 60 * 60 * 1000);
      const filtered = snapshots.filter((s: any) => new Date(s.timestamp).getTime() > cutoff);
      
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error saving price snapshot to localStorage:', error);
    }
  }

  private static getPriceFromLocalStorage(
    symbol: string,
    assetType: string,
    timeframe: Timeframe
  ): number | null {
    try {
      const key = 'moneyHub_priceSnapshots';
      const snapshots = JSON.parse(localStorage.getItem(key) || '[]');
      const targetTime = Date.now() - this.TIMEFRAMES[timeframe];
      
      const matching = snapshots.filter((s: any) => 
        s.symbol === symbol.toUpperCase() && 
        s.asset_type === assetType &&
        new Date(s.timestamp).getTime() <= targetTime
      );

      if (matching.length === 0) return null;
      
      // Get closest snapshot to target time
      matching.sort((a: any, b: any) => 
        Math.abs(new Date(b.timestamp).getTime() - targetTime) - 
        Math.abs(new Date(a.timestamp).getTime() - targetTime)
      );

      return matching[0].price;
    } catch (error) {
      console.error('Error getting price from localStorage:', error);
      return null;
    }
  }

  private static savePortfolioSnapshotToLocalStorage(snapshot: PortfolioSnapshot): void {
    try {
      const key = 'moneyHub_portfolioSnapshots';
      const snapshots = JSON.parse(localStorage.getItem(key) || '[]');
      snapshots.push(snapshot);
      
      // Keep only last 48 hours
      const cutoff = Date.now() - (48 * 60 * 60 * 1000);
      const filtered = snapshots.filter((s: any) => 
        new Date(s.snapshot_date).getTime() > cutoff
      );
      
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error saving portfolio snapshot to localStorage:', error);
    }
  }

  private static getPortfolioValueFromLocalStorage(
    userId: string,
    timeframe: Timeframe
  ): number | null {
    try {
      const key = 'moneyHub_portfolioSnapshots';
      const snapshots = JSON.parse(localStorage.getItem(key) || '[]');
      const targetTime = Date.now() - this.TIMEFRAMES[timeframe];
      
      const matching = snapshots.filter((s: any) => 
        s.user_id === userId &&
        new Date(s.snapshot_date).getTime() <= targetTime
      );

      if (matching.length === 0) return null;
      
      // Get closest snapshot to target time
      matching.sort((a: any, b: any) => 
        Math.abs(new Date(b.snapshot_date).getTime() - targetTime) - 
        Math.abs(new Date(a.snapshot_date).getTime() - targetTime)
      );

      return matching[0].total_net_worth;
    } catch (error) {
      console.error('Error getting portfolio value from localStorage:', error);
      return null;
    }
  }

  private static getEmptyChanges(): EnhancedTimeframeChanges {
    return {
      change1h: 0,
      change1hPercent: 0,
      change4h: 0,
      change4hPercent: 0,
      change24h: 0,
      change24hPercent: 0,
      change7d: 0,
      change7dPercent: 0,
      change30d: 0,
      change30dPercent: 0,
      change365d: 0,
      change365dPercent: 0,
    };
  }
}

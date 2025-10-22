/**
 * Portfolio Analysis Service
 * Provides detailed breakdown of portfolio performance including 24h, weekly, monthly, and yearly changes
 */

import { FinnhubAPI } from './api/finnhub-api';

export interface AssetPerformance {
  symbol: string;
  name: string;
  type: 'crypto' | 'stock';
  currentPrice: number;
  currentValue: number;
  quantity: number;
  costBasis: number;
  
  // Performance metrics
  totalGainLoss: number;
  totalGainLossPercent: number;
  
  // Time-based changes
  change24h: number;
  change24hPercent: number;
  changeWeekly: number;
  changeWeeklyPercent: number;
  changeMonthly: number;
  changeMonthlyPercent: number;
  changeYearly: number;
  changeYearlyPercent: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  
  // Time-based changes
  change24h: number;
  change24hPercent: number;
  changeWeekly: number;
  changeWeeklyPercent: number;
  changeMonthly: number;
  changeMonthlyPercent: number;
  changeYearly: number;
  changeYearlyPercent: number;
  
  assets: AssetPerformance[];
}

export class PortfolioAnalysisService {
  private static finnhub = new FinnhubAPI({ 
    apiKey: process.env.NEXT_PUBLIC_FINNHUB_API_KEY || 'd3nbll9r01qo7510cpf0d3nbll9r01qo7510cpfg' 
  });

  /**
   * Get comprehensive portfolio analysis with breakdown by timeframe
   */
  static async analyzePortfolio(holdings: any[]): Promise<PortfolioSummary> {
    if (!holdings || holdings.length === 0) {
      throw new Error('No holdings to analyze');
    }

    console.log(`📊 [Portfolio Analysis] Starting analysis for ${holdings.length} holdings...`);

    const assetPerformances: AssetPerformance[] = [];
    let totalValue = 0;
    let totalCostBasis = 0;

    // Calculate portfolio value 24h, 7d, 30d, and 365d ago for comparison
    let portfolioValue24hAgo = 0;
    let portfolioValue7dAgo = 0;
    let portfolioValue30dAgo = 0;
    let portfolioValue365dAgo = 0;

    // Analyze each holding
    for (const holding of holdings) {
      try {
        const performance = await this.analyzeAsset(holding);
        
        if (performance) {
          assetPerformances.push(performance);
          totalValue += performance.currentValue;
          totalCostBasis += performance.costBasis;

          // Calculate historical portfolio values
          portfolioValue24hAgo += performance.currentValue - performance.change24h;
          portfolioValue7dAgo += performance.currentValue - performance.changeWeekly;
          portfolioValue30dAgo += performance.currentValue - performance.changeMonthly;
          portfolioValue365dAgo += performance.currentValue - performance.changeYearly;
          
          console.log(`✅ [Portfolio Analysis] Analyzed ${holding.symbol}: $${performance.currentValue.toFixed(2)}`);
        } else {
          console.warn(`⚠️ [Portfolio Analysis] Failed to analyze ${holding.symbol}`);
        }
      } catch (error) {
        console.error(`❌ [Portfolio Analysis] Error analyzing ${holding.symbol}:`, error);
        // Continue with other holdings
      }
    }

    if (assetPerformances.length === 0) {
      throw new Error('Unable to analyze any holdings. Please check your data and try again.');
    }

    console.log(`📊 [Portfolio Analysis] Successfully analyzed ${assetPerformances.length}/${holdings.length} holdings`);

    // Calculate total gains/losses
    const totalGainLoss = totalValue - totalCostBasis;
    const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

    // Calculate time-based changes
    const change24h = totalValue - portfolioValue24hAgo;
    const change24hPercent = portfolioValue24hAgo > 0 ? (change24h / portfolioValue24hAgo) * 100 : 0;

    const changeWeekly = totalValue - portfolioValue7dAgo;
    const changeWeeklyPercent = portfolioValue7dAgo > 0 ? (changeWeekly / portfolioValue7dAgo) * 100 : 0;

    const changeMonthly = totalValue - portfolioValue30dAgo;
    const changeMonthlyPercent = portfolioValue30dAgo > 0 ? (changeMonthly / portfolioValue30dAgo) * 100 : 0;

    const changeYearly = totalValue - portfolioValue365dAgo;
    const changeYearlyPercent = portfolioValue365dAgo > 0 ? (changeYearly / portfolioValue365dAgo) * 100 : 0;

    console.log(`✅ [Portfolio Analysis] Complete! Total value: $${totalValue.toFixed(2)}`);

    return {
      totalValue,
      totalCostBasis,
      totalGainLoss,
      totalGainLossPercent,
      change24h,
      change24hPercent,
      changeWeekly,
      changeWeeklyPercent,
      changeMonthly,
      changeMonthlyPercent,
      changeYearly,
      changeYearlyPercent,
      assets: assetPerformances.sort((a, b) => b.totalGainLossPercent - a.totalGainLossPercent)
    };
  }

  /**
   * Analyze a single asset with historical price data
   */
  private static async analyzeAsset(holding: any): Promise<AssetPerformance | null> {
    try {
      const symbol = holding.symbol;
      const quantity = holding.amount || holding.shares || 0;
      const entryPrice = holding.entryPoint || holding.entryPrice || holding.buyPrice || 0;
      const type = holding.type || (holding.amount ? 'crypto' : 'stock');

      // Get current price
      const currentData = await this.getCurrentPrice(symbol, type);
      if (!currentData) return null;

      const currentPrice = currentData.currentPrice;
      const currentValue = quantity * currentPrice;
      const costBasis = quantity * entryPrice;
      const totalGainLoss = currentValue - costBasis;
      const totalGainLossPercent = costBasis > 0 ? (totalGainLoss / costBasis) * 100 : 0;

      // Get historical prices for different timeframes
      const price24hAgo = await this.getHistoricalPrice(symbol, type, 1);
      const price7dAgo = await this.getHistoricalPrice(symbol, type, 7);
      const price30dAgo = await this.getHistoricalPrice(symbol, type, 30);
      const price365dAgo = await this.getHistoricalPrice(symbol, type, 365);

      // Calculate time-based changes
      const value24hAgo = quantity * (price24hAgo || currentPrice);
      const change24h = currentValue - value24hAgo;
      const change24hPercent = value24hAgo > 0 ? (change24h / value24hAgo) * 100 : 0;

      const value7dAgo = quantity * (price7dAgo || currentPrice);
      const changeWeekly = currentValue - value7dAgo;
      const changeWeeklyPercent = value7dAgo > 0 ? (changeWeekly / value7dAgo) * 100 : 0;

      const value30dAgo = quantity * (price30dAgo || currentPrice);
      const changeMonthly = currentValue - value30dAgo;
      const changeMonthlyPercent = value30dAgo > 0 ? (changeMonthly / value30dAgo) * 100 : 0;

      const value365dAgo = quantity * (price365dAgo || currentPrice);
      const changeYearly = currentValue - value365dAgo;
      const changeYearlyPercent = value365dAgo > 0 ? (changeYearly / value365dAgo) * 100 : 0;

      return {
        symbol,
        name: currentData.name || symbol,
        type: type as 'crypto' | 'stock',
        currentPrice,
        currentValue,
        quantity,
        costBasis,
        totalGainLoss,
        totalGainLossPercent,
        change24h,
        change24hPercent,
        changeWeekly,
        changeWeeklyPercent,
        changeMonthly,
        changeMonthlyPercent,
        changeYearly,
        changeYearlyPercent
      };
    } catch (error) {
      console.error(`Error analyzing asset ${holding.symbol}:`, error);
      return null;
    }
  }

  /**
   * Get current price for an asset
   */
  private static async getCurrentPrice(symbol: string, type: string): Promise<{ currentPrice: number; name: string } | null> {
    try {
      // Use absolute URL to work in both client and server contexts
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/market-data?symbol=${symbol}&type=${type}`, {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.warn(`Failed to fetch current price for ${symbol}: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (!data.currentPrice) {
        console.warn(`No current price data for ${symbol}`);
        return null;
      }
      
      return {
        currentPrice: data.currentPrice,
        name: data.name || symbol
      };
    } catch (error) {
      console.error(`Error fetching current price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get historical price for an asset (N days ago)
   */
  private static async getHistoricalPrice(symbol: string, type: string, daysAgo: number): Promise<number | null> {
    try {
      // For stocks, use Finnhub candles
      if (type === 'stock') {
        const to = Math.floor(Date.now() / 1000);
        const from = to - (daysAgo * 24 * 60 * 60);
        
        try {
          const candles = await this.finnhub.getCandles(symbol.toUpperCase(), 'D', from, to);
          
          if (candles && candles.c && candles.c.length > 0) {
            // Return the first available close price (closest to target date)
            return candles.c[0];
          }
        } catch (finnhubError) {
          console.warn(`Finnhub historical data failed for ${symbol}:`, finnhubError);
        }
      }

      // For crypto, try CoinGecko market chart
      if (type === 'crypto') {
        const coinId = symbol.toLowerCase() === 'btc' ? 'bitcoin' : 
                       symbol.toLowerCase() === 'eth' ? 'ethereum' : 
                       symbol.toLowerCase();

        try {
          const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${daysAgo}&interval=daily`,
            { 
              cache: 'no-store',
              headers: {
                'Accept': 'application/json',
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.prices && data.prices.length > 0) {
              // Return the first price point (oldest)
              return data.prices[0][1];
            }
          } else {
            console.warn(`CoinGecko API error for ${symbol}: ${response.status}`);
          }
        } catch (coingeckoError) {
          console.warn(`CoinGecko historical data failed for ${symbol}:`, coingeckoError);
        }
      }

      return null;
    } catch (error) {
      console.error(`Error fetching historical price for ${symbol} (${daysAgo}d ago):`, error);
      return null;
    }
  }

  /**
   * Format currency value
   */
  static formatCurrency(value: number): string {
    const absValue = Math.abs(value);
    if (absValue >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (absValue >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Format percentage with emoji
   */
  static formatPercentage(percent: number): string {
    const emoji = percent >= 0 ? '🟢' : '🔴';
    const sign = percent >= 0 ? '+' : '';
    return `${emoji} ${sign}${percent.toFixed(2)}%`;
  }

  /**
   * Format change with currency and percentage
   */
  static formatChange(value: number, percent: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${this.formatCurrency(value)} (${this.formatPercentage(percent)})`;
  }
}

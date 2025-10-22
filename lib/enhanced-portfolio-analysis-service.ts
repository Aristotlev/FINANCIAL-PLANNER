/**
 * Enhanced Portfolio Analysis Service
 * Provides detailed breakdown of portfolio performance including all timeframes:
 * 1h, 4h, 24h, 7d, 30d, 365d
 */

import { EnhancedTimeTrackingService, EnhancedTimeframeChanges } from './enhanced-time-tracking-service';
import { FinnhubAPI } from './api/finnhub-api';

export interface EnhancedAssetPerformance {
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
  
  // Enhanced time-based changes
  timeframeChanges: EnhancedTimeframeChanges;
}

export interface EnhancedPortfolioSummary {
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  
  // Enhanced time-based changes
  timeframeChanges: EnhancedTimeframeChanges;
  
  assets: EnhancedAssetPerformance[];
  topPerformers: EnhancedAssetPerformance[];
  bottomPerformers: EnhancedAssetPerformance[];
  
  // Analysis metadata
  analyzedAt: Date;
  totalAssets: number;
}

export class EnhancedPortfolioAnalysisService {
  private static finnhub = new FinnhubAPI({ 
    apiKey: process.env.NEXT_PUBLIC_FINNHUB_API_KEY || 'd3nbll9r01qo7510cpf0d3nbll9r01qo7510cpfg' 
  });

  /**
   * Get comprehensive portfolio analysis with all timeframes
   */
  static async analyzePortfolio(holdings: any[], userId: string): Promise<EnhancedPortfolioSummary> {
    if (!holdings || holdings.length === 0) {
      throw new Error('No holdings to analyze');
    }

    console.log(`📊 [Enhanced Portfolio Analysis] Starting analysis for ${holdings.length} holdings...`);

    const assetPerformances: EnhancedAssetPerformance[] = [];
    let totalValue = 0;
    let totalCostBasis = 0;

    // Analyze each holding
    for (const holding of holdings) {
      try {
        const performance = await this.analyzeAsset(holding);
        
        if (performance) {
          assetPerformances.push(performance);
          totalValue += performance.currentValue;
          totalCostBasis += performance.costBasis;
          
          console.log(`✅ [Enhanced Analysis] ${holding.symbol}: $${performance.currentValue.toFixed(2)}`);
        } else {
          console.warn(`⚠️ [Enhanced Analysis] Failed to analyze ${holding.symbol}`);
        }
      } catch (error) {
        console.error(`❌ [Enhanced Analysis] Error analyzing ${holding.symbol}:`, error);
      }
    }

    if (assetPerformances.length === 0) {
      throw new Error('Unable to analyze any holdings. Please check your data and try again.');
    }

    // Calculate portfolio-level timeframe changes
    const portfolioChanges = await EnhancedTimeTrackingService.calculatePortfolioTimeframeChanges(
      userId,
      totalValue
    );

    // Calculate total gains/losses
    const totalGainLoss = totalValue - totalCostBasis;
    const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

    // Sort and identify top/bottom performers
    const sortedByPerformance = [...assetPerformances].sort(
      (a, b) => b.totalGainLossPercent - a.totalGainLossPercent
    );

    console.log(`✅ [Enhanced Portfolio Analysis] Complete! Total value: $${totalValue.toFixed(2)}`);

    return {
      totalValue,
      totalCostBasis,
      totalGainLoss,
      totalGainLossPercent,
      timeframeChanges: portfolioChanges,
      assets: assetPerformances,
      topPerformers: sortedByPerformance.slice(0, 3),
      bottomPerformers: sortedByPerformance.slice(-3).reverse(),
      analyzedAt: new Date(),
      totalAssets: assetPerformances.length
    };
  }

  /**
   * Analyze a single asset with enhanced historical price data
   */
  private static async analyzeAsset(holding: any): Promise<EnhancedAssetPerformance | null> {
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

      // Calculate enhanced timeframe changes using the new service
      const timeframeChanges = await EnhancedTimeTrackingService.calculateAssetTimeframeChanges(
        symbol,
        type as 'crypto' | 'stock',
        currentPrice,
        quantity
      );

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
        timeframeChanges
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
   * Generate detailed portfolio report text
   */
  static generateDetailedReport(summary: EnhancedPortfolioSummary): string {
    const { totalValue, totalCostBasis, totalGainLoss, totalGainLossPercent, timeframeChanges, assets } = summary;
    
    let report = `AI Assistant\n📊 **Complete Portfolio Analysis**\n\n`;
    
    // Portfolio totals
    report += `💰 **Total Portfolio Value**: ${this.formatCurrency(totalValue)}\n`;
    report += `📈 **Total Cost Basis**: ${this.formatCurrency(totalCostBasis)}\n`;
    report += `${totalGainLoss >= 0 ? '🟢' : '🔴'} **Total P/L**: ${this.formatChange(totalGainLoss, totalGainLossPercent)}\n\n`;
    
    // Performance over time with ALL timeframes
    report += `⏱️ **Performance Over Time:**\n`;
    report += `• **1 Hour**: ${this.formatChange(timeframeChanges.change1h, timeframeChanges.change1hPercent)}\n`;
    report += `• **4 Hours**: ${this.formatChange(timeframeChanges.change4h, timeframeChanges.change4hPercent)}\n`;
    report += `• **24 Hours**: ${this.formatChange(timeframeChanges.change24h, timeframeChanges.change24hPercent)}\n`;
    report += `• **Weekly**: ${this.formatChange(timeframeChanges.change7d, timeframeChanges.change7dPercent)}\n`;
    report += `• **Monthly**: ${this.formatChange(timeframeChanges.change30d, timeframeChanges.change30dPercent)}\n`;
    report += `• **Yearly**: ${this.formatChange(timeframeChanges.change365d, timeframeChanges.change365dPercent)}\n\n`;
    
    // Asset breakdown
    report += `📋 **Asset Breakdown** (${assets.length} holdings):\n\n`;
    
    assets.forEach((asset, index) => {
      report += `**${index + 1}. ${asset.symbol}** (${asset.type.toUpperCase()})\n`;
      report += `💵 Current Value: ${this.formatCurrency(asset.currentValue)}\n`;
      report += `${asset.totalGainLoss >= 0 ? '🟢' : '🔴'} Total P/L: ${this.formatChange(asset.totalGainLoss, asset.totalGainLossPercent)}\n`;
      report += `📊 Performance:\n`;
      report += `• 1h: ${this.formatChange(asset.timeframeChanges.change1h, asset.timeframeChanges.change1hPercent)}\n`;
      report += `• 4h: ${this.formatChange(asset.timeframeChanges.change4h, asset.timeframeChanges.change4hPercent)}\n`;
      report += `• 24h: ${this.formatChange(asset.timeframeChanges.change24h, asset.timeframeChanges.change24hPercent)}\n`;
      report += `• Weekly: ${this.formatChange(asset.timeframeChanges.change7d, asset.timeframeChanges.change7dPercent)}\n`;
      report += `• Monthly: ${this.formatChange(asset.timeframeChanges.change30d, asset.timeframeChanges.change30dPercent)}\n`;
      report += `• Yearly: ${this.formatChange(asset.timeframeChanges.change365d, asset.timeframeChanges.change365dPercent)}\n\n`;
    });
    
    // Top performers
    if (summary.topPerformers.length > 0) {
      report += `🏆 **Top Performers:**\n`;
      summary.topPerformers.forEach((asset, index) => {
        const emoji = asset.totalGainLossPercent >= 0 ? '🟢' : '🔴';
        report += `${index + 1}. ${emoji} **${asset.symbol}**: ${this.formatPercentage(asset.totalGainLossPercent)}\n`;
      });
      report += `\n`;
    }
    
    // Recommendations
    report += `💡 **Recommendations:**\n`;
    report += `• Monitor your positions across multiple timeframes for better decision-making\n`;
    report += `• Short-term volatility (1h, 4h) can differ significantly from long-term trends\n`;
    report += `• Consider rebalancing if any position deviates significantly from your target allocation\n`;
    report += `• Review underperforming assets and consider whether they align with your investment thesis\n`;
    
    return report;
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

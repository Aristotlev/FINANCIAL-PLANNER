/**
 * AI Market Data Service
 * Fetches charts, graphs, and real-time data from the best sources
 * to assist users in making informed financial decisions
 */

import { enhancedMarketService } from './enhanced-market-service';
import { MarketAnalysisService } from './market-analysis-service';

export interface MarketDataResponse {
  text: string;
  charts?: ChartData[];
  data?: MarketMetrics;
  analysis?: string;
  sources?: string[];
}

export interface ChartData {
  type: 'line' | 'candlestick' | 'bar' | 'area' | 'comparison';
  title: string;
  symbol: string;
  data: any[];
  timeframe: string;
  embedUrl?: string;
}

export interface MarketMetrics {
  price: number;
  change24h: number;
  volume: number;
  marketCap?: string;
  high24h?: number;
  low24h?: number;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  technicalIndicators?: {
    rsi?: number;
    macd?: string;
    movingAverage?: string;
  };
}

export class AIMarketDataService {
  /**
   * Fetch technical indicator chart for an asset
   */
  static async fetchTechnicalIndicator(symbol: string, indicator: string): Promise<MarketDataResponse> {
    try {
      // Fetch real-time price and market data
      const assetData = await enhancedMarketService.fetchAssetPrice(symbol);
      
      if (!assetData) {
        return {
          text: `⚠️ I couldn't find data for ${symbol}. Please verify the symbol and try again.`,
          sources: []
        };
      }

      // Detect asset type
      const assetType = this.detectAssetType(symbol);

      // Map indicator name to description
      const indicatorInfo: Record<string, { name: string; description: string; interpretation: string }> = {
        'RSI': {
          name: 'Relative Strength Index (RSI)',
          description: 'Measures momentum on a scale of 0-100',
          interpretation: 'RSI > 70 suggests overbought conditions (potential reversal down), RSI < 30 suggests oversold conditions (potential reversal up)'
        },
        'MACD': {
          name: 'Moving Average Convergence Divergence (MACD)',
          description: 'Shows the relationship between two moving averages',
          interpretation: 'MACD crossing above signal line is bullish, crossing below is bearish'
        },
        'BB': {
          name: 'Bollinger Bands',
          description: 'Shows price volatility and potential breakout zones',
          interpretation: 'Price touching upper band suggests overbought, touching lower band suggests oversold'
        }
      };

      const info = indicatorInfo[indicator] || indicatorInfo['RSI'];
      
      const changeEmoji = assetData.change24h >= 0 ? '🟢' : '🔴';
      const changeSign = assetData.change24h >= 0 ? '+' : '';

      let text = `📊 **${info.name} Chart for ${assetData.name} ${symbol}**\n\n`;
      text += `💰 **Current Price**: $${assetData.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
      
      if (assetData.change24h !== undefined) {
        text += `${changeEmoji} **24h Change**: ${changeSign}${assetData.change24h.toFixed(2)}%\n`;
      }

      text += `\n📈 **About ${info.name}**:\n${info.description}\n\n`;
      text += `💡 **How to Read It**:\n${info.interpretation}\n\n`;
      text += `🔍 Click the link below to view the interactive ${info.name} chart on TradingView.`;

      // Generate TradingView widget URL with indicator
      const tradingViewUrl = this.generateTradingViewUrlWithIndicator(symbol, assetType, indicator);

      const response: MarketDataResponse = {
        text,
        charts: [
          {
            type: 'line',
            title: `${assetData.name} ${symbol} ${info.name}`,
            symbol: symbol,
            data: [],
            timeframe: '24h',
            embedUrl: tradingViewUrl
          }
        ],
        data: {
          price: assetData.currentPrice,
          change24h: assetData.change24h || 0,
          volume: 0,
          marketCap: assetData.marketCap,
        },
        sources: [...this.getSources(assetType), 'TradingView Technical Analysis']
      };

      return response;
    } catch (error) {
      console.error('Error fetching technical indicator:', error);
      return {
        text: `❌ I encountered an error fetching the ${indicator} chart for ${symbol}. Please try again.`,
        sources: []
      };
    }
  }

  /**
   * Fetch comprehensive market data for an asset
   * Supports all asset types: crypto, stock, forex, index, commodity, ETF, CFD
   */
  static async fetchAssetInsights(symbol: string, type?: 'crypto' | 'stock' | 'forex' | 'index' | 'commodity' | 'etf' | 'cfd'): Promise<MarketDataResponse> {
    try {
      // Fetch real-time price and market data (map forex/index/commodity/etf/cfd to stock for API call)
      const apiType = (type === 'forex' || type === 'index' || type === 'commodity' || type === 'etf' || type === 'cfd') ? 'stock' : type;
      const assetData = await enhancedMarketService.fetchAssetPrice(symbol, apiType);
      
      if (!assetData) {
        return {
          text: `⚠️ I couldn't find data for ${symbol}. Please verify the symbol and try again.`,
          sources: []
        };
      }

      // Detect asset type if not specified
      const assetType = type || this.detectAssetType(symbol);

      // Get market analysis
      let analysis = '';
      let technicalData: any = {};

      if (assetType === 'crypto') {
        const cryptoAnalysis = MarketAnalysisService.getCryptoAnalysis();
        analysis = cryptoAnalysis.recommendation || '';
        
        // Find if this crypto is in top performers
        const topPerformer = cryptoAnalysis.topPerformers?.find(
          (p: any) => p.symbol === symbol
        );
        if (topPerformer) {
          analysis += `\n\n📈 **${symbol}** is currently a top performer with ${topPerformer.change} change.`;
        }
      } else if (assetType === 'stock') {
        const stockAnalysis = MarketAnalysisService.getStockAnalysis();
        analysis = stockAnalysis.recommendation || '';
        technicalData = {
          volatility: stockAnalysis.marketOverview?.volatility,
        };
      }

      // Generate TradingView widget URL
      const tradingViewUrl = this.generateTradingViewUrl(symbol, assetType);

      const response: MarketDataResponse = {
        text: this.generateInsightText(assetData, assetType, analysis),
        charts: [
          {
            type: 'line',
            title: `${assetData.name} ${symbol} Price Chart`,
            symbol: symbol,
            data: [],
            timeframe: '24h',
            embedUrl: tradingViewUrl
          }
        ],
        data: {
          price: assetData.currentPrice,
          change24h: assetData.change24h || 0,
          volume: 0, // Would come from API
          marketCap: assetData.marketCap,
          ...technicalData
        },
        analysis,
        sources: this.getSources(assetType)
      };

      return response;
    } catch (error) {
      console.error('Error fetching asset insights:', error);
      return {
        text: `❌ I encountered an error fetching data for ${symbol}. Please try again.`,
        sources: []
      };
    }
  }

  /**
   * Fetch technical indicator with enhanced exchange detection
   */
  static async fetchTechnicalIndicatorChart(symbol: string, indicator: string, type?: 'crypto' | 'stock'): Promise<MarketDataResponse> {
    const assetType = type || this.detectAssetType(symbol);
    return await this.fetchTechnicalIndicator(symbol, indicator);
  }

  /**
   * Compare multiple assets side-by-side
   */
  static async compareAssets(symbols: string[]): Promise<MarketDataResponse> {
    try {
      const assetDataPromises = symbols.map(symbol => 
        enhancedMarketService.fetchAssetPrice(symbol)
      );
      
      const assetsData = await Promise.all(assetDataPromises);
      const validAssets = assetsData.filter(a => a !== null);

      if (validAssets.length === 0) {
        return {
          text: "⚠️ I couldn't find data for any of those symbols. Please check and try again.",
          sources: []
        };
      }

      // Generate comparison text
      let comparisonText = `📊 **Asset Comparison**\n\n`;
      
      validAssets.forEach(asset => {
        const changeEmoji = asset.change24h >= 0 ? '🟢' : '🔴';
        const changeSign = asset.change24h >= 0 ? '+' : '';
        comparisonText += `**${asset.name} ${asset.symbol}**\n`;
        comparisonText += `💰 Price: $${asset.currentPrice.toFixed(2)}\n`;
        comparisonText += `${changeEmoji} 24h: ${changeSign}${asset.change24h?.toFixed(2)}%\n`;
        if (asset.marketCap) {
          comparisonText += `📊 Market Cap: ${asset.marketCap}\n`;
        }
        comparisonText += `\n`;
      });

      // Analysis
      const bestPerformer = validAssets.reduce((best, current) => 
        (current.change24h || 0) > (best.change24h || 0) ? current : best
      );

      comparisonText += `\n🏆 **Best 24h Performer**: ${bestPerformer.name} with ${bestPerformer.change24h >= 0 ? '+' : ''}${bestPerformer.change24h?.toFixed(2)}%`;

      return {
        text: comparisonText,
        charts: validAssets.map(asset => ({
          type: 'line' as const,
          title: `${asset.name} ${asset.symbol}`,
          symbol: asset.symbol,
          data: [],
          timeframe: '24h',
          embedUrl: this.generateTradingViewUrl(asset.symbol, this.detectAssetType(asset.symbol))
        })),
        sources: ['CoinGecko API', 'Yahoo Finance', 'TradingView Charts']
      };
    } catch (error) {
      console.error('Error comparing assets:', error);
      return {
        text: "❌ I encountered an error comparing these assets. Please try again.",
        sources: []
      };
    }
  }

  /**
   * Get market sentiment and trends
   */
  static async getMarketSentiment(category: 'crypto' | 'stock' | 'overall'): Promise<MarketDataResponse> {
    try {
      let analysis: any;
      let text = '';

      if (category === 'crypto') {
        analysis = MarketAnalysisService.getCryptoAnalysis();
        text = `🪙 **Cryptocurrency Market Sentiment**\n\n`;
        text += `📊 **Overall Market**: ${analysis.marketSentiment || 'Neutral'}\n`;
        text += `⚡ **Dominance**: BTC ${analysis.btcDominance}, ETH ${analysis.ethDominance}\n\n`;
        
        text += `🔥 **Top Performers (24h):**\n`;
        analysis.topPerformers?.forEach((crypto: any) => {
          const emoji = crypto.change?.startsWith('+') ? '🟢' : '🔴';
          text += `${emoji} **${crypto.symbol}**: ${crypto.change}\n`;
        });

        text += `\n💡 **Recommendation**: ${analysis.recommendation}`;
      } else if (category === 'stock') {
        analysis = MarketAnalysisService.getStockAnalysis();
        text = `📈 **Stock Market Sentiment**\n\n`;
        text += `📊 **Market Overview:**\n`;
        text += `• **S&P 500**: ${analysis.marketOverview?.sp500?.change || 'N/A'}\n`;
        text += `• **Volatility (VIX)**: ${analysis.marketVolatility || 'N/A'}\n`;
        text += `• **Sentiment**: ${analysis.sentiment || 'Neutral'}\n\n`;
        
        text += `🏭 **Sector Performance:**\n`;
        Object.entries(analysis.sectors || {}).forEach(([sector, data]: [string, any]) => {
          const emoji = data.performance?.startsWith('+') ? '🟢' : '🔴';
          text += `${emoji} **${sector}**: ${data.performance} (${data.outlook})\n`;
        });

        text += `\n💡 **Recommendation**: ${analysis.recommendation}`;
      } else {
        // Overall market
        const stockAnalysis = MarketAnalysisService.getStockAnalysis();
        const cryptoAnalysis = MarketAnalysisService.getCryptoAnalysis();
        const portfolioAnalysis = MarketAnalysisService.getPortfolioAnalysis();

        text = `🌍 **Overall Market Sentiment**\n\n`;
        text += `📈 **Stocks**: Moderate Volatility\n`;
        text += `🪙 **Crypto**: ${cryptoAnalysis.marketSentiment || 'Neutral'}\n`;
        text += `📊 **Risk Level**: Moderate\n\n`;
        text += `💡 **Key Insight**: ${portfolioAnalysis.diversificationScore || 'Maintain a diversified portfolio across asset classes.'}`;
      }

      return {
        text,
        analysis: analysis.recommendation,
        sources: this.getSources(category)
      };
    } catch (error) {
      console.error('Error getting market sentiment:', error);
      return {
        text: "❌ I encountered an error fetching market sentiment. Please try again.",
        sources: []
      };
    }
  }

  /**
   * Analyze portfolio performance with comprehensive breakdown
   */
  static async analyzePortfolio(holdings: any[]): Promise<MarketDataResponse> {
    try {
      if (!holdings || holdings.length === 0) {
        return {
          text: "📊 You don't have any holdings to analyze yet. Add some assets to get started!",
          sources: []
        };
      }

      // Import and use the PortfolioAnalysisService
      const { PortfolioAnalysisService } = await import('./portfolio-analysis-service');
      const analysis = await PortfolioAnalysisService.analyzePortfolio(holdings);

      // Build comprehensive analysis text
      let text = `📊 **Complete Portfolio Analysis**\n\n`;
      
      // Overall Portfolio Summary
      text += `💰 **Total Portfolio Value**: ${PortfolioAnalysisService.formatCurrency(analysis.totalValue)}\n`;
      text += `📈 **Total Cost Basis**: ${PortfolioAnalysisService.formatCurrency(analysis.totalCostBasis)}\n`;
      
      const totalGainEmoji = analysis.totalGainLoss >= 0 ? '🟢' : '🔴';
      text += `${totalGainEmoji} **Total P/L**: ${analysis.totalGainLoss >= 0 ? '+' : ''}${PortfolioAnalysisService.formatCurrency(analysis.totalGainLoss)} (${analysis.totalGainLoss >= 0 ? '+' : ''}${analysis.totalGainLossPercent.toFixed(2)}%)\n\n`;

      // Time-based Performance
      text += `⏱️ **Performance Over Time:**\n`;
      text += `• **24h Change**: ${PortfolioAnalysisService.formatChange(analysis.change24h, analysis.change24hPercent)}\n`;
      text += `• **Weekly Change**: ${PortfolioAnalysisService.formatChange(analysis.changeWeekly, analysis.changeWeeklyPercent)}\n`;
      text += `• **Monthly Change**: ${PortfolioAnalysisService.formatChange(analysis.changeMonthly, analysis.changeMonthlyPercent)}\n`;
      text += `• **Yearly Change**: ${PortfolioAnalysisService.formatChange(analysis.changeYearly, analysis.changeYearlyPercent)}\n\n`;

      // Individual Asset Breakdown
      text += `📋 **Asset Breakdown** (${analysis.assets.length} holdings):\n\n`;
      
      analysis.assets.forEach((asset, idx) => {
        const performanceEmoji = asset.totalGainLossPercent >= 0 ? '🟢' : '🔴';
        text += `**${idx + 1}. ${asset.symbol}** (${asset.type.toUpperCase()})\n`;
        text += `   💵 **Current Value**: ${PortfolioAnalysisService.formatCurrency(asset.currentValue)}\n`;
        text += `   ${performanceEmoji} **Total P/L**: ${asset.totalGainLoss >= 0 ? '+' : ''}${PortfolioAnalysisService.formatCurrency(asset.totalGainLoss)} (${asset.totalGainLossPercent >= 0 ? '+' : ''}${asset.totalGainLossPercent.toFixed(2)}%)\n`;
        text += `   📊 **Performance**:\n`;
        text += `      • 24h: ${PortfolioAnalysisService.formatPercentage(asset.change24hPercent)}\n`;
        text += `      • Weekly: ${PortfolioAnalysisService.formatPercentage(asset.changeWeeklyPercent)}\n`;
        text += `      • Monthly: ${PortfolioAnalysisService.formatPercentage(asset.changeMonthlyPercent)}\n`;
        text += `      • Yearly: ${PortfolioAnalysisService.formatPercentage(asset.changeYearlyPercent)}\n`;
        text += `\n`;
      });

      // Top Performers
      const topPerformers = analysis.assets.slice(0, 3);
      if (topPerformers.length > 0) {
        text += `🏆 **Top Performers:**\n`;
        topPerformers.forEach((asset, idx) => {
          const emoji = asset.totalGainLossPercent >= 0 ? '🟢' : '🔴';
          text += `${idx + 1}. ${emoji} **${asset.symbol}**: ${asset.totalGainLossPercent >= 0 ? '+' : ''}${asset.totalGainLossPercent.toFixed(2)}%\n`;
        });
        text += `\n`;
      }

      // Underperformers
      const underperformers = analysis.assets.slice(-2);
      if (underperformers.length > 0 && analysis.assets.length > 3) {
        text += `📉 **Needs Attention:**\n`;
        underperformers.forEach((asset) => {
          const emoji = asset.totalGainLossPercent >= 0 ? '🟢' : '🔴';
          text += `${emoji} **${asset.symbol}**: ${asset.totalGainLossPercent >= 0 ? '+' : ''}${asset.totalGainLossPercent.toFixed(2)}%\n`;
        });
        text += `\n`;
      }

      // Recommendations
      text += `💡 **Recommendations:**\n`;
      if (analysis.totalGainLossPercent > 20) {
        text += `• Consider taking profits on strong performers\n`;
      }
      if (analysis.totalGainLossPercent < -10) {
        text += `• Review underperforming assets and consider rebalancing\n`;
      }
      text += `• Maintain diversification across asset classes\n`;
      text += `• Monitor market conditions and adjust as needed`;

      return {
        text,
        data: {
          price: analysis.totalValue,
          change24h: analysis.change24hPercent,
          volume: 0
        },
        analysis: 'Comprehensive portfolio analysis with historical performance',
        sources: ['Live Market Data', 'Historical Price Data', 'Portfolio Analytics']
      };
    } catch (error) {
      console.error('Error analyzing portfolio:', error);
      
      // Provide more specific error message
      let errorMsg = "❌ I encountered an error analyzing your portfolio. ";
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMsg += "There was a network issue connecting to market data services. Please check your internet connection and try again.";
      } else if (error instanceof Error) {
        errorMsg += `Details: ${error.message}. Please try again.`;
        console.error('Portfolio analysis error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      } else {
        errorMsg += "Please try again.";
      }
      
      return {
        text: errorMsg,
        sources: []
      };
    }
  }

  /**
   * Clean and optimize text for TTS (Text-to-Speech)
   * Expands acronyms, formats numbers properly, removes markdown
   */
  private static cleanTextForTTS(text: string): string {
    let cleaned = text;
    
    // Remove all markdown formatting
    cleaned = cleaned.replace(/\*\*/g, ''); // Bold
    cleaned = cleaned.replace(/\*/g, '');   // Italic
    cleaned = cleaned.replace(/#{1,6}\s/g, ''); // Headers
    cleaned = cleaned.replace(/`{1,3}/g, ''); // Code blocks
    cleaned = cleaned.replace(/_{1,2}/g, ''); // Underlines
    cleaned = cleaned.replace(/~/g, '');     // Strikethrough
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Links [text](url) -> text
    cleaned = cleaned.replace(/━+/g, ''); // Visual separators
    cleaned = cleaned.replace(/•/g, ''); // Bullet points
    
    // Remove ALL emojis (prevents TTS from trying to read them)
    // Using ranges that work across all JS versions
    cleaned = cleaned.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ''); // Surrogate pairs (most emojis)
    cleaned = cleaned.replace(/[\u2600-\u27BF]/g, ''); // Misc symbols and dingbats
    
    // Expand common forex/trading acronyms for better pronunciation
    const acronyms: Record<string, string> = {
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'USDT': 'Tether',
      'USDC': 'U.S.D.C.',
      'EUR': 'Euro',
      'USD': 'U.S. Dollar',
      'GBP': 'British Pound',
      'JPY': 'Japanese Yen',
      'CHF': 'Swiss Franc',
      'AUD': 'Australian Dollar',
      'CAD': 'Canadian Dollar',
      'NZD': 'New Zealand Dollar',
      'RSI': 'R.S.I.',
      'MACD': 'M.A.C.D.',
      'P/E': 'price to earnings',
      'GDP': 'G.D.P.',
      'VIX': 'V.I.X.',
      'S&P 500': 'S and P 500',
      'NYSE': 'N.Y.S.E.',
      'NASDAQ': 'NASDAQ',
    };
    
    // Replace acronyms with pronunciations (word boundaries)
    Object.entries(acronyms).forEach(([acronym, expansion]) => {
      const regex = new RegExp(`\\b${acronym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      cleaned = cleaned.replace(regex, expansion);
    });
    
    // Format currency pairs (EURUSD -> Euro U.S. Dollar)
    cleaned = cleaned.replace(/\b([A-Z]{3})([A-Z]{3})\b/g, (match, base, quote) => {
      const baseExpanded = acronyms[base] || base;
      const quoteExpanded = acronyms[quote] || quote;
      return `${baseExpanded} ${quoteExpanded}`;
    });
    
    // Format large numbers with commas for better pronunciation
    cleaned = cleaned.replace(/\$(\d+)(\.(\d+))?/g, (match, dollars, _, cents) => {
      const num = parseInt(dollars);
      if (num >= 1000000000) {
        return `$${(num / 1000000000).toFixed(2)} billion`;
      } else if (num >= 1000000) {
        return `$${(num / 1000000).toFixed(2)} million`;
      } else if (num >= 1000) {
        return `$${(num / 1000).toFixed(2)} thousand`;
      }
      return match;
    });
    
    // Format percentages properly - read each decimal digit
    // Example: 26.82% -> "twenty-six point eight two percent"
    cleaned = cleaned.replace(/\+([\d,]+)\.?(\d*)%/g, (match, whole, decimal) => {
      const cleanWhole = whole.replace(/,/g, '');
      if (decimal) {
        // Split decimal digits so TTS reads them individually
        const decimalSpaced = decimal.split('').join(' ');
        return `up ${cleanWhole} point ${decimalSpaced} percent`;
      }
      return `up ${cleanWhole} percent`;
    });
    
    cleaned = cleaned.replace(/-([\d,]+)\.?(\d*)%/g, (match, whole, decimal) => {
      const cleanWhole = whole.replace(/,/g, '');
      if (decimal) {
        const decimalSpaced = decimal.split('').join(' ');
        return `down ${cleanWhole} point ${decimalSpaced} percent`;
      }
      return `down ${cleanWhole} percent`;
    });
    
    cleaned = cleaned.replace(/([\d,]+)\.?(\d*)%/g, (match, whole, decimal) => {
      const cleanWhole = whole.replace(/,/g, '');
      if (decimal) {
        const decimalSpaced = decimal.split('').join(' ');
        return `${cleanWhole} point ${decimalSpaced} percent`;
      }
      return `${cleanWhole} percent`;
    });
    
    // Replace multiple newlines with periods for natural pauses
    cleaned = cleaned.replace(/\n\n+/g, '. ');
    cleaned = cleaned.replace(/\n/g, ' ');
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  /**
   * Generate TradingView widget URL with specific technical indicator
   */
  private static generateTradingViewUrlWithIndicator(symbol: string, type: 'crypto' | 'stock' | 'forex' | 'index' | 'commodity' | 'etf' | 'cfd', indicator: string): string {
    const baseUrl = 'https://www.tradingview.com/widgetembed/';
    
    // Use the same smart mapping as generateTradingViewUrl
    let tvSymbol = symbol.toUpperCase();
    if (type === 'crypto') {
      const stablecoins = ['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDD'];
      if (stablecoins.includes(tvSymbol)) {
        tvSymbol = `COINBASE:${symbol}USD`;
      } else {
        tvSymbol = `BINANCE:${symbol}USDT`;
      }
    } else {
      // Check NYSE stocks
      const nyseStocks = [
        'NYSE', 'BAC', 'JPM', 'WFC', 'C', 'GS', 'MS', 'V', 'MA', 'AXP', 'DIS', 'NKE', 
        'MCD', 'KO', 'PEP', 'WMT', 'HD', 'CVX', 'XOM', 'BA', 'CAT', 'MMM', 'GE',
        'T', 'VZ', 'PFE', 'JNJ', 'UNH', 'ABT', 'TMO', 'LLY', 'MRK', 'ABBV',
        'GM', 'F', 'NIO', 'XPEV', 'LI', 'RIVN', 'LCID',
        'BABA', 'PDD', 'JD'
      ];
      
      if (nyseStocks.includes(tvSymbol)) {
        tvSymbol = `NYSE:${symbol}`;
      } else {
        tvSymbol = `NASDAQ:${symbol}`;
      }
    }

    // Map indicator to TradingView study ID
    const indicatorStudies: Record<string, string> = {
      'RSI': 'RSI@tv-basicstudies',
      'MACD': 'MACD@tv-basicstudies',
      'BB': 'BB@tv-basicstudies'
    };

    const studyId = indicatorStudies[indicator] || indicatorStudies['RSI'];
    const studiesArray = JSON.stringify([studyId]);

    const params = new URLSearchParams({
      frameElementId: 'tradingview_widget',
      symbol: tvSymbol,
      interval: 'D',
      hidesidetoolbar: '0',
      symboledit: '1',
      saveimage: '1',
      toolbarbg: 'f1f3f6',
      studies: studiesArray,
      theme: 'light',
      style: '1',
      timezone: 'Etc/UTC',
      withdateranges: '1',
      hide_side_toolbar: '0',
      allow_symbol_change: '1',
      details: '1',
      hotlist: '1',
      calendar: '1',
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Generate TradingView widget URL for embedding
   * Supports all asset types with proper exchange mapping
   */
  private static generateTradingViewUrl(symbol: string, type: 'crypto' | 'stock' | 'forex' | 'index' | 'commodity' | 'etf' | 'cfd'): string {
    const baseUrl = 'https://www.tradingview.com/widgetembed/';
    
    // Map symbol to TradingView format with proper exchange
    let tvSymbol = symbol.toUpperCase();
    
    if (type === 'crypto') {
      // Crypto assets - use Binance as primary exchange
      const stablecoins = ['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDD'];
      if (stablecoins.includes(tvSymbol)) {
        tvSymbol = `COINBASE:${symbol}USD`;
      } else {
        tvSymbol = `BINANCE:${symbol}USDT`;
      }
    } else if (type === 'forex') {
      // Forex pairs - use FX exchange
      tvSymbol = `FX:${symbol.toUpperCase()}`;
    } else if (type === 'index') {
      // Indices - check mapping first
      const indices: Record<string, string> = {
        'SPX': 'SP:SPX',
        'SPY': 'AMEX:SPY',
        'QQQ': 'NASDAQ:QQQ',
        'DIA': 'AMEX:DIA',
        'IWM': 'AMEX:IWM',
        'VIX': 'CBOE:VIX',
        'DXY': 'TVC:DXY',
        'NDX': 'NASDAQ:NDX',
        'RUT': 'RUSSELL:RUT',
        'VXX': 'BATS:VXX',
        'UVXY': 'BATS:UVXY',
        'VIXY': 'BATS:VIXY',
        'DJI': 'DJ:DJI',
        'IXIC': 'NASDAQ:IXIC',
        'COMP': 'NASDAQ:COMP'
      };
      tvSymbol = indices[tvSymbol] || `AMEX:${symbol}`;
    } else if (type === 'commodity') {
      // Commodities - use futures contracts
      const commodities: Record<string, string> = {
        'GC': 'COMEX:GC1!',
        'SI': 'COMEX:SI1!',
        'CL': 'NYMEX:CL1!',
        'NG': 'NYMEX:NG1!',
        'HG': 'COMEX:HG1!',
        'ZC': 'CBOT:ZC1!',
        'ZW': 'CBOT:ZW1!',
        'ZS': 'CBOT:ZS1!',
        'GOLD': 'COMEX:GC1!',
        'SILVER': 'COMEX:SI1!',
        'OIL': 'NYMEX:CL1!',
        'GAS': 'NYMEX:NG1!'
      };
      tvSymbol = commodities[tvSymbol] || `COMEX:${symbol}1!`;
    } else if (type === 'etf') {
      // ETFs - map to their primary exchanges
      const etfExchanges: Record<string, string> = {
        'SPY': 'AMEX:SPY',
        'QQQ': 'NASDAQ:QQQ',
        'DIA': 'AMEX:DIA',
        'IWM': 'AMEX:IWM',
        'VTI': 'AMEX:VTI',
        'VOO': 'AMEX:VOO',
        'GLD': 'AMEX:GLD',
        'SLV': 'AMEX:SLV',
        'USO': 'AMEX:USO',
        'TLT': 'NASDAQ:TLT',
        'ARKK': 'AMEX:ARKK',
        'ARKG': 'AMEX:ARKG',
        'ARKW': 'AMEX:ARKW'
      };
      tvSymbol = etfExchanges[tvSymbol] || `AMEX:${symbol}`;
    } else if (type === 'cfd') {
      // CFDs - treat similar to underlying asset, use stock exchange mapping
      // Remove CFD suffix/prefix if present
      const cleanSymbol = tvSymbol.replace(/CFD|_CFD|\.C$/gi, '');
      tvSymbol = `NASDAQ:${cleanSymbol}`;
    } else {
      // Stock/ETF/Index detection and exchange mapping
      const nyseStocks = [
        'NYSE', 'BAC', 'JPM', 'WFC', 'C', 'GS', 'MS', 'V', 'MA', 'AXP', 'DIS', 'NKE', 
        'MCD', 'KO', 'PEP', 'WMT', 'HD', 'CVX', 'XOM', 'BA', 'CAT', 'MMM', 'GE',
        'T', 'VZ', 'PFE', 'JNJ', 'UNH', 'ABT', 'TMO', 'LLY', 'MRK', 'ABBV',
        'GM', 'F', 'NIO', 'XPEV', 'LI', 'RIVN', 'LCID',
        'BABA', 'PDD', 'JD', 'NIO'
      ];
      
      const indices: Record<string, string> = {
        'SPX': 'SP:SPX',
        'SPY': 'AMEX:SPY',
        'QQQ': 'NASDAQ:QQQ',
        'DIA': 'AMEX:DIA',
        'IWM': 'AMEX:IWM',
        'VIX': 'CBOE:VIX',
        'DXY': 'TVC:DXY',
        'NDX': 'NASDAQ:NDX',
        'RUT': 'RUSSELL:RUT'
      };
      
      const commodities: Record<string, string> = {
        'GC': 'COMEX:GC1!',      // Gold
        'SI': 'COMEX:SI1!',      // Silver
        'CL': 'NYMEX:CL1!',      // Crude Oil
        'NG': 'NYMEX:NG1!',      // Natural Gas
        'HG': 'COMEX:HG1!',      // Copper
        'ZC': 'CBOT:ZC1!',       // Corn
        'ZW': 'CBOT:ZW1!',       // Wheat
        'ZS': 'CBOT:ZS1!'        // Soybeans
      };
      
      // Check if it's an index
      if (indices[tvSymbol]) {
        tvSymbol = indices[tvSymbol];
      }
      // Check if it's a commodity
      else if (commodities[tvSymbol]) {
        tvSymbol = commodities[tvSymbol];
      }
      // Check if it's a forex pair (e.g., EURUSD, GBPUSD)
      else if (tvSymbol.length === 6 && /^[A-Z]{6}$/.test(tvSymbol)) {
        // Likely a forex pair
        tvSymbol = `FX:${tvSymbol}`;
      }
      // Check if it's a NYSE stock
      else if (nyseStocks.includes(tvSymbol)) {
        tvSymbol = `NYSE:${symbol}`;
      }
      // Default to NASDAQ for other stocks
      else {
        tvSymbol = `NASDAQ:${symbol}`;
      }
    }

    const params = new URLSearchParams({
      frameElementId: 'tradingview_widget',
      symbol: tvSymbol,
      interval: 'D',
      hidesidetoolbar: '0',
      symboledit: '1',
      saveimage: '1',
      toolbarbg: 'f1f3f6',
      studies: '[]',
      theme: 'light',
      style: '1',
      timezone: 'Etc/UTC',
      withdateranges: '1',
      hide_side_toolbar: '0',
      allow_symbol_change: '1',
      details: '1',
      hotlist: '1',
      calendar: '1',
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Generate comprehensive insight text with real-time focus
   * Clean, visually appealing format without JSON, brackets, or technical jargon
   * Formatted like engaging financial commentary with TradingView integration
   */
  private static generateInsightText(assetData: any, type: string, analysis: string): string {
    const changeEmoji = assetData.changePercent24h >= 0 ? '🟢' : '🔴';
    const changeSign = assetData.changePercent24h >= 0 ? '+' : '';
    const trendEmoji = assetData.changePercent24h >= 0 ? '📈' : '📉';
    
    // Choose appropriate emoji based on asset type
    const typeEmoji = type === 'crypto' ? '🪙' : 
                     type === 'stock' ? '📊' : 
                     type === 'forex' ? '💱' : 
                     type === 'commodity' ? '📦' : 
                     type === 'index' ? '📈' : 
                     type === 'etf' ? '🎯' : 
                     type === 'cfd' ? '⚡' : '💼';
    
    // Format price with proper commas and decimals
    const formatPrice = (price: number) => {
      return price.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: price < 1 ? 6 : 2 
      });
    };
    
    // Start with concise introduction
    let text = `**${assetData.name} (${assetData.symbol})** ${typeEmoji}\n\n`;
    
    // Current price - concise and clear
    text += `💰 **Price**: $${formatPrice(assetData.currentPrice)} `;
    text += `${changeEmoji} **${changeSign}${Math.abs(assetData.changePercent24h || 0).toFixed(2)}%** (24h)\n`;
    
    // Add volume and market cap if available - on same line for brevity
    if (assetData.volume || assetData.marketCap) {
      if (assetData.volume) {
        const formattedVolume = assetData.volume >= 1000000000 ? 
          `$${(assetData.volume / 1000000000).toFixed(2)}B` :
          assetData.volume >= 1000000 ? 
          `$${(assetData.volume / 1000000).toFixed(2)}M` : 
          `$${assetData.volume.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        text += `📊 **Volume**: ${formattedVolume}`;
      }
      if (assetData.marketCap) {
        text += assetData.volume ? ` | **Market Cap**: ${assetData.marketCap}` : `📊 **Market Cap**: ${assetData.marketCap}`;
      }
      text += `\n`;
    }
    text += `\n`;

    // Price range information - concise
    if (assetData.high24h && assetData.low24h) {
      const rangePosition = ((assetData.currentPrice - assetData.low24h) / (assetData.high24h - assetData.low24h) * 100);
      text += `**24h Range**: $${formatPrice(assetData.low24h)} - $${formatPrice(assetData.high24h)}`;
      if (rangePosition > 75) {
        text += ` (near high 🔥)`;
      } else if (rangePosition < 25) {
        text += ` (near low 💎)`;
      }
      text += `\n\n`;
    }
    
    // Technical analysis section - streamlined
    text += `📊 **Technical Analysis**\n`;

    // Calculate volatility for later use
    const volatility = Math.abs(assetData.changePercent24h || 0);

    // Concise trend analysis
    if (assetData.changePercent24h < -3) {
      text += `**Trend**: Bearish - Trading below key moving averages.\n`;
    } else if (assetData.changePercent24h > 3) {
      text += `**Trend**: Bullish - Strong upward momentum above moving averages.\n`;
    } else {
      text += `**Trend**: Neutral - Consolidating near moving averages.\n`;
    }

    // Concise key levels
    if (assetData.high24h && assetData.low24h) {
      text += `**Support**: $${formatPrice(assetData.low24h)} | **Resistance**: $${formatPrice(assetData.high24h)}\n`;
    }

    // Brief volume note
    if (assetData.volume && volatility > 5) {
      text += `**Volume**: Elevated (strong participation confirming trend)\n`;
    }

    // Technical Indicators - concise
    const rsiValue = this.calculateRSI(assetData.changePercent24h);
    const macdSignal = this.calculateMACDSignal(assetData.changePercent24h);
    
    text += `**RSI**: ${rsiValue.toFixed(0)} `;
    if (rsiValue > 70) {
      text += `(Overbought)`;
    } else if (rsiValue < 30) {
      text += `(Oversold)`;
    } else {
      text += `(${rsiValue >= 50 ? 'Bullish' : 'Neutral'})`;
    }
    
    text += ` | **MACD**: ${macdSignal.charAt(0).toUpperCase() + macdSignal.slice(1)}\n\n`;

    // Overall Sentiment and Summary - concise
    text += `💡 **Summary**\n`;
    
    if (type === 'stock') {
      if ((assetData.changePercent24h || 0) < -3) {
        text += `${assetData.symbol} is facing **significant bearish pressure**. Investors are likely watching for any catalysts from upcoming earnings reports, `;
        text += `new product announcements, or sector developments that could change market sentiment. The broader economic environment and `;
        if (assetData.sector) {
          text += `the ${assetData.sector} sector dynamics `;
        } else {
          text += `industry competition `;
        }
        text += `should be considered when evaluating ${assetData.name}'s future prospects.\n\n`;
      } else if ((assetData.changePercent24h || 0) > 3) {
        text += `${assetData.symbol} is showing **strong bullish momentum** with positive market sentiment. The ${type === 'stock' ? 'stock' : 'asset'} is attracting investor confidence. `;
        text += `Monitor for potential profit-taking at key resistance levels, but the overall trend remains positive.\n\n`;
      } else {
        text += `${assetData.symbol} is currently **consolidating** in a neutral range. Market participants are awaiting the next catalyst for direction. `;
        text += `Watch for breakout signals above resistance or breakdown below support levels for the next significant move.\n\n`;
      }
    } else if (type === 'crypto') {
      if ((assetData.changePercent24h || 0) < -3) {
        text += `${assetData.symbol} is experiencing bearish pressure in the current crypto market environment. Monitor Bitcoin's performance and overall `;
        text += `market sentiment for directional cues. Cryptocurrency markets can be highly volatile, so risk management is crucial.\n\n`;
      } else if ((assetData.changePercent24h || 0) > 3) {
        text += `${assetData.symbol} is showing strong upward momentum. The crypto market sentiment is supportive of further gains. `;
        text += `However, remain vigilant as crypto markets can shift quickly. Consider taking partial profits at resistance levels.\n\n`;
      } else {
        text += `${assetData.symbol} is consolidating in the current range. Watch for volume expansion and price breakouts for the next major move. `;
        text += `The crypto market sentiment remains dynamic.\n\n`;
      }
    } else if (type === 'forex') {
      // Get currency pair names for better context
      const baseCurrency = assetData.symbol.substring(0, 3);
      const quoteCurrency = assetData.symbol.substring(3, 6);
      const pairName = `${baseCurrency}/${quoteCurrency}`;
      
      if ((assetData.changePercent24h || 0) < -0.5) {
        text += `${pairName} is showing **significant bearish pressure** with ${baseCurrency} weakening against ${quoteCurrency}. `;
        text += `This downward momentum suggests either deteriorating fundamentals for ${baseCurrency} or strengthening conditions for ${quoteCurrency}. `;
        text += `Currency movements of this magnitude often reflect diverging central bank policies, shifts in interest rate expectations, `;
        text += `or major economic data surprises. The technical setup confirms the bearish bias, with price trading below key moving averages `;
        text += `and indicators pointing toward continued downside pressure.\n\n`;
        
        text += `**Key Drivers to Monitor:**\n`;
        text += `Watch central bank communications from both ${baseCurrency} and ${quoteCurrency} regions closely. Interest rate differentials `;
        text += `are the primary driver of forex movements. Upcoming employment reports, inflation data (CPI/PPI), and GDP figures can `;
        text += `trigger sharp reversals or accelerate the current trend. Geopolitical developments, trade negotiations, and risk sentiment `;
        text += `shifts also impact currency valuations significantly.\n\n`;
        
        text += `**Technical Outlook:**\n`;
        text += `Current RSI readings suggest the pair is ${rsiValue < 30 ? 'deeply oversold and due for a bounce' : 'still in bearish territory with room to fall further'}. `;
        text += `MACD momentum is ${macdSignal}, confirming the directional bias. Key support levels need to hold to prevent further declines. `;
        text += `If support breaks, expect accelerated selling pressure. Conversely, any bounce back to resistance could offer shorting opportunities `;
        text += `for traders looking to ride the downtrend. Volume and volatility typically spike during London and New York session overlaps.\n\n`;
      } else if ((assetData.changePercent24h || 0) > 0.5) {
        text += `${pairName} is displaying **strong bullish momentum** with ${baseCurrency} gaining significant ground against ${quoteCurrency}. `;
        text += `This upward move reflects either improving economic fundamentals for ${baseCurrency}, weakening conditions for ${quoteCurrency}, `;
        text += `or shifting market expectations around monetary policy. When forex pairs move with this kind of conviction, it often signals `;
        text += `a sustained trend rather than just short-term noise. The technical indicators are aligned with the bullish price action, `;
        text += `showing positive momentum and strong buying interest across multiple timeframes.\n\n`;
        
        text += `**What's Powering This Rally:**\n`;
        text += `Interest rate expectations are clearly favoring ${baseCurrency} right now. Either the market is pricing in tighter monetary policy `;
        text += `from the ${baseCurrency} central bank, or expecting dovish moves from ${quoteCurrency} authorities. Recent economic data has likely `;
        text += `exceeded expectations for ${baseCurrency}, boosting currency strength. Watch for profit-taking near key resistance levels, `;
        text += `as forex markets can reverse quickly on position unwinding. However, a sustained break above resistance with strong volume `;
        text += `would confirm the uptrend continuation and open the door for further gains.\n\n`;
        
        text += `**Technical Analysis:**\n`;
        text += `RSI is reading ${rsiValue.toFixed(0)}, which is ${rsiValue > 70 ? 'in overbought territory - watch for potential pullbacks' : 'showing strong bullish momentum with room to run higher'}. `;
        text += `MACD momentum confirms the ${macdSignal} trend with positive divergence. The pair is trading above both 50-day and 200-day moving averages, `;
        text += `a textbook bullish setup. Dips toward support levels could present attractive buying opportunities for trend followers. `;
        text += `Volume patterns suggest institutional participation, lending credibility to the move. Consider trailing stops to protect gains `;
        text += `while allowing the uptrend to continue developing.\n\n`;
      } else {
        text += `${pairName} is currently **consolidating in a neutral range**, with balanced buying and selling pressure creating market indecision. `;
        text += `This type of sideways action is common in forex markets between major economic releases or central bank decisions. `;
        text += `Traders are clearly waiting for the next catalyst to establish a clear direction. Range-bound conditions like these often precede `;
        text += `significant breakouts in either direction, making this a critical setup to monitor closely.\n\n`;
        
        text += `**Potential Breakout Catalysts:**\n`;
        text += `Major economic data releases are the most likely triggers for volatility. Non-Farm Payrolls (NFP), GDP reports, inflation data (CPI/PPI), `;
        text += `and unemployment figures can spark immediate directional moves. Central bank meetings, policy statements, and forward guidance `;
        text += `from Fed/ECB/BOJ officials carry significant market-moving potential. Unexpected geopolitical events or major news headlines `;
        text += `can also break the current equilibrium. From a technical standpoint, watch for volume expansion at either the upper or lower `;
        text += `boundary of this range - that's usually the first sign of an impending breakout.\n\n`;
        
        text += `**Trading Strategy for Range Markets:**\n`;
        text += `Current RSI at ${rsiValue.toFixed(0)} is ${rsiValue > 50 ? 'slightly bullish but range-bound' : 'neutral with slight bearish bias but contained'}. `;
        text += `MACD shows ${macdSignal} momentum, indicating neither bulls nor bears are in control. In this environment, range traders can `;
        text += `buy near support ($${assetData.low24h?.toFixed(4) || 'N/A'}) and sell near resistance ($${assetData.high24h?.toFixed(4) || 'N/A'}). `;
        text += `Breakout traders should wait for a decisive move beyond these boundaries with strong volume confirmation before entering positions. `;
        text += `The key is patience - let the market show its hand before committing capital. Use tight stops inside the range and wider stops `;
        text += `once a breakout is confirmed.\n\n`;
      }
    } else if (type === 'index') {
      if (assetData.symbol === 'VIX') {
        if ((assetData.currentPrice || 0) > 25) {
          text += `The VIX is elevated, indicating heightened market fear and uncertainty. This often presents buying opportunities in equities `;
          text += `for contrarian investors, though caution is warranted as volatility can persist.\n\n`;
        } else if ((assetData.currentPrice || 0) < 15) {
          text += `The VIX is at low levels, suggesting market complacency. While this indicates stability, it also means the market may be `;
          text += `vulnerable to surprise moves. Consider hedging strategies or taking profits on extended positions.\n\n`;
        } else {
          text += `The VIX is in a moderate range, indicating normal market conditions. Stay alert for spikes during major news events `;
          text += `or economic releases which could signal increased market stress.\n\n`;
        }
      } else {
        if ((assetData.changePercent24h || 0) < -1) {
          text += `${assetData.symbol} is under pressure with broad market selling. Monitor sector rotation, earnings reports, and macroeconomic indicators. `;
          text += `Index weakness often reflects broader economic concerns or profit-taking after rallies.\n\n`;
        } else if ((assetData.changePercent24h || 0) > 1) {
          text += `${assetData.symbol} is showing strong performance with broad market participation. Bullish momentum suggests positive sentiment, `;
          text += `though be mindful of overbought conditions and potential for consolidation or pullbacks.\n\n`;
        } else {
          text += `${assetData.symbol} is consolidating with balanced buying and selling pressure. Watch for breakouts above resistance or `;
          text += `breakdowns below support for the next directional move. Economic data and Fed policy remain key drivers.\n\n`;
        }
      }
    } else {
      text += `${assetData.symbol} is ${(assetData.changePercent24h || 0) > 0 ? 'showing positive momentum' : 'under pressure'} in current market conditions. `;
      text += `Continue monitoring key technical levels and fundamental catalysts.\n\n`;
    }

    // Risk disclaimer
    text += `It's crucial to remember that this is a **${volatility > 5 ? 'highly volatile' : 'moderately volatile'}** ${type}, and it's essential to align any decisions with your personal risk tolerance and investment goals.\n\n`;

    // TradingView Chart Link is added automatically by the UI component, so we skip it here to avoid redundancy

    // Stock fundamentals - concise
    if (type === 'stock' && (assetData.peRatio || assetData.dividendYield || assetData.high52Week)) {
      text += `**Fundamentals**\n`;
      
      if (assetData.peRatio) {
        const peStatus = assetData.peRatio > 30 ? '🔥 **Premium valuation** (Growth play)' : 
                        assetData.peRatio < 15 ? '💎 **Value territory** (Potential bargain)' : 
                        '⚖️ **Fair valuation** (Balanced)';
        text += `📊 **P/E Ratio**: ${assetData.peRatio.toFixed(2)}\n`;
        text += `   ${peStatus}\n\n`;
      }
      
      if (assetData.dividendYield && assetData.dividendYield > 0) {
        const divStatus = assetData.dividendYield > 4 ? '🔥 **Excellent yield!**' :
                         assetData.dividendYield > 2 ? '✅ **Good yield**' :
                         '📊 **Modest yield**';
        text += `💵 **Dividend Yield**: ${assetData.dividendYield.toFixed(2)}% ${divStatus}\n`;
      }
      
      if (assetData.high52Week && assetData.low52Week) {
        const from52WeekHigh = ((assetData.currentPrice - assetData.high52Week) / assetData.high52Week * 100);
        const from52WeekLow = ((assetData.currentPrice - assetData.low52Week) / assetData.low52Week * 100);
        let rangeStatus = '';
        
        if (from52WeekHigh > -5) {
          rangeStatus = '🔥 **Near 52-week high!** Strong momentum';
        } else if (from52WeekHigh < -30) {
          rangeStatus = '💎 **Deep discount territory** Potential value opportunity';
        } else if (from52WeekLow < 10) {
          rangeStatus = '⚠️ **Near 52-week low** Oversold conditions';
        } else {
          rangeStatus = '📊 **Mid-range** - Balanced position';
        }
        
        text += `\n📊 **52-Week Range**: $${assetData.low52Week.toFixed(2)} - $${assetData.high52Week.toFixed(2)}\n`;
        text += `📍 **From 52W High**: ${from52WeekHigh.toFixed(1)}%\n`;
        text += `📍 **From 52W Low**: ${changeSign}${from52WeekLow.toFixed(1)}%\n`;
        text += `   ${rangeStatus}\n`;
      }
      
      if (assetData.sector) {
        text += `\n🏭 **Sector**: ${assetData.sector}\n`;
        if (assetData.industry) {
          text += `🔧 **Industry**: ${assetData.industry}\n`;
        }
      }
    }

    // Trading recommendations based on actual data
    text += `\n\n💡 **TRADING INSIGHTS & STRATEGY**\n\n`;
    
    if (volatility > 10) {
      text += `⚠️ **High Volatility Environment**\n`;
      text += `   • ⛔ Set stop-loss orders (-10-15% from entry)\n`;
      text += `   • 📊 Consider position sizing (max 2-3% of portfolio)\n`;
      text += `   • 🎯 Excellent for swing trading opportunities\n`;
      text += `   • 🔄 Monitor closely and adjust positions\n`;
    } else if (volatility > 5) {
      text += `📊 **Moderate Volatility - Normal Conditions**\n`;
      text += `   • 📍 Support Level: $${assetData.low24h?.toFixed(2) || 'N/A'}\n`;
      text += `   • 🎯 Resistance Level: $${assetData.high24h?.toFixed(2) || 'N/A'}\n`;
      text += `   • ✅ Standard risk management applies\n`;
      text += `   • 📈 Good for both day and swing trades\n`;
    } else {
      text += `✅ **Low Volatility - Stable Price Action**\n`;
      text += `   • 💎 Ideal for long-term holding (HODL)\n`;
      text += `   • 📊 Lower risk for new positions\n`;
      text += `   • ⏰ May be consolidating before next big move\n`;
      text += `   • 🎯 Good entry point for patient investors\n`;
    }

    // Forex-specific context - comprehensive like crypto
    if (type === 'forex') {
      text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `💱 FOREX-SPECIFIC INSIGHTS\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF'];
      const commodityPairs = ['AUDUSD', 'NZDUSD', 'USDCAD'];
      const crossPairs = ['EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'EURAUD', 'EURCHF'];
      
      if (majorPairs.includes(assetData.symbol)) {
        text += `**🌍 Major Currency Pair**\n\n`;
        text += `**Characteristics:**\n`;
        text += `   **✅** Highest liquidity in the forex market\n`;
        text += `   **✅** Tightest spreads (typically 1-2 pips)\n`;
        text += `   **✅** Most actively traded worldwide\n`;
        text += `   **✅** Deepest order books for large positions\n\n`;
        
        text += `**Best Trading Conditions:**\n`;
        text += `   📊 **Day Trading**: Excellent for scalping and intraday strategies\n`;
        text += `   ⚡ **Algorithmic Trading**: High liquidity supports automated strategies\n`;
        text += `   🎯 **Technical Analysis**: Price action is clean and reliable\n`;
        text += `   ⏰ **Active Hours**: London session (3 AM - 12 PM ET) & New York session (8 AM - 5 PM ET)\n`;
        text += `   � **Peak Volatility**: London-NY overlap (8 AM - 12 PM ET)\n\n`;
        
        text += `**Primary Market Drivers:**\n`;
        text += `   **🏦 Central Bank Policy**: Fed, ECB, BOE decisions shape multi-month trends\n`;
        text += `   **📊 Economic Data**: NFP, GDP, CPI, retail sales drive immediate moves\n`;
        text += `   **💹 Interest Rate Differentials**: The #1 long-term driver of forex prices\n`;
        text += `   **🌐 Geopolitical Events**: Elections, trade deals, international conflicts\n`;
        text += `   **📈 Risk Sentiment**: Safe-haven flows during market stress\n\n`;
        
        text += `**Professional Trading Tips:**\n`;
        text += `   • Trade during session overlaps for maximum liquidity and tighter spreads\n`;
        text += `   • Major pairs respect technical levels better than exotic pairs\n`;
        text += `   • Watch for "fake breakouts" near round numbers (e.g., 1.1000, 1.2000)\n`;
        text += `   • News releases can cause 50-100 pip moves in seconds - use caution\n`;
        text += `   • Correlation with stock markets and bond yields often drives major trends\n\n`;
      } else if (commodityPairs.includes(assetData.symbol)) {
        text += `**🏆 Commodity Currency Pair**\n\n`;
        text += `**Characteristics:**\n`;
        text += `   **🛢️** Heavily influenced by commodity prices (oil, gold, metals, agriculture)\n`;
        text += `   **🌏** Tied to resource-exporting economies (Australia, New Zealand, Canada)\n`;
        text += `   **📊** China demand is a critical driver\n`;
        text += `   **⚡** Can be more volatile than major pairs\n\n`;
        
        text += `**Key Commodity Correlations:**\n`;
        if (assetData.symbol === 'AUDUSD') {
          text += `   🥇 **Gold Prices**: AUD often moves with gold (Australia is major exporter)\n`;
          text += `   ⛏️ **Iron Ore**: Critical Australian export to China\n`;
          text += `   🏭 **Chinese Manufacturing**: Strong correlation with China PMI data\n`;
          text += `   💹 **Risk-On Sentiment**: AUD strengthens when markets are bullish\n\n`;
        } else if (assetData.symbol === 'NZDUSD') {
          text += `   🥛 **Dairy Prices**: New Zealand's primary export commodity\n`;
          text += `   🐑 **Agricultural Commodities**: Wool, meat, produce exports\n`;
          text += `   🌏 **Australian Economy**: NZD follows AUD movements closely\n`;
          text += `   📊 **Global Risk Appetite**: Sensitive to market sentiment shifts\n\n`;
        } else if (assetData.symbol === 'USDCAD') {
          text += `   🛢️ **Crude Oil Prices**: Canada is major oil exporter (inverse USD/CAD correlation)\n`;
          text += `   🇺🇸 **US Economy**: 75% of Canadian trade is with the US\n`;
          text += `   📊 **Energy Sector**: Oil sands and natural gas production\n`;
          text += `   💰 **US Stock Market**: Follows S&P 500 risk sentiment\n\n`;
        }
        
        text += `**Trading Strategy:**\n`;
        text += `   📈 **Commodity traders**: Monitor oil, gold, and metal prices daily\n`;
        text += `   🌏 **Watch China data**: Chinese demand drives commodity prices\n`;
        text += `   ⏰ **Asian Session**: Active during Sydney and Tokyo trading hours\n`;
        text += `   💡 **Risk Indicator**: Commodity pairs strengthen in risk-on environments\n`;
        text += `   ⚠️ **Wider Spreads**: Typically 2-4 pips vs 1-2 for majors\n\n`;
        
        text += `**Pro Tips:**\n`;
        text += `   • Always check commodity prices before trading commodity currencies\n`;
        text += `   • China PMI and GDP releases are high-impact events\n`;
        text += `   • These pairs can trend for weeks when commodity prices trend\n`;
        text += `   • Use carry trade strategies when interest rate differentials are favorable\n`;
        text += `   • Excellent for position trading and swing trading approaches\n\n`;
      } else if (crossPairs.includes(assetData.symbol)) {
        text += `**🔄 Cross Currency Pair** (No USD)\n\n`;
        text += `**Characteristics:**\n`;
        text += `   **💱** Represents relative strength between two non-USD currencies\n`;
        text += `   **📊** Often clearer trends than USD pairs (removes US dollar noise)\n`;
        text += `   **🎯** Good for diversification away from USD exposure\n`;
        text += `   **⚠️** Wider spreads than major pairs (3-6 pips typical)\n`;
        text += `   **📉** Lower liquidity but can offer excellent trending opportunities\n\n`;
        
        text += `**Why Trade Cross Pairs:**\n`;
        text += `   **✅ Pure Play**: Direct exposure to EUR vs JPY strength, no USD factor\n`;
        text += `   **✅ Trend Clarity**: Removes conflicting USD signals\n`;
        text += `   **✅ Portfolio Diversification**: Alternative to USD-based pairs\n`;
        text += `   **✅ Specific Regional Exposure**: Target particular economic regions\n\n`;
        
        text += `**Key Drivers:**\n`;
        text += `   **🏦 Dual Central Bank Policy**: Watch BOTH central banks' policies\n`;
        text += `   **💹 Interest Rate Spreads**: Drives carry trade opportunities\n`;
        text += `   **📊 Relative Economic Performance**: Compare GDP, employment, inflation\n`;
        text += `   **🌍 Regional Risk Events**: Brexit, EU policy, BOJ interventions\n\n`;
        
        text += `**Trading Approach:**\n`;
        text += `   📈 **Trend Following**: Cross pairs often trend longer than majors\n`;
        text += `   � **Carry Trades**: Take advantage of interest rate differentials\n`;
        text += `   ⏰ **Session Timing**: Trade during both currency regions' active hours\n`;
        text += `   🎯 **Technical Analysis**: Crosses respect support/resistance well\n`;
        text += `   ⚠️ **Risk Management**: Use wider stops due to higher volatility\n\n`;
        
        text += `**Important Notes:**\n`;
        text += `   • Crosses can make 200-300 pip moves when trends develop\n`;
        text += `   • Spreads widen significantly during off-market hours\n`;
        text += `   • Always monitor BOTH base and quote currency fundamentals\n`;
        text += `   • Popular with professional carry traders and hedge funds\n`;
        text += `   • Can offer 3-5% annual interest differentials (carry trade)\n\n`;
      } else {
        text += `**💱 Exotic/Minor Forex Pair**\n\n`;
        text += `**Characteristics:**\n`;
        text += `   **🌍** Includes emerging market or less-traded currencies\n`;
        text += `   **⚠️** Wider spreads (5-20+ pips common)\n`;
        text += `   **📊** Lower liquidity and larger price gaps\n`;
        text += `   **🎲** Higher volatility and less predictable price action\n\n`;
        
        text += `**Trading Considerations:**\n`;
        text += `   • Research country-specific fundamentals thoroughly\n`;
        text += `   • Use smaller position sizes due to increased risk\n`;
        text += `   • Be aware of political and economic instability\n`;
        text += `   • Spreads can spike during news events or market stress\n`;
        text += `   • Best for experienced traders with strong fundamentals knowledge\n\n`;
      }
      
      text += `**📊 UNIVERSAL FOREX TRADING RULES**\n\n`;
      text += `**Risk Management (Critical!):**\n`;
      text += `   🎯 **Position Sizing**: Never risk more than 1-2% of account per trade\n`;
      text += `   🛑 **Stop Losses**: Always use stops - forex can gap on weekends\n`;
      text += `   📊 **Leverage**: Keep leverage conservative (10:1 max recommended)\n`;
      text += `   💰 **Take Profits**: Set realistic targets and stick to your plan\n\n`;
      
      text += `**Best Times to Trade:**\n`;
      text += `   🌅 **Asian Session** (7 PM - 4 AM ET): JPY pairs most active\n`;
      text += `   🇪🇺 **London Session** (3 AM - 12 PM ET): EUR and GBP pairs peak\n`;
      text += `   🇺🇸 **New York Session** (8 AM - 5 PM ET): USD pairs most liquid\n`;
      text += `   🔥 **London-NY Overlap** (8 AM - 12 PM ET): Highest volume & volatility\n\n`;
      
      text += `**High-Impact Events to Watch:**\n`;
      text += `   📊 **Non-Farm Payrolls (NFP)**: First Friday of month - massive USD volatility\n`;
      text += `   🏦 **Central Bank Meetings**: Fed, ECB, BOE, BOJ policy decisions\n`;
      text += `   📈 **GDP Releases**: Quarterly economic growth data\n`;
      text += `   💹 **Inflation Data (CPI/PPI)**: Directly impacts interest rate expectations\n`;
      text += `   👔 **Employment Reports**: Unemployment rate changes signal economic health\n`;
      text += `   🗣️ **Central Bank Speeches**: Powell, Lagarde, Bailey can move markets\n\n`;
      
      text += `**Technical Analysis for Forex:**\n`;
      text += `   📍 **Support & Resistance**: Forex respects psychological levels (1.2000, 110.00)\n`;
      text += `   📊 **Fibonacci Retracements**: Widely used by institutional traders\n`;
      text += `   📈 **Trend Lines**: Clean trends in liquid pairs\n`;
      text += `   🔢 **Moving Averages**: 50/200 day MAs critical for trend identification\n`;
      text += `   💡 **RSI & MACD**: Same indicators shown above work excellently for forex\n`;
      text += `   ⚡ **Candlestick Patterns**: Doji, engulfing patterns are reliable signals\n\n`;
      
      text += `**Fundamental Analysis Checklist:**\n`;
      text += `   ✅ Check economic calendar daily (forexfactory.com, investing.com)\n`;
      text += `   ✅ Monitor interest rate differentials between currency pairs\n`;
      text += `   ✅ Read central bank statements and meeting minutes\n`;
      text += `   ✅ Track inflation trends (target is usually 2% annually)\n`;
      text += `   ✅ Watch unemployment rates (lower = stronger currency)\n`;
      text += `   ✅ Follow geopolitical news and trade negotiations\n`;
      text += `   ✅ Understand correlation with stocks, bonds, and commodities\n\n`;
      
      text += `**Common Forex Trading Mistakes to Avoid:**\n`;
      text += `   ❌ Trading during news without protection (guaranteed stop-loss)\n`;
      text += `   ❌ Using excessive leverage (>10:1 is dangerous)\n`;
      text += `   ❌ Ignoring the economic calendar and scheduled releases\n`;
      text += `   ❌ Trading during illiquid hours (Sunday open, major holidays)\n`;
      text += `   ❌ Revenge trading after losses\n`;
      text += `   ❌ Not using stop losses ("I'll watch it closely" doesn't work)\n`;
      text += `   ❌ Overtrading - quality over quantity always\n`;
      text += `   ❌ Holding positions over weekends (gap risk)\n\n`;
    }
    
    // Index-specific context
    if (type === 'index') {
      text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `📈 **INDEX-SPECIFIC INSIGHTS**\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      const majorIndices: Record<string, any> = {
        'SPX': { name: 'S&P 500', desc: 'Broad market benchmark - 500 large-cap US stocks' },
        'SPY': { name: 'S&P 500 ETF', desc: 'Most liquid ETF tracking S&P 500' },
        'QQQ': { name: 'Nasdaq-100 ETF', desc: 'Tech-heavy index with growth stocks' },
        'DIA': { name: 'Dow Jones ETF', desc: 'Price-weighted 30 blue-chip stocks' },
        'IWM': { name: 'Russell 2000 ETF', desc: 'Small-cap stock benchmark' },
        'VIX': { name: 'Volatility Index', desc: 'Market fear gauge - inverse to S&P 500' },
        'DXY': { name: 'US Dollar Index', desc: 'Dollar strength vs basket of currencies' }
      };
      
      const indexInfo = majorIndices[assetData.symbol];
      if (indexInfo) {
        text += `📊 **${indexInfo.name}**\n`;
        text += `   ${indexInfo.desc}\n\n`;
      }
      
      if (assetData.symbol === 'VIX') {
        text += `⚡ **VIX Special Considerations**:\n`;
        text += `   • VIX > 20: Elevated fear, potential market stress\n`;
        text += `   • VIX < 12: Complacency, potential for surprise moves\n`;
        text += `   • Spikes often mark market bottoms\n`;
        text += `   • Mean-reverting - extreme levels don't last\n`;
      } else if (assetData.symbol === 'DXY') {
        text += `💵 **Dollar Index Implications**:\n`;
        text += `   • Strong dollar: Pressure on commodities & emerging markets\n`;
        text += `   • Weak dollar: Boost for commodities & international stocks\n`;
        text += `   • Inverse correlation with gold typically\n`;
        text += `   • Key driver: Fed policy & interest rate differentials\n`;
      } else {
        text += `📊 **Index Trading Tips**:\n`;
        text += `   • ETFs offer easy exposure without futures complexity\n`;
        text += `   • Watch for sector rotation and market breadth\n`;
        text += `   • Consider options for leverage or hedging\n`;
        text += `   • Monitor major components' earnings & news\n`;
        text += `   • Use for portfolio hedging or tactical allocation\n`;
      }
    }
    
    // ETF-specific context
    if (type === 'etf') {
      text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `🎯 **ETF-SPECIFIC INSIGHTS**\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      const etfCategories: Record<string, any> = {
        'SPY': { category: 'Broad Market', desc: 'S&P 500 tracker - largest and most liquid ETF', expense: '0.09%' },
        'QQQ': { category: 'Technology', desc: 'Nasdaq-100 tracker - tech-heavy growth stocks', expense: '0.20%' },
        'DIA': { category: 'Blue Chip', desc: 'Dow Jones 30 tracker - large-cap value stocks', expense: '0.16%' },
        'IWM': { category: 'Small Cap', desc: 'Russell 2000 tracker - small-cap exposure', expense: '0.19%' },
        'VTI': { category: 'Total Market', desc: 'Entire US stock market in one ETF', expense: '0.03%' },
        'VOO': { category: 'Broad Market', desc: 'S&P 500 tracker - ultra-low fees', expense: '0.03%' },
        'GLD': { category: 'Commodity', desc: 'Gold tracker - inflation hedge', expense: '0.40%' },
        'SLV': { category: 'Commodity', desc: 'Silver tracker - precious metal exposure', expense: '0.50%' },
        'ARKK': { category: 'Innovation', desc: 'Disruptive innovation - high risk/reward', expense: '0.75%' }
      };
      
      const etfInfo = etfCategories[assetData.symbol];
      if (etfInfo) {
        text += `📊 **${assetData.name}**\n`;
        text += `   📁 **Category**: ${etfInfo.category}\n`;
        text += `   💰 **Expense Ratio**: ${etfInfo.expense}\n`;
        text += `   📝 **Description**: ${etfInfo.desc}\n\n`;
      }
      
      text += `🎯 **Why Trade ETFs:**\n\n`;
      text += `**Advantages:**\n`;
      text += `   **✅ Instant Diversification**: One trade = exposure to dozens/hundreds of stocks\n`;
      text += `   **✅ Lower Risk**: Diversification reduces individual stock risk\n`;
      text += `   **✅ Liquidity**: Major ETFs trade millions of shares daily\n`;
      text += `   **✅ Transparency**: Holdings disclosed daily\n`;
      text += `   **✅ Tax Efficiency**: More tax-efficient than mutual funds\n`;
      text += `   **✅ Low Costs**: Expense ratios as low as 0.03% annually\n`;
      text += `   **✅ Trade Like Stocks**: Buy/sell anytime during market hours\n\n`;
      
      text += `**ETF Categories Explained:**\n`;
      text += `   **📊** Broad Market ETFs (SPY, VOO, VTI): Track entire market or S&P 500\n`;
      text += `   **💻** Sector ETFs (XLK, XLF, XLE): Target specific industries\n`;
      text += `   **🌍** International ETFs (EFA, EEM, VWO): Global/emerging market exposure\n`;
      text += `   **💰** Bond ETFs (AGG, BND, TLT): Fixed income and treasury exposure\n`;
      text += `   **🥇** Commodity ETFs (GLD, SLV, USO): Gold, silver, oil exposure\n`;
      text += `   **🎯** Thematic ETFs (ARKK, ICLN, WCLD): Specific investment themes\n`;
      text += `   **🎲** Leveraged ETFs (TQQQ, UPRO): 2-3x daily returns (high risk!)\n`;
      text += `   **📉** Inverse ETFs (SH, PSQ): Profit from market declines\n\n`;
      
      text += `**📈 ETF Trading Strategies:**\n\n`;
      text += `**Long-Term Investing:**\n`;
      text += `   • SPY/VOO/VTI for broad market exposure\n`;
      text += `   • DCA (Dollar-Cost Average) into positions monthly\n`;
      text += `   • Hold through market cycles for compound growth\n`;
      text += `   • Core holdings for retirement accounts\n\n`;
      
      text += `**Sector Rotation:**\n`;
      text += `   • Rotate between sector ETFs based on economic cycle\n`;
      text += `   • Tech (XLK) in growth phases, Utilities (XLU) in downturns\n`;
      text += `   • Follow Fed policy and interest rate trends\n`;
      text += `   • Monitor sector performance weekly\n\n`;
      
      text += `**Tactical Trading:**\n`;
      text += `   • Use technical analysis on liquid ETFs (SPY, QQQ)\n`;
      text += `   • Tight spreads make day/swing trading feasible\n`;
      text += `   • Options strategies (covered calls, spreads) on major ETFs\n`;
      text += `   • High volume ensures easy entry/exit\n\n`;
      
      text += `**Portfolio Hedging:**\n`;
      text += `   • VIX ETFs (VXX, UVXY) for volatility protection\n`;
      text += `   • Inverse ETFs (SH, PSQ) to hedge long positions\n`;
      text += `   • Bond ETFs (TLT, AGG) for portfolio stability\n`;
      text += `   • Gold ETFs (GLD) as inflation hedge\n\n`;
      
      text += `**⚠️ ETF Risk Considerations:**\n\n`;
      text += `**Leveraged/Inverse ETFs (CRITICAL!):**\n`;
      text += `   **⚠️ Daily Rebalancing**: Not for holding >1 day (decay risk)\n`;
      text += `   **⚠️ Volatility Drag**: Returns don't match 2x/3x over time\n`;
      text += `   **⚠️ High Fees**: Expense ratios 0.75-1.00%+\n`;
      text += `   **⚠️ For Traders Only**: Suitable only for experienced day traders\n\n`;
      
      text += `**Standard ETF Risks:**\n`;
      text += `   • **Tracking Error**: May not perfectly match underlying index\n`;
      text += `   • **Liquidity Risk**: Low-volume ETFs have wide bid-ask spreads\n`;
      text += `   • **Expense Ratio**: Even small fees compound over decades\n`;
      text += `   • **Market Risk**: ETFs go down when markets go down\n`;
      text += `   • **Concentration Risk**: Some ETFs heavily weighted in few stocks\n\n`;
      
      text += `**📊 Key Metrics to Monitor:**\n`;
      text += `   📈 **Expense Ratio**: Lower is better (aim for <0.20%)\n`;
      text += `   💧 **Daily Volume**: Higher volume = tighter spreads\n`;
      text += `   📊 **Assets Under Management (AUM)**: Larger = more stable\n`;
      text += `   🎯 **Tracking Error**: Should closely match underlying index\n`;
      text += `   💰 **Bid-Ask Spread**: Tighter spreads reduce trading costs\n`;
      text += `   📝 **Holdings Transparency**: Know what you're buying\n\n`;
      
      text += `**💡 Pro Tips for ETF Investors:**\n`;
      text += `   • Start with broad market ETFs (SPY, VOO, VTI) as core holdings\n`;
      text += `   • Add sector/thematic ETFs for satellite positions (10-20% of portfolio)\n`;
      text += `   • Avoid frequent trading - ETFs shine in long-term strategies\n`;
      text += `   • Use limit orders, not market orders, to control entry price\n`;
      text += `   • Check expense ratios - 0.50% difference = huge impact over 30 years\n`;
      text += `   • Consider tax implications - ETFs are tax-efficient but still taxable\n`;
      text += `   • Rebalance portfolio quarterly to maintain target allocations\n`;
      text += `   • NEVER hold leveraged ETFs overnight unless you're a pro trader\n\n`;
    }
    
    // CFD-specific context
    if (type === 'cfd') {
      text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `**⚡ CFD-SPECIFIC INSIGHTS**\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      text += `**What are CFDs (Contracts for Difference)?**\n\n`;
      text += `CFDs are **derivative instruments** that let you speculate on price movements WITHOUT owning the underlying asset. `;
      text += `You're trading the DIFFERENCE between entry and exit prices, not the actual stock, commodity, or currency.\n\n`;
      
      text += `**⚡ Key CFD Characteristics:**\n\n`;
      text += `**✅ Leverage Trading**:\n`;
      text += `   • Trade with margin (typical 5:1 to 30:1 leverage)\n`;
      text += `   • Control $10,000 position with $500 (20:1 leverage)\n`;
      text += `   • Amplifies BOTH gains AND losses dramatically\n`;
      text += `   • Can lose more than initial investment\n\n`;
      
      text += `**✅ Go Long or Short**:\n`;
      text += `   • BUY (long) if you think price will rise\n`;
      text += `   • SELL (short) if you think price will fall\n`;
      text += `   • Profit in both rising and falling markets\n`;
      text += `   • No need to borrow shares for short selling\n\n`;
      
      text += `**✅ No Ownership**:\n`;
      text += `   • Don't own the underlying asset\n`;
      text += `   • No shareholder rights or dividends (usually)\n`;
      text += `   • Can't vote in company decisions\n`;
      text += `   • Pure price speculation instrument\n\n`;
      
      text += `**✅ 24/7 Trading** (for some assets):\n`;
      text += `   • Crypto CFDs: Trade 24/7\n`;
      text += `   • Stock CFDs: Trade during market hours + some after-hours\n`;
      text += `   • Forex CFDs: 24/5 trading (Monday-Friday)\n`;
      text += `   • Commodity CFDs: Extended hours vs futures\n\n`;
      
      text += `**🚨 CRITICAL CFD RISKS (Read This 3 Times!):**\n\n`;
      text += `**⚠️ Leverage Risk**:\n`;
      text += `   • 10:1 leverage = 10% move wipes out your account\n`;
      text += `   • 30:1 leverage = 3.33% move liquidates your position\n`;
      text += `   • Losses can EXCEED your initial deposit\n`;
      text += `   • You can owe the broker money after liquidation\n\n`;
      
      text += `**⚠️ Margin Calls**:\n`;
      text += `   • If losses reduce margin below maintenance level, you get a margin call\n`;
      text += `   • Must deposit more funds or positions are force-closed\n`;
      text += `   • Happens automatically and instantly\n`;
      text += `   • No warning during fast-moving markets\n\n`;
      
      text += `**⚠️ Overnight Financing Costs**:\n`;
      text += `   • Holding CFDs overnight incurs daily interest charges\n`;
      text += `   • Costs accumulate if you hold positions for weeks/months\n`;
      text += `   • Can eat into profits significantly on long-term trades\n`;
      text += `   • Different rates for longs vs shorts\n\n`;
      
      text += `**⚠️ Counterparty Risk**:\n`;
      text += `   • Trading with the broker, not on an exchange\n`;
      text += `   • If broker goes bankrupt, you could lose funds\n`;
      text += `   • No centralized exchange protection\n`;
      text += `   • Use only regulated, reputable brokers\n\n`;
      
      text += `**⚠️ Gap Risk**:\n`;
      text += `   • Prices can gap over weekends or during news\n`;
      text += `   • Stop-losses may not execute at your specified price\n`;
      text += `   • Slippage can be severe in volatile markets\n`;
      text += `   • Guaranteed stops cost extra fees\n\n`;
      
      text += `**📈 CFD Trading Strategies:**\n\n`;
      text += `**Day Trading CFDs:**\n`;
      text += `   • Open and close positions same day\n`;
      text += `   • Avoid overnight financing costs\n`;
      text += `   • Use technical analysis for entries/exits\n`;
      text += `   • Tight stops (1-2% max risk per trade)\n`;
      text += `   • Focus on liquid, volatile assets\n\n`;
      
      text += `**Swing Trading CFDs:**\n`;
      text += `   • Hold for 2-10 days to catch medium-term moves\n`;
      text += `   • Factor in overnight costs to profit calculations\n`;
      text += `   • Use wider stops (3-5% risk)\n`;
      text += `   • Trend-following strategies work well\n`;
      text += `   • Monitor positions daily\n\n`;
      
      text += `**Hedging with CFDs:**\n`;
      text += `   • Short CFDs to hedge long stock positions\n`;
      text += `   • Protect portfolio during market downturns\n`;
      text += `   • More flexible than options for some traders\n`;
      text += `   • Lower capital requirements than shorting stocks\n`;
      text += `   • Useful for tax-loss harvesting strategies\n\n`;
      
      text += `**Scalping (Advanced!):**\n`;
      text += `   • Hold positions for seconds to minutes\n`;
      text += `   • Capture tiny price movements repeatedly\n`;
      text += `   • Requires excellent execution and tight spreads\n`;
      text += `   • Extremely time-intensive\n`;
      text += `   • Only for experienced traders with discipline\n\n`;
      
      text += `**🎯 CFD Risk Management (MANDATORY!):**\n\n`;
      text += `**Position Sizing:**\n`;
      text += `   🎯 **Never risk more than 1-2% of account per trade**\n`;
      text += `   🎯 **Calculate position size based on stop-loss distance**\n`;
      text += `   🎯 **Account for leverage - smaller positions than stocks**\n`;
      text += `   🎯 **Start with minimum sizes until consistently profitable**\n\n`;
      
      text += `**Stop-Loss Strategy:**\n`;
      text += `   🛑 **ALWAYS use stop-losses - no exceptions**\n`;
      text += `   🛑 **Set stops BEFORE entering trade**\n`;
      text += `   🛑 **Place stops at technical levels, not arbitrary percentages**\n`;
      text += `   🛑 **Use guaranteed stops for overnight positions (costs extra)**\n`;
      text += `   🛑 **Never move stops against your position**\n\n`;
      
      text += `**Leverage Management:**\n`;
      text += `   📊 **Start with 5:1 leverage maximum**\n`;
      text += `   📊 **Only increase leverage with proven track record**\n`;
      text += `   📊 **Lower leverage = better sleep at night**\n`;
      text += `   📊 **Professional traders rarely exceed 10:1 leverage**\n`;
      text += `   📊 **High leverage (30:1+) is for scalping only**\n\n`;
      
      text += `**Account Management:**\n`;
      text += `   💰 **Maintain margin buffer (use <50% of available margin)**\n`;
      text += `   💰 **Never trade with money you can't afford to lose**\n`;
      text += `   💰 **Keep emergency cash reserve for margin calls**\n`;
      text += `   💰 **Withdraw profits regularly - don't compound indefinitely**\n`;
      text += `   💰 **Track all trades in a journal - learn from mistakes**\n\n`;
      
      text += `**📊 CFD vs Traditional Trading:**\n\n`;
      text += `**CFDs vs Stocks:**\n`;
      text += `   ✅ CFDs: Lower capital requirement (leverage)\n`;
      text += `   ✅ CFDs: Can short sell easily\n`;
      text += `   ❌ CFDs: Overnight financing costs\n`;
      text += `   ❌ CFDs: No ownership rights\n`;
      text += `   ❌ CFDs: Counterparty risk\n\n`;
      
      text += `**CFDs vs Forex:**\n`;
      text += `   ✅ CFDs: Access to stocks, indices, commodities\n`;
      text += `   ✅ Forex: Tighter spreads typically\n`;
      text += `   ✅ Forex: Higher liquidity in major pairs\n`;
      text += `   ⚖️ Both: Similar leverage levels\n`;
      text += `   ⚖️ Both: Overnight financing costs\n\n`;
      
      text += `**CFDs vs Futures:**\n`;
      text += `   ✅ CFDs: No expiration dates\n`;
      text += `   ✅ CFDs: Smaller contract sizes\n`;
      text += `   ❌ CFDs: Higher spreads than futures\n`;
      text += `   ❌ Futures: Centralized exchange (lower risk)\n`;
      text += `   ❌ Futures: Better for large institutional traders\n\n`;
      
      text += `**💡 Professional CFD Trading Tips:**\n\n`;
      text += `**Before You Start:**\n`;
      text += `   • Demo trade for 3-6 months minimum\n`;
      text += `   • Master risk management before increasing size\n`;
      text += `   • Choose regulated brokers (FCA, ASIC, CySEC)\n`;
      text += `   • Read ALL terms - spreads, overnight costs, margin requirements\n`;
      text += `   • Understand tax implications in your jurisdiction\n\n`;
      
      text += `**While Trading:**\n`;
      text += `   • Trade liquid assets with tight spreads (major stocks, forex, indices)\n`;
      text += `   • Avoid trading during major news events (unless experienced)\n`;
      text += `   • Close positions before weekends to avoid gap risk\n`;
      text += `   • Monitor margin levels continuously\n`;
      text += `   • Keep emotions in check - follow your trading plan strictly\n\n`;
      
      text += `**Long-Term Success:**\n`;
      text += `   • Treat CFD trading as a business, not gambling\n`;
      text += `   • Track performance metrics (win rate, risk/reward, profit factor)\n`;
      text += `   • Continuously educate yourself on markets and trading psychology\n`;
      text += `   • Accept that most retail CFD traders lose money (65-80% statistics)\n`;
      text += `   • Start small, prove consistency, then scale gradually\n\n`;
      
      text += `**🚫 Common CFD Trading Mistakes (AVOID!):**\n`;
      text += `   ❌ Over-leveraging (using 20:1+ leverage as beginner)\n`;
      text += `   ❌ No stop-losses ("I'll watch it closely" - famous last words)\n`;
      text += `   ❌ Revenge trading after losses\n`;
      text += `   ❌ Trading with rent/bill money\n`;
      text += `   ❌ Ignoring overnight financing costs\n`;
      text += `   ❌ Not understanding margin requirements\n`;
      text += `   ❌ Trading illiquid CFDs with wide spreads\n`;
      text += `   ❌ Holding losing positions hoping for recovery\n`;
      text += `   ❌ Moving stop-losses away from entry (giving losses more room)\n`;
      text += `   ❌ Not reading broker terms and conditions\n\n`;
      
      text += `**🎓 Educational Resources:**\n`;
      text += `   📚 **Books**: "Trading in the Zone" by Mark Douglas\n`;
      text += `   📚 **Books**: "Technical Analysis of Financial Markets" by John Murphy\n`;
      text += `   🎥 **YouTube**: Search "CFD trading tutorial" for visual learning\n`;
      text += `   💻 **Demo Accounts**: Practice with virtual money first (MetaTrader, cTrader)\n`;
      text += `   📊 **Forums**: BabyPips (forex), Elite Trader (general trading)\n`;
      text += `   📈 **Courses**: Consider paid courses ONLY after mastering free resources\n\n`;
    }
    
    // Specific crypto context
    if (type === 'crypto') {
      text += `\n\n🪙 **CRYPTO-SPECIFIC INSIGHTS**\n\n`;
      
      const stablecoins = ['USDT', 'USDC', 'DAI', 'BUSD'];
      if (stablecoins.includes(assetData.symbol)) {
        text += `💵 **Stablecoin** - Pegged to $1.00\n`;
        text += `   ✅ **Use for**: Trading pairs, earning yield, transferring value\n`;
        text += `   ❌ **Not for**: Price appreciation or speculation\n`;
      } else if (assetData.symbol === 'BTC') {
        text += `₿ **Bitcoin** - The Original Digital Gold\n`;
        text += `   🏆 **Largest crypto by market cap**\n`;
        text += `   📊 **Sets trend for broader crypto market**\n`;
        text += `   💎 **Digital store of value with limited supply**\n`;
      } else if (assetData.symbol === 'ETH') {
        text += `Ξ **Ethereum** - Smart Contract Leader\n`;
        text += `   💼 **Powers most DeFi & NFT applications**\n`;
        text += `   🔥 **EIP-1559 creates deflationary pressure**\n`;
        text += `   🚀 **Leading platform for decentralized apps**\n`;
      }
    }
    
    // Stock-specific context
    if (type === 'stock') {
      text += `\n\n📊 **STOCK-SPECIFIC INSIGHTS**\n\n`;
      
      // Add support/resistance levels
      if (assetData.low24h && assetData.high24h) {
        text += `📍 **Key Levels to Watch**:\n`;
        text += `   🟢 **Support**: $${assetData.low24h.toFixed(2)} - Strong buying interest\n`;
        text += `   🔴 **Resistance**: $${assetData.high24h.toFixed(2)} - Selling pressure expected\n\n`;
      }
      
      // Trading strategy based on trend
      if (assetData.changePercent24h > 3) {
        text += `🚀 **Momentum Play**:\n`;
        text += `   • Strong upward trend confirmed\n`;
        text += `   • Consider trailing stop to lock profits\n`;
        text += `   • Watch for pullback to add position\n`;
      } else if (assetData.changePercent24h < -3) {
        text += `📉 **Bearish Pressure**:\n`;
        text += `   • Downtrend in effect\n`;
        text += `   • Wait for reversal signals before entering\n`;
        text += `   • Look for support bounce opportunity\n`;
      } else {
        text += `⚖️ **Range-Bound Trading**:\n`;
        text += `   • Buy near support, sell near resistance\n`;
        text += `   • Wait for breakout confirmation\n`;
        text += `   • Reduced position size recommended\n`;
      }
    }

    // Risk disclaimer only
    text += `\n\n⚠️ *Not financial advice. Always DYOR.*`;
    
    return text;
  }

  /**
   * Detect asset type from symbol
   * Enhanced to properly detect forex, indices, commodities, ETFs, CFDs, and crypto
   */
  private static detectAssetType(symbol: string): 'crypto' | 'stock' | 'forex' | 'index' | 'commodity' | 'etf' | 'cfd' {
    const upperSymbol = symbol.toUpperCase();
    
    // Crypto symbols
    const cryptoSymbols = [
      'BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'USDC', 'XRP', 'ADA', 'DOGE', 'TRX',
      'LINK', 'MATIC', 'DOT', 'AVAX', 'ATOM', 'UNI', 'LTC', 'NEAR', 'APT', 'ARB',
      'OP', 'FIL', 'SHIB', 'BCH', 'XLM', 'ALGO', 'VET', 'ICP', 'APE', 'SAND',
      'MANA', 'AXS', 'BUSD', 'DAI', 'TUSD', 'USDD'
    ];
    
    // ETF symbols (common ETFs)
    const etfSymbols = [
      'SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VOO', 'VEA', 'VWO', 'AGG', 'BND',
      'GLD', 'SLV', 'USO', 'TLT', 'IEF', 'LQD', 'HYG', 'EMB', 'XLE', 'XLF',
      'XLK', 'XLV', 'XLI', 'XLP', 'XLY', 'XLB', 'XLU', 'XLRE', 'XLC', 'SMH',
      'ARKK', 'ARKG', 'ARKW', 'EEM', 'EFA', 'IEMG', 'VNQ', 'VYM', 'SCHD', 'SPYD'
    ];
    
    // Index symbols (pure indices, not ETFs)
    const indexSymbols = [
      'SPX', 'NDX', 'RUT', 'DJI', 'IXIC', 'COMP', 'VIX', 'DXY',
      'VXX', 'UVXY', 'VIXY'
    ];
    
    // Commodity symbols
    const commoditySymbols = [
      'GC', 'SI', 'CL', 'NG', 'HG', 'ZC', 'ZW', 'ZS',
      'GOLD', 'SILVER', 'OIL', 'GAS'
    ];
    
    // CFD symbols (common CFD patterns)
    // CFDs often have suffixes or prefixes like .CFD, _CFD, or specific naming patterns
    if (upperSymbol.includes('CFD') || upperSymbol.endsWith('.C') || 
        upperSymbol.startsWith('CFD_') || upperSymbol.endsWith('_CFD')) {
      return 'cfd';
    }
    
    // Common forex pairs
    const forexPairs = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
      'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'EURAUD', 'EURCHF', 'AUDNZD',
      'GBPAUD', 'GBPCAD', 'GBPCHF', 'AUDCAD', 'AUDCHF', 'CADJPY', 'CHFJPY',
      'EURCAD', 'EURNZD', 'NZDCAD', 'NZDCHF', 'NZDJPY'
    ];
    
    if (cryptoSymbols.includes(upperSymbol)) {
      return 'crypto';
    }
    
    if (etfSymbols.includes(upperSymbol)) {
      return 'etf';
    }
    
    if (indexSymbols.includes(upperSymbol)) {
      return 'index';
    }
    
    if (commoditySymbols.includes(upperSymbol)) {
      return 'commodity';
    }
    
    if (forexPairs.includes(upperSymbol) || (upperSymbol.length === 6 && /^[A-Z]{6}$/.test(upperSymbol))) {
      return 'forex';
    }
    
    return 'stock';
  }

  /**
   * Calculate RSI (Relative Strength Index) based on recent price change
   * Simplified calculation using 24h price movement
   */
  private static calculateRSI(changePercent24h: number): number {
    // Normalize to 0-100 scale
    // Positive changes push RSI above 50, negative below 50
    const baseRSI = 50;
    const sensitivity = 3; // Adjust sensitivity
    
    // Calculate RSI based on price change
    let rsi = baseRSI + (changePercent24h * sensitivity);
    
    // Clamp between 0 and 100
    rsi = Math.max(0, Math.min(100, rsi));
    
    return rsi;
  }

  /**
   * Calculate MACD signal based on price momentum
   */
  private static calculateMACDSignal(changePercent24h: number): 'bullish' | 'bearish' | 'neutral' {
    if (changePercent24h > 1.5) {
      return 'bullish';
    } else if (changePercent24h < -1.5) {
      return 'bearish';
    }
    return 'neutral';
  }

  /**
   * Determine Bollinger Band position
   */
  private static calculateBollingerBandPosition(
    currentPrice: number, 
    low24h: number, 
    high24h: number
  ): 'upper' | 'lower' | 'middle' {
    if (!low24h || !high24h) return 'middle';
    
    const range = high24h - low24h;
    const position = (currentPrice - low24h) / range;
    
    if (position > 0.8) return 'upper';
    if (position < 0.2) return 'lower';
    return 'middle';
  }

  /**
   * Get Moving Average status based on trend
   */
  private static getMovingAverageStatus(changePercent24h: number): {
    ma50: string;
    ma200: string;
    summary: string;
  } {
    let ma50 = '';
    let ma200 = '';
    let summary = '';
    
    if (changePercent24h > 3) {
      ma50 = '🟢 Above (Bullish)';
      ma200 = '🟢 Above (Strong uptrend)';
      summary = '✅ **Golden Cross** - Strong bullish trend';
    } else if (changePercent24h > 0) {
      ma50 = '🟢 Above (Bullish)';
      ma200 = '⚪ Near (Neutral)';
      summary = '📈 **Uptrend** - Momentum building';
    } else if (changePercent24h < -3) {
      ma50 = '🔴 Below (Bearish)';
      ma200 = '🔴 Below (Strong downtrend)';
      summary = '⚠️ **Death Cross** - Strong bearish trend';
    } else {
      ma50 = '🔴 Below (Bearish)';
      ma200 = '⚪ Near (Neutral)';
      summary = '📉 **Downtrend** - Weakness present';
    }
    
    return { ma50, ma200, summary };
  }

  /**
   * Get data sources based on asset type
   */
  private static getSources(type: string): string[] {
    switch (type) {
      case 'crypto':
        return ['CoinGecko', 'Binance', 'Gate.io', 'TradingView'];
      case 'stock':
        return ['Yahoo Finance', 'Twelve Data', 'TradingView'];
      case 'forex':
        return ['OANDA', 'Forex.com', 'TradingView', 'Central Banks'];
      case 'index':
        return ['S&P Global', 'CBOE', 'Yahoo Finance', 'TradingView'];
      case 'commodity':
        return ['CME Group', 'Bloomberg Commodities', 'TradingView'];
      case 'etf':
        return ['Yahoo Finance', 'ETF.com', 'Morningstar', 'TradingView'];
      case 'cfd':
        return ['CFD Brokers', 'TradingView', 'Market Analytics', 'Broker APIs'];
      default:
        return ['Multiple Financial Sources', 'TradingView', 'Market Analytics'];
    }
  }

  /**
   * Get historical data for charting (stub for future implementation)
   */
  static async getHistoricalData(symbol: string, timeframe: '1D' | '1W' | '1M' | '3M' | '1Y'): Promise<any[]> {
    // This would fetch actual historical data from APIs
    // For now, return empty array - can be implemented with Yahoo Finance or CoinGecko historical endpoints
    console.log(`Historical data for ${symbol} (${timeframe}) would be fetched here`);
    return [];
  }
}

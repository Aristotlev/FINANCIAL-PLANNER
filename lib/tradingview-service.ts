/**
 * TradingView Chart Service
 * Generates TradingView widget links and embeddings for all asset types
 */

export interface TradingViewChartConfig {
  symbol: string;
  assetType: 'stock' | 'crypto' | 'forex' | 'commodity' | 'index';
  interval?: string; // Default: 'D' (daily)
  theme?: 'light' | 'dark';
  indicators?: string[]; // Technical indicators to show
  width?: number | string;
  height?: number | string;
}

export interface TradingViewLink {
  url: string;
  embedUrl: string;
  widgetHtml: string;
}

export class TradingViewService {
  private static readonly BASE_URL = 'https://www.tradingview.com/chart/';
  private static readonly WIDGET_URL = 'https://s3.tradingview.com/tv.js';

  /**
   * Convert asset symbol to TradingView format
   */
  private static formatSymbol(symbol: string, assetType: string): string {
    const upperSymbol = symbol.toUpperCase();

    switch (assetType) {
      case 'crypto':
        // Crypto: BINANCE:BTCUSDT, COINBASE:BTCUSD
        return `BINANCE:${upperSymbol}USDT`;
      
      case 'forex':
        // Forex: FX:EURUSD, OANDA:GBPUSD
        if (upperSymbol.length === 6) {
          return `FX:${upperSymbol}`;
        }
        return `FX:${upperSymbol}USD`;
      
      case 'commodity':
        // Commodities: TVC:GOLD, NYMEX:CL1! (crude oil)
        const commodityMap: Record<string, string> = {
          'GOLD': 'TVC:GOLD',
          'SILVER': 'TVC:SILVER',
          'OIL': 'NYMEX:CL1!',
          'CL': 'NYMEX:CL1!',
          'GC': 'COMEX:GC1!', // Gold futures
          'SI': 'COMEX:SI1!', // Silver futures
        };
        return commodityMap[upperSymbol] || `TVC:${upperSymbol}`;
      
      case 'index':
        // Indices: TVC:SPX, TVC:DJI
        const indexMap: Record<string, string> = {
          'SPX': 'TVC:SPX',
          'SPY': 'NASDAQ:SPY',
          'DJI': 'TVC:DJI',
          'NDX': 'TVC:NDX',
          'QQQ': 'NASDAQ:QQQ',
        };
        return indexMap[upperSymbol] || `TVC:${upperSymbol}`;
      
      case 'stock':
      default:
        // US Stocks: NASDAQ:AAPL, NYSE:JPM
        // Try to detect exchange automatically
        const nasdaqStocks = ['AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'META', 'NVDA', 'AMD', 'INTC', 'NFLX'];
        if (nasdaqStocks.includes(upperSymbol)) {
          return `NASDAQ:${upperSymbol}`;
        }
        return `NYSE:${upperSymbol}`;
    }
  }

  /**
   * Generate TradingView chart URL
   */
  static generateChartUrl(config: TradingViewChartConfig): string {
    const tvSymbol = this.formatSymbol(config.symbol, config.assetType);
    const interval = config.interval || 'D'; // D = Daily, W = Weekly, M = Monthly
    
    // Build URL with parameters
    const params = new URLSearchParams({
      symbol: tvSymbol,
      interval: interval,
      theme: config.theme || 'dark',
    });

    return `${this.BASE_URL}?${params.toString()}`;
  }

  /**
   * Generate TradingView widget embed URL
   */
  static generateEmbedUrl(config: TradingViewChartConfig): string {
    const tvSymbol = this.formatSymbol(config.symbol, config.assetType);
    
    const widgetConfig = {
      symbol: tvSymbol,
      interval: config.interval || 'D',
      timezone: 'America/New_York',
      theme: config.theme || 'dark',
      style: '1', // Candlestick
      locale: 'en',
      toolbar_bg: '#f1f3f6',
      enable_publishing: false,
      allow_symbol_change: false,
      studies: config.indicators || [],
      width: config.width || '100%',
      height: config.height || 500,
    };

    const params = new URLSearchParams();
    Object.entries(widgetConfig).forEach(([key, value]) => {
      params.append(key, String(value));
    });

    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }

  /**
   * Generate complete TradingView widget HTML
   */
  static generateWidgetHtml(config: TradingViewChartConfig): string {
    const tvSymbol = this.formatSymbol(config.symbol, config.assetType);
    const containerId = `tradingview_${config.symbol}_${Date.now()}`;

    const indicators = config.indicators || ['RSI', 'MACD', 'BB']; // Default indicators
    const studiesParam = indicators.join(',');

    return `
<div class="tradingview-widget-container" style="height:${config.height || 500}px;width:${config.width || '100%'}">
  <div id="${containerId}" style="height:100%;width:100%"></div>
  <script type="text/javascript" src="${this.WIDGET_URL}"></script>
  <script type="text/javascript">
    new TradingView.widget({
      "width": "100%",
      "height": "100%",
      "symbol": "${tvSymbol}",
      "interval": "${config.interval || 'D'}",
      "timezone": "America/New_York",
      "theme": "${config.theme || 'dark'}",
      "style": "1",
      "locale": "en",
      "toolbar_bg": "#f1f3f6",
      "enable_publishing": false,
      "allow_symbol_change": false,
      "studies": [${indicators.map(i => `"${i}"`).join(',')}],
      "container_id": "${containerId}"
    });
  </script>
</div>`;
  }

  /**
   * Generate all TradingView links for an asset
   */
  static generateLinks(config: TradingViewChartConfig): TradingViewLink {
    return {
      url: this.generateChartUrl(config),
      embedUrl: this.generateEmbedUrl(config),
      widgetHtml: this.generateWidgetHtml(config),
    };
  }

  /**
   * Generate chart link with specific technical indicators
   */
  static generateTechnicalAnalysisChart(
    symbol: string,
    assetType: 'stock' | 'crypto' | 'forex' | 'commodity' | 'index',
    indicator: 'RSI' | 'MACD' | 'BB' | 'MA' | 'EMA' | 'VWAP'
  ): TradingViewLink {
    const indicators: Record<string, string[]> = {
      'RSI': ['RSI@tv-basicstudies'],
      'MACD': ['MACD@tv-basicstudies'],
      'BB': ['BB@tv-basicstudies'],
      'MA': ['MASimple@tv-basicstudies', 'MAExp@tv-basicstudies'],
      'EMA': ['MAExp@tv-basicstudies'],
      'VWAP': ['VWAP@tv-basicstudies'],
    };

    return this.generateLinks({
      symbol,
      assetType,
      indicators: indicators[indicator] || [],
      theme: 'dark',
      interval: 'D',
    });
  }

  /**
   * Generate chart for comparison of multiple assets
   */
  static generateComparisonChart(symbols: Array<{ symbol: string; assetType: string }>): string {
    const tvSymbols = symbols.map(s => this.formatSymbol(s.symbol, s.assetType)).join(',');
    return `${this.BASE_URL}?symbol=${encodeURIComponent(tvSymbols)}&theme=dark&interval=D`;
  }

  /**
   * Get shareable chart link (optimized for social media)
   */
  static getShareableLink(symbol: string, assetType: string): string {
    const tvSymbol = this.formatSymbol(symbol, assetType);
    return `https://www.tradingview.com/x/${tvSymbol}/`;
  }
}

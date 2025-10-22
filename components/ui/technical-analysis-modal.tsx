"use client";

import { useState, useEffect } from "react";
import { X, TrendingUp, TrendingDown, Activity, BarChart3, Target } from "lucide-react";

interface TechnicalAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  assetType: 'crypto' | 'stock' | 'forex' | 'commodity' | 'index';
  assetName?: string;
}

const TECHNICAL_INDICATORS = [
  { 
    id: 'rsi', 
    name: 'RSI (Relative Strength Index)', 
    code: 'STD;Relative%1Strength%1Index',
    description: 'Momentum oscillator measuring speed and magnitude of price changes',
    icon: Activity
  },
  { 
    id: 'macd', 
    name: 'MACD', 
    code: 'STD;MACD',
    description: 'Trend-following momentum indicator showing relationship between moving averages',
    icon: TrendingUp
  },
  { 
    id: 'bb', 
    name: 'Bollinger Bands', 
    code: 'STD;Bollinger%1Bands',
    description: 'Volatility indicator with upper and lower price bands',
    icon: BarChart3
  },
  { 
    id: 'stoch', 
    name: 'Stochastic Oscillator', 
    code: 'STD;Stochastic',
    description: 'Momentum indicator comparing closing price to price range',
    icon: Target
  },
  { 
    id: 'ema', 
    name: 'EMA (Exponential Moving Average)', 
    code: 'STD;EMA',
    description: 'Trend indicator giving more weight to recent prices',
    icon: TrendingUp
  },
  { 
    id: 'sma', 
    name: 'SMA (Simple Moving Average)', 
    code: 'STD;SMA',
    description: 'Basic trend indicator averaging prices over time',
    icon: TrendingUp
  },
  { 
    id: 'volume', 
    name: 'Volume', 
    code: 'STD;Volume',
    description: 'Shows trading activity and confirms price movements',
    icon: BarChart3
  },
  { 
    id: 'atr', 
    name: 'ATR (Average True Range)', 
    code: 'STD;Average%1True%1Range',
    description: 'Volatility indicator measuring market volatility',
    icon: Activity
  }
];

const TIMEFRAMES = [
  { id: '1', label: '1 Min', value: '1' },
  { id: '5', label: '5 Min', value: '5' },
  { id: '15', label: '15 Min', value: '15' },
  { id: '60', label: '1 Hour', value: '60' },
  { id: '240', label: '4 Hour', value: '240' },
  { id: 'D', label: 'Daily', value: 'D' },
  { id: 'W', label: 'Weekly', value: 'W' },
  { id: 'M', label: 'Monthly', value: 'M' }
];

export function TechnicalAnalysisModal({ 
  isOpen, 
  onClose, 
  symbol, 
  assetType,
  assetName 
}: TechnicalAnalysisModalProps) {
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(['rsi']);
  const [timeframe, setTimeframe] = useState('D');
  const [widgetLoaded, setWidgetLoaded] = useState(false);

  // Format symbol for TradingView
  const getTradingViewSymbol = () => {
    switch (assetType) {
      case 'crypto':
        return `BINANCE:${symbol}USDT`;
      case 'stock':
        return `NASDAQ:${symbol}`;
      case 'forex':
        return `FX:${symbol}`;
      case 'commodity':
        return `OANDA:${symbol}`;
      case 'index':
        return `INDEX:${symbol}`;
      default:
        return symbol;
    }
  };

  const toggleIndicator = (indicatorId: string) => {
    setSelectedIndicators(prev => {
      if (prev.includes(indicatorId)) {
        return prev.filter(id => id !== indicatorId);
      } else {
        return [...prev, indicatorId];
      }
    });
  };

  useEffect(() => {
    if (!isOpen) {
      setWidgetLoaded(false);
      return;
    }

    // Load TradingView widget
    const loadWidget = () => {
      const container = document.getElementById('technical-analysis-widget');
      if (!container) return;

      // Get selected indicator codes
      const studies = selectedIndicators
        .map(id => {
          const indicator = TECHNICAL_INDICATORS.find(ind => ind.id === id);
          return indicator ? indicator.code : null;
        })
        .filter(Boolean);

      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.async = true;
      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol: getTradingViewSymbol(),
        interval: timeframe,
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        allow_symbol_change: false,
        calendar: false,
        hide_top_toolbar: false,
        hide_legend: false,
        hide_side_toolbar: false,
        details: true,
        hotlist: false,
        hide_volume: false,
        save_image: true,
        backgroundColor: "#0F0F0F",
        gridColor: "rgba(242, 242, 242, 0.06)",
        withdateranges: true,
        range: "12M",
        enable_publishing: false,
        toolbar_bg: "#131722",
        studies: studies,
        support_host: "https://www.tradingview.com"
      });

      container.innerHTML = '';
      container.appendChild(script);
      setWidgetLoaded(true);
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(loadWidget, 100);
    return () => clearTimeout(timer);
  }, [isOpen, selectedIndicators, timeframe, symbol, assetType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000000] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative w-full max-w-7xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Technical Analysis
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {assetName || symbol} ({getTradingViewSymbol()})
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Controls Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Timeframe Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Timeframe
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf.id}
                      onClick={() => setTimeframe(tf.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        timeframe === tf.value
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quick Presets
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedIndicators(['rsi'])}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    RSI Only
                  </button>
                  <button
                    onClick={() => setSelectedIndicators(['rsi', 'macd'])}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                  >
                    RSI + MACD
                  </button>
                  <button
                    onClick={() => setSelectedIndicators(['rsi', 'macd', 'bb'])}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                  >
                    Full Analysis
                  </button>
                  <button
                    onClick={() => setSelectedIndicators([])}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            {/* Indicator Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select Indicators ({selectedIndicators.length} selected)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {TECHNICAL_INDICATORS.map((indicator) => {
                  const Icon = indicator.icon;
                  const isSelected = selectedIndicators.includes(indicator.id);
                  
                  return (
                    <button
                      key={indicator.id}
                      onClick={() => toggleIndicator(indicator.id)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-purple-600' : 'text-gray-500'}`} />
                        <span className={`font-semibold text-sm ${
                          isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-white'
                        }`}>
                          {indicator.name}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {indicator.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chart */}
            <div className="bg-[#0F0F0F] rounded-lg overflow-hidden" style={{ minHeight: '600px' }}>
              <div 
                id="technical-analysis-widget" 
                className="tradingview-widget-container"
                style={{ height: '600px', width: '100%' }}
              />
            </div>

            {/* Info Footer */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-1">
                    Interactive Chart
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Use the chart tools to draw trend lines, add more indicators, change chart types, and analyze price patterns. 
                    Click on any indicator in the chart legend to customize its settings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

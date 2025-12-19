"use client";

import { useState, useEffect, useRef } from "react";
import { X, TrendingUp, Activity, BarChart3, Target, Loader2 } from "lucide-react";

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
    name: 'RSI', 
    code: 'STD;Relative%1Strength%1Index',
    description: 'Momentum oscillator',
    icon: Activity
  },
  { 
    id: 'macd', 
    name: 'MACD', 
    code: 'STD;MACD',
    description: 'Trend-following momentum',
    icon: TrendingUp
  },
  { 
    id: 'bb', 
    name: 'Bollinger Bands', 
    code: 'STD;Bollinger%1Bands',
    description: 'Volatility indicator',
    icon: BarChart3
  },
  { 
    id: 'stoch', 
    name: 'Stochastic', 
    code: 'STD;Stochastic',
    description: 'Momentum oscillator',
    icon: Target
  },
  { 
    id: 'ema', 
    name: 'EMA', 
    code: 'STD;EMA',
    description: 'Exponential Moving Avg',
    icon: TrendingUp
  },
  { 
    id: 'sma', 
    name: 'SMA', 
    code: 'STD;SMA',
    description: 'Simple Moving Avg',
    icon: TrendingUp
  },
  { 
    id: 'volume', 
    name: 'Volume', 
    code: 'STD;Volume',
    description: 'Trading activity',
    icon: BarChart3
  },
  { 
    id: 'atr', 
    name: 'ATR', 
    code: 'STD;Average%1True%1Range',
    description: 'Volatility measure',
    icon: Activity
  }
];

const TIMEFRAMES = [
  { id: '1', label: '1m', value: '1' },
  { id: '5', label: '5m', value: '5' },
  { id: '15', label: '15m', value: '15' },
  { id: '60', label: '1H', value: '60' },
  { id: '240', label: '4H', value: '240' },
  { id: 'D', label: '1D', value: 'D' },
  { id: 'W', label: '1W', value: 'W' },
  { id: 'M', label: '1M', value: 'M' }
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
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef(`tradingview-widget-${Date.now()}`);

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

  // Load TradingView widget
  useEffect(() => {
    if (!isOpen) {
      setIsLoading(true);
      return;
    }

    const loadWidget = () => {
      const container = containerRef.current;
      if (!container) return;

      // Clear existing content
      container.innerHTML = '';
      setIsLoading(true);

      // Get selected indicator codes
      const studies = selectedIndicators
        .map(id => {
          const indicator = TECHNICAL_INDICATORS.find(ind => ind.id === id);
          return indicator ? indicator.code : null;
        })
        .filter(Boolean);

      // Create widget container with unique ID
      const widgetContainer = document.createElement('div');
      widgetContainer.id = widgetIdRef.current;
      widgetContainer.className = 'tradingview-widget-container__widget';
      widgetContainer.style.height = '100%';
      widgetContainer.style.width = '100%';

      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.async = true;
      script.type = 'text/javascript';
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
        backgroundColor: "rgba(15, 15, 15, 1)",
        gridColor: "rgba(242, 242, 242, 0.06)",
        withdateranges: true,
        range: "12M",
        enable_publishing: false,
        toolbar_bg: "#131722",
        studies: studies,
        support_host: "https://www.tradingview.com"
      });

      container.appendChild(widgetContainer);
      widgetContainer.appendChild(script);

      // Set loading to false after a delay
      const loadingTimer = setTimeout(() => setIsLoading(false), 2000);
      
      return () => clearTimeout(loadingTimer);
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(loadWidget, 200);
    return () => clearTimeout(timer);
  }, [isOpen, selectedIndicators, timeframe, symbol, assetType]);

  // Handle escape key and body overflow
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Content */}
      <div 
        className="relative w-full max-w-7xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col z-10"
        onClick={(e) => e.stopPropagation()}
      >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                {assetName || symbol}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{getTradingViewSymbol()}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3 overflow-y-auto">
            {/* Timeframe & Indicators - Single Row */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Timeframe */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Timeframe:
                </label>
                <div className="flex gap-1">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf.id}
                      onClick={() => setTimeframe(tf.value)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
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

              {/* Indicator Count */}
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Indicators: {selectedIndicators.length}
              </div>
            </div>

            {/* Indicator Buttons - Compact Grid */}
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {TECHNICAL_INDICATORS.map((indicator) => {
                const Icon = indicator.icon;
                const isSelected = selectedIndicators.includes(indicator.id);
                
                return (
                  <button
                    key={indicator.id}
                    onClick={() => toggleIndicator(indicator.id)}
                    className={`p-2 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                        : 'border-gray-300 dark:border-gray-700 hover:border-purple-400'
                    }`}
                    title={indicator.description}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Icon className={`w-4 h-4 ${
                        isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500'
                      }`} />
                      <span className={`font-semibold text-xs ${
                        isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-400'
                      }`}>
                        {indicator.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Chart - Larger */}
            <div className="relative bg-[#0F0F0F] rounded-lg overflow-hidden border border-gray-700" style={{ minHeight: '650px', height: '650px' }}>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0F0F0F] z-10">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400 text-sm">Loading chart...</p>
                  </div>
                </div>
              )}
              <div 
                ref={containerRef}
                className="tradingview-widget-container"
                style={{ height: '100%', width: '100%' }}
              />
            </div>
          </div>
        </div>
    </div>
  );
}

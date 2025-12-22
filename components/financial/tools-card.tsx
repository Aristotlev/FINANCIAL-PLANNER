"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Wrench,
  Plus,
  X,
  TrendingUp,
  DollarSign,
  Globe,
  Coins,
  BarChart3,
  LineChart,
  Maximize2,
  Minimize2
} from "lucide-react";
import { TbChartCandle, TbChartLine } from "react-icons/tb";
import { EnhancedFinancialCard } from "../ui/enhanced-financial-card";
import { formatNumber } from "../../lib/utils";

// Tools Hover Content
function ToolsHoverContent() {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-900 dark:text-white">Trading Tools</span>
        <span className="text-sm font-bold text-purple-600">Active</span>
      </div>
      <div className="text-xs space-y-1">
        <div className="flex justify-between">
          <span>Stock Charts:</span>
          <span className="font-medium">Real-time</span>
        </div>
        <div className="flex justify-between">
          <span>Crypto Data:</span>
          <span className="font-medium">Live Updates</span>
        </div>
        <div className="flex justify-between">
          <span>Forex Pairs:</span>
          <span className="font-medium">Multi-Currency</span>
        </div>
        <div className="flex justify-between">
          <span>Technical Analysis:</span>
          <span className="font-medium">Advanced</span>
        </div>
      </div>
    </div>
  );
}

// Tools Modal Content
function ToolsModalContent() {
  const [activeTab, setActiveTab] = useState<'chart' | 'stocks' | 'crypto' | 'forex'>('chart');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Track which tabs have been loaded to avoid re-loading
  const loadedTabsRef = useRef<Set<string>>(new Set());
  // Track if initial load is complete
  const initialLoadRef = useRef(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const chartContainer = document.getElementById(`tradingview-${activeTab}-container`);
      if (chartContainer) {
        // Try different fullscreen APIs for browser compatibility
        const requestFullscreen = chartContainer.requestFullscreen || 
                                   (chartContainer as any).webkitRequestFullscreen || 
                                   (chartContainer as any).mozRequestFullScreen || 
                                   (chartContainer as any).msRequestFullscreen;
        
        if (requestFullscreen) {
          requestFullscreen.call(chartContainer).then(() => {
            setIsFullscreen(true);
          }).catch((err: any) => {
            console.error('Error attempting to enable fullscreen:', err);
            alert('Unable to enter fullscreen mode. Please try a different browser or check permissions.');
          });
        }
      } else {
        console.error('Chart container not found:', `tradingview-${activeTab}-container`);
      }
    } else {
      const exitFullscreen = document.exitFullscreen || 
                             (document as any).webkitExitFullscreen || 
                             (document as any).mozCancelFullScreen || 
                             (document as any).msExitFullscreen;
      
      if (exitFullscreen) {
        exitFullscreen.call(document).then(() => {
          setIsFullscreen(false);
        }).catch((err: any) => {
          console.error('Error attempting to exit fullscreen:', err);
        });
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    // Add listeners for all browser variants
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    // If this tab was already loaded, just show it without reloading
    if (loadedTabsRef.current.has(activeTab)) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    const loadTradingViewWidget = () => {
      if (typeof window === 'undefined') return;

      // Suppress TradingView iframe contentWindow errors - these are expected during widget initialization
      const originalError = console.error;
      console.error = (...args) => {
        const errorMsg = args[0]?.toString() || '';
        if (errorMsg.includes('contentWindow') || errorMsg.includes('tradingview')) {
          return; // Suppress TradingView-related errors
        }
        originalError.apply(console, args);
      };

      // Load immediately - no artificial delay
      const loadWidget = () => {
        try {
          if (activeTab === 'chart') {
            const container = document.getElementById('tradingview-chart-widget');
            if (!container) {
              console.error('TradingView chart container not found');
              setIsLoading(false);
              return;
            }
            
            // Skip if already has content (cached)
            if (container.querySelector('.tradingview-widget-container__widget iframe')) {
              loadedTabsRef.current.add(activeTab);
              setIsLoading(false);
              return;
            }
            
            container.innerHTML = '';
            
            // TradingView Widget - Exact structure
            const widgetHtml = `
              <div class="tradingview-widget-container" style="height:100%;width:100%">
                <div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>
              </div>
            `;
            
            container.innerHTML = widgetHtml;
            
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
            script.async = true;
            script.onload = () => {
              // Mark as loaded immediately, no artificial delay
              loadedTabsRef.current.add(activeTab);
              setIsLoading(false);
              // Restore console.error after a short delay
              setTimeout(() => {
                console.error = originalError;
              }, 500);
            };
            script.onerror = (e) => {
              setIsLoading(false);
              console.error = originalError; // Restore on error
            };
            script.innerHTML = JSON.stringify({
              "allow_symbol_change": true,
              "calendar": false,
              "details": true,
              "hide_side_toolbar": false,
              "hide_top_toolbar": false,
              "hide_legend": false,
              "hide_volume": false,
              "hotlist": true,
              "interval": "D",
              "locale": "en",
              "save_image": true,
              "style": "1",
              "symbol": "NASDAQ:AAPL",
              "theme": "dark",
              "timezone": "Etc/UTC",
              "backgroundColor": "#0F0F0F",
              "gridColor": "rgba(242, 242, 242, 0.06)",
              "watchlist": [],
              "withdateranges": true,
              "range": "YTD",
              "compareSymbols": [],
              "show_popup_button": true,
              "popup_height": "650",
              "popup_width": "1000",
              "studies": [],
              "autosize": true
            });
            
            container.querySelector('.tradingview-widget-container')?.appendChild(script);
            
          } else if (activeTab === 'stocks') {
            const container = document.getElementById('tradingview-stocks-widget');
            if (!container) {
              console.error('TradingView stocks container not found');
              setIsLoading(false);
              return;
            }
            
            // Skip if already has content (cached)
            if (container.querySelector('.tradingview-widget-container__widget iframe')) {
              loadedTabsRef.current.add(activeTab);
              setIsLoading(false);
              return;
            }
            
            container.innerHTML = '';
            
            // TradingView Stock Heatmap Widget
            const widgetHtml = `
              <div class="tradingview-widget-container" style="height:100%;width:100%">
                <div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>
              </div>
            `;
            
            container.innerHTML = widgetHtml;
            
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js';
            script.async = true;
            script.onload = () => {
              loadedTabsRef.current.add(activeTab);
              setIsLoading(false);
              setTimeout(() => {
                console.error = originalError;
              }, 500);
            };
            script.onerror = (e) => {
              setIsLoading(false);
              console.error = originalError;
            };
            script.innerHTML = JSON.stringify({
              "dataSource": "SPX500",
              "blockSize": "market_cap_basic",
              "blockColor": "change",
              "grouping": "sector",
              "locale": "en",
              "symbolUrl": "",
              "colorTheme": "dark",
              "exchanges": [],
              "hasTopBar": true,
              "isDataSetEnabled": true,
              "isZoomEnabled": true,
              "hasSymbolTooltip": true,
              "isMonoSize": true,
              "width": "100%",
              "height": "100%"
            });
            
            container.querySelector('.tradingview-widget-container')?.appendChild(script);
            
          } else if (activeTab === 'crypto') {
            const container = document.getElementById('tradingview-crypto-widget');
            if (!container) {
              console.error('TradingView crypto container not found');
              setIsLoading(false);
              return;
            }
            
            // Skip if already has content (cached)
            if (container.querySelector('.tradingview-widget-container__widget iframe')) {
              loadedTabsRef.current.add(activeTab);
              setIsLoading(false);
              return;
            }
            
            container.innerHTML = '';
            
            const widgetHtml = `
              <div class="tradingview-widget-container" style="height:100%;width:100%">
                <div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>
              </div>
            `;
            
            container.innerHTML = widgetHtml;
            
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-screener.js';
            script.async = true;
            script.onload = () => {
              loadedTabsRef.current.add(activeTab);
              setIsLoading(false);
              setTimeout(() => {
                console.error = originalError;
              }, 500);
            };
            script.onerror = (e) => {
              setIsLoading(false);
              console.error = originalError;
            };
            script.text = JSON.stringify({
              "width": "100%",
              "height": "100%",
              "defaultColumn": "overview",
              "screener_type": "crypto_mkt",
              "displayCurrency": "USD",
              "colorTheme": "dark",
              "locale": "en"
            });
            
            container.querySelector('.tradingview-widget-container')?.appendChild(script);
            
          } else if (activeTab === 'forex') {
            const container = document.getElementById('tradingview-forex-widget');
            if (!container) {
              console.error('TradingView forex container not found');
              setIsLoading(false);
              return;
            }
            
            // Skip if already has content (cached)
            if (container.querySelector('.tradingview-widget-container__widget iframe')) {
              loadedTabsRef.current.add(activeTab);
              setIsLoading(false);
              return;
            }
            
            container.innerHTML = '';
            
            const widgetHtml = `
              <div class="tradingview-widget-container" style="height:100%;width:100%">
                <div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>
              </div>
            `;
            
            container.innerHTML = widgetHtml;
            
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-forex-cross-rates.js';
            script.async = true;
            script.onload = () => {
              loadedTabsRef.current.add(activeTab);
              setIsLoading(false);
              setTimeout(() => {
                console.error = originalError;
              }, 500);
            };
            script.onerror = (e) => {
              setIsLoading(false);
              console.error = originalError;
            };
            script.text = JSON.stringify({
              "width": "100%",
              "height": "100%",
              "currencies": ["EUR", "USD", "JPY", "GBP", "CHF", "AUD", "CAD", "NZD"],
              "isTransparent": false,
              "colorTheme": "dark",
              "locale": "en"
            });
            
            container.querySelector('.tradingview-widget-container')?.appendChild(script);
          }
        } catch (error) {
          console.error = originalError; // Restore original console.error
          console.error('Error loading TradingView widget:', error);
          setIsLoading(false);
        }
      };

      // Use requestAnimationFrame for smoother initialization
      requestAnimationFrame(() => {
        loadWidget();
      });

      return () => {
        console.error = originalError; // Ensure cleanup restores console.error
      };
    };

    const cleanup = loadTradingViewWidget();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [activeTab]);

  return (
    <div className="p-6">
      <style jsx>{`
        #tradingview-chart-container:fullscreen,
        #tradingview-stocks-container:fullscreen,
        #tradingview-crypto-container:fullscreen,
        #tradingview-forex-container:fullscreen {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          background-color: #131722;
        }
        #tradingview-chart-container:fullscreen #tradingview-chart-widget,
        #tradingview-stocks-container:fullscreen #tradingview-stocks-widget,
        #tradingview-crypto-container:fullscreen #tradingview-crypto-widget,
        #tradingview-forex-container:fullscreen #tradingview-forex-widget {
          height: 100vh !important;
          width: 100vw !important;
          max-width: 100% !important;
          max-height: 100% !important;
        }
        #tradingview-chart-container:fullscreen .tradingview-widget-container,
        #tradingview-stocks-container:fullscreen .tradingview-widget-container,
        #tradingview-crypto-container:fullscreen .tradingview-widget-container,
        #tradingview-forex-container:fullscreen .tradingview-widget-container {
          height: 100vh !important;
          width: 100vw !important;
          max-width: 100%;
        }
        
        /* Webkit fullscreen */
        #tradingview-chart-container:-webkit-full-screen,
        #tradingview-stocks-container:-webkit-full-screen,
        #tradingview-crypto-container:-webkit-full-screen,
        #tradingview-forex-container:-webkit-full-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          background-color: #131722;
        }
        
        /* Mozilla fullscreen */
        #tradingview-chart-container:-moz-full-screen,
        #tradingview-stocks-container:-moz-full-screen,
        #tradingview-crypto-container:-moz-full-screen,
        #tradingview-forex-container:-moz-full-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          background-color: #131722;
        }
        
        /* MS fullscreen */
        #tradingview-chart-container:-ms-fullscreen,
        #tradingview-stocks-container:-ms-fullscreen,
        #tradingview-crypto-container:-ms-fullscreen,
        #tradingview-forex-container:-ms-fullscreen {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          background-color: #131722;
        }
      `}</style>
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex justify-between items-center">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {[
              { id: 'chart', label: 'Chart', icon: TbChartCandle },
              { id: 'stocks', label: 'Stocks', icon: TrendingUp },
              { id: 'crypto', label: 'Crypto', icon: Coins },
              { id: 'forex', label: 'Forex', icon: DollarSign }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Fullscreen Toggle Button */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4" />
                <span className="text-sm">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                <span className="text-sm">Fullscreen</span>
              </>
            )}
          </button>
        </div>

        {/* Chart Tab */}
        <div className={`space-y-4 ${activeTab === 'chart' ? 'block' : 'hidden'}`}>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/50 dark:hover:shadow-purple-500/30 cursor-pointer">
                <div className="text-2xl font-bold text-purple-600">Live</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Real-time Data</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/50 dark:hover:shadow-purple-500/30 cursor-pointer">
                <div className="text-2xl font-bold text-purple-600">50+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Indicators</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/50 dark:hover:shadow-purple-500/30 cursor-pointer">
                <div className="text-2xl font-bold text-purple-600">Global</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Markets</div>
              </div>
            </div>

            {/* Chart Widget */}
            <div id="tradingview-chart-container" className="rounded-lg overflow-hidden relative" style={{ minHeight: '600px', backgroundColor: '#131722' }}>
              {isLoading && activeTab === 'chart' && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#131722] z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading TradingView Chart...</p>
                  </div>
                </div>
              )}
              <div id="tradingview-chart-widget" style={{ height: '650px', width: '100%', minHeight: '600px', backgroundColor: '#131722' }}></div>
            </div>

            {/* Chart Info Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <TbChartCandle className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Technical Analysis</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Advanced charting tools and indicators</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Market Data</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Real-time quotes and historical data</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <LineChart className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Symbol Search</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Search and compare any stock</p>
              </div>
            </div>
        </div>

        {/* Stocks Tab */}
        <div className={`space-y-4 ${activeTab === 'stocks' ? 'block' : 'hidden'}`}>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/50 dark:hover:shadow-purple-500/30 cursor-pointer">
                <div className="text-2xl font-bold text-purple-600">500+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">US Stocks</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/50 dark:hover:shadow-purple-500/30 cursor-pointer">
                <div className="text-2xl font-bold text-purple-600">Live</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Market Data</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/50 dark:hover:shadow-purple-500/30 cursor-pointer">
                <div className="text-2xl font-bold text-purple-600">Multi</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Screener</div>
              </div>
            </div>

            {/* Stocks Screener Widget */}
            <div id="tradingview-stocks-container" className="rounded-lg overflow-hidden relative" style={{ minHeight: '600px', backgroundColor: '#131722' }}>
              {isLoading && activeTab === 'stocks' && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#131722] z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading Stock Screener...</p>
                  </div>
                </div>
              )}
              <div id="tradingview-stocks-widget" style={{ height: '650px', width: '100%', minHeight: '600px', backgroundColor: '#131722' }}></div>
            </div>

            {/* Stocks Info Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Market Movers</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Top gainers and losers</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Stock Screener</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Filter by fundamentals</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <LineChart className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Performance</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Real-time tracking</p>
              </div>
            </div>
        </div>

        {/* Crypto Tab */}
        <div className={`space-y-4 ${activeTab === 'crypto' ? 'block' : 'hidden'}`}>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/50 dark:hover:shadow-purple-500/30 cursor-pointer">
                <div className="text-2xl font-bold text-purple-600">24/7</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Trading</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/50 dark:hover:shadow-purple-500/30 cursor-pointer">
                <div className="text-2xl font-bold text-purple-600">1000+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Cryptocurrencies</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/50 dark:hover:shadow-purple-500/30 cursor-pointer">
                <div className="text-2xl font-bold text-purple-600">Live</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Market Cap</div>
              </div>
            </div>

            {/* Crypto Screener Widget */}
            <div id="tradingview-crypto-container" className="rounded-lg overflow-hidden relative" style={{ minHeight: '600px', backgroundColor: '#131722' }}>
              {isLoading && activeTab === 'crypto' && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#131722] z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading Crypto Screener...</p>
                  </div>
                </div>
              )}
              <div id="tradingview-crypto-widget" style={{ height: '650px', width: '100%', minHeight: '600px', backgroundColor: '#131722' }}></div>
            </div>

            {/* Crypto Info Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Top Cryptos</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Bitcoin, Ethereum, and more</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Market Movers</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Top gainers and losers</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Volume Analysis</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">24h trading volume data</p>
              </div>
            </div>
        </div>

        {/* Forex Tab */}
        <div className={`space-y-4 ${activeTab === 'forex' ? 'block' : 'hidden'}`}>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/50 dark:hover:shadow-purple-500/30 cursor-pointer">
                <div className="text-2xl font-bold text-purple-600">8</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Major Currencies</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/50 dark:hover:shadow-purple-500/30 cursor-pointer">
                <div className="text-2xl font-bold text-purple-600">Live</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Exchange Rates</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/50 dark:hover:shadow-purple-500/30 cursor-pointer">
                <div className="text-2xl font-bold text-purple-600">Multi</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Currency Pairs</div>
              </div>
            </div>

            {/* Forex Cross Rates Widget */}
            <div id="tradingview-forex-container" className="rounded-lg overflow-hidden relative" style={{ minHeight: '600px', backgroundColor: '#131722' }}>
              {isLoading && activeTab === 'forex' && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#131722] z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading Forex Data...</p>
                  </div>
                </div>
              )}
              <div id="tradingview-forex-widget" style={{ height: '650px', width: '100%', minHeight: '600px', backgroundColor: '#131722' }}></div>
            </div>

            {/* Forex Info Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Major Pairs</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">EUR/USD, GBP/USD, USD/JPY</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Cross Rates</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Real-time currency matrix</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <TbChartLine className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Rate Changes</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">24h percentage changes</p>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}

// Tools Card Component
export function ToolsCard() {
  const chartData = [
    { value: 95, change: "+3.5%" },
    { value: 100, change: "+2.8%" },
    { value: 98, change: "-1.2%" },
    { value: 105, change: "+4.5%" },
    { value: 110, change: "+5.2%" },
  ];

  return (
    <EnhancedFinancialCard
      title="Tools"
      description="Trading tools for stocks, crypto & forex"
      amount="Active"
      change="Live Data"
      changeType="positive"
      mainColor="#f43f5e"
      secondaryColor="#fb7185"
      gridColor="#f43f5e15"
      stats={[
        { label: "Stocks", value: "Charts", color: "#8b5cf6" },
        { label: "Crypto", value: "Screener", color: "#a78bfa" }
      ]}
      icon={Wrench}
      hoverContent={<ToolsHoverContent />}
      modalContent={<ToolsModalContent />}
      chartData={chartData}
    />
  );
}

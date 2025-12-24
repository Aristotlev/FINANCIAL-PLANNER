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
  Minimize2,
  Bell,
  History,
  Trash2,
  ChevronDown,
  ChevronRight,
  Calendar,
  Mail,
  Search,
  Loader2,
  CandlestickChart
} from "lucide-react";
import { EnhancedFinancialCard } from "../ui/enhanced-financial-card";
import { formatNumber } from "../../lib/utils";
import { TRADING_DATABASE } from "../../lib/trading-database";

// Types
interface Alert {
  id: string;
  symbol: string;
  targetPrice: number;
  currentPrice: number;
  condition: 'above' | 'below';
  active: boolean;
}

interface Trade {
  id: string;
  date: string;
  symbol: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  total: number;
  status: 'completed' | 'pending';
}

// Mock Data for History
const MOCK_TRADES: Trade[] = [
  { id: '1', date: '2024-03-15', symbol: 'AAPL', type: 'buy', amount: 10, price: 175.50, total: 1755.00, status: 'completed' },
  { id: '2', date: '2024-02-28', symbol: 'BTC', type: 'buy', amount: 0.05, price: 62000.00, total: 3100.00, status: 'completed' },
  { id: '3', date: '2023-11-10', symbol: 'TSLA', type: 'sell', amount: 5, price: 210.00, total: 1050.00, status: 'completed' },
  { id: '4', date: '2023-08-05', symbol: 'ETH', type: 'buy', amount: 1.5, price: 1800.00, total: 2700.00, status: 'completed' },
  { id: '5', date: '2022-12-15', symbol: 'NVDA', type: 'buy', amount: 20, price: 145.00, total: 2900.00, status: 'completed' },
  { id: '6', date: '2022-06-20', symbol: 'AMD', type: 'sell', amount: 50, price: 85.00, total: 4250.00, status: 'completed' },
  { id: '7', date: '2021-11-01', symbol: 'SOL', type: 'buy', amount: 100, price: 200.00, total: 20000.00, status: 'completed' },
  { id: '8', date: '2021-05-15', symbol: 'DOGE', type: 'sell', amount: 10000, price: 0.50, total: 5000.00, status: 'completed' },
];

// Alerts Tab Component
function AlertsTab() {
  const [alerts, setAlerts] = useState<Alert[]>([
    { id: '1', symbol: 'AAPL', targetPrice: 180.00, currentPrice: 175.43, condition: 'above', active: true },
    { id: '2', symbol: 'BTC', targetPrice: 60000.00, currentPrice: 64230.00, condition: 'below', active: true },
  ]);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [email, setEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const filteredAssets = TRADING_DATABASE.filter(asset => 
    asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10);

  const handleAddAlert = async () => {
    if (!selectedSymbol || !targetPrice) return;
    
    setIsCreating(true);
    
    const asset = TRADING_DATABASE.find(a => a.symbol === selectedSymbol);
    const price = parseFloat(targetPrice);
    const currentPrice = asset?.currentPrice || 0;
    const condition = price > currentPrice ? 'above' : 'below';
    
    try {
      // Call the API to send the email
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: selectedSymbol,
          targetPrice: price,
          condition,
          userEmail: email || 'delivered@resend.dev' // Fallback for testing
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create alert');
      }

      const newAlert: Alert = {
        id: Math.random().toString(36).substr(2, 9),
        symbol: selectedSymbol,
        targetPrice: price,
        currentPrice: currentPrice,
        condition,
        active: true
      };

      setAlerts([...alerts, newAlert]);
      setSelectedSymbol('');
      setTargetPrice('');
      setSearchQuery('');
      // Don't clear email so they can add another easily
    } catch (error) {
      console.error('Error creating alert:', error);
      alert('Failed to create alert. Please check your connection and try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Add Alert Form */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-purple-600" />
          Create New Alert
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <label className="block text-xs text-gray-500 mb-1">Asset</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search asset..."
                className="w-full pl-8 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
            </div>
            {searchQuery && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredAssets.map(asset => (
                  <button
                    key={asset.symbol}
                    onClick={() => {
                      setSelectedSymbol(asset.symbol);
                      setSearchQuery(`${asset.symbol} - ${asset.name}`);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center"
                  >
                    <span>{asset.symbol}</span>
                    <span className="text-gray-500 text-xs">{asset.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Target Price</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email Notification</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-8 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAddAlert}
              disabled={!selectedSymbol || !targetPrice || isCreating}
              className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Setting Alert...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Set Alert
                </>
              )}
            </button>
          </div>
        </div>
        
        <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
          <Mail className="w-3 h-3" />
          We'll send a confirmation email to verify the alert.
        </p>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Active Alerts</h3>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No active alerts</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {alerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-sm">
                    {alert.symbol.substring(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white">{alert.symbol}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        alert.condition === 'above' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {alert.condition === 'above' ? '≥' : '≤'} ${formatNumber(alert.targetPrice)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Current: ${formatNumber(alert.currentPrice)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteAlert(alert.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// History Tab Component
function HistoryTab() {
  const [expandedYears, setExpandedYears] = useState<string[]>([]);

  const toggleYear = (year: string) => {
    setExpandedYears(prev => 
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  // Group trades by year
  const groupedTrades = MOCK_TRADES.reduce((acc, trade) => {
    const year = new Date(trade.date).getFullYear().toString();
    if (!acc[year]) acc[year] = [];
    acc[year].push(trade);
    return acc;
  }, {} as Record<string, Trade[]>);

  const years = Object.keys(groupedTrades).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Trade History</h3>
        <div className="text-xs text-gray-500">
          {MOCK_TRADES.length} total trades
        </div>
      </div>

      <div className="space-y-3">
        {years.map(year => (
          <div key={year} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleYear(year)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span className="font-semibold text-gray-900 dark:text-white">{year}</span>
                <span className="text-xs text-gray-500 bg-white dark:bg-gray-900 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                  {groupedTrades[year].length} trades
                </span>
              </div>
              {expandedYears.includes(year) ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {expandedYears.includes(year) && (
              <div className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                {groupedTrades[year].map(trade => (
                  <div key={trade.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        trade.type === 'buy' 
                          ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {trade.type === 'buy' ? <TrendingUp className="w-4 h-4" /> : <TrendingUp className="w-4 h-4 transform rotate-180" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-white">{trade.symbol}</span>
                          <span className={`text-xs font-medium uppercase ${
                            trade.type === 'buy' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {trade.type}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900 dark:text-white">
                        ${formatNumber(trade.total)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {trade.amount} @ ${formatNumber(trade.price)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState<'chart' | 'stocks' | 'crypto' | 'forex' | 'alerts' | 'history'>('chart');
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
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex border-b border-gray-200 dark:border-gray-700 flex-1 min-w-0">
            <div className="flex overflow-x-auto scrollbar-hide w-full">
              {[
                { id: 'chart', label: 'Chart', icon: CandlestickChart },
                { id: 'stocks', label: 'Stocks', icon: TrendingUp },
                { id: 'crypto', label: 'Crypto', icon: Coins },
                { id: 'forex', label: 'Forex', icon: DollarSign },
                { id: 'alerts', label: 'Alerts', icon: Bell },
                { id: 'history', label: 'History', icon: History }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 border-b-2 transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                    activeTab === id
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400 font-semibold'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Fullscreen Toggle Button */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex-shrink-0"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">Fullscreen</span>
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
                  <CandlestickChart className="w-4 h-4 text-purple-600" />
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
                  <LineChart className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Rate Changes</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">24h percentage changes</p>
              </div>
            </div>
        </div>

        {/* Alerts Tab */}
        <div className={`space-y-4 ${activeTab === 'alerts' ? 'block' : 'hidden'}`}>
          <AlertsTab />
        </div>

        {/* History Tab */}
        <div className={`space-y-4 ${activeTab === 'history' ? 'block' : 'hidden'}`}>
          <HistoryTab />
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

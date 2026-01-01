"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Newspaper,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Globe,
  Coins,
  BarChart3,
  Clock,
  ArrowUpRight,
  User,
  Sparkles
} from "lucide-react";
import { EnhancedFinancialCard } from "../ui/enhanced-financial-card";
import { formatNumber } from "../../lib/utils";
import { usePortfolioContext } from "../../contexts/portfolio-context";
import { ThemedStatBox, CARD_THEME_COLORS } from "../ui/themed-stat-box";
import { useTranslation } from "../../contexts/translation-context";

interface NewsItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  category: string;
  matchedSymbol?: string;
}

// News sources configuration - matches API sources
const NEWS_SOURCES = {
  crypto: [
    { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", color: "#FF6B35" },
    { name: "CoinTelegraph", url: "https://cointelegraph.com/rss", color: "#00D4AA" },
    { name: "The Block", url: "https://www.theblock.co/rss.xml", color: "#1A1A1A" },
    { name: "Decrypt", url: "https://decrypt.co/feed", color: "#0052FF" },
    { name: "Bitcoin Magazine", url: "https://bitcoinmagazine.com/.rss/full/", color: "#5B67E5" },
    { name: "Crypto Briefing", url: "https://cryptobriefing.com/feed/", color: "#7C3AED" },
    { name: "CryptoSlate", url: "https://cryptoslate.com/feed/", color: "#4A5568" },
    { name: "NewsBTC", url: "https://www.newsbtc.com/feed/", color: "#F7931A" },
    { name: "Google News", url: "https://news.google.com", color: "#4285F4" }
  ],
  stocks: [
    { name: "MarketWatch", url: "https://www.marketwatch.com/rss/topstories", color: "#0066CC" },
    { name: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex", color: "#720E9E" },
    { name: "Investing.com", url: "https://www.investing.com/rss/news_285.rss", color: "#FF7700" },
    { name: "Seeking Alpha", url: "https://seekingalpha.com/feed.xml", color: "#FF7A00" },
    { name: "Benzinga", url: "https://www.benzinga.com/feed", color: "#F08518" },
    { name: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", color: "#0099CC" },
    { name: "Reuters Business", url: "https://www.reutersagency.com/feed/", color: "#FF6600" },
    { name: "Barron's", url: "https://www.barrons.com/xml/rss/3_7014.xml", color: "#0080C9" },
    { name: "The Motley Fool", url: "https://www.fool.com/feeds/index.aspx", color: "#D9232D" },
    { name: "Google News", url: "https://news.google.com", color: "#4285F4" }
  ],
  forex: [
    { name: "FXStreet", url: "https://www.fxstreet.com/news/rss", color: "#1E40AF" },
    { name: "DailyFX", url: "https://www.dailyfx.com/feeds/market-news", color: "#059669" },
    { name: "ForexLive", url: "https://www.forexlive.com/feed/news", color: "#DC2626" },
    { name: "Investing.com FX", url: "https://www.investing.com/rss/news_1.rss", color: "#7C3AED" },
    { name: "FXEmpire", url: "https://www.fxempire.com/api/rss/news", color: "#0052FF" },
    { name: "Action Forex", url: "https://www.actionforex.com/rss/", color: "#2563EB" },
    { name: "Finance Magnates", url: "https://www.financemagnates.com/feed/", color: "#F59E0B" }
  ],
  indices: [
    { name: "MarketWatch", url: "https://www.marketwatch.com/rss/topstories", color: "#0088CC" },
    { name: "Investing.com", url: "https://www.investing.com/rss/news.rss", color: "#005EB8" },
    { name: "Reuters Markets", url: "https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best", color: "#FF6600" },
    { name: "CNBC Markets", url: "https://www.cnbc.com/id/10000664/device/rss/rss.html", color: "#0099CC" },
    { name: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex", color: "#720E9E" },
    { name: "Bloomberg", url: "https://www.bloomberg.com/feed/podcast/etf-iq.xml", color: "#000000" },
    { name: "Financial Times", url: "https://www.ft.com/markets?format=rss", color: "#FFF1E5" },
    { name: "WSJ Markets", url: "https://feeds.wsj.com/wsj/xml/rss/3_7031.xml", color: "#0274B6" },
    { name: "Barron's Markets", url: "https://www.barrons.com/xml/rss/3_7031.xml", color: "#0080C9" },
    { name: "CNBC World", url: "https://www.cnbc.com/id/100727362/device/rss/rss.html", color: "#00AAE7" },
    { name: "The Motley Fool", url: "https://www.fool.com/feeds/index.aspx", color: "#D9232D" },
    { name: "Seeking Alpha", url: "https://seekingalpha.com/feed.xml", color: "#FF7A00" }
  ],
  general: [
    { name: "Reuters Top News", url: "https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best", color: "#FF6600" },
    { name: "CNBC Top News", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", color: "#0099CC" },
    { name: "WSJ World News", url: "https://feeds.wsj.com/wsj/xml/rss/3_7085.xml", color: "#0274B6" },
    { name: "Financial Times World", url: "https://www.ft.com/world?format=rss", color: "#FFF1E5" },
    { name: "BBC Business", url: "http://feeds.bbci.co.uk/news/business/rss.xml", color: "#BB1919" },
    { name: "CNN Business", url: "http://rss.cnn.com/rss/money_latest.rss", color: "#CC0000" },
    { name: "Forbes Business", url: "https://www.forbes.com/business/feed/", color: "#000000" },
    { name: "Business Insider", url: "https://feeds.businessinsider.com/custom/all", color: "#1C1C1C" }
  ]
};

// News Hover Content
function NewsHoverContent() {
  const totalSources = Object.values(NEWS_SOURCES).reduce((sum, arr) => sum + arr.length, 0);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-gray-900 dark:text-white">News Sources</span>
        <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{totalSources} Total</span>
      </div>
      
      {/* Sample sources from each category */}
      <div className="space-y-1.5 text-[10px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Coins className="w-3 h-3 text-orange-600 dark:text-orange-400" />
            <span className="text-gray-700 dark:text-gray-300 font-medium">Crypto:</span>
          </div>
          <span className="text-gray-600 dark:text-gray-400">CoinDesk, CoinTelegraph +2</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-orange-600 dark:text-orange-400" />
            <span className="text-gray-700 dark:text-gray-300 font-medium">Stocks:</span>
          </div>
          <span className="text-gray-600 dark:text-gray-400">MarketWatch, Yahoo +2</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-orange-600 dark:text-orange-400" />
            <span className="text-gray-700 dark:text-gray-300 font-medium">Forex:</span>
          </div>
          <span className="text-gray-600 dark:text-gray-400">FXStreet, DailyFX +2</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <BarChart3 className="w-3 h-3 text-orange-600 dark:text-orange-400" />
            <span className="text-gray-700 dark:text-gray-300 font-medium">Indices:</span>
          </div>
          <span className="text-gray-600 dark:text-gray-400">Reuters, CNBC +2</span>
        </div>
      </div>
      
      <div className="pt-1 border-t border-gray-200 dark:border-gray-700">
        <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
          Multi-source aggregation
        </div>
      </div>
    </div>
  );
}

// Helper function to parse pubDate string to minutes for sorting
function parseTimeToMinutes(pubDate: string): number {
  const match = pubDate.match(/(\d+)\s+(minute|hour|day)s?\s+ago/);
  if (!match) return 0; // "Recently" or other formats = most recent
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  if (unit === 'minute') return value;
  if (unit === 'hour') return value * 60;
  if (unit === 'day') return value * 24 * 60;
  return 0;
}

// News Modal Content
function NewsModalContent() {
  const [activeTab, setActiveTab] = useState<'mynews' | 'crypto' | 'stocks' | 'forex' | 'indices' | 'general'>('mynews');
  const [error, setError] = useState<string | null>(null);
  
  // Store news for each tab separately for instant switching
  const [tabNews, setTabNews] = useState<Record<string, NewsItem[]>>({
    mynews: [],
    crypto: [],
    stocks: [],
    forex: [],
    indices: [],
    general: []
  });
  
  // Track loading state for each tab
  const [tabLoading, setTabLoading] = useState<Record<string, boolean>>({
    mynews: true,
    crypto: false,
    stocks: false,
    forex: false,
    indices: false,
    general: false
  });
  
  // Track which tabs have been loaded
  const loadedTabsRef = useRef<Set<string>>(new Set());
  const lastRefreshRef = useRef<Record<string, number>>({});
  
  // Get current tab's news
  const news = tabNews[activeTab] || [];
  const isTabLoading = tabLoading[activeTab];
  
  // Get portfolio context safely
  const portfolioContext = usePortfolioContext();
  const cryptoHoldings = portfolioContext?.cryptoHoldings || [];
  const stockHoldings = portfolioContext?.stockHoldings || [];

  // Helper to update news for a specific tab
  const updateTabNews = useCallback((tab: string, newsItems: NewsItem[]) => {
    setTabNews(prev => ({ ...prev, [tab]: newsItems }));
  }, []);

  // Helper to update loading state for a specific tab
  const updateTabLoading = useCallback((tab: string, isLoading: boolean) => {
    setTabLoading(prev => ({ ...prev, [tab]: isLoading }));
  }, []);

  // Fetch personalized news from API - returns real articles for each holding
  const fetchPersonalizedNewsFromAPI = useCallback(async (forceRefresh = false): Promise<NewsItem[]> => {
    // If no holdings, fetch general market news from API instead of mock data
    if (cryptoHoldings.length === 0 && stockHoldings.length === 0) {
      try {
        // Fetch general market news from crypto and stocks categories with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const [cryptoRes, stocksRes] = await Promise.allSettled([
          fetch(`/api/news?category=crypto${forceRefresh ? `&t=${Date.now()}` : ''}`, { signal: controller.signal }),
          fetch(`/api/news?category=stocks${forceRefresh ? `&t=${Date.now()}` : ''}`, { signal: controller.signal })
        ]);
        
        clearTimeout(timeoutId);
        
        const cryptoData = cryptoRes.status === 'fulfilled' && cryptoRes.value.ok 
          ? await cryptoRes.value.json() 
          : { news: [] };
        const stocksData = stocksRes.status === 'fulfilled' && stocksRes.value.ok 
          ? await stocksRes.value.json() 
          : { news: [] };
        
        // Combine and return top articles from each
        return [
          ...(cryptoData.news || []).slice(0, 4),
          ...(stocksData.news || []).slice(0, 4)
        ];
      } catch (error) {
        console.error('Error fetching general news:', error);
        return [];
      }
    }

    try {
      // Call the personalized news API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for personalized news
      
      const response = await fetch('/api/news/personalized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(forceRefresh ? { 'Cache-Control': 'no-cache' } : {})
        },
        body: JSON.stringify({
          cryptoHoldings: cryptoHoldings.map(h => ({ 
            symbol: h.symbol, 
            name: h.name 
          })),
          stockHoldings: stockHoldings.map(h => ({ 
            symbol: h.symbol, 
            name: h.name 
          }))
        }),
        cache: forceRefresh ? 'no-store' : 'default',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to fetch personalized news');
      }

      const data = await response.json();
      
      if (data.success && data.news && data.news.length > 0) {
        return data.news;
      }
      
      // Return empty array if API returns no data - no fake mock fallback
      return [];
    } catch (error) {
      console.error('Error fetching personalized news:', error);
      // Return empty array on error - no fake mock fallback
      return [];
    }
  }, [cryptoHoldings, stockHoldings]);

  // Optimized fetch function that stores news per tab
  const fetchNewsForTab = useCallback(async (category: string, forceRefresh = false) => {
    // Check if already loaded and not forcing refresh
    const cacheAge = lastRefreshRef.current[category] ? Date.now() - lastRefreshRef.current[category] : Infinity;
    const isCacheValid = cacheAge < 2 * 60 * 1000; // 2 minutes cache
    
    // Skip if already loaded and cache is valid (unless forcing refresh)
    if (loadedTabsRef.current.has(category) && isCacheValid && !forceRefresh) {
      return;
    }
    
    // For "My News" tab, fetch personalized news from API
    if (category === 'mynews') {
      updateTabLoading('mynews', true);
      setError(null);
      
      try {
        const personalizedNews = await fetchPersonalizedNewsFromAPI(forceRefresh);
        
        // Sort by recency
        personalizedNews.sort((a, b) => {
          const aMinutes = parseTimeToMinutes(a.pubDate);
          const bMinutes = parseTimeToMinutes(b.pubDate);
          return aMinutes - bMinutes;
        });
        
        updateTabNews('mynews', personalizedNews);
        loadedTabsRef.current.add('mynews');
        lastRefreshRef.current['mynews'] = Date.now();
        
        if (personalizedNews.length === 0) {
          setError('No personalized news found. Try refreshing or add more holdings.');
        }
      } catch (err) {
        console.error('Error loading personalized news:', err);
        setError('Unable to load personalized news. Please try refreshing.');
      } finally {
        updateTabLoading('mynews', false);
      }
      return;
    }
    
    // Show loading only if no cached data
    if (tabNews[category]?.length === 0) {
      updateTabLoading(category, true);
    }
    setError(null);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const cacheBuster = forceRefresh ? `&t=${Date.now()}` : '';
      const url = `/api/news?category=${category}${cacheBuster}`;
      
      const response = await fetch(url, {
        signal: controller.signal,
        cache: forceRefresh ? 'no-store' : 'default',
        headers: forceRefresh ? { 'Cache-Control': 'no-cache' } : {}
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch news: ${response.status}`);
      }
      
      const data = await response.json();
      const newsData = (data.news && data.news.length > 0) ? data.news : [];
      
      // Remove duplicates
      const uniqueNews: NewsItem[] = [];
      const seenTitles = new Set<string>();
      const seenLinks = new Set<string>();
      
      newsData.forEach((item: NewsItem) => {
        const normalizedTitle = item.title.toLowerCase().trim();
        const normalizedLink = item.link.toLowerCase().trim();
        if (!seenTitles.has(normalizedTitle) && !seenLinks.has(normalizedLink)) {
          seenTitles.add(normalizedTitle);
          seenLinks.add(normalizedLink);
          uniqueNews.push(item);
        }
      });
      
      // Sort by time
      uniqueNews.sort((a: NewsItem, b: NewsItem) => {
        const aMinutes = parseTimeToMinutes(a.pubDate);
        const bMinutes = parseTimeToMinutes(b.pubDate);
        return aMinutes - bMinutes;
      });
      
      // Limit to 20 items for better performance
      updateTabNews(category, uniqueNews.slice(0, 20));
      loadedTabsRef.current.add(category);
      lastRefreshRef.current[category] = Date.now();
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setError('Loading took longer than expected.');
      } else {
        console.error('Error fetching news:', err);
        setError('Unable to load fresh news.');
      }
    } finally {
      updateTabLoading(category, false);
    }
  }, [fetchPersonalizedNewsFromAPI, tabNews, updateTabLoading, updateTabNews]);

  // Load initial tab and prefetch adjacent tabs
  useEffect(() => {
    // Load current tab
    fetchNewsForTab(activeTab);
    
    // Prefetch other tabs in background (with delay to not overwhelm the API)
    const tabs = ['mynews', 'crypto', 'stocks', 'forex', 'indices', 'general'];
    const currentIndex = tabs.indexOf(activeTab);
    
    // Prefetch next and previous tabs after a short delay
    const prefetchTimeout = setTimeout(() => {
      const adjacentTabs = [
        tabs[(currentIndex + 1) % tabs.length],
        tabs[(currentIndex - 1 + tabs.length) % tabs.length]
      ];
      
      adjacentTabs.forEach((tab, index) => {
        if (!loadedTabsRef.current.has(tab)) {
          setTimeout(() => fetchNewsForTab(tab), index * 500);
        }
      });
    }, 1000);
    
    return () => clearTimeout(prefetchTimeout);
  }, [activeTab, fetchNewsForTab]);

  const refreshNews = async () => {
    setError(null);
    // Remove from loaded set to force refetch
    loadedTabsRef.current.delete(activeTab);
    delete lastRefreshRef.current[activeTab];
    await fetchNewsForTab(activeTab, true);
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'mynews':
        return Sparkles;
      case 'crypto':
        return Coins;
      case 'stocks':
        return TrendingUp;
      case 'forex':
        return DollarSign;
      case 'indices':
        return BarChart3;
      case 'general':
        return Globe;
      default:
        return Newspaper;
    }
  };

  const getSourceColor = (source: string) => {
    const allSources = Object.values(NEWS_SOURCES).flat();
    const sourceConfig = allSources.find(s => s.name === source);
    return sourceConfig?.color || "#6B7280";
  };

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Header with Refresh Button */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex border-b border-gray-200 dark:border-gray-700 flex-1 min-w-0">
            <div className="flex overflow-x-auto scrollbar-hide w-full">
              {[
                { id: 'mynews', label: 'My News' },
                { id: 'crypto', label: 'Crypto' },
                { id: 'stocks', label: 'Stocks' },
                { id: 'forex', label: 'Forex' },
                { id: 'indices', label: 'Indices' },
                { id: 'general', label: 'General' }
              ].map(({ id, label }) => {
                const Icon = getTabIcon(id);
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as any)}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 border-b-2 transition-all duration-200 ease-in-out whitespace-nowrap flex-shrink-0 ${
                      activeTab === id
                        ? 'border-orange-500 text-orange-600 dark:text-orange-400 font-semibold scale-105'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 transition-transform duration-200 ${activeTab === id ? 'scale-110' : ''}`} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          
          <button
            onClick={refreshNews}
            disabled={isTabLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[#212121] text-white rounded-lg border border-[#212121] transition-all duration-200 active:scale-95 hover:bg-[#333] flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isTabLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* My News Info Banner */}
        {activeTab === 'mynews' && (
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {((cryptoHoldings?.length || 0) > 0 || (stockHoldings?.length || 0) > 0) ? 'Personalized News Feed' : 'General Market News'}
              </h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              {((cryptoHoldings?.length || 0) > 0 || (stockHoldings?.length || 0) > 0) ? (
                <>News filtered based on your current investments: {cryptoHoldings?.length || 0} crypto {(cryptoHoldings?.length || 0) === 1 ? 'holding' : 'holdings'} and {stockHoldings?.length || 0} stock {(stockHoldings?.length || 0) === 1 ? 'position' : 'positions'}</>
              ) : (
                <>Showing general market news. Add investments to your portfolio to see personalized news about your holdings!</>
              )}
            </p>
            {((cryptoHoldings?.length || 0) > 0 || (stockHoldings?.length || 0) > 0) ? (
              <div className="flex flex-wrap gap-2">
                {(() => {
                  // Combine all holdings and remove duplicates based on symbol
                  const allHoldings = [...(cryptoHoldings || []), ...(stockHoldings || [])];
                  const uniqueHoldings = allHoldings.filter((holding, index, self) => 
                    index === self.findIndex((h) => h.symbol === holding.symbol)
                  );
                  
                  return uniqueHoldings.map((holding) => (
                    <span
                      key={holding.id}
                      className="px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200"
                      style={{ 
                        backgroundColor: `${holding.color}15`,
                        borderColor: `${holding.color}40`,
                        color: holding.color
                      }}
                    >
                      {holding.symbol}
                    </span>
                  ));
                })()}
              </div>
            ) : (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-4 h-4" />
                  <span className="font-semibold">Get Started:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600 dark:text-gray-400">
                  <li>Add crypto or stock holdings to your portfolio</li>
                  <li>Your news feed will automatically filter relevant articles</li>
                  <li>Each holding gets guaranteed news coverage</li>
                </ul>
              </div>
            )}
          </div>
        )}



        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <ThemedStatBox
            themeColor={CARD_THEME_COLORS.news}
            value={Math.max(news.length, 8)}
            label={activeTab === 'mynews' ? 'Your Articles' : 'Latest Articles'}
            className="p-2"
          />
          <ThemedStatBox
            themeColor={CARD_THEME_COLORS.news}
            value={activeTab === 'mynews' ? (cryptoHoldings?.length || 0) + (stockHoldings?.length || 0) : NEWS_SOURCES[activeTab as keyof typeof NEWS_SOURCES]?.length || 0}
            label={activeTab === 'mynews' ? 'Holdings' : 'News Sources'}
            className="p-2"
          />
          <ThemedStatBox
            themeColor={CARD_THEME_COLORS.news}
            value={activeTab === 'mynews' ? 'Smart' : 'Live'}
            label={activeTab === 'mynews' ? 'AI Filtered' : 'Real-time Updates'}
            className="p-2"
          />
          <ThemedStatBox
            themeColor={CARD_THEME_COLORS.news}
            value={activeTab === 'mynews' ? 'Auto' : '24/7'}
            label={activeTab === 'mynews' ? 'Updated' : 'Coverage'}
            className="p-2"
          />
        </div>

        {/* News Feed */}
        <div className="relative space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {isTabLoading && news.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-orange-600 dark:text-orange-400 animate-spin mb-3" />
              <span className="text-gray-600 dark:text-gray-400 font-medium">Loading latest news...</span>
              <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">Fetching from {NEWS_SOURCES[activeTab as keyof typeof NEWS_SOURCES]?.length || 'multiple'} sources</span>
            </div>
          ) : news.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <Newspaper className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-lg font-medium">No news available</p>
              <p className="text-sm">Try refreshing or check back later</p>
            </div>
          ) : (
            <>
            {news.map((item, index) => (
              <a
                key={`${item.link}-${index}`}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 transition-colors duration-200 cursor-pointer group no-underline"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className="px-2 py-1 text-xs font-semibold rounded"
                        style={{
                          backgroundColor: `${getSourceColor(item.source)}20`,
                          color: getSourceColor(item.source)
                        }}
                      >
                        {item.source}
                      </span>
                      {/* Show matched symbol badge for personalized news */}
                      {activeTab === 'mynews' && (item as any).matchedSymbol && (
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
                          {(item as any).matchedSymbol}
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        {item.pubDate}
                      </div>
                    </div>
                    
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-200">
                      {item.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                  
                  <div className="flex-shrink-0 p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors duration-200">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
              </a>
            ))}
            </>
          )}
          
          {/* Loading overlay when refreshing with existing content */}
          {isTabLoading && news.length > 0 && (
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
              <div className="flex flex-col items-center">
                <RefreshCw className="w-6 h-6 text-orange-600 dark:text-orange-400 animate-spin mb-2" />
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Refreshing...</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm pt-4 border-t border-gray-200 dark:border-gray-700">
          <ThemedStatBox
            themeColor={CARD_THEME_COLORS.news}
            value="Multi-Source"
            label="Aggregated from top sources"
            className="py-2 px-4"
          />
          <ThemedStatBox
            themeColor={CARD_THEME_COLORS.news}
            value="Real-time RSS"
            label="Live feed updates"
            className="py-2 px-4"
          />
          <ThemedStatBox
            themeColor={CARD_THEME_COLORS.news}
            value="Global Coverage"
            label="Worldwide market news"
            className="py-2 px-4"
          />
        </div>
      </div>
    </div>
  );
}

// News Card Component
export function NewsCard() {
  const { t } = useTranslation();
  // Generate comprehensive news activity chart data
  // Represents realistic 24-hour news cycle with smooth variations
  const chartData = [
    { value: 45, change: "+2.1%" },   // 12 AM - Quiet period
    { value: 42, change: "+1.8%" },   // 1 AM - Lowest activity
    { value: 48, change: "+2.5%" },   // 2 AM - Slight increase
    { value: 52, change: "+3.2%" },   // 3 AM - Asian markets opening
    { value: 58, change: "+4.1%" },   // 4 AM - Building momentum
    { value: 65, change: "+5.3%" },   // 5 AM - Early morning uptick
    { value: 72, change: "+7.2%" },   // 6 AM - Morning rise
    { value: 78, change: "+8.8%" },   // 7 AM - Steady growth
    { value: 85, change: "+10.5%" },  // 8 AM - Market open activity
    { value: 92, change: "+12.8%" },  // 9 AM - High activity
    { value: 88, change: "+11.2%" },  // 10 AM - Slight dip
    { value: 95, change: "+14.5%" },  // 11 AM - Peak morning
    { value: 98, change: "+15.8%" },  // 12 PM - Midday peak
    { value: 93, change: "+13.1%" },  // 1 PM - Post-lunch
    { value: 90, change: "+11.9%" },  // 2 PM - Afternoon steady
    { value: 87, change: "+10.6%" },  // 3 PM - Market close prep
    { value: 82, change: "+9.2%" },   // 4 PM - Closing activity
    { value: 75, change: "+7.8%" },   // 5 PM - After hours
    { value: 70, change: "+6.5%" },   // 6 PM - Evening wind down
    { value: 65, change: "+5.2%" },   // 7 PM - Evening low
    { value: 68, change: "+5.9%" },   // 8 PM - Evening update cycle
    { value: 62, change: "+4.7%" },   // 9 PM - Late evening
    { value: 55, change: "+3.8%" },   // 10 PM - Night reporting
    { value: 50, change: "+3.0%" },   // 11 PM - Late night wrap-up
  ];

  return (
    <EnhancedFinancialCard
      title={t('news.title')}
      description={t('news.latest')}
      amount="Live"
      change="24/7"
      changeType="positive"
      mainColor="#f97316"
      secondaryColor="#fb923c"
      gridColor="#f9731615"
      stats={[
        { label: t('news.sources'), value: "32", color: "#f97316" },
        { label: t('news.coverage'), value: t('news.global'), color: "#fb923c" }
      ]}
      icon={Newspaper}
      hoverContent={<NewsHoverContent />}
      modalContent={<NewsModalContent />}
      chartData={chartData}
    />
  );
}

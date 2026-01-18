"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Loader2, LineChart, TrendingUp, Info } from 'lucide-react';
import { InsiderSentiment } from '@/components/sec/InsiderSentiment';
import { tickerDomains } from '@/lib/ticker-domains';
import { cn } from '@/lib/utils';
import Image from 'next/image';

// Generate a consistent color based on ticker
const getTickerColor = (ticker: string): string => {
  const colors = [
    'from-blue-500 to-blue-700',
    'from-purple-500 to-purple-700',
    'from-green-500 to-green-700',
    'from-orange-500 to-orange-700',
    'from-pink-500 to-pink-700',
    'from-cyan-500 to-cyan-700',
    'from-indigo-500 to-indigo-700',
    'from-teal-500 to-teal-700',
  ];
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Company Icon Component
const CompanyIcon = ({ ticker, className = "h-10 w-10", showPlaceholder = true }: { ticker: string, className?: string, showPlaceholder?: boolean }) => {
  const [imageError, setImageError] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const upperTicker = ticker.toUpperCase();
  
  // Build list of image sources to try
  const imageSources = useMemo(() => {
    const sources: string[] = [];
    
    // 1. Known domain from our mapping
    if (tickerDomains[upperTicker]) {
      sources.push(`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${tickerDomains[upperTicker]}&size=128`);
    }
    
    // 2. Try logo.dev API (free tier, good coverage)
    sources.push(`https://img.logo.dev/ticker/${upperTicker}?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ`);
    
    // 3. Try common domain patterns
    sources.push(`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${ticker.toLowerCase()}.com&size=128`);
    
    return sources;
  }, [upperTicker, ticker]);
  
  useEffect(() => {
    setImageError(false);
    setFallbackIndex(0);
  }, [ticker]);
  
  const handleImageError = () => {
    if (fallbackIndex < imageSources.length - 1) {
      setFallbackIndex(prev => prev + 1);
    } else {
      setImageError(true);
    }
  };
  
  // Custom height/width based on className for Image component is tricky with Tailwind classes for h/w
  // So we stick to standard img for external sources where dimensions vary or are controlled by class
  if (!imageError && imageSources.length > 0) {
    return (
      <img 
        src={imageSources[fallbackIndex]}
        alt={`${ticker} logo`} 
        className={cn(className, "rounded-lg object-contain bg-white p-0.5")}
        onError={handleImageError}
        loading="lazy"
      />
    );
  }

  if (!showPlaceholder) return null;

  return (
    <div className={cn(className, `rounded-lg bg-gradient-to-br ${getTickerColor(ticker)} flex items-center justify-center font-bold text-white shadow-lg`)}>
      {ticker.slice(0, 2)}
    </div>
  );
};

export function InsiderSentimentView() {
  const [ticker, setTicker] = useState('AAPL');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
        setIsLoading(true);
        // Simulate a brief loading state for UI feedback
        setTimeout(() => {
            setTicker(searchInput.toUpperCase().trim());
            setIsLoading(false);
        }, 500);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                  <LineChart className="w-6 h-6 text-blue-400" />
                  Insider Sentiment Analysis
              </h2>
              <div className="flex gap-3 text-sm mt-1 text-gray-400">
                Analyze Monthly Share Purchase Ratio (MSPR) & Insider Confidence
              </div>
          </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-3">
        <form onSubmit={handleSearch} className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by ticker (e.g., NVDA, MSFT)..."
                className="w-full pl-10 pr-4 py-2 bg-transparent border-none text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-0"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading || !searchInput.trim()}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                isLoading || !searchInput.trim()
                  ? "bg-[#1A1A1A] text-gray-500 border border-gray-800 cursor-not-allowed"
                  : "bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600/20"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing</span>
                </>
              ) : (
                <>
                  <span>Analyze</span>
                </>
              )}
            </button>
        </form>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto space-y-6 pr-2 custom-scrollbar">
          
          {/* Company Header */}
          <div className="flex items-center gap-4 py-2 animate-in fade-in duration-500">
             <CompanyIcon ticker={ticker} className="h-12 w-12" />
             <div>
                <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    {ticker}
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-400 border border-gray-700">
                        NASDAQ
                    </span>
                </h3>
                <p className="text-sm text-gray-400 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-gray-500" />
                    Insider Sentiment Report
                </p>
             </div>
          </div>

          <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-1 min-h-[400px]">
             {/* We pass the ticker to the child component which handles data fetching and display */}
             <InsiderSentiment ticker={ticker} />
          </div>
      </div>
    </div>
  );
}

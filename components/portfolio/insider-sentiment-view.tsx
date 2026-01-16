"use client";

import { useState, useEffect, useMemo } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { InsiderSentiment } from '../sec/InsiderSentiment';
import { tickerDomains } from '@/lib/ticker-domains';

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

// Company Icon Component - Same approach as SEC EDGAR page
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
  
  if (!imageError && imageSources.length > 0) {
    return (
      <img 
        src={imageSources[fallbackIndex]}
        alt={`${ticker} logo`} 
        className={`${className} rounded-lg object-contain bg-white p-1`}
        onError={handleImageError}
        loading="lazy"
      />
    );
  }

  if (!showPlaceholder) return null;

  return (
    <div className={`${className} rounded-lg bg-gradient-to-br ${getTickerColor(ticker)} flex items-center justify-center font-bold text-white shadow-lg`}>
      {ticker.slice(0, 2)}
    </div>
  );
};

export function InsiderSentimentView() {
  const [ticker, setTicker] = useState('AAPL');
  const [searchInput, setSearchInput] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setTicker(searchInput.toUpperCase().trim());
      setSearchInput('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justifying-between">
        <h2 className="text-2xl font-bold text-white">Insider Sentiment Analysis</h2>
      </div>

      {/* Search Bar */}
      <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by ticker (e.g., TSLA, AAPL, MSFT)..."
              className="w-full bg-[#0D0D0D] border border-gray-800 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block pl-10 p-2.5"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-800 transition-colors"
          >
            Analyze
          </button>
        </form>
      </div>

      <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-6 min-h-[400px]">
        <div className="mb-6 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <CompanyIcon ticker={ticker} className="h-10 w-10" />
             <div>
                <h3 className="text-lg font-semibold text-white">Sentiment Analysis for {ticker}</h3>
                <p className="text-sm text-gray-400">Monthly Share Purchase Ratio (MSPR) & Insider Confidence</p>
             </div>
           </div>
        </div>
        
        <InsiderSentiment ticker={ticker} />
      </div>
    </div>
  );
}

"use client";

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { InsiderSentiment } from '../sec/InsiderSentiment';

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
             <div className="h-10 w-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg">
                {ticker.substring(0, 2)}
             </div>
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

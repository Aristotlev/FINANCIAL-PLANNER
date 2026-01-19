"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Search, RefreshCw, DollarSign } from 'lucide-react';
import { getBrandColor } from '../../../lib/brand-colors';
import {
  AppleIconTV,
  MicrosoftIconTV,
  AmazonIconTV,
  GoogleIconTV,
  TeslaIconTV,
  NvidiaIconTV,
  MetaIconTV,
  ETFIcon,
  ChartIcon
} from '../../../lib/tradingview-icons';

// Stock Icon Component - TradingView style
function StockIcon({ symbol, className = "w-5 h-5" }: { symbol: string; className?: string }) {
  switch (symbol) {
    case 'AAPL':
      return <AppleIconTV className={className} />;
    case 'MSFT':
      return <MicrosoftIconTV className={className} />;
    case 'AMZN':
      return <AmazonIconTV className={className} />;
    case 'GOOGL':
    case 'GOOG':
      return <GoogleIconTV className={className} />;
    case 'TSLA':
      return <TeslaIconTV className={className} />;
    case 'NVDA':
      return <NvidiaIconTV className={className} />;
    case 'META':
      return <MetaIconTV className={className} />;
    default:
      return <ETFIcon symbol={symbol} className={className} color="#2196F3" />;
  }
}

export interface StockHolding {
  id: string;
  name: string;
  symbol: string;
  shares: number;
  value: number;
  color: string;
  change: string;
  sector: string;
  entryPoint: number;
}

interface SearchResult {
  name: string;
  symbol: string;
  currentPrice?: number;
  sector: string;
  exchange?: string;
}

// Popular stocks for search
const popularStocks: SearchResult[] = [
  { name: 'Apple Inc.', symbol: 'AAPL', currentPrice: 175, sector: 'Technology' },
  { name: 'Microsoft Corp.', symbol: 'MSFT', currentPrice: 340, sector: 'Technology' },
  { name: 'Amazon.com Inc.', symbol: 'AMZN', currentPrice: 408, sector: 'Consumer Discretionary' },
  { name: 'Alphabet Inc.', symbol: 'GOOGL', currentPrice: 135, sector: 'Technology' },
  { name: 'Tesla Inc.', symbol: 'TSLA', currentPrice: 240, sector: 'Automotive' },
  { name: 'NVIDIA Corp.', symbol: 'NVDA', currentPrice: 450, sector: 'Technology' },
  { name: 'Meta Platforms', symbol: 'META', currentPrice: 320, sector: 'Technology' },
  { name: 'Berkshire Hathaway', symbol: 'BRK.B', currentPrice: 350, sector: 'Financial' },
  { name: 'Vanguard S&P 500', symbol: 'VOO', currentPrice: 384, sector: 'ETF' },
  { name: 'Johnson & Johnson', symbol: 'JNJ', currentPrice: 160, sector: 'Healthcare' },
  { name: 'JPMorgan Chase', symbol: 'JPM', currentPrice: 145, sector: 'Financial' },
  { name: 'Visa Inc.', symbol: 'V', currentPrice: 245, sector: 'Financial' },
  { name: 'Walmart Inc.', symbol: 'WMT', currentPrice: 160, sector: 'Consumer Staples' },
  { name: 'Procter & Gamble', symbol: 'PG', currentPrice: 150, sector: 'Consumer Staples' },
  { name: 'Mastercard Inc.', symbol: 'MA', currentPrice: 400, sector: 'Financial' },
];

export function AddStockPositionModal({
  isOpen,
  onClose,
  onAdd
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (holding: Omit<StockHolding, 'id' | 'value' | 'change' | 'color'>) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>(popularStocks);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<SearchResult | null>(null);
  const [shares, setShares] = useState('');
  const [entryPoint, setEntryPoint] = useState('');
  const [color, setColor] = useState('#06b6d4');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Debounce search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        setIsSearching(true);
        try {
          const response = await fetch(`/api/yahoo-finance/search?q=${encodeURIComponent(searchTerm)}`);
          
          if (!response.ok) {
            throw new Error('Search failed');
          }

          const data = await response.json();
          
          if (data.results && Array.isArray(data.results) && data.results.length > 0) {
            const results: SearchResult[] = data.results
              .map((quote: any) => ({
                name: quote.name,
                symbol: quote.symbol,
                sector: quote.sector,
                exchange: quote.exchange,
                currentPrice: undefined
              }));
            setSearchResults(results);
          } else {
            const localResults = popularStocks.filter(stock => 
              stock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              stock.symbol.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setSearchResults(localResults);
          }
        } catch (error) {
          console.error('Error searching stocks:', error);
          const localResults = popularStocks.filter(stock => 
            stock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            stock.symbol.toLowerCase().includes(searchTerm.toLowerCase())
          );
          setSearchResults(localResults);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults(popularStocks);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleAdd = () => {
    if (selectedStock && shares && entryPoint) {
      onAdd({
        name: selectedStock.name,
        symbol: selectedStock.symbol,
        shares: parseInt(shares),
        entryPoint: parseFloat(entryPoint),
        sector: selectedStock.sector
      });
      onClose();
      setSearchTerm('');
      setSelectedStock(null);
      setShares('');
      setEntryPoint('');
      setColor('#06b6d4');
      setSearchResults(popularStocks);
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedStock(null);
      setShares('');
      setEntryPoint('');
      setColor('#06b6d4');
      setSearchResults(popularStocks);
      setShowDropdown(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000001] flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-[#0D0D0D] border border-white/10 p-6 rounded-3xl w-full max-w-[480px] shadow-2xl relative overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-bold text-white">Add Stock Position</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Section */}
        <div className="mb-6 relative" ref={dropdownRef}>
          <label className="block text-sm font-medium mb-2 text-gray-400">Search Stock</label>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-500 transition-colors" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full pl-11 pr-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-white placeholder-gray-600 transition-all font-medium"
              placeholder="Search by symbol or name..."
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-500" />
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showDropdown && !selectedStock && (
            <div className="absolute z-50 w-full mt-2 max-h-60 overflow-y-auto border border-white/10 rounded-xl bg-[#1A1A1A] shadow-2xl">
              {!searchTerm && <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-white/5 border-b border-white/5">Popular Stocks</div>}
              {searchResults.map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => {
                    setSelectedStock(stock);
                    setSearchTerm('');
                    setShowDropdown(false);
                    if (stock.currentPrice) {
                      setEntryPoint(stock.currentPrice.toString());
                    }
                    setColor(getBrandColor(stock.symbol, 'stock'));
                  }}
                  className="w-full p-3 text-left hover:bg-white/5 border-b border-white/5 last:border-b-0 flex items-center gap-3 transition-colors active:bg-white/10"
                >
                  <div className="flex-shrink-0 w-8 flex justify-center">
                    <StockIcon symbol={stock.symbol} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white truncate">{stock.symbol}</div>
                    <div className="text-sm text-gray-400 truncate">
                      {stock.name}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap font-mono">
                    {stock.currentPrice ? `$${stock.currentPrice}` : stock.exchange}
                  </div>
                </button>
              ))}
              {searchResults.length === 0 && (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No stocks found
                </div>
              )}
            </div>
          )}
        </div>

          {/* Selected Stock */}
        {selectedStock && (
          <div className="mb-6 p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="p-2 bg-black/20 rounded-lg">
                  <StockIcon symbol={selectedStock.symbol} className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-white truncate text-lg">{selectedStock.name}</div>
                  <div className="text-xs text-cyan-400 font-medium">
                    {selectedStock.symbol} • {selectedStock.exchange || selectedStock.sector}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStock(null)}
                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Shares Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-400">Number of Shares</label>
            <input
              type="number"
              step="1"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-white placeholder-gray-600 transition-all font-mono font-medium"
              placeholder="0"
            />
          </div>

          {/* Entry Point Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-400">Entry Point</label>
            <div className="relative group">
              <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-500 transition-colors" />
              <input
                type="number"
                step="any"
                value={entryPoint}
                onChange={(e) => setEntryPoint(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-white placeholder-gray-600 transition-all font-mono font-medium"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Chart Color Picker */}
        <div className="mb-8">
          <label className="block text-sm font-medium mb-2 text-gray-400">Chart Color</label>
          <div className="flex items-center gap-3">
             <div className="relative flex-1 h-12 rounded-xl border border-white/10 bg-[#1A1A1A] overflow-hidden">
               <input
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
               <div className="absolute inset-0 flex items-center px-4 pointer-events-none">
                 <div className="w-8 h-8 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: color }}></div>
                 <span className="ml-3 text-gray-400 font-mono text-sm">{color}</span>
               </div>
             </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Select a color for pie charts and visualizations</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-white/10 text-white rounded-xl hover:bg-white/5 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedStock || !shares || !entryPoint}
            className="flex-1 px-4 py-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-all font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            Add Position
          </button>
        </div>
      </div>
    </div>
  );
}

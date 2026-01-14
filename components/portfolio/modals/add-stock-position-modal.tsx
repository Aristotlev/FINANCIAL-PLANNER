"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Search, RefreshCw } from 'lucide-react';
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
  const [color, setColor] = useState('#8b5cf6');
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
      setColor('#8b5cf6');
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
      setColor('#8b5cf6');
      setSearchResults(popularStocks);
      setShowDropdown(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[1000001] overflow-y-auto" onClick={onClose}>
      <div className="min-h-full flex items-start sm:items-center justify-center p-4 py-8 sm:py-4">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl w-full max-w-[384px]" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Stock Position</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-900 dark:text-white">
              <X className="w-4 h-4 dark:text-white dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            </button>
          </div>

          {/* Search Section */}
          <div className="mb-4 relative" ref={dropdownRef}>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Search Stock</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-gray-300" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                placeholder="Search by symbol or name..."
              />
              {isSearching && (
                <div className="absolute right-3 top-2.5">
                  <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showDropdown && !selectedStock && (
              <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-xl">
                {!searchTerm && <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">Popular Stocks</div>}
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
                    className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center gap-3"
                  >
                    <div className="flex-shrink-0 w-8 flex justify-center">
                      <StockIcon symbol={stock.symbol} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white truncate">{stock.symbol}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {stock.name}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap">
                      {stock.currentPrice ? `$${stock.currentPrice}` : stock.exchange}
                    </div>
                  </button>
                ))}
                {searchResults.length === 0 && (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                    No stocks found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Stock */}
          {selectedStock && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-900/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <StockIcon symbol={selectedStock.symbol} />
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white truncate">{selectedStock.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedStock.symbol} • {selectedStock.exchange || selectedStock.sector}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedStock(null)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          )}

          {/* Shares Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Number of Shares</label>
            <input
              type="number"
              step="1"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
              placeholder="Enter shares..."
            />
          </div>

          {/* Entry Point Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Entry Point ($)</label>
            <input
              type="number"
              step="any"
              value={entryPoint}
              onChange={(e) => setEntryPoint(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
              placeholder="Enter price..."
            />
          </div>

          {/* Chart Color Picker */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Chart Color</label>
            <input
              className="w-full p-2 border rounded h-10 cursor-pointer"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Select a color for pie charts and visualizations</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!selectedStock || !shares || !entryPoint}
              className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Position
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

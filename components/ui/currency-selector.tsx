"use client";

import React, { useState, useRef, useEffect } from 'react';
import { DollarSign, ChevronDown, Search, RefreshCw, Check } from 'lucide-react';
import { useCurrency, SUPPORTED_CURRENCIES, Currency } from '../../contexts/currency-context';

export function CurrencySelector() {
  const { mainCurrency, setMainCurrency, lastUpdated, refreshRates, isLoading } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredCurrencies = SUPPORTED_CURRENCIES.filter(currency =>
    currency.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    currency.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectCurrency = (currency: Currency) => {
    setMainCurrency(currency);
    setIsOpen(false);
    setSearchQuery('');
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';
    
    const now = Date.now();
    const diff = now - lastUpdated.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return lastUpdated.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Currency Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white rounded-md hover:bg-gray-700 transition-colors group"
        title="Select Main Currency"
      >
        <DollarSign className="w-4 h-4" />
        <span className="text-sm font-medium">
          {mainCurrency.flag} {mainCurrency.code}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-[10002] max-h-[500px] flex flex-col">
          {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Select Main Currency
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    refreshRates();
                  }}
                  disabled={isLoading}
                  className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh exchange rates"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search currencies..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {/* Last Updated Info */}
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                <span>Last updated: {formatLastUpdated()}</span>
                {isLoading && <span className="text-blue-500">Updating...</span>}
              </div>
            </div>

            {/* Currency List */}
            <div className="overflow-y-auto flex-1">
              {filteredCurrencies.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No currencies found
                </div>
              ) : (
                <div className="p-2">
                  {filteredCurrencies.map((currency) => {
                    const isSelected = currency.code === mainCurrency.code;
                    return (
                      <button
                        key={currency.code}
                        onClick={() => handleSelectCurrency(currency)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className="text-2xl">{currency.flag}</span>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-semibold">{currency.code}</div>
                          <div className={`text-xs ${
                            isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {currency.name}
                          </div>
                        </div>
                        <div className={`text-xs font-medium px-2 py-0.5 rounded ${
                          isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {currency.symbol}
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Note */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                All amounts will be converted to {mainCurrency.code}
              </p>
            </div>
          </div>
      )}
    </div>
  );
}

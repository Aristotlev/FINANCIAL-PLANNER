"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, RefreshCw, Check } from 'lucide-react';
import { useCurrency, SUPPORTED_CURRENCIES, Currency } from '../../contexts/currency-context';

const CurrencyFlag = ({ countryCode, className = "w-5 h-3.5" }: { countryCode?: string, className?: string }) => {
  if (!countryCode) return null;
  
  return (
    <img
      src={`https://flagcdn.com/w40/${countryCode}.png`}
      srcSet={`https://flagcdn.com/w80/${countryCode}.png 2x`}
      width="20"
      height="14"
      alt={`${countryCode} flag`}
      className={`object-cover rounded-sm flex-shrink-0 ${className}`}
      loading="lazy"
    />
  );
};

export function PortfolioCurrencySelector() {
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
      {/* Currency Button - Using the requested styling */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white rounded-md hover:bg-gray-800 transition-colors group ${isOpen ? 'bg-gray-800 text-white' : ''}`}
        title="Select Main Currency"
        type="button"
      >
        <div className="flex items-center gap-3">
          {mainCurrency.countryCode ? (
            <CurrencyFlag countryCode={mainCurrency.countryCode} />
          ) : (
            <span className="text-lg leading-none">{mainCurrency.flag}</span>
          )}
          <span className="text-sm font-medium">{mainCurrency.code}</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu - Portfolio Branding */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#0D0D0D] border border-gray-800 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.6)] z-[201] max-h-[500px] flex flex-col overflow-hidden ring-1 ring-white/10">
            {/* Header */}
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">
                  Select Main Currency
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    refreshRates();
                  }}
                  disabled={isLoading}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1A1A1A] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh exchange rates"
                  type="button"
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
                  className="w-full pl-9 pr-3 py-2 bg-[#1A1A1A] border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {/* Last Updated Info */}
              <div className="mt-2 text-xs text-gray-400 flex items-center justify-between">
                <span>Last updated: {formatLastUpdated()}</span>
                {isLoading && <span className="text-blue-400">Updating...</span>}
              </div>
            </div>

            {/* Currency List */}
            <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent max-h-[300px]">
              {filteredCurrencies.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No currencies found
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredCurrencies.map((currency) => {
                    const isSelected = currency.code === mainCurrency.code;
                    return (
                      <button
                        key={currency.code}
                        onClick={() => handleSelectCurrency(currency)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-[#1A1A1A] text-blue-400'
                            : 'text-gray-300 hover:bg-[#1A1A1A] hover:text-white'
                        }`}
                        type="button"
                      >
                        <div className="flex-shrink-0 w-6 flex justify-center">
                          {currency.countryCode ? (
                            <CurrencyFlag countryCode={currency.countryCode} className="w-6 h-4" />
                          ) : (
                            <span className="text-2xl leading-none">{currency.flag}</span>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-semibold">{currency.code}</div>
                          <div className={`text-xs ${
                            isSelected ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-400'
                          }`}>
                            {currency.name}
                          </div>
                        </div>
                        <div className={`text-xs font-medium px-2 py-0.5 rounded ${
                          isSelected ? 'text-blue-400' : 'text-gray-500'
                        }`}>
                          {currency.symbol}
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-blue-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Note */}
            <div className="p-3 border-t border-gray-800 bg-[#1A1A1A]/50">
              <p className="text-xs text-gray-500 text-center">
                All amounts will be converted to {mainCurrency.code}
              </p>
            </div>
          </div>
      )}
    </div>
  );
}

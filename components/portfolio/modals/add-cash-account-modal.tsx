"use client";

import React, { useState, useEffect } from "react";
import { 
  X,
  DollarSign,
  Search,
  Building
} from "lucide-react";
import { searchBanks, BankInfo } from "../../../lib/banks-database";

export interface CashAccount {
  id: string;
  name: string;
  bank: string;
  balance: number;
  type: string;
  apy: number;
  color: string;
  currency?: string;
}

// Bank Logo Component
function BankLogo({ bank }: { bank: BankInfo }) {
  const [imgError, setImgError] = useState(false);
  
  const getInitialAttempt = () => {
    if (bank.website.includes('capitalone.com')) return 2;
    if (bank.website.includes('emiratesnbd.com')) return 1;
    return 0;
  };

  const [fallbackAttempt, setFallbackAttempt] = useState(getInitialAttempt);
  
  const getLogoUrl = () => {
    switch (fallbackAttempt) {
      case 0:
        return `https://www.google.com/s2/favicons?domain=${bank.website}&sz=128`;
      case 1:
        return `https://logo.clearbit.com/${bank.website}`;
      case 2:
        return `https://icons.duckduckgo.com/ip3/${bank.website}.ico`;
      default:
        return null;
    }
  };
  
  const logoUrl = getLogoUrl();
  
  if (imgError || !logoUrl) {
    return (
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: bank.color + '20' }}
      >
        <Building 
          className="w-5 h-5"
          style={{ color: bank.color }}
        />
      </div>
    );
  }
  
  return (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 overflow-hidden">
      <img 
        src={logoUrl}
        alt={bank.name}
        className="w-full h-full object-contain p-1"
        onError={() => {
          if (fallbackAttempt < 2) {
            setFallbackAttempt(fallbackAttempt + 1);
          } else {
            setImgError(true);
          }
        }}
      />
    </div>
  );
}

export function AddCashAccountModal({ 
  isOpen, 
  onClose, 
  onAdd 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onAdd: (account: Omit<CashAccount, 'id'>) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    bank: '',
    balance: 0,
    type: 'Checking',
    apy: 0,
    color: '#10b981',
    currency: 'USD'
  });
  
  const [bankSearchTerm, setBankSearchTerm] = useState('');
  const [bankSuggestions, setBankSuggestions] = useState<BankInfo[]>([]);
  const [showBankDropdown, setShowBankDropdown] = useState(false);

  // Search banks as user types
  useEffect(() => {
    if (bankSearchTerm.trim().length > 0) {
      const results = searchBanks(bankSearchTerm.trim());
      setBankSuggestions(results.slice(0, 8));
      setShowBankDropdown(true);
    } else {
      setBankSuggestions([]);
      setShowBankDropdown(false);
    }
  }, [bankSearchTerm]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({ name: '', bank: '', balance: 0, type: 'Checking', apy: 0, color: '#10b981', currency: 'USD' });
      setBankSearchTerm('');
      setShowBankDropdown(false);
    }
  }, [isOpen]);

  const selectBank = (bank: BankInfo) => {
    setFormData({ ...formData, bank: bank.name, color: bank.color });
    setBankSearchTerm(bank.name);
    setShowBankDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      ...formData,
      bank: formData.bank || bankSearchTerm
    });
    setFormData({ name: '', bank: '', balance: 0, type: 'Checking', apy: 0, color: '#10b981', currency: 'USD' });
    setBankSearchTerm('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000001]" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-[500px] max-h-[90vh] overflow-y-auto relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Cash Account</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-900 dark:text-white">
            <X className="w-4 h-4 dark:text-white dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Account Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
              placeholder="e.g., Main Checking, Emergency Fund"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Bank</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-300 z-10 pointer-events-none" />
              <input
                type="text"
                value={bankSearchTerm}
                onChange={(e) => {
                  const value = e.target.value;
                  setBankSearchTerm(value);
                  setFormData({...formData, bank: value});
                  if (value.trim().length > 0) {
                    setShowBankDropdown(true);
                  }
                }}
                onFocus={() => {
                  if (bankSearchTerm.trim().length > 0) {
                    setShowBankDropdown(true);
                  }
                }}
                onBlur={() => {
                  setTimeout(() => setShowBankDropdown(false), 250);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                placeholder="Search by bank or country name..."
                required
                autoComplete="off"
              />
              
              {/* Bank Suggestions Dropdown */}
              {showBankDropdown && bankSuggestions.length > 0 && (
                <div className="absolute z-[1000010] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-72 overflow-y-auto">
                  {bankSuggestions.map((bank) => (
                    <button
                      key={bank.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectBank(bank);
                      }}
                      className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-start gap-3 transition-colors cursor-pointer"
                    >
                      <BankLogo bank={bank} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-white truncate">
                          {bank.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {bank.country} • {bank.type.charAt(0).toUpperCase() + bank.type.slice(1)}
                        </div>
                        {bank.products.length > 0 && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                            {bank.products.slice(0, 3).join(' • ')}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {/* No results message */}
              {showBankDropdown && bankSearchTerm.trim().length > 0 && bankSuggestions.length === 0 && (
                <div className="absolute z-[1000010] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    No banks found for "{bankSearchTerm}"
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
                    You can still type any bank name manually.
                  </p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              💡 Try: "Chase", "United States", "Revolut", "Germany", "HSBC", etc.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Balance</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={formData.balance}
                onChange={(e) => setFormData({...formData, balance: parseFloat(e.target.value)})}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                placeholder="0"
                step="0.01"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Currency</label>
            <select
              value={formData.currency || 'USD'}
              onChange={(e) => setFormData({...formData, currency: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="USD">🇺🇸 USD - US Dollar</option>
              <option value="EUR">🇪🇺 EUR - Euro</option>
              <option value="GBP">🇬🇧 GBP - British Pound</option>
              <option value="JPY">🇯🇵 JPY - Japanese Yen</option>
              <option value="CHF">🇨🇭 CHF - Swiss Franc</option>
              <option value="CAD">🇨🇦 CAD - Canadian Dollar</option>
              <option value="AUD">🇦🇺 AUD - Australian Dollar</option>
              <option value="CNY">🇨🇳 CNY - Chinese Yuan</option>
              <option value="INR">🇮🇳 INR - Indian Rupee</option>
              <option value="BRL">🇧🇷 BRL - Brazilian Real</option>
              <option value="MXN">🇲🇽 MXN - Mexican Peso</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              💡 The balance will be displayed in this currency and converted to your main currency
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Account Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="Checking">Checking Account</option>
              <option value="Savings">Savings Account</option>
              <option value="Money Market">Money Market Account</option>
              <option value="Business">Business Account</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Annual Percentage Yield (APY)</label>
            <div className="relative">
              <input
                type="number"
                value={formData.apy}
                onChange={(e) => setFormData({...formData, apy: parseFloat(e.target.value)})}
                className="w-full px-4 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                placeholder="4.25"
                step="0.01"
                min="0"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Chart Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({...formData, color: e.target.value})}
                className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                This color will be used in pie charts and visualizations
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 flex-1 bg-[#212121] text-white px-4 py-2 rounded-lg border border-[#212121] transition-all duration-200 active:scale-95 hover:bg-[#333]"
            >
              Add Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

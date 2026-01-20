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
  targetAmount?: number;
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
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white border border-white/10 overflow-hidden shadow-sm">
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
    currency: 'USD',
    targetAmount: 0 // Added for goal type
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
      setFormData({ name: '', bank: '', balance: 0, type: 'Checking', apy: 0, color: '#10b981', currency: 'USD', targetAmount: 0 });
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
    setFormData({ name: '', bank: '', balance: 0, type: 'Checking', apy: 0, color: '#10b981', currency: 'USD', targetAmount: 0 });
    setBankSearchTerm('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[1000001]" onClick={onClose}>
      <div className="bg-[#0D0D0D] border border-white/10 p-6 rounded-3xl w-[500px] max-h-[90vh] overflow-y-auto relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Add Cash Account</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-400">Account Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-white placeholder-gray-600 transition-all font-medium"
              placeholder="e.g., Main Checking, Emergency Fund"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-400">Bank</label>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
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
                className="w-full pl-11 pr-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-white placeholder-gray-600 transition-all font-medium"
                placeholder="Search by bank or country name..."
                required
                autoComplete="off"
              />
              
              {/* Bank Suggestions Dropdown */}
              {showBankDropdown && bankSuggestions.length > 0 && (
                <div className="absolute z-[1000010] w-full mt-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-xl max-h-72 overflow-y-auto overflow-hidden">
                  {bankSuggestions.map((bank) => (
                    <button
                      key={bank.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectBank(bank);
                      }}
                      className="w-full p-3 text-left hover:bg-white/5 border-b border-white/5 last:border-b-0 flex items-start gap-3 transition-colors cursor-pointer"
                    >
                      <BankLogo bank={bank} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white truncate">
                          {bank.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {bank.country} • {bank.type.charAt(0).toUpperCase() + bank.type.slice(1)}
                        </div>
                        {bank.products.length > 0 && (
                          <div className="text-xs text-gray-600 mt-1 truncate">
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
                <div className="absolute z-[1000010] w-full mt-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-xl p-4">
                  <p className="text-sm text-gray-400 text-center">
                    No banks found for "{bankSearchTerm}"
                  </p>
                  <p className="text-xs text-gray-500 text-center mt-1">
                    You can still type any bank name manually.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-400">Balance</label>
            <div className="relative group">
              <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type="number"
                value={formData.balance}
                onChange={(e) => setFormData({...formData, balance: parseFloat(e.target.value)})}
                className="w-full pl-11 pr-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-white placeholder-gray-600 transition-all font-mono font-medium"
                placeholder="0.00"
                step="0.01"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-400">Currency</label>
            <div className="relative">
              <select
                value={formData.currency || 'USD'}
                onChange={(e) => setFormData({...formData, currency: e.target.value})}
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-white appearance-none cursor-pointer font-medium"
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
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-400">Account Type</label>
            <div className="relative">
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-white appearance-none cursor-pointer font-medium"
              >
                <option value="Checking">Checking Account</option>
                <option value="Savings">Savings Account</option>
                <option value="Money Market">Money Market Account</option>
                <option value="Business">Business Account</option>
                <option value="Goal">Savings Goal</option>
              </select>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          {formData.type === 'Goal' && (
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-400">Goal Target Amount</label>
              <div className="relative group">
                <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="number"
                  value={formData.targetAmount || ''}
                  onChange={(e) => setFormData({...formData, targetAmount: parseFloat(e.target.value)})}
                  className="w-full pl-11 pr-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-white placeholder-gray-600 transition-all font-mono font-medium"
                  placeholder="Target Amount"
                  step="0.01"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-400">Annual Percentage Yield (APY)</label>
            <div className="relative group">
              <input
                type="number"
                value={formData.apy}
                onChange={(e) => setFormData({...formData, apy: parseFloat(e.target.value)})}
                className="w-full px-4 py-3 pr-10 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-white placeholder-gray-600 transition-all font-mono font-medium"
                placeholder="4.25"
                step="0.01"
                min="0"
              />
              <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm group-focus-within:text-emerald-500 transition-colors">%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-400">Chart Color</label>
            <div className="flex items-center gap-4 bg-[#1A1A1A] border border-white/10 p-2 rounded-xl">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({...formData, color: e.target.value})}
                className="w-12 h-10 rounded-lg cursor-pointer bg-transparent border-none p-0"
              />
              <span className="text-sm text-gray-400">
                Used for charts and visualizations
              </span>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-white/10 text-white rounded-xl hover:bg-white/5 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-[#0D0D0D] border border-white/20 text-white rounded-xl hover:bg-white/10 transition-all font-bold"
            >
              Add Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

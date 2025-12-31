"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Wallet, 
  Plus, 
  Edit3, 
  Trash2, 
  Building2,
  TrendingUp,
  X,
  DollarSign,
  Target,
  Search,
  Filter,
  Building,
  Calendar,
  Briefcase,
  RefreshCw,
  Clock,
  Coins
} from "lucide-react";
import { EnhancedFinancialCard } from "../ui/enhanced-financial-card";
import { SupabaseDataService } from "../../lib/supabase/supabase-data-service";
import { MarketAnalysisWidget } from "../ui/market-analysis-widget";
import { ThemedStatBox, CARD_THEME_COLORS } from "../ui/themed-stat-box";
import { formatNumber } from "../../lib/utils";
import { searchBanks, BankInfo } from "../../lib/banks-database";
import { useCurrencyConversion } from "../../hooks/use-currency-conversion";
import { DualCurrencyDisplay, CompactDualCurrency } from "../ui/dual-currency-display";

// Bank Logo Component
function BankLogo({ bank }: { bank: BankInfo }) {
  const [imgError, setImgError] = useState(false);
  
  // Determine best starting strategy based on known issues to avoid 404s/blocks
  const getInitialAttempt = () => {
    // Capital One: Google 404s, Clearbit often blocked. Start with DuckDuckGo (2)
    if (bank.website.includes('capitalone.com')) return 2;
    
    // Emirates NBD: Google 404s. Start with Clearbit (1)
    if (bank.website.includes('emiratesnbd.com')) return 1;
    
    // Default: Start with Google (0)
    return 0;
  };

  const [fallbackAttempt, setFallbackAttempt] = useState(getInitialAttempt);
  
  // Use Google's favicon service as primary (free, no API key required)
  // Falls back to Clearbit, then DuckDuckGo, then colored icon
  const getLogoUrl = () => {
    switch (fallbackAttempt) {
      case 0:
        // Primary: Google's high-quality favicon service (128px)
        return `https://www.google.com/s2/favicons?domain=${bank.website}&sz=128`;
      case 1:
        // Fallback 1: Clearbit Logo API (often better for company logos)
        return `https://logo.clearbit.com/${bank.website}`;
      case 2:
        // Fallback 2: DuckDuckGo icon service
        return `https://icons.duckduckgo.com/ip3/${bank.website}.ico`;
      default:
        return null;
    }
  };
  
  const logoUrl = getLogoUrl();
  
  if (imgError || !logoUrl) {
    // Fallback to colored icon if all logo sources fail
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

interface CashAccount {
  id: string;
  name: string;
  bank: string;
  balance: number;
  type: string;
  apy: number;
  color: string;
  currency?: string; // ISO currency code (e.g., 'USD', 'EUR', 'GBP')
}

interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'weekly' | 'bi-weekly' | 'yearly' | 'one-time';
  category: 'salary' | 'side-hustle' | 'freelance' | 'passive' | 'bonus' | 'other';
  connectedAccount: string; // Account ID where income is deposited
  isRecurring: boolean;
  nextPaymentDate?: string;
  notes?: string;
  color: string;
}

const initialCashAccounts: CashAccount[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Main Checking",
    bank: "Chase Bank",
    balance: 8250,
    type: "Checking",
    apy: 0.01,
    color: "#10b981",
    currency: "USD"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002", 
    name: "High-Yield Savings",
    bank: "Marcus by Goldman Sachs",
    balance: 4200.75,
    type: "Savings",
    apy: 4.25,
    color: "#34d399",
    currency: "USD"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    name: "Emergency Fund",
    bank: "Ally Bank", 
    balance: 12000,
    type: "Savings",
    apy: 4.0,
    color: "#6ee7b7",
    currency: "USD"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440004",
    name: "Investment Buffer",
    bank: "Charles Schwab",
    balance: 3200,
    type: "Checking",
    apy: 0.45,
    color: "#a7f3d0",
    currency: "USD"
  }
];

function CashHoverContent() {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);

  useEffect(() => {
    const loadAccounts = async () => {
      const savedAccounts = await SupabaseDataService.getCashAccounts([]);
      setAccounts(savedAccounts);
    };
    loadAccounts();
    
    // Listen for data changes
    const handleDataChange = () => loadAccounts();
    window.addEventListener('financialDataChanged', handleDataChange);
    
    return () => window.removeEventListener('financialDataChanged', handleDataChange);
  }, []);

  const checkingAccounts = accounts.filter(acc => acc.type === 'Checking');
  const savingsAccounts = accounts.filter(acc => acc.type === 'Savings');
  const checkingTotal = checkingAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const savingsTotal = savingsAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const investmentBuffer = checkingAccounts.find(acc => acc.name.toLowerCase().includes('investment') || acc.name.toLowerCase().includes('buffer'));

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="flex items-center gap-1">
          💰 Checking Accounts
        </span>
        <span className="font-semibold text-green-600 dark:text-green-400">${formatNumber(checkingTotal)}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="flex items-center gap-1">
          💎 Savings Accounts
        </span>
        <span className="font-semibold text-green-600 dark:text-green-400">${formatNumber(savingsTotal)}</span>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-600 pt-1 mt-1">
        <div className="flex justify-between text-xs">
          <span>Available to Invest</span>
          <span className="font-semibold text-green-600 dark:text-green-400">${formatNumber(investmentBuffer?.balance || 0)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Total Liquid</span>
          <span className="font-semibold text-green-600 dark:text-green-400">${formatNumber(totalBalance)}</span>
        </div>
      </div>
    </div>
  );
}

// Add Account Modal Component
function AddCashAccountModal({ 
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
      setBankSuggestions(results.slice(0, 8)); // Show top 8 results
      setShowBankDropdown(true); // Always show dropdown when typing
    } else {
      setBankSuggestions([]);
      setShowBankDropdown(false);
    }
  }, [bankSearchTerm]);

  const selectBank = (bank: BankInfo) => {
    setFormData({ ...formData, bank: bank.name, color: bank.color });
    setBankSearchTerm(bank.name);
    setShowBankDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      ...formData,
      bank: formData.bank || bankSearchTerm // Use either formData.bank or search term
    });
    setFormData({ name: '', bank: '', balance: 0, type: 'Checking', apy: 0, color: '#10b981', currency: 'USD' });
    setBankSearchTerm('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[15000]" onClick={onClose}>
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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800"
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
                  // Show dropdown immediately when user types
                  if (value.trim().length > 0) {
                    setShowBankDropdown(true);
                  }
                }}
                onFocus={() => {
                  // Show dropdown if there's text
                  if (bankSearchTerm.trim().length > 0) {
                    setShowBankDropdown(true);
                  }
                }}
                onBlur={() => {
                  // Delay hiding dropdown to allow click events to register
                  setTimeout(() => setShowBankDropdown(false), 250);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                placeholder="Search by bank or country name..."
                required
                autoComplete="off"
              />
              
              {/* Bank Suggestions Dropdown */}
              {showBankDropdown && bankSuggestions.length > 0 && (
                <div className="absolute z-[15010] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-72 overflow-y-auto">
                  {bankSuggestions.map((bank) => (
                    <button
                      key={bank.id}
                      type="button"
                      onMouseDown={(e) => {
                        // Use onMouseDown instead of onClick to fire before onBlur
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
                <div className="absolute z-[15010] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4">
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800"
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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800"
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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800"
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
                className="w-full px-4 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800"
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
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Add Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditCashAccountModal({ 
  isOpen, 
  onClose, 
  account, 
  onUpdate 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  account: CashAccount | null;
  onUpdate: (account: CashAccount) => Promise<void>;
}) {
  const [formData, setFormData] = useState<CashAccount>({
    id: '',
    name: '',
    bank: '',
    balance: 0,
    type: 'Checking',
    apy: 0,
    color: '#10b981',
    currency: 'USD'
  });

  React.useEffect(() => {
    if (account) {
      setFormData(account);
    }
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(formData);
    onClose();
  };

  if (!isOpen || !account) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Edit Cash Account</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Account Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Bank</label>
            <input
              type="text"
              value={formData.bank}
              onChange={(e) => setFormData({...formData, bank: e.target.value})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Balance</label>
            <input
              type="number"
              value={formData.balance}
              onChange={(e) => setFormData({...formData, balance: parseFloat(e.target.value)})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              step="0.01"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Currency</label>
            <select
              value={formData.currency || 'USD'}
              onChange={(e) => setFormData({...formData, currency: e.target.value})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
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
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Account Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
            >
              <option value="Checking">Checking</option>
              <option value="Savings">Savings</option>
              <option value="Money Market">Money Market</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">APY (%)</label>
            <input
              type="number"
              value={formData.apy}
              onChange={(e) => setFormData({...formData, apy: parseFloat(e.target.value)})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              step="0.01"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Chart Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({...formData, color: e.target.value})}
                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Color for charts and visualizations
              </span>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Update Account
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white dark:text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Income Modal Component
function AddIncomeModal({ 
  isOpen, 
  onClose, 
  onAdd,
  accounts 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onAdd: (income: Omit<IncomeSource, 'id'>) => Promise<void>;
  accounts: CashAccount[];
}) {
  const [formData, setFormData] = useState<Omit<IncomeSource, 'id'>>({
    name: '',
    amount: 0,
    frequency: 'monthly',
    category: 'salary',
    connectedAccount: '',
    isRecurring: true,
    nextPaymentDate: '',
    notes: '',
    color: '#10b981'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAdd(formData);
    setFormData({
      name: '',
      amount: 0,
      frequency: 'monthly',
      category: 'salary',
      connectedAccount: '',
      isRecurring: true,
      nextPaymentDate: '',
      notes: '',
      color: '#10b981'
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[15000]" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-[500px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Income Source</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-4 h-4 text-gray-900 dark:text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Income Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
              placeholder="e.g., Main Salary, Freelance Work, YouTube"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Amount ($)</label>
              <input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({...formData, frequency: e.target.value as any})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="one-time">One-Time</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value as any})}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="salary">Salary</option>
              <option value="side-hustle">Side Hustle</option>
              <option value="freelance">Freelance</option>
              <option value="passive">Passive Income</option>
              <option value="bonus">Bonus</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Connected Account</label>
            <select
              value={formData.connectedAccount}
              onChange={(e) => setFormData({...formData, connectedAccount: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
              required
            >
              <option value="">Select account where income is deposited</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} - {account.bank}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-200 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isRecurring}
                onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              Recurring Income
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
              Uncheck for one-time payments like bonuses or gifts
            </p>
          </div>

          {formData.isRecurring && (
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Next Payment Date (Optional)</label>
              <input
                type="date"
                value={formData.nextPaymentDate}
                onChange={(e) => setFormData({...formData, nextPaymentDate: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
              rows={2}
              placeholder="Additional details about this income source..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({...formData, color: e.target.value})}
                className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Color for visual identification
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
            >
              Add Income Source
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Income Modal Component
function EditIncomeModal({ 
  isOpen, 
  onClose, 
  income, 
  onUpdate,
  accounts 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  income: IncomeSource | null;
  onUpdate: (income: IncomeSource) => Promise<void>;
  accounts: CashAccount[];
}) {
  const [formData, setFormData] = useState<IncomeSource>({
    id: '',
    name: '',
    amount: 0,
    frequency: 'monthly',
    category: 'salary',
    connectedAccount: '',
    isRecurring: true,
    nextPaymentDate: '',
    notes: '',
    color: '#10b981'
  });

  React.useEffect(() => {
    if (income) {
      setFormData(income);
    }
  }, [income]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(formData);
    onClose();
  };

  if (!isOpen || !income) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[15000]" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-[500px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Income Source</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-4 h-4 text-gray-900 dark:text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Income Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Amount ($)</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({...formData, frequency: e.target.value as any})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="one-time">One-Time</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value as any})}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="salary">Salary</option>
              <option value="side-hustle">Side Hustle</option>
              <option value="freelance">Freelance</option>
              <option value="passive">Passive Income</option>
              <option value="bonus">Bonus</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Connected Account</label>
            <select
              value={formData.connectedAccount}
              onChange={(e) => setFormData({...formData, connectedAccount: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
              required
            >
              <option value="">Select account</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} - {account.bank}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-200 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isRecurring}
                onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              Recurring Income
            </label>
          </div>

          {formData.isRecurring && (
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Next Payment Date (Optional)</label>
              <input
                type="date"
                value={formData.nextPaymentDate}
                onChange={(e) => setFormData({...formData, nextPaymentDate: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({...formData, color: e.target.value})}
                className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Color for visual identification
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Update Income Source
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CashModalContent() {
  const [activeTab, setActiveTab] = useState<'accounts' | 'analytics' | 'income'>('accounts');
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CashAccount | null>(null);
  const [showAddIncomeModal, setShowAddIncomeModal] = useState(false);
  const [showEditIncomeModal, setShowEditIncomeModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeSource | null>(null);
  const isInitialMount = useRef(true);

  // Load data on component mount
  useEffect(() => {
    const loadAccounts = async () => {
      const savedAccounts = await SupabaseDataService.getCashAccounts([]);
      setAccounts(savedAccounts);
    };
    const loadIncomeSources = async () => {
      const savedIncome = await SupabaseDataService.getIncomeSources([]);
      setIncomeSources(savedIncome);
    };
    loadAccounts();
    loadIncomeSources();
    
    // Listen for data changes from AI or other components
    const handleDataChange = () => {
      loadAccounts();
      loadIncomeSources();
    };
    window.addEventListener('cashDataChanged', handleDataChange);
    window.addEventListener('financialDataChanged', handleDataChange);
    
    return () => {
      window.removeEventListener('cashDataChanged', handleDataChange);
      window.removeEventListener('financialDataChanged', handleDataChange);
    };
  }, []);

  // Data is now saved immediately on each operation (add/update/delete)
  // No need for a separate useEffect that watches all accounts changes

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const checkingTotal = accounts.filter(a => a.type === 'Checking').reduce((sum, a) => sum + a.balance, 0);
  const savingsTotal = accounts.filter(a => a.type === 'Savings').reduce((sum, a) => sum + a.balance, 0);
  const moneyMarketTotal = accounts.filter(a => a.type === 'Money Market').reduce((sum, a) => sum + a.balance, 0);
  
  // Calculate weighted APY for analytics
  const weightedAPY = totalBalance > 0
    ? accounts.reduce((sum, acc) => sum + (acc.balance * acc.apy), 0) / totalBalance
    : 0;

  const addAccount = async (accountData: Omit<CashAccount, 'id'>) => {
    const newAccount: CashAccount = {
      ...accountData,
      id: crypto.randomUUID()
    };
    // Save to database first
    await SupabaseDataService.saveCashAccount(newAccount);
    setAccounts([...accounts, newAccount]);
    // Notify other components
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const updateAccount = async (updatedAccount: CashAccount) => {
    await SupabaseDataService.saveCashAccount(updatedAccount);
    setAccounts(accounts.map(account => 
      account.id === updatedAccount.id ? updatedAccount : account
    ));
    setEditingAccount(null);
    // Notify other components
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const deleteAccount = async (accountId: string) => {
    await SupabaseDataService.deleteCashAccount(accountId);
    setAccounts(accounts.filter(account => account.id !== accountId));
    // Notify other components
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const editAccount = (account: CashAccount) => {
    setEditingAccount(account);
    setShowEditModal(true);
  };

  // Income CRUD operations
  const addIncomeSource = async (incomeData: Omit<IncomeSource, 'id'>) => {
    const newIncome: IncomeSource = {
      ...incomeData,
      id: crypto.randomUUID()
    };
    await SupabaseDataService.saveIncomeSource(newIncome);
    setIncomeSources([...incomeSources, newIncome]);
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const updateIncomeSource = async (updatedIncome: IncomeSource) => {
    await SupabaseDataService.saveIncomeSource(updatedIncome);
    setIncomeSources(incomeSources.map(income => 
      income.id === updatedIncome.id ? updatedIncome : income
    ));
    setEditingIncome(null);
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const deleteIncomeSource = async (incomeId: string) => {
    await SupabaseDataService.deleteIncomeSource(incomeId);
    setIncomeSources(incomeSources.filter(income => income.id !== incomeId));
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const editIncomeSource = (income: IncomeSource) => {
    setEditingIncome(income);
    setShowEditIncomeModal(true);
  };

  // Calculate monthly income
  const calculateMonthlyIncome = (income: IncomeSource) => {
    if (income.frequency === 'monthly') return income.amount;
    if (income.frequency === 'weekly') return income.amount * 4.33;
    if (income.frequency === 'bi-weekly') return income.amount * 2.17;
    if (income.frequency === 'yearly') return income.amount / 12;
    if (income.frequency === 'one-time') return 0; // One-time doesn't count toward monthly
    return 0;
  };

  const totalMonthlyIncome = incomeSources
    .filter(income => income.isRecurring)
    .reduce((sum, income) => sum + calculateMonthlyIncome(income), 0);

  const totalYearlyIncome = totalMonthlyIncome * 12;

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex border-b border-gray-200 dark:border-gray-700 flex-1 min-w-0">
            <div className="flex overflow-x-auto scrollbar-hide w-full">
              {[
                { id: 'accounts', label: 'Accounts', icon: Wallet },
                { id: 'analytics', label: 'Analytics', icon: TrendingUp },
                { id: 'income', label: 'Income', icon: Briefcase }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 border-b-2 transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                    activeTab === id
                      ? 'border-green-500 text-green-600 dark:text-green-400 font-semibold'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex gap-2 flex-shrink-0">
            {activeTab === 'accounts' && (
              <>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[#212121] text-white rounded-lg border border-[#212121] transition-all duration-200 active:scale-95 hover:bg-[#333] flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Account</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </>
            )}
            {activeTab === 'income' && (
              <button
                onClick={() => setShowAddIncomeModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[#212121] text-white rounded-lg border border-[#212121] transition-all duration-200 active:scale-95 hover:bg-[#333] flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Income Source</span>
                <span className="sm:hidden">Add</span>
              </button>
            )}
          </div>
        </div>

        {/* Accounts Tab */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            <div className="space-y-4">
              {accounts.sort((a, b) => b.balance - a.balance).map((account) => (
                <div key={account.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center text-white font-bold text-sm mt-1">
                        <Building2 className="w-5 h-5" />
                      </div>
                      
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{account.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          {account.bank}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {account.type} Account
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <DualCurrencyDisplay 
                          amount={account.balance} 
                          originalCurrency={account.currency || "USD"}
                          layout="stacked"
                          size="md"
                          originalClassName="text-lg font-bold text-green-600 dark:text-green-400"
                        />
                        <div className="text-sm text-gray-500 flex items-center gap-1 justify-end">
                          <TrendingUp className="w-3 h-3" />
                          {account.apy}% APY
                        </div>
                      </div>
                      
                      <div className="flex gap-1">
                        <button
                          onClick={() => editAccount(account)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4 dark:text-cyan-400 dark:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await deleteAccount(account.id);
                            } catch (error) {
                              console.error('Failed to delete account:', error);
                              alert('Failed to delete account. Please try again.');
                            }
                          }}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 dark:text-red-400 dark:drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {accounts.length === 0 && (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">No cash accounts added yet</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Your First Account
                  </button>
                </div>
              )}
            </div>

            {/* Account Summary Stats */}
            <div className="grid grid-cols-3 gap-4 px-2 -mx-2 py-2 -my-2">
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.cash}
                value={`$${Math.round(checkingTotal).toLocaleString()}`}
                label="Checking Accounts"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.cash}
                value={`$${Math.round(savingsTotal).toLocaleString()}`}
                label="Savings Accounts"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.cash}
                value={`$${Math.round(moneyMarketTotal).toLocaleString()}`}
                label="Money Market"
              />
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* APY Earnings Calculator */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Interest Earnings Projections</h3>
              <div className="space-y-3">
                {accounts.map((account) => {
                  // Calculate earnings based on APY
                  const monthlyRate = account.apy / 100 / 12;
                  const quarterlyRate = account.apy / 100 / 4;
                  const yearlyRate = account.apy / 100;
                  
                  const monthlyEarnings = account.balance * monthlyRate;
                  const quarterlyEarnings = account.balance * quarterlyRate;
                  const yearlyEarnings = account.balance * yearlyRate;
                  
                  return (
                    <div key={account.id} className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">{account.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {account.bank} • ${formatNumber(account.balance)} @ {account.apy}% APY
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Monthly</div>
                          <div className="text-lg font-bold text-green-600 dark:text-green-400">
                            +${formatNumber(monthlyEarnings)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {((monthlyRate) * 100).toFixed(3)}%
                          </div>
                        </div>
                        
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quarterly</div>
                          <div className="text-lg font-bold text-green-600 dark:text-green-400">
                            +${formatNumber(quarterlyEarnings)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {((quarterlyRate) * 100).toFixed(2)}%
                          </div>
                        </div>
                        
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Yearly</div>
                          <div className="text-lg font-bold text-green-600 dark:text-green-400">
                            +${formatNumber(yearlyEarnings)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {account.apy.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Total Earnings Summary */}
                {accounts.length > 0 && (
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Total Portfolio Earnings</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Monthly</div>
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          +${formatNumber(accounts.reduce((sum, acc) => sum + (acc.balance * (acc.apy / 100 / 12)), 0))}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quarterly</div>
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          +${formatNumber(accounts.reduce((sum, acc) => sum + (acc.balance * (acc.apy / 100 / 4)), 0))}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Yearly</div>
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          +${formatNumber(accounts.reduce((sum, acc) => sum + (acc.balance * (acc.apy / 100)), 0))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-center text-sm text-gray-600 dark:text-gray-400">
                      Weighted Average APY: {weightedAPY.toFixed(2)}%
                    </div>
                  </div>
                )}
                
                {accounts.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No accounts to calculate earnings</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Add cash accounts to see interest projections</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Cash Flow Analysis</h3>
              <div className="p-4 rounded-lg">
                <div className="space-y-3">
                  {/* Dynamic recommendations based on actual holdings */}
                  {(() => {
                    const recommendations = [];
                    const emergencyFunds = accounts.filter(a => 
                      a.name.toLowerCase().includes('emergency') || 
                      (a.type === 'Savings' && !a.name.toLowerCase().includes('goal'))
                    ).reduce((sum, a) => sum + a.balance, 0);
                    
                    const highYieldAccounts = accounts.filter(a => a.apy >= 4.0);
                    const lowYieldAccounts = accounts.filter(a => a.apy < 4.0 && a.balance > 1000);
                    const highestAPY = Math.max(...accounts.map(a => a.apy), 0);
                    const avgAPY = weightedAPY;
                    
                    // Emergency fund check
                    if (emergencyFunds < 15000) {
                      recommendations.push({
                        icon: '🚨',
                        text: `Build emergency fund: You have $${formatNumber(emergencyFunds)} saved. Target: $15,000-30,000 (3-6 months expenses)`,
                        priority: 'high'
                      });
                    } else if (emergencyFunds >= 15000 && emergencyFunds < 30000) {
                      recommendations.push({
                        icon: '✓',
                        text: `Emergency fund on track: $${formatNumber(emergencyFunds)} saved. Consider reaching $30,000 for 6 months coverage`,
                        priority: 'medium'
                      });
                    } else {
                      recommendations.push({
                        icon: '✅',
                        text: `Strong emergency fund: $${formatNumber(emergencyFunds)} saved - well above 6 months coverage!`,
                        priority: 'good'
                      });
                    }
                    
                    // High-yield savings recommendation
                    if (lowYieldAccounts.length > 0 && highestAPY < 4.5) {
                      const lowYieldTotal = lowYieldAccounts.reduce((sum, a) => sum + a.balance, 0);
                      const currentYearlyEarnings = lowYieldTotal * (avgAPY / 100);
                      const potentialYearlyEarnings = lowYieldTotal * 0.045;
                      const extraYearlyEarnings = potentialYearlyEarnings - currentYearlyEarnings;
                      recommendations.push({
                        icon: '💰',
                        text: `Consider high-yield savings: $${formatNumber(lowYieldTotal)} at ${avgAPY.toFixed(2)}% could earn +${(4.5 - avgAPY).toFixed(2)}% more APY at 4.5% (+$${formatNumber(extraYearlyEarnings)}/year extra)`,
                        priority: 'high'
                      });
                      // Suggest online high-yield account apps
                      recommendations.push({
                        icon: '📱',
                        text: `Try online high-yield apps: Revolut (up to 5.14% APY), Wise (multi-currency savings), N26 (fee-free banking), CashApp (instant access), SoFi, or Marcus by Goldman Sachs`,
                        priority: 'high'
                      });
                    } else if (avgAPY >= 4.0) {
                      recommendations.push({
                        icon: '🎯',
                        text: `Excellent APY: Average ${avgAPY.toFixed(2)}% across accounts - well optimized!`,
                        priority: 'good'
                      });
                    }
                    
                    // Checking account optimization
                    const checkingBalance = checkingTotal;
                    if (checkingBalance > 10000) {
                      recommendations.push({
                        icon: '📊',
                        text: `Optimize checking balance: $${formatNumber(checkingBalance)} in checking. Consider moving excess to high-yield savings`,
                        priority: 'medium'
                      });
                    } else if (checkingBalance < 2000) {
                      recommendations.push({
                        icon: '⚠️',
                        text: `Low checking balance: $${formatNumber(checkingBalance)} - ensure adequate buffer for monthly expenses`,
                        priority: 'medium'
                      });
                    } else {
                      recommendations.push({
                        icon: '✓',
                        text: `Checking balance optimized: $${formatNumber(checkingBalance)} - good buffer maintained`,
                        priority: 'good'
                      });
                    }
                    
                    // Fee analysis
                    if (accounts.length > 5) {
                      recommendations.push({
                        icon: '🔍',
                        text: `Review ${accounts.length} accounts for fees: Consolidate to fee-free alternatives where possible`,
                        priority: 'low'
                      });
                    }
                    
                    // Automation recommendation
                    if (totalBalance > 5000) {
                      recommendations.push({
                        icon: '🤖',
                        text: `Set up automatic transfers: Automate ${Math.round(totalBalance * 0.1)} (10% of balance) monthly to maximize interest`,
                        priority: 'medium'
                      });
                    }
                    
                    return recommendations.map((rec, idx) => (
                      <div 
                        key={idx}
                        className={`p-3 rounded-lg border-l-4 ${
                          rec.priority === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-red-500' :
                          rec.priority === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500' :
                          rec.priority === 'good' ? 'bg-green-50 dark:bg-green-900/20 border-green-500' :
                          'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                        }`}
                      >
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="mr-2">{rec.icon}</span>
                          {rec.text}
                        </p>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Market Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Risk Level Card */}
                <div className="bg-gradient-to-br from-red-50 to-red-50 dark:from-red-900/20 dark:to-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Risk Level</h4>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      totalBalance > 50000 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                      totalBalance > 20000 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                    }`}>
                      {totalBalance > 50000 ? 'Very Low' : totalBalance > 20000 ? 'Low' : 'Moderate'}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Cash holdings: ${formatNumber(totalBalance)}
                  </p>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    {totalBalance > 50000 
                      ? '✓ Strong liquidity position - well diversified'
                      : totalBalance > 20000
                      ? '✓ Good liquidity - consider building reserves'
                      : '⚠ Build emergency fund to reduce risk'}
                  </div>
                </div>

                {/* Opportunity Score Card */}
                <div className="bg-gradient-to-br from-green-50 to-green-50 dark:from-green-900/20 dark:to-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Opportunity Score</h4>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {(() => {
                        const avgAPY = weightedAPY;
                        if (avgAPY >= 4.5) return '9.5/10';
                        if (avgAPY >= 4.0) return '8.5/10';
                        if (avgAPY >= 3.0) return '7.0/10';
                        if (avgAPY >= 2.0) return '5.5/10';
                        return '4.0/10';
                      })()}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Current avg APY: {weightedAPY.toFixed(2)}%
                  </p>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    {weightedAPY >= 4.5 
                      ? '✓ Excellent rates - maximizing returns'
                      : weightedAPY >= 4.0
                      ? '✓ Good rates - slight room for improvement'
                      : '⚠ Opportunity to increase returns with higher APY accounts'}
                  </div>
                </div>
              </div>

              {/* Best Options - Real-time rates */}
              <div className="mt-4 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Best Current Options (As of {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">High-Yield Savings</span>
                      </div>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">4.25-4.50%</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Top banks: Marcus, Ally, American Express
                    </p>
                    {weightedAPY < 4.25 && totalBalance > 0 && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        ↑ +{(4.35 - weightedAPY).toFixed(2)}% APY (+${formatNumber(totalBalance * (4.35 - weightedAPY) / 100)}/year)
                      </p>
                    )}
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">Money Market</span>
                      </div>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">4.50-5.00%</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Top options: Vanguard, Fidelity, Schwab
                    </p>
                    {weightedAPY < 4.50 && totalBalance > 0 && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        ↑ +{(4.75 - weightedAPY).toFixed(2)}% APY (+${formatNumber(totalBalance * (4.75 - weightedAPY) / 100)}/year)
                      </p>
                    )}
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">6-Month CD</span>
                      </div>
                      <span className="text-lg font-bold text-purple-600 dark:text-purple-400">4.75-5.25%</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Best for: 6-12 month timeframe
                    </p>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                          <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">12-Month CD</span>
                      </div>
                      <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">5.00-5.50%</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Best for: Long-term savings goals
                    </p>
                  </div>
                </div>

                {/* Projected earnings with better rates */}
                {weightedAPY < 4.5 && totalBalance > 5000 && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <h5 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">💡 Optimization Opportunity</h5>
                    <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">
                      Moving ${formatNumber(totalBalance)} to accounts averaging 4.5% APY:
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Current yearly:</span>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          ${formatNumber(totalBalance * weightedAPY / 100)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Potential yearly:</span>
                        <div className="font-semibold text-green-600 dark:text-green-400">
                          ${formatNumber(totalBalance * 4.5 / 100)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Extra income:</span>
                        <div className="font-semibold text-green-600 dark:text-green-400">
                          +${formatNumber(totalBalance * (4.5 - weightedAPY) / 100)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Income Tab */}
        {activeTab === 'income' && (
          <div className="space-y-6">
            {/* Income Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Monthly Income</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${formatNumber(totalMonthlyIncome)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {incomeSources.filter(i => i.isRecurring).length} recurring sources
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Yearly Income</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${formatNumber(totalYearlyIncome)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Projected annual earnings
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Total Sources</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {incomeSources.length}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {incomeSources.filter(i => !i.isRecurring).length} one-time payments
                </div>
              </div>
            </div>

            {/* Income Sources List */}
            <div className="space-y-4">
              {incomeSources.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Income Sources Yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Start tracking your salary, side hustles, and other income streams</p>
                  <button
                    onClick={() => setShowAddIncomeModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Add Your First Income Source
                  </button>
                </div>
              ) : (
                <>
                  {/* Recurring Income */}
                  {incomeSources.filter(i => i.isRecurring).length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                        <RefreshCw className="w-5 h-5" />
                        Recurring Income
                      </h3>
                      <div className="space-y-3">
                        {incomeSources
                          .filter(income => income.isRecurring)
                          .sort((a, b) => calculateMonthlyIncome(b) - calculateMonthlyIncome(a))
                          .map((income) => {
                            const connectedAccount = accounts.find(acc => acc.id === income.connectedAccount);
                            const monthlyAmount = calculateMonthlyIncome(income);
                            
                            return (
                              <div key={income.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 transition-colors">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-start gap-3 flex-1">
                                    <div 
                                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                      style={{ backgroundColor: income.color + '40' }}
                                    >
                                      <Briefcase className="w-5 h-5" style={{ color: income.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-gray-900 dark:text-white">{income.name}</h4>
                                        <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                          {income.category}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                          <DollarSign className="w-4 h-4" />
                                          ${formatNumber(income.amount)} / {income.frequency}
                                        </span>
                                        {connectedAccount && (
                                          <span className="flex items-center gap-1">
                                            <Building2 className="w-4 h-4" />
                                            {connectedAccount.name}
                                          </span>
                                        )}
                                        {income.nextPaymentDate && (
                                          <span className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            Next: {new Date(income.nextPaymentDate).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                      {income.notes && (
                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{income.notes}</p>
                                      )}
                                      <div className="mt-2 text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Monthly equivalent: </span>
                                        <span className="font-semibold text-green-600 dark:text-green-400">
                                          ${formatNumber(monthlyAmount)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 ml-4">
                                    <button
                                      onClick={() => editIncomeSource(income)}
                                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                      title="Edit income source"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm(`Delete "${income.name}"?`)) {
                                          deleteIncomeSource(income.id);
                                        }
                                      }}
                                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                      title="Delete income source"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* One-Time Income */}
                  {incomeSources.filter(i => !i.isRecurring).length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        One-Time Income
                      </h3>
                      <div className="space-y-3">
                        {incomeSources
                          .filter(income => !income.isRecurring)
                          .sort((a, b) => b.amount - a.amount)
                          .map((income) => {
                            const connectedAccount = accounts.find(acc => acc.id === income.connectedAccount);
                            
                            return (
                              <div key={income.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-start gap-3 flex-1">
                                    <div 
                                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                      style={{ backgroundColor: income.color + '40' }}
                                    >
                                      <DollarSign className="w-5 h-5" style={{ color: income.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-gray-900 dark:text-white">{income.name}</h4>
                                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                          {income.category}
                                        </span>
                                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                          one-time
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                        <span className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                                          <DollarSign className="w-4 h-4" />
                                          ${formatNumber(income.amount)}
                                        </span>
                                        {connectedAccount && (
                                          <span className="flex items-center gap-1">
                                            <Building2 className="w-4 h-4" />
                                            {connectedAccount.name}
                                          </span>
                                        )}
                                      </div>
                                      {income.notes && (
                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{income.notes}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-2 ml-4">
                                    <button
                                      onClick={() => editIncomeSource(income)}
                                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                      title="Edit income source"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm(`Delete "${income.name}"?`)) {
                                          deleteIncomeSource(income.id);
                                        }
                                      }}
                                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                      title="Delete income source"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddCashAccountModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onAdd={addAccount}
      />
      
      <EditCashAccountModal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)} 
        account={editingAccount}
        onUpdate={updateAccount}
      />

      <AddIncomeModal 
        isOpen={showAddIncomeModal} 
        onClose={() => setShowAddIncomeModal(false)} 
        onAdd={addIncomeSource}
        accounts={accounts}
      />
      
      <EditIncomeModal 
        isOpen={showEditIncomeModal} 
        onClose={() => setShowEditIncomeModal(false)} 
        income={editingIncome}
        onUpdate={updateIncomeSource}
        accounts={accounts}
      />
    </div>
  );
}

export function CashCard() {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const { convertToMain, formatMain, mainCurrency } = useCurrencyConversion();

  // Load data on component mount and when currency changes
  useEffect(() => {
    const loadAccounts = async () => {
      const savedAccounts = await SupabaseDataService.getCashAccounts([]);
      setAccounts(savedAccounts);
    };
    loadAccounts();
    
    // Listen for data changes and reload
    const handleDataChange = () => loadAccounts();
    window.addEventListener('cashDataChanged', handleDataChange);
    window.addEventListener('financialDataChanged', handleDataChange);
    window.addEventListener('currencyChanged', handleDataChange); // Re-render on currency change
    
    return () => {
      window.removeEventListener('cashDataChanged', handleDataChange);
      window.removeEventListener('financialDataChanged', handleDataChange);
      window.removeEventListener('currencyChanged', handleDataChange);
    };
  }, [mainCurrency.code]); // Re-load when currency changes

  // Calculate dynamic values from saved data with currency conversion
  const totalBalance = accounts.reduce((sum, account) => {
    // Convert each account's balance to main currency
    const accountCurrency = account.currency || 'USD';
    const convertedBalance = convertToMain(account.balance, accountCurrency);
    return sum + convertedBalance;
  }, 0);
  
  const checkingAccounts = accounts.filter(acc => acc.type === 'Checking');
  const savingsAccounts = accounts.filter(acc => acc.type === 'Savings');
  const checkingTotal = checkingAccounts.reduce((sum, acc) => {
    const accountCurrency = acc.currency || 'USD';
    return sum + convertToMain(acc.balance, accountCurrency);
  }, 0);
  const savingsTotal = savingsAccounts.reduce((sum, acc) => {
    const accountCurrency = acc.currency || 'USD';
    return sum + convertToMain(acc.balance, accountCurrency);
  }, 0);

  // Calculate real APY-based return (weighted average)
  const weightedAPY = totalBalance > 0 && accounts.length > 0
    ? accounts.reduce((sum, acc) => {
        const accountCurrency = acc.currency || 'USD';
        const convertedBalance = convertToMain(acc.balance, accountCurrency);
        return sum + (convertedBalance * acc.apy);
      }, 0) / totalBalance
    : 0;
  const changePercent = weightedAPY > 0 ? `+${weightedAPY.toFixed(2)}%` : "0.0%";
  const changeType = weightedAPY > 0 ? "positive" as const : "negative" as const;

  // Dynamic chart data based on actual accounts - sort by balance and take top holdings
  const chartData = accounts
    .filter(account => account.balance && !isNaN(account.balance) && isFinite(account.balance))
    .sort((a, b) => {
      const aConverted = convertToMain(a.balance, a.currency || 'USD');
      const bConverted = convertToMain(b.balance, b.currency || 'USD');
      return bConverted - aConverted;
    })
    .slice(0, 12)
    .map(account => ({
      value: convertToMain(account.balance, account.currency || 'USD'),
      change: `+${account.apy}%`
    }));

  // Display total in main currency
  const displayAmount = formatMain(totalBalance);

  return (
    <EnhancedFinancialCard
      title="Cash & Liquid Assets"
      description="Available liquid funds across all accounts"
      amount={displayAmount}
      change={changePercent}
      changeType="positive"
      mainColor="#10b981"
      secondaryColor="#34d399"
      gridColor="#10b98115"
      stats={[
        { label: "Checking", value: formatMain(checkingTotal), color: "#10b981" },
        { label: "Savings", value: formatMain(savingsTotal), color: "#34d399" }
      ]}
      icon={Coins}
      hoverContent={<CashHoverContent />}
      modalContent={<CashModalContent />}
      chartData={chartData}
    />
  );
}

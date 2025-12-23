"use client";

import { useState, useEffect, useRef } from "react";
import { 
  PiggyBank, 
  Plus, 
  Search, 
  X, 
  Edit3, 
  Trash2, 
  Target,
  TrendingUp,
  Wallet,
  Globe,
  MapPin,
  Filter,
  Building2,
  DollarSign,
  Percent
} from "lucide-react";
import { EnhancedFinancialCard } from "../ui/enhanced-financial-card";
import { SupabaseDataService } from "../../lib/supabase/supabase-data-service";
import { MarketAnalysisWidget } from "../ui/market-analysis-widget";
import { ThemedStatBox, CARD_THEME_COLORS } from "../ui/themed-stat-box";
import { INTERNATIONAL_BANKS, BankInfo, searchBanks, getBanksByCountry, getBanksByContinent, getAllCountries, getAllContinents } from "../../lib/banks-database";
import { formatNumber } from "../../lib/utils";
import { useCurrency } from "../../contexts/currency-context";

interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  priority: 'High' | 'Medium' | 'Low';
  color: string;
  monthlyContribution: number;
  apy: number;
}

interface Account {
  id: string;
  name: string;
  bank: string;
  balance: number;
  apy: number;
  type: string;
}

const initialSavingsGoals: SavingsGoal[] = [
  { 
    id: '1',
    name: 'Emergency Fund', 
    target: 30000, 
    current: 25000, 
    priority: 'High', 
    color: '#3b82f6',
    monthlyContribution: 500,
    apy: 4.25
  },
  { 
    id: '2',
    name: 'Vacation Fund', 
    target: 10000, 
    current: 8500, 
    priority: 'Medium', 
    color: '#6366f1',
    monthlyContribution: 300,
    apy: 4.05
  },
  { 
    id: '3',
    name: 'Home Down Payment', 
    target: 50000, 
    current: 11780, 
    priority: 'High', 
    color: '#0ea5e9',
    monthlyContribution: 800,
    apy: 4.15
  }
];

const initialAccounts: Account[] = [
  { id: '1', name: 'Marcus High-Yield', bank: 'Marcus by Goldman Sachs', balance: 25000, apy: 4.25, type: 'High-Yield Savings' },
  { id: '2', name: 'Ally Online Savings', bank: 'Ally Bank', balance: 15280, apy: 4.05, type: 'Online Savings' },
  { id: '3', name: 'Emergency CD', bank: 'Capital One', balance: 5000, apy: 4.50, type: 'Certificate of Deposit' }
];

const priorityColors = {
  'High': '#ef4444',
  'Medium': '#f59e0b', 
  'Low': '#10b981'
};

// Bank Search Modal Component
function BankSearchModal({
  isOpen,
  onClose,
  onSelectBank
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectBank: (bank: BankInfo) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedContinent, setSelectedContinent] = useState<string>('');
  const [bankType, setBankType] = useState<string>('');
  const [filteredBanks, setFilteredBanks] = useState<BankInfo[]>(INTERNATIONAL_BANKS);

  useEffect(() => {
    let results = INTERNATIONAL_BANKS;

    // Apply search query filter
    if (searchQuery.trim()) {
      results = searchBanks(searchQuery);
    }

    // Apply country filter
    if (selectedCountry) {
      results = results.filter(bank => bank.country === selectedCountry);
    }

    // Apply continent filter
    if (selectedContinent) {
      results = results.filter(bank => bank.continent === selectedContinent);
    }

    // Apply bank type filter
    if (bankType) {
      results = results.filter(bank => bank.type === bankType);
    }

    setFilteredBanks(results);
  }, [searchQuery, selectedCountry, selectedContinent, bankType]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCountry('');
    setSelectedContinent('');
    setBankType('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000001] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Select Your Bank</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Choose from over 50 international banks</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 dark:text-white dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search Bar */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search banks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
              />
            </div>

            {/* Country Filter */}
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
            >
              <option value="">All Countries</option>
              {getAllCountries().map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>

            {/* Continent Filter */}
            <select
              value={selectedContinent}
              onChange={(e) => setSelectedContinent(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
            >
              <option value="">All Continents</option>
              {getAllContinents().map(continent => (
                <option key={continent} value={continent}>{continent}</option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={bankType}
              onChange={(e) => setBankType(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
            >
              <option value="">All Types</option>
              <option value="retail">Retail Banking</option>
              <option value="digital">Digital Banking</option>
              <option value="investment">Investment Banking</option>
              <option value="credit-union">Credit Union</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {(searchQuery || selectedCountry || selectedContinent || bankType) && (
            <button
              onClick={clearFilters}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
            >
              <Filter className="w-3 h-3" />
              Clear all filters
            </button>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBanks.map((bank) => (
              <div
                key={bank.id}
                onClick={() => {
                  onSelectBank(bank);
                  onClose();
                }}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer transition-all hover:shadow-md"
              >
                {/* Bank Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: bank.color }}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">{bank.name}</h4>
                    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                      <MapPin className="w-3 h-3" />
                      <span>{bank.country}</span>
                    </div>
                  </div>
                </div>

                {/* Bank Details */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Type:</span>
                    <span className="capitalize font-medium text-gray-900 dark:text-white">{bank.type}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Products:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{bank.products.length} types</span>
                  </div>
                </div>

                {/* Popular Products */}
                <div className="mt-3">
                  <div className="flex flex-wrap gap-1">
                    {bank.products.slice(0, 2).map((product, index) => (
                      <span
                        key={index}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded"
                      >
                        {product}
                      </span>
                    ))}
                    {bank.products.length > 2 && (
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded">
                        +{bank.products.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredBanks.length === 0 && (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No banks found matching your criteria</p>
              <button
                onClick={clearFilters}
                className="mt-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
              >
                Clear filters to see all banks
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Add Account Modal Component
function AddAccountModal({
  isOpen,
  onClose,
  onAdd
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (account: Omit<Account, 'id'>) => void;
}) {
  const [name, setName] = useState('');
  const [selectedBank, setSelectedBank] = useState<BankInfo | null>(null);
  const [balance, setBalance] = useState('');
  const [apy, setApy] = useState('');
  const [type, setType] = useState('');
  const [showBankSearch, setShowBankSearch] = useState(false);

  const handleAdd = () => {
    if (name && selectedBank && balance && apy && type) {
      onAdd({
        name,
        bank: selectedBank.name,
        balance: parseFloat(balance),
        apy: parseFloat(apy),
        type
      });
      onClose();
      resetForm();
    }
  };

  const resetForm = () => {
    setName('');
    setSelectedBank(null);
    setBalance('');
    setApy('');
    setType('');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl w-96 max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Savings Account</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-900 dark:text-white">
              <X className="w-4 h-4 dark:text-white dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Account Name */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Account Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                placeholder="e.g., Emergency Fund Savings"
              />
            </div>

            {/* Bank Selection */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Bank</label>
              <button
                type="button"
                onClick={() => setShowBankSearch(true)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 text-left flex items-center justify-between"
              >
                {selectedBank ? (
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: selectedBank.color }}
                    >
                      <Building2 className="w-3 h-3" />
                    </div>
                    <span className="truncate">{selectedBank.name}</span>
                  </div>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">Select your bank...</span>
                )}
                <Search className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Account Type */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Account Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
              >
                <option value="">Select account type</option>
                <option value="High-Yield Savings">High-Yield Savings</option>
                <option value="Regular Savings">Regular Savings</option>
                <option value="Money Market">Money Market</option>
                <option value="Certificate of Deposit">Certificate of Deposit (CD)</option>
                <option value="Online Savings">Online Savings</option>
              </select>
            </div>

            {/* Current Balance */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Current Balance</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                  placeholder="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* APY */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Annual Percentage Yield (APY)</label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={apy}
                  onChange={(e) => setApy(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                  placeholder="4.25"
                  step="0.01"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!name || !selectedBank || !balance || !apy || !type}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Add Account
              </button>
            </div>
          </div>
        </div>
      </div>

      <BankSearchModal
        isOpen={showBankSearch}
        onClose={() => setShowBankSearch(false)}
        onSelectBank={(bank) => setSelectedBank(bank)}
      />
    </>
  );
}

// Common savings goals with suggested targets
const COMMON_SAVINGS_GOALS = [
  { name: 'Emergency Fund', target: 25000, priority: 'High' as const, monthlyContribution: 500 },
  { name: 'House Down Payment', target: 50000, priority: 'High' as const, monthlyContribution: 800 },
  { name: 'Car Fund', target: 15000, priority: 'Medium' as const, monthlyContribution: 300 },
  { name: 'Wedding', target: 20000, priority: 'High' as const, monthlyContribution: 500 },
  { name: 'Vacation Fund', target: 10000, priority: 'Medium' as const, monthlyContribution: 250 },
  { name: 'New Laptop', target: 2000, priority: 'Low' as const, monthlyContribution: 100 },
  { name: 'Home Renovation', target: 30000, priority: 'Medium' as const, monthlyContribution: 600 },
  { name: 'Education Fund', target: 40000, priority: 'High' as const, monthlyContribution: 700 },
  { name: 'Investment Capital', target: 25000, priority: 'Medium' as const, monthlyContribution: 500 },
  { name: 'Retirement Supplement', target: 100000, priority: 'High' as const, monthlyContribution: 1000 },
  { name: 'Medical Emergency', target: 15000, priority: 'High' as const, monthlyContribution: 400 },
  { name: 'Business Startup', target: 50000, priority: 'Medium' as const, monthlyContribution: 800 },
  { name: 'Debt Payoff', target: 20000, priority: 'High' as const, monthlyContribution: 500 },
  { name: 'Holiday Shopping', target: 3000, priority: 'Low' as const, monthlyContribution: 150 },
  { name: 'Pet Emergency Fund', target: 5000, priority: 'Medium' as const, monthlyContribution: 200 }
];

// Add Goal Modal Component
function AddGoalModal({ 
  isOpen, 
  onClose, 
  onAdd 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onAdd: (goal: Omit<SavingsGoal, 'id' | 'color'>) => void;
}) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [apy, setApy] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredGoals, setFilteredGoals] = useState(COMMON_SAVINGS_GOALS);

  // Filter goals based on input
  useEffect(() => {
    if (name.trim().length > 0) {
      const filtered = COMMON_SAVINGS_GOALS.filter(goal =>
        goal.name.toLowerCase().includes(name.toLowerCase())
      );
      setFilteredGoals(filtered);
    } else {
      setFilteredGoals(COMMON_SAVINGS_GOALS);
    }
  }, [name]);

  const selectGoal = (goal: typeof COMMON_SAVINGS_GOALS[0]) => {
    setName(goal.name);
    setTarget(goal.target.toString());
    setPriority(goal.priority);
    setMonthlyContribution(goal.monthlyContribution.toString());
    setShowSuggestions(false);
  };

  const handleAdd = () => {
    if (name && target && current && monthlyContribution && apy) {
      onAdd({
        name,
        target: parseFloat(target),
        current: parseFloat(current),
        priority,
        monthlyContribution: parseFloat(monthlyContribution),
        apy: parseFloat(apy)
      });
      onClose();
      resetForm();
    }
  };

  const resetForm = () => {
    setName('');
    setTarget('');
    setCurrent('');
    setPriority('Medium');
    setMonthlyContribution('');
    setApy('');
    setShowSuggestions(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[15000]">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl w-96 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Savings Goal</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-900 dark:text-white">
            <X className="w-4 h-4" style={{ color: "inherit" }} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Goal Name with Dropdown */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Goal Name</label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  // Delay hiding to allow click events to register
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                placeholder="e.g., Car Fund, Wedding, New Laptop..."
                autoComplete="off"
              />
              
              {/* Suggestions Dropdown */}
              {showSuggestions && filteredGoals.length > 0 && (
                <div className="absolute z-[15010] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                  {filteredGoals.map((goal, index) => (
                    <button
                      key={index}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectGoal(goal);
                      }}
                      className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white">{goal.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            ${goal.target.toLocaleString()} target • ${goal.monthlyContribution}/month
                          </div>
                        </div>
                        <div 
                          className="px-2 py-1 rounded text-xs font-medium ml-2"
                          style={{ 
                            backgroundColor: `${priorityColors[goal.priority]}20`,
                            color: priorityColors[goal.priority]
                          }}
                        >
                          {goal.priority}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {/* No results message */}
              {showSuggestions && name.trim().length > 0 && filteredGoals.length === 0 && (
                <div className="absolute z-[15010] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No matching goals. Type your custom goal name.
                  </p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              💡 Click to select from popular goals or type your own
            </p>
          </div>

          {/* Target Amount */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Target Amount ($)</label>
            <input
              type="number"
              step="any"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
              placeholder="Enter target amount..."
            />
          </div>

          {/* Current Amount */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Current Amount ($)</label>
            <input
              type="number"
              step="any"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
              placeholder="Enter current savings..."
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'High' | 'Medium' | 'Low')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Monthly Contribution */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Monthly Contribution ($)</label>
            <input
              type="number"
              step="any"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
              placeholder="Monthly savings amount..."
            />
          </div>

          {/* APY */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">APY (%)</label>
            <input
              type="number"
              step="0.01"
              value={apy}
              onChange={(e) => setApy(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
              placeholder="Annual percentage yield..."
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!name || !target || !current || !monthlyContribution || !apy}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Goal
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Goal Modal Component
function EditGoalModal({ 
  isOpen, 
  onClose, 
  goal,
  onUpdate 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  goal: SavingsGoal | null;
  onUpdate: (id: string, updates: Partial<SavingsGoal>) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [apy, setApy] = useState('');

  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setTarget(goal.target.toString());
      setCurrent(goal.current.toString());
      setPriority(goal.priority);
      setMonthlyContribution(goal.monthlyContribution.toString());
      setApy(goal.apy.toString());
    }
  }, [goal]);

  const handleUpdate = async () => {
    if (goal && name && target && current && monthlyContribution && apy) {
      await onUpdate(goal.id, {
        name,
        target: parseFloat(target),
        current: parseFloat(current),
        priority,
        monthlyContribution: parseFloat(monthlyContribution),
        apy: parseFloat(apy)
      });
      onClose();
    }
  };

  if (!isOpen || !goal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl w-96">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Savings Goal</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-900 dark:text-white">
            <X className="w-4 h-4" style={{ color: "inherit" }} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Goal Name */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Goal Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
            />
          </div>

          {/* Target Amount */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Target Amount ($)</label>
            <input
              type="number"
              step="any"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
            />
          </div>

          {/* Current Amount */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Current Amount ($)</label>
            <input
              type="number"
              step="any"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'High' | 'Medium' | 'Low')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Monthly Contribution */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Monthly Contribution ($)</label>
            <input
              type="number"
              step="any"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
            />
          </div>

          {/* APY */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">APY (%)</label>
            <input
              type="number"
              step="0.01"
              value={apy}
              onChange={(e) => setApy(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Update Goal
          </button>
        </div>
      </div>
    </div>
  );
}

function SavingsModalContent() {
  const [activeTab, setActiveTab] = useState<'goals' | 'accounts' | 'analytics'>('goals');
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const isInitialMount = useRef(true);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      const savedGoals = await SupabaseDataService.getSavingsAccounts([]);
      setSavingsGoals(savedGoals);
      setAccounts(savedGoals); // Savings accounts are the goals
    };
    loadData();
    
    // Listen for data changes from AI or other components
    const handleDataChange = () => loadData();
    window.addEventListener('savingsDataChanged', handleDataChange);
    window.addEventListener('financialDataChanged', handleDataChange);
    
    return () => {
      window.removeEventListener('savingsDataChanged', handleDataChange);
      window.removeEventListener('financialDataChanged', handleDataChange);
    };
  }, []);

  // Data is now saved immediately on each operation (add/update/delete)
  // No need for a separate useEffect that watches all goals changes

  // Save accounts data (same as goals for savings) - shares same isInitialMount ref
  useEffect(() => {
    if (isInitialMount.current) {
      return;
    }
    
    const saveAccounts = async () => {
      for (const account of accounts) {
        await SupabaseDataService.saveSavingsAccount(account);
      }
    };
    if (accounts.length > 0) {
      saveAccounts();
    }
  }, [accounts]);

  const colors = ['#3b82f6', '#6366f1', '#0ea5e9', '#8b5cf6', '#06b6d4', '#10b981'];

  const addGoal = async (newGoal: Omit<SavingsGoal, 'id' | 'color'>) => {
    const id = crypto.randomUUID();
    const color = colors[savingsGoals.length % colors.length];
    
    const goal: SavingsGoal = {
      ...newGoal,
      id,
      color
    };

    // Save to database first
    await SupabaseDataService.saveSavingsAccount(goal);
    setSavingsGoals([...savingsGoals, goal]);
    // Notify other components
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const updateGoal = async (id: string, updates: Partial<SavingsGoal>) => {
    const updatedGoals = savingsGoals.map(goal => 
      goal.id === id ? { ...goal, ...updates } : goal
    );
    
    // Save to database immediately
    const updatedGoal = updatedGoals.find(g => g.id === id);
    if (updatedGoal) {
      await SupabaseDataService.saveSavingsAccount(updatedGoal);
    }
    
    setSavingsGoals(updatedGoals);
    // Notify other components
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const deleteGoal = async (id: string) => {
    await SupabaseDataService.deleteSavingsAccount(id);
    setSavingsGoals(prev => prev.filter(goal => goal.id !== id));
    // Notify other components
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const addAccount = async (accountData: Omit<Account, 'id'>) => {
    const newAccount: Account = {
      ...accountData,
      id: crypto.randomUUID()
    };
    // Save to database first
    await SupabaseDataService.saveSavingsAccount(newAccount);
    setAccounts(prev => [...prev, newAccount]);
    // Notify other components
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const deleteAccount = async (id: string) => {
    await SupabaseDataService.deleteSavingsAccount(id);
    setAccounts(prev => prev.filter(account => account.id !== id));
    // Notify other components
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const totalSavings = accounts.reduce((sum, account) => sum + account.balance, 0);
  const totalMonthlyContribution = savingsGoals.reduce((sum, goal) => sum + goal.monthlyContribution, 0);
  const averageAPY = accounts.length > 0 ? accounts.reduce((sum, account) => sum + account.apy, 0) / accounts.length : 0;

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex border-b border-gray-200 dark:border-gray-700 flex-1 min-w-0">
            <div className="flex overflow-x-auto scrollbar-hide w-full">
              {[
                { id: 'goals', label: 'Goals', icon: Target },
                { id: 'accounts', label: 'Accounts', icon: Wallet },
                { id: 'analytics', label: 'Analytics', icon: TrendingUp }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 border-b-2 transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          
          {activeTab === 'goals' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Goal</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              {savingsGoals.map((goal) => (
                <div key={goal.id} className="relative bg-gray-50 dark:bg-gray-800 p-4 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-500/30 hover:scale-[1.01] hover:z-10 cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-semibold text-gray-900 dark:text-white">{goal.name}</div>
                        <div 
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{ 
                            backgroundColor: `${priorityColors[goal.priority]}20`,
                            color: priorityColors[goal.priority]
                          }}
                        >
                          {goal.priority}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        ${goal.monthlyContribution}/month • {goal.apy}% APY
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
                        <div 
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min((goal.current / goal.target) * 100, 100)}%`,
                            backgroundColor: goal.color
                          }}
                        />
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {Math.round((goal.current / goal.target) * 100)}% complete • 
                        ${Math.max(0, goal.target - goal.current).toLocaleString()} remaining
                      </div>
                    </div>
                    <div className="flex items-start gap-4 ml-4">
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">${goal.current.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">of ${goal.target.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingGoal(goal);
                            setShowEditModal(true);
                          }}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        >
                          <Edit3 className="w-4 h-4 text-gray-700 dark:text-cyan-400 dark:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await deleteGoal(goal.id);
                            } catch (error) {
                              console.error('Failed to delete goal:', error);
                              alert('Failed to delete goal. Please try again.');
                            }
                          }}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-red-500"
                        >
                          <Trash2 className="w-4 h-4 dark:text-red-400 dark:drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2 -mx-2 py-2 -my-2">
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.savings}
                value={`$${totalMonthlyContribution.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                label="Monthly Savings"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.savings}
                value={`${averageAPY.toFixed(2)}%`}
                label="Average APY"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.savings}
                value={`$${totalSavings.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                label="Total Saved"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.savings}
                value={savingsGoals.length}
                label="Active Goals"
              />
            </div>
          </div>
        )}

        {/* Accounts Tab */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Savings Accounts</h3>
              <button
                onClick={() => setShowAddAccountModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Account
              </button>
            </div>

            <div className="space-y-4">
              {accounts.sort((a, b) => b.balance - a.balance).map((account) => {
                // Find bank info for enhanced display
                const bankInfo = INTERNATIONAL_BANKS.find(bank => bank.name === account.bank);
                
                return (
                  <div key={account.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        {/* Bank Icon */}
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm mt-1"
                          style={{ backgroundColor: bankInfo?.color || '#6b7280' }}
                        >
                          <Building2 className="w-5 h-5" />
                        </div>
                        
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{account.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <span>{account.bank}</span>
                            {bankInfo && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {bankInfo.country}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="text-xs text-gray-900 dark:text-white mt-1">
                            {account.type}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">${account.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                          <div className="text-sm text-green-600 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {account.apy}% APY
                          </div>
                          {bankInfo && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                              {bankInfo.type} bank
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={async () => {
                            try {
                              await deleteAccount(account.id);
                            } catch (error) {
                              console.error('Failed to delete account:', error);
                              alert('Failed to delete account. Please try again.');
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Additional Bank Info */}
                    {bankInfo && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex flex-wrap gap-2">
                          {bankInfo.products.slice(0, 3).map((product, index) => (
                            <span
                              key={index}
                              className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                            >
                              {product}
                            </span>
                          ))}
                          {bankInfo.products.length > 3 && (
                            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                              +{bankInfo.products.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {accounts.length === 0 && (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">No savings accounts added yet</p>
                  <button
                    onClick={() => setShowAddAccountModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Your First Account
                  </button>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Account Security</h4>
              <div className="text-sm space-y-1 text-gray-900 dark:text-white">
                <div className="flex justify-between">
                  <span>FDIC Insured</span>
                  <span className="text-green-600">✓ Up to $250,000</span>
                </div>
                <div className="flex justify-between">
                  <span>Multi-factor Auth</span>
                  <span className="text-green-600">✓ Enabled</span>
                </div>
                <div className="flex justify-between">
                  <span>Account Monitoring</span>
                  <span className="text-green-600">✓ Active</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Goal Timeline</h3>
              <div className="space-y-3">
                {savingsGoals.map((goal) => {
                  const remaining = Math.max(0, goal.target - goal.current);
                  const monthsToComplete = goal.monthlyContribution > 0 ? Math.ceil(remaining / goal.monthlyContribution) : 0;
                  
                  return (
                    <div key={goal.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{goal.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          ${remaining.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} remaining
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold" style={{ color: goal.color }}>
                          {monthsToComplete} months
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          to completion
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Optimization Tips</h3>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg">
                <ul className="space-y-2 text-sm">
                  <li className="text-gray-700 dark:text-gray-300">• Increase emergency fund priority for better financial security</li>
                  <li className="text-gray-700 dark:text-gray-300">• Consider high-yield savings accounts with rates above 4.5%</li>
                  <li className="text-gray-700 dark:text-gray-300">• Automate transfers on payday to maintain consistent savings</li>
                  <li className="text-gray-700 dark:text-gray-300">• Review and rebalance goals quarterly based on income changes</li>
                  <li className="text-gray-700 dark:text-gray-300">• Consider CD ladders for goals with longer timelines</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddGoalModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onAdd={addGoal}
      />
      
      <EditGoalModal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)} 
        goal={editingGoal}
        onUpdate={updateGoal}
      />

      <AddAccountModal
        isOpen={showAddAccountModal}
        onClose={() => setShowAddAccountModal(false)}
        onAdd={addAccount}
      />
    </div>
  );
}

function SavingsHoverContent() {
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);

  useEffect(() => {
    const loadGoals = async () => {
      const savedGoals = await SupabaseDataService.getSavingsAccounts([]);
      setSavingsGoals(savedGoals);
    };
    loadGoals();
    
    // Listen for data changes
    const handleDataChange = () => loadGoals();
    window.addEventListener('financialDataChanged', handleDataChange);
    
    return () => window.removeEventListener('financialDataChanged', handleDataChange);
  }, []);

  const totalAmount = savingsGoals.reduce((sum, goal) => sum + goal.current, 0);
  const averageAPY = savingsGoals.length > 0 
    ? (savingsGoals.reduce((sum, goal) => sum + (goal.apy || 0), 0) / savingsGoals.length).toFixed(2)
    : '0.00';
  const monthlyContributions = savingsGoals.reduce((sum, goal) => sum + (goal.monthlyContribution || 0), 0);
  
  // Show top 3 goals by current value
  const topGoals = [...savingsGoals].sort((a, b) => b.current - a.current).slice(0, 3);

  return (
    <div className="space-y-1">
      {topGoals.map((goal, index) => (
        <div key={goal.id} className="flex justify-between text-xs">
          <span>{goal.name}</span>
          <span className="font-semibold" style={{ color: goal.color }}>${formatNumber(goal.current)}</span>
        </div>
      ))}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-1 mt-1">
        <div className="flex justify-between text-xs">
          <span>Monthly Savings Rate</span>
          <span className="font-semibold text-green-600 dark:text-green-400">${formatNumber(monthlyContributions)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Average APY</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">{averageAPY}%</span>
        </div>
      </div>
    </div>
  );
}

export function SavingsCard() {
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const { mainCurrency, convert } = useCurrency();

  // Load data on component mount
  useEffect(() => {
    const loadGoals = async () => {
      const savedGoals = await SupabaseDataService.getSavingsAccounts([]);
      setSavingsGoals(savedGoals);
    };
    loadGoals();
    
    // Listen for data changes and reload
    const handleDataChange = () => loadGoals();
    window.addEventListener('savingsDataChanged', handleDataChange);
    window.addEventListener('financialDataChanged', handleDataChange);
    window.addEventListener('currencyChanged', handleDataChange);
    
    return () => {
      window.removeEventListener('savingsDataChanged', handleDataChange);
      window.removeEventListener('financialDataChanged', handleDataChange);
      window.removeEventListener('currencyChanged', handleDataChange);
    };
  }, []);

  // Calculate dynamic values from saved data (values are stored in USD)
  const totalAmountUSD = savingsGoals.reduce((sum, goal) => sum + goal.current, 0);
  const emergencyFundsUSD = savingsGoals.filter(goal => goal.name.toLowerCase().includes('emergency')).reduce((sum, goal) => sum + goal.current, 0);
  
  // Convert to main currency for display
  const totalAmount = convert(totalAmountUSD, 'USD', mainCurrency.code);
  const emergencyFunds = convert(emergencyFundsUSD, 'USD', mainCurrency.code);
  const goalsFunds = totalAmount - emergencyFunds;

  // Calculate weighted APY from all savings goals
  const weightedAPY = savingsGoals.length > 0 && totalAmountUSD > 0
    ? savingsGoals.reduce((sum, goal) => sum + (goal.current * (goal.apy || 0)), 0) / totalAmountUSD
    : 0;
  const changePercent = savingsGoals.length === 0 ? "0.0%" : `+${weightedAPY.toFixed(2)}%`;
  const changeType = weightedAPY > 0 ? "positive" as const : "negative" as const;

  // Create chart data from savings goals - sort by current value and show progress
  const chartData = savingsGoals
    .filter(goal => goal.current && !isNaN(goal.current) && isFinite(goal.current))
    .sort((a, b) => b.current - a.current)
    .slice(0, 12)
    .map(goal => ({
      value: goal.current,
      change: `${((goal.current / goal.target) * 100).toFixed(1)}%`
    }));

  // Currency conversion - show in user's selected currency
  const displayAmount = `${mainCurrency.symbol}${totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  const originalAmount = mainCurrency.code !== 'USD' ? `$${totalAmountUSD.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : undefined;

  return (
    <EnhancedFinancialCard
      title="Savings"
      description="High-yield savings and emergency funds"
      amount={displayAmount}
      change={changePercent}
      changeType={changeType}
      mainColor="#3b82f6"
      secondaryColor="#60a5fa"
      gridColor="#3b82f615"
      stats={[
        { label: "Emergency", value: `${mainCurrency.symbol}${emergencyFunds.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, color: "#3b82f6" },
        { label: "Goals", value: `${mainCurrency.symbol}${goalsFunds.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, color: "#60a5fa" }
      ]}
      icon={PiggyBank}
      hoverContent={<SavingsHoverContent />}
      modalContent={<SavingsModalContent />}
      chartData={chartData}
      convertedAmount={originalAmount}
      sourceCurrency={mainCurrency.code}
    />
  );
}

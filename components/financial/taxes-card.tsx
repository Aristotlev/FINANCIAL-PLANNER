"use client";

import React, { useState, useEffect } from "react";
import { 
  Receipt, 
  Plus, 
  Edit3, 
  Trash2,
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  Globe,
  FileText,
  AlertCircle,
  CheckCircle,
  Info,
  PieChart,
  X
} from "lucide-react";
import { GiReceiveMoney } from "react-icons/gi";
import { EnhancedFinancialCard } from "../ui/enhanced-financial-card";
import { SupabaseDataService } from "../../lib/supabase/supabase-data-service";
import { formatNumber } from "../../lib/utils";
import {
  Country,
  CompanyType,
  TAX_CONFIGS,
  calculateTotalTax,
  TaxCalculationInput,
  TaxCalculationResult,
  getCompanyTypesForCountry,
  getCompanyTypeName,
  formatCurrency,
  CustomIncomeSource,
  IncomeType,
  TaxTreatment
} from "../../lib/tax-calculator";
import { ImprovedTaxProfileModal } from "./improved-tax-profile-modal";

// Tax Profile Interface
export interface TaxProfile {
  id: string;
  name: string;
  country: Country;
  companyType: CompanyType;
  salaryIncome: number;
  businessIncome: number;
  capitalGains: {
    shortTerm: number;
    longTerm: number;
  };
  dividends: number;
  rentalIncome: number;
  cryptoGains: number;
  deductibleExpenses: number;
  customIncomeSources?: CustomIncomeSource[];
  notes: string;
  isActive: boolean;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

function TaxesHoverContent() {
  const [profiles, setProfiles] = useState<TaxProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<TaxProfile | null>(null);

  useEffect(() => {
    const loadProfiles = async () => {
      const savedProfiles = await SupabaseDataService.getTaxProfiles([]);
      setProfiles(savedProfiles);
      const active = savedProfiles.find(p => p.isActive);
      setActiveProfile(active || null);
    };
    loadProfiles();

    const handleDataChange = () => loadProfiles();
    window.addEventListener('financialDataChanged', handleDataChange);
    
    return () => window.removeEventListener('financialDataChanged', handleDataChange);
  }, []);

  if (!activeProfile) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400">
        No active tax profile. Create one to see calculations.
      </div>
    );
  }

  const calculation = calculateTotalTax({
    country: activeProfile.country,
    companyType: activeProfile.companyType,
    salaryIncome: activeProfile.salaryIncome,
    businessIncome: activeProfile.businessIncome,
    capitalGains: activeProfile.capitalGains,
    dividends: activeProfile.dividends,
    rentalIncome: activeProfile.rentalIncome,
    cryptoGains: activeProfile.cryptoGains,
    deductibleExpenses: activeProfile.deductibleExpenses,
    customIncomeSources: activeProfile.customIncomeSources || []
  });

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span>Total Income</span>
        <span className="font-semibold text-green-600 dark:text-green-400">
          {formatCurrency(calculation.totalIncome, activeProfile.country)}
        </span>
      </div>
      <div className="flex justify-between text-xs">
        <span>Income Tax</span>
        <span className="font-semibold text-red-600 dark:text-red-400">
          -{formatCurrency(calculation.incomeTax.amount, activeProfile.country)}
        </span>
      </div>
      <div className="flex justify-between text-xs">
        <span>Capital Gains Tax</span>
        <span className="font-semibold text-orange-600 dark:text-orange-400">
          -{formatCurrency(calculation.capitalGainsTax.amount, activeProfile.country)}
        </span>
      </div>
      {calculation.corporateTax && (
        <div className="flex justify-between text-xs">
          <span>Corporate Tax</span>
          <span className="font-semibold text-purple-600 dark:text-purple-400">
            -{formatCurrency(calculation.corporateTax.amount, activeProfile.country)}
          </span>
        </div>
      )}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
        <div className="flex justify-between text-xs">
          <span className="font-semibold">Total Tax</span>
          <span className="font-semibold text-red-600 dark:text-red-400">
            -{formatCurrency(calculation.totalTax, activeProfile.country)}
          </span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="font-semibold">Net Income</span>
          <span className="font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(calculation.netIncome, activeProfile.country)}
          </span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span>Effective Tax Rate</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {calculation.totalTaxRate.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function AddEditTaxProfileModal({
  isOpen,
  onClose,
  onSave,
  profile
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: Omit<TaxProfile, 'id'> | TaxProfile) => void;
  profile?: TaxProfile | null;
}) {
  const [formData, setFormData] = useState<Omit<TaxProfile, 'id'>>({
    name: '',
    country: 'USA',
    companyType: 'individual',
    salaryIncome: 0,
    businessIncome: 0,
    capitalGains: { shortTerm: 0, longTerm: 0 },
    dividends: 0,
    rentalIncome: 0,
    cryptoGains: 0,
    deductibleExpenses: 0,
    customIncomeSources: [],
    notes: '',
    isActive: false
  });

  const [availableCompanyTypes, setAvailableCompanyTypes] = useState<CompanyType[]>([]);
  const [countrySearchOpen, setCountrySearchOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        country: profile.country,
        companyType: profile.companyType,
        salaryIncome: profile.salaryIncome,
        businessIncome: profile.businessIncome,
        capitalGains: profile.capitalGains,
        dividends: profile.dividends,
        rentalIncome: profile.rentalIncome,
        cryptoGains: profile.cryptoGains,
        deductibleExpenses: profile.deductibleExpenses,
        customIncomeSources: profile.customIncomeSources || [],
        notes: profile.notes,
        isActive: profile.isActive
      });
    } else {
      setFormData({
        name: '',
        country: 'USA',
        companyType: 'individual',
        salaryIncome: 0,
        businessIncome: 0,
        capitalGains: { shortTerm: 0, longTerm: 0 },
        dividends: 0,
        rentalIncome: 0,
        cryptoGains: 0,
        deductibleExpenses: 0,
        customIncomeSources: [],
        notes: '',
        isActive: false
      });
    }
  }, [profile, isOpen]);

  useEffect(() => {
    const types = getCompanyTypesForCountry(formData.country);
    setAvailableCompanyTypes(types);
    
    // Reset to first available type if current type not available
    if (!types.includes(formData.companyType)) {
      setFormData(prev => ({ ...prev, companyType: types[0] }));
    }
  }, [formData.country]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (profile) {
      onSave({ ...formData, id: profile.id });
    } else {
      onSave(formData);
    }
    onClose();
  };

  if (!isOpen) return null;

  const countryConfig = TAX_CONFIGS[formData.country];
  
  // Filter countries based on search query
  const availableCountries = Object.keys(TAX_CONFIGS) as Country[];
  const filteredCountries = availableCountries.filter(country => 
    country.toLowerCase().includes(countrySearchQuery.toLowerCase())
  );

  // Get country flag emoji
  const getCountryFlag = (country: Country) => {
    const flags: Record<Country, string> = {
      'USA': '🇺🇸',
      'UK': '🇬🇧',
      'Canada': '🇨🇦',
      'Germany': '🇩🇪',
      'France': '🇫🇷',
      'Australia': '🇦🇺',
      'Japan': '🇯🇵',
      'Singapore': '🇸🇬',
      'UAE': '🇦🇪',
      'Switzerland': '🇨🇭',
      'Netherlands': '🇳🇱',
      'Spain': '🇪🇸',
      'Italy': '🇮🇹',
      'Greece': '🇬🇷',
      'Portugal': '🇵🇹',
      'Brazil': '🇧🇷',
      'Mexico': '🇲🇽',
      'India': '🇮🇳',
      'China': '🇨🇳',
      'South Korea': '🇰🇷',
      'New Zealand': '🇳🇿',
      'Belgium': '🇧🇪',
      'Sweden': '🇸🇪',
      'Norway': '🇳🇴',
      'Denmark': '🇩🇰',
      'Finland': '🇫🇮',
      'Austria': '🇦🇹',
      'Poland': '🇵🇱',
      'Czech Republic': '🇨🇿',
      'Ireland': '🇮🇪',
      'Israel': '🇮🇱',
      'Turkey': '🇹🇷',
      'Thailand': '🇹🇭',
      'Malaysia': '🇲🇾',
      'Indonesia': '🇮🇩',
      'Philippines': '🇵🇭',
      'Vietnam': '🇻🇳',
      'Argentina': '🇦🇷',
      'Chile': '🇨🇱',
      'Colombia': '🇨🇴',
      'Peru': '🇵🇪'
    };
    return flags[country] || '🌍';
  };

  // Get country display name
  const getCountryDisplayName = (country: Country) => {
    const config = TAX_CONFIGS[country];
    return `${country} (${config.currency})`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000003] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-[800px] max-h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {profile ? 'Edit Tax Profile' : 'Add Tax Profile'}
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">
                Profile Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                placeholder="e.g., 2024 Tax Profile"
                required
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">
                Country
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setCountrySearchOpen(!countrySearchOpen);
                    setCountrySearchQuery('');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 text-gray-900 dark:text-white flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{getCountryFlag(formData.country)}</span>
                    <span className="font-medium">{formData.country}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">• {countryConfig.currency}</span>
                  </div>
                  <svg 
                    className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${countrySearchOpen ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {countrySearchOpen && (
                  <div className="absolute z-[15010] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-[400px] overflow-hidden">
                    {/* Search Input */}
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      <div className="relative">
                        <input
                          type="text"
                          value={countrySearchQuery}
                          onChange={(e) => setCountrySearchQuery(e.target.value)}
                          placeholder="Search countries..."
                          className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          autoFocus
                        />
                        <svg
                          className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>

                    {/* Countries List */}
                    <div className="max-h-[280px] overflow-y-auto">
                      {filteredCountries.length > 0 ? (
                        <div>
                          {filteredCountries.map(country => {
                            const config = TAX_CONFIGS[country];
                            const isSelected = country === formData.country;
                            return (
                              <button
                                key={country}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setFormData({...formData, country});
                                  setCountrySearchOpen(false);
                                  setCountrySearchQuery('');
                                }}
                                className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center gap-3 transition-colors cursor-pointer ${
                                  isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                }`}
                              >
                                <span className="text-xl flex-shrink-0">{getCountryFlag(country)}</span>
                                <div className="flex-1 min-w-0">
                                  <div className={`font-semibold text-sm truncate ${
                                    isSelected 
                                      ? 'text-blue-600 dark:text-blue-400' 
                                      : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {country}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {config.currency} • {config.currencySymbol}
                                  </div>
                                </div>
                                {isSelected && (
                                  <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                          <p className="text-sm">No countries found for "{countrySearchQuery}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                💡 Selected currency: {countryConfig.currency} ({countryConfig.currencySymbol})
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">
              Company Type
            </label>
            <select
              value={formData.companyType}
              onChange={(e) => setFormData({...formData, companyType: e.target.value as CompanyType})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
            >
              {availableCompanyTypes.map(type => (
                <option key={type} value={type}>
                  {getCompanyTypeName(type)}
                </option>
              ))}
            </select>
          </div>

          {/* Income Sources */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Income Sources
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">
                  Salary/Wages ({countryConfig.currencySymbol})
                </label>
                <input
                  type="number"
                  value={formData.salaryIncome}
                  onChange={(e) => setFormData({...formData, salaryIncome: parseFloat(e.target.value) || 0})}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">
                  Business Income ({countryConfig.currencySymbol})
                </label>
                <input
                  type="number"
                  value={formData.businessIncome}
                  onChange={(e) => setFormData({...formData, businessIncome: parseFloat(e.target.value) || 0})}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">
                  Short-term Capital Gains ({countryConfig.currencySymbol})
                </label>
                <input
                  type="number"
                  value={formData.capitalGains.shortTerm}
                  onChange={(e) => setFormData({
                    ...formData, 
                    capitalGains: { ...formData.capitalGains, shortTerm: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  step="0.01"
                  min="0"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Assets held &lt; 1 year
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">
                  Long-term Capital Gains ({countryConfig.currencySymbol})
                </label>
                <input
                  type="number"
                  value={formData.capitalGains.longTerm}
                  onChange={(e) => setFormData({
                    ...formData, 
                    capitalGains: { ...formData.capitalGains, longTerm: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  step="0.01"
                  min="0"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Assets held ≥ 1 year
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">
                  Dividends ({countryConfig.currencySymbol})
                </label>
                <input
                  type="number"
                  value={formData.dividends}
                  onChange={(e) => setFormData({...formData, dividends: parseFloat(e.target.value) || 0})}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">
                  Rental Income ({countryConfig.currencySymbol})
                </label>
                <input
                  type="number"
                  value={formData.rentalIncome}
                  onChange={(e) => setFormData({...formData, rentalIncome: parseFloat(e.target.value) || 0})}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">
                  Crypto Gains ({countryConfig.currencySymbol})
                </label>
                <input
                  type="number"
                  value={formData.cryptoGains}
                  onChange={(e) => setFormData({...formData, cryptoGains: parseFloat(e.target.value) || 0})}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">
                  Deductible Expenses ({countryConfig.currencySymbol})
                </label>
                <input
                  type="number"
                  value={formData.deductibleExpenses}
                  onChange={(e) => setFormData({...formData, deductibleExpenses: parseFloat(e.target.value) || 0})}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Custom Income Sources */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Custom Income Sources
              </h4>
              <button
                type="button"
                onClick={() => {
                  const newSource: CustomIncomeSource = {
                    id: Date.now().toString(),
                    label: '',
                    amount: 0,
                    incomeType: 'custom',
                    taxTreatment: 'ordinary_income',
                    notes: ''
                  };
                  setFormData({
                    ...formData,
                    customIncomeSources: [...(formData.customIncomeSources || []), newSource]
                  });
                }}
                className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Custom Income
              </button>
            </div>

            {formData.customIncomeSources && formData.customIncomeSources.length > 0 && (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {formData.customIncomeSources.map((source, index) => (
                  <div key={source.id} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Custom Income #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = formData.customIncomeSources?.filter(s => s.id !== source.id) || [];
                          setFormData({ ...formData, customIncomeSources: updated });
                        }}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                          Label
                        </label>
                        <input
                          type="text"
                          value={source.label}
                          onChange={(e) => {
                            const updated = formData.customIncomeSources?.map(s => 
                              s.id === source.id ? { ...s, label: e.target.value } : s
                            ) || [];
                            setFormData({ ...formData, customIncomeSources: updated });
                          }}
                          className="w-full p-1.5 text-xs border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                          placeholder="e.g., Freelance Design"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                          Amount ({countryConfig.currencySymbol})
                        </label>
                        <input
                          type="number"
                          value={source.amount}
                          onChange={(e) => {
                            const updated = formData.customIncomeSources?.map(s => 
                              s.id === source.id ? { ...s, amount: parseFloat(e.target.value) || 0 } : s
                            ) || [];
                            setFormData({ ...formData, customIncomeSources: updated });
                          }}
                          className="w-full p-1.5 text-xs border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                          step="0.01"
                          min="0"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                          Income Type
                        </label>
                        <select
                          value={source.incomeType}
                          onChange={(e) => {
                            const updated = formData.customIncomeSources?.map(s => 
                              s.id === source.id ? { ...s, incomeType: e.target.value as IncomeType } : s
                            ) || [];
                            setFormData({ ...formData, customIncomeSources: updated });
                          }}
                          className="w-full p-1.5 text-xs border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                        >
                          <option value="side_hustle">Side Hustle</option>
                          <option value="freelance">Freelance</option>
                          <option value="consulting">Consulting</option>
                          <option value="royalties">Royalties</option>
                          <option value="investment_income">Investment Income</option>
                          <option value="alimony">Alimony</option>
                          <option value="pension">Pension</option>
                          <option value="social_security">Social Security</option>
                          <option value="commission">Commission</option>
                          <option value="bonus">Bonus</option>
                          <option value="interest">Interest</option>
                          <option value="trust_income">Trust Income</option>
                          <option value="annuity">Annuity</option>
                          <option value="disability">Disability</option>
                          <option value="unemployment">Unemployment</option>
                          <option value="lottery_winnings">Lottery/Winnings</option>
                          <option value="inheritance">Inheritance</option>
                          <option value="gifts">Gifts</option>
                          <option value="tips">Tips</option>
                          <option value="self_employment">Self Employment</option>
                          <option value="partnership_income">Partnership Income</option>
                          <option value="foreign_income">Foreign Income</option>
                          <option value="custom">Custom/Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                          Tax Treatment
                        </label>
                        <select
                          value={source.taxTreatment}
                          onChange={(e) => {
                            const updated = formData.customIncomeSources?.map(s => 
                              s.id === source.id ? { ...s, taxTreatment: e.target.value as TaxTreatment } : s
                            ) || [];
                            setFormData({ ...formData, customIncomeSources: updated });
                          }}
                          className="w-full p-1.5 text-xs border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                        >
                          <option value="ordinary_income">Ordinary Income</option>
                          <option value="capital_gains">Capital Gains</option>
                          <option value="qualified_dividends">Qualified Dividends</option>
                          <option value="passive_income">Passive Income</option>
                          <option value="business_income">Business Income</option>
                          <option value="exempt">Tax Exempt</option>
                          <option value="preferential">Preferential Rate</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-2">
                      <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Notes (Optional)
                      </label>
                      <input
                        type="text"
                        value={source.notes || ''}
                        onChange={(e) => {
                          const updated = formData.customIncomeSources?.map(s => 
                            s.id === source.id ? { ...s, notes: e.target.value } : s
                          ) || [];
                          setFormData({ ...formData, customIncomeSources: updated });
                        }}
                        className="w-full p-1.5 text-xs border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                        placeholder="Additional details..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(!formData.customIncomeSources || formData.customIncomeSources.length === 0) && (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No custom income sources added</p>
                <p className="text-xs mt-1">Add income from side hustles, freelancing, or other sources</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              rows={3}
              placeholder="Add any notes about this tax profile..."
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
              className="w-4 h-4"
            />
            <label htmlFor="isActive" className="text-sm text-gray-900 dark:text-gray-200">
              Set as active profile
            </label>
          </div>
        </form>
        
        <div className="flex gap-3 p-6 pt-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2.5 rounded-lg font-bold hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
          >
            {profile ? '✓ Update' : '+ Add'} Profile
          </button>
        </div>
      </div>
    </div>
  );
}

function TaxesModalContent() {
  const [profiles, setProfiles] = useState<TaxProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<TaxProfile | null>(null);
  const [calculation, setCalculation] = useState<TaxCalculationResult | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<TaxProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'optimization'>('overview');

  useEffect(() => {
    const loadProfiles = async () => {
      const savedProfiles = await SupabaseDataService.getTaxProfiles([]);
      setProfiles(savedProfiles);
      const active = savedProfiles.find(p => p.isActive);
      setActiveProfile(active || null);
    };
    loadProfiles();

    const handleDataChange = () => loadProfiles();
    window.addEventListener('financialDataChanged', handleDataChange);
    
    return () => window.removeEventListener('financialDataChanged', handleDataChange);
  }, []);

  useEffect(() => {
    if (activeProfile) {
      const calc = calculateTotalTax({
        country: activeProfile.country,
        companyType: activeProfile.companyType,
        salaryIncome: activeProfile.salaryIncome,
        businessIncome: activeProfile.businessIncome,
        capitalGains: activeProfile.capitalGains,
        dividends: activeProfile.dividends,
        rentalIncome: activeProfile.rentalIncome,
        cryptoGains: activeProfile.cryptoGains,
        deductibleExpenses: activeProfile.deductibleExpenses,
        customIncomeSources: activeProfile.customIncomeSources || []
      });
      setCalculation(calc);
    } else {
      setCalculation(null);
    }
  }, [activeProfile]);

  const handleSaveProfile = async (profileData: Omit<TaxProfile, 'id'> | TaxProfile) => {
    try {
      let newProfile: TaxProfile;
      
      if ('id' in profileData) {
        newProfile = profileData as TaxProfile;
        await SupabaseDataService.saveTaxProfile(newProfile);
        
        // If setting as active, deactivate others
        if (newProfile.isActive) {
          const updatedProfiles = profiles.map(p => ({
            ...p,
            isActive: p.id === newProfile.id
          }));
          for (const p of updatedProfiles) {
            if (p.id !== newProfile.id && p.isActive) {
              await SupabaseDataService.saveTaxProfile({ ...p, isActive: false });
            }
          }
          setProfiles(updatedProfiles);
        } else {
          setProfiles(profiles.map(p => p.id === newProfile.id ? newProfile : p));
        }
      } else {
        newProfile = {
          ...profileData,
          id: Date.now().toString()
        };
        
        // If setting as active, deactivate others
        if (newProfile.isActive) {
          for (const p of profiles) {
            if (p.isActive) {
              await SupabaseDataService.saveTaxProfile({ ...p, isActive: false });
            }
          }
          setProfiles(profiles.map(p => ({ ...p, isActive: false })).concat(newProfile));
        } else {
          setProfiles([...profiles, newProfile]);
        }
        
        await SupabaseDataService.saveTaxProfile(newProfile);
      }
      
      if (newProfile.isActive) {
        setActiveProfile(newProfile);
      }
      
      setEditingProfile(null);
      window.dispatchEvent(new Event('financialDataChanged'));
    } catch (error) {
      console.error('Error saving tax profile:', error);
      alert('Failed to save tax profile. Please try again.');
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('Are you sure you want to delete this tax profile?')) return;
    
    try {
      await SupabaseDataService.deleteTaxProfile(profileId);
      const updated = profiles.filter(p => p.id !== profileId);
      setProfiles(updated);
      
      if (activeProfile?.id === profileId) {
        setActiveProfile(null);
      }
      
      window.dispatchEvent(new Event('financialDataChanged'));
    } catch (error) {
      console.error('Error deleting tax profile:', error);
      alert('Failed to delete tax profile. Please try again.');
    }
  };

  const handleSetActive = async (profileId: string) => {
    try {
      const updatedProfiles = profiles.map(p => ({
        ...p,
        isActive: p.id === profileId
      }));
      
      for (const p of updatedProfiles) {
        await SupabaseDataService.saveTaxProfile(p);
      }
      
      setProfiles(updatedProfiles);
      const active = updatedProfiles.find(p => p.id === profileId);
      setActiveProfile(active || null);
      
      window.dispatchEvent(new Event('financialDataChanged'));
    } catch (error) {
      console.error('Error setting active profile:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tax Calculator</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Smart tax calculations based on country laws and company type
            </p>
          </div>
          <button
            onClick={() => {
              setEditingProfile(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Profile
          </button>
        </div>

        {/* Active Profile Overview */}
        {calculation && activeProfile && (
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{activeProfile.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {activeProfile.country} • {getCompanyTypeName(activeProfile.companyType)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-semibold rounded-full">
                  Active
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Income</div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(calculation.totalIncome, activeProfile.country)}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Tax</div>
                <div className="text-xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(calculation.totalTax, activeProfile.country)}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Net Income</div>
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(calculation.netIncome, activeProfile.country)}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Effective Rate</div>
                <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {calculation.totalTaxRate.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        {calculation && (
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-4">
              {[
                { id: 'overview', label: 'Overview', icon: PieChart },
                { id: 'breakdown', label: 'Tax Breakdown', icon: Calculator },
                { id: 'optimization', label: 'Optimization Tips', icon: TrendingUp }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content */}
        {calculation && activeProfile && (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tax Components */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Tax Components</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Income Tax</span>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                            {formatCurrency(calculation.incomeTax.amount, activeProfile.country)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {calculation.incomeTax.effectiveRate.toFixed(2)}% effective
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Capital Gains Tax</span>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                            {formatCurrency(calculation.capitalGainsTax.amount, activeProfile.country)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {calculation.capitalGainsTax.rate.toFixed(2)}% rate
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Dividend Tax</span>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                            {formatCurrency(calculation.dividendTax.amount, activeProfile.country)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {calculation.dividendTax.rate.toFixed(2)}% rate
                          </div>
                        </div>
                      </div>

                      {calculation.corporateTax && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Corporate Tax</span>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                              {formatCurrency(calculation.corporateTax.amount, activeProfile.country)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {calculation.corporateTax.rate.toFixed(2)}% rate
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Social Security</span>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">
                            {formatCurrency(calculation.socialSecurity.amount, activeProfile.country)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {calculation.socialSecurity.rate.toFixed(2)}% rate
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Income Sources */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Income Sources</h4>
                    <div className="space-y-2">
                      {activeProfile.salaryIncome > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Salary</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(activeProfile.salaryIncome, activeProfile.country)}
                          </span>
                        </div>
                      )}
                      {activeProfile.businessIncome > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Business</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(activeProfile.businessIncome, activeProfile.country)}
                          </span>
                        </div>
                      )}
                      {activeProfile.capitalGains.shortTerm > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Short-term Gains</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(activeProfile.capitalGains.shortTerm, activeProfile.country)}
                          </span>
                        </div>
                      )}
                      {activeProfile.capitalGains.longTerm > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Long-term Gains</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(activeProfile.capitalGains.longTerm, activeProfile.country)}
                          </span>
                        </div>
                      )}
                      {activeProfile.dividends > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Dividends</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(activeProfile.dividends, activeProfile.country)}
                          </span>
                        </div>
                      )}
                      {activeProfile.rentalIncome > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Rental</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(activeProfile.rentalIncome, activeProfile.country)}
                          </span>
                        </div>
                      )}
                      {activeProfile.cryptoGains > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Crypto</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(activeProfile.cryptoGains, activeProfile.country)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Breakdown Tab */}
            {activeTab === 'breakdown' && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Detailed Tax Breakdown</h4>
                  
                  <div className="space-y-6">
                    {/* Income Tax Breakdown */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Income Tax</h5>
                        <span className="text-sm font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(calculation.incomeTax.amount, activeProfile.country)}
                        </span>
                      </div>
                      <div className="space-y-1 pl-4 border-l-2 border-red-200 dark:border-red-800">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Marginal Rate:</span>
                          <span className="font-semibold">{calculation.incomeTax.marginalRate}%</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Effective Rate:</span>
                          <span className="font-semibold">{calculation.incomeTax.effectiveRate.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Taxable Income:</span>
                          <span className="font-semibold">{formatCurrency(calculation.taxableIncome, activeProfile.country)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Other Taxes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Capital Gains Tax</div>
                        <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                          {formatCurrency(calculation.capitalGainsTax.amount, activeProfile.country)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Average rate: {calculation.capitalGainsTax.rate.toFixed(2)}%
                        </div>
                      </div>

                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Dividend Tax</div>
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {formatCurrency(calculation.dividendTax.amount, activeProfile.country)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Rate: {calculation.dividendTax.rate}%
                        </div>
                      </div>

                      <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-4">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Social Security</div>
                        <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                          {formatCurrency(calculation.socialSecurity.amount, activeProfile.country)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Rate: {calculation.socialSecurity.rate}%
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">VAT/GST Rate</div>
                        <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                          {calculation.vatGst.rate}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          On goods & services
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Optimization Tab */}
            {activeTab === 'optimization' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-green-200 dark:border-green-700">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">Tax Optimization Suggestions</h4>
                  </div>

                  {calculation.suggestions.length > 0 ? (
                    <div className="space-y-3">
                      {calculation.suggestions.map((suggestion, index) => (
                        <div key={index} className="flex gap-3 bg-white dark:bg-gray-800 rounded-lg p-4">
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-700 dark:text-gray-300">{suggestion}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Info className="w-5 h-5" />
                      <p className="text-sm">No specific optimization suggestions at this time.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* All Profiles List */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">All Tax Profiles</h3>
          {profiles.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Calculator className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No tax profiles yet</p>
              <p className="text-sm">Click "Add Profile" to create your first tax calculation</p>
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className={`p-4 bg-white dark:bg-gray-800 rounded-lg border transition-all hover:shadow-lg ${
                    profile.isActive
                      ? 'border-blue-500 dark:border-blue-600'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{profile.name}</h4>
                        {profile.isActive && (
                          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-semibold rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {profile.country}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {getCompanyTypeName(profile.companyType)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!profile.isActive && (
                        <button
                          onClick={() => handleSetActive(profile.id)}
                          className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          Set Active
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingProfile(profile);
                          setShowAddModal(true);
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      >
                        <Edit3 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteProfile(profile.id)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal - Using Improved Version */}
      <ImprovedTaxProfileModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingProfile(null);
        }}
        onSave={handleSaveProfile}
        profile={editingProfile}
      />
    </div>
  );
}

export function TaxesCard() {
  const [profiles, setProfiles] = useState<TaxProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<TaxProfile | null>(null);
  const [calculation, setCalculation] = useState<TaxCalculationResult | null>(null);

  useEffect(() => {
    const loadProfiles = async () => {
      const savedProfiles = await SupabaseDataService.getTaxProfiles([]);
      setProfiles(savedProfiles);
      const active = savedProfiles.find(p => p.isActive);
      setActiveProfile(active || null);
    };
    loadProfiles();

    const handleDataChange = () => loadProfiles();
    window.addEventListener('financialDataChanged', handleDataChange);
    
    return () => window.removeEventListener('financialDataChanged', handleDataChange);
  }, []);

  useEffect(() => {
    if (activeProfile) {
      const calc = calculateTotalTax({
        country: activeProfile.country,
        companyType: activeProfile.companyType,
        salaryIncome: activeProfile.salaryIncome,
        businessIncome: activeProfile.businessIncome,
        capitalGains: activeProfile.capitalGains,
        dividends: activeProfile.dividends,
        rentalIncome: activeProfile.rentalIncome,
        cryptoGains: activeProfile.cryptoGains,
        deductibleExpenses: activeProfile.deductibleExpenses,
        customIncomeSources: activeProfile.customIncomeSources || []
      });
      setCalculation(calc);
    } else {
      setCalculation(null);
    }
  }, [activeProfile]);

  const totalTax = calculation?.totalTax || 0;
  const totalIncome = calculation?.totalIncome || 0;
  const netIncome = calculation?.netIncome || 0;
  const effectiveRate = calculation?.totalTaxRate || 0;

  // Chart data for visualization
  const chartData = calculation ? [
    { value: calculation.incomeTax.amount, change: `${calculation.incomeTax.effectiveRate.toFixed(1)}%` },
    { value: calculation.capitalGainsTax.amount, change: `${calculation.capitalGainsTax.rate.toFixed(1)}%` },
    { value: calculation.dividendTax.amount, change: `${calculation.dividendTax.rate}%` },
    { value: calculation.socialSecurity.amount, change: `${calculation.socialSecurity.rate}%` },
    ...(calculation.corporateTax ? [{ value: calculation.corporateTax.amount, change: `${calculation.corporateTax.rate}%` }] : [])
  ] : [];

  return (
    <EnhancedFinancialCard
      title="Taxes"
      description={activeProfile ? `${activeProfile.country} • ${getCompanyTypeName(activeProfile.companyType)}` : "Smart tax calculator"}
      amount={calculation && activeProfile ? `-${formatCurrency(totalTax, activeProfile.country)}` : "$0.00"}
      change={effectiveRate > 0 ? `${effectiveRate.toFixed(1)}% effective rate` : "0%"}
      changeType="negative"
      mainColor="#3b82f6"
      secondaryColor="#60a5fa"
      gridColor="#3b82f615"
      stats={[
        { 
          label: "Total Income", 
          value: calculation && activeProfile ? `+${formatCurrency(totalIncome, activeProfile.country)}` : "$0.00", 
          color: "#10b981" 
        },
        { 
          label: "Total Tax", 
          value: calculation && activeProfile ? `-${formatCurrency(totalTax, activeProfile.country)}` : "$0.00", 
          color: "#ef4444" 
        },
        { 
          label: "Net Income", 
          value: calculation && activeProfile ? formatCurrency(netIncome, activeProfile.country) : "$0.00", 
          color: "#3b82f6" 
        }
      ]}
      icon={GiReceiveMoney}
      hoverContent={<TaxesHoverContent />}
      modalContent={<TaxesModalContent />}
      chartData={chartData}
    />
  );
}

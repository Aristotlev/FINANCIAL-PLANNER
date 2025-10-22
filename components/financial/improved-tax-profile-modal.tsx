"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  X, 
  ChevronRight, 
  ChevronLeft,
  Check,
  Info,
  TrendingUp,
  Calculator,
  Sparkles,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import {
  Country,
  CompanyType,
  TAX_CONFIGS,
  formatCurrency,
  getCompanyTypeName
} from "../../lib/tax-calculator";
import {
  getCountryFlag,
  getCountryTaxRules,
  generateDynamicForm,
  calculateTaxPreview,
  getSmartSuggestions,
  EmploymentStatus,
  IncomeCategory
} from "../../lib/tax-wizard-system";
import { TaxProfile } from "./taxes-card";

interface ImprovedTaxProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: Omit<TaxProfile, 'id'> | TaxProfile) => void;
  profile?: TaxProfile | null;
}

type Step = 'basic' | 'income' | 'review';

export function ImprovedTaxProfileModal({
  isOpen,
  onClose,
  onSave,
  profile
}: ImprovedTaxProfileModalProps) {
  // Form state
  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [profileName, setProfileName] = useState('');
  const [country, setCountry] = useState<Country>('USA');
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>('employed');
  const [companyType, setCompanyType] = useState<CompanyType>('individual');
  const [isActive, setIsActive] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Income data
  const [incomeData, setIncomeData] = useState<Record<string, number | string>>({
    salaryIncome: 0,
    businessIncome: 0,
    capitalGainsShort: 0,
    capitalGainsLong: 0,
    dividends: 0,
    rentalIncome: 0,
    cryptoGains: 0,
    deductibleExpenses: 0
  });
  
  // UI state
  const [countrySearchOpen, setCountrySearchOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  
  // Get country rules and dynamic form
  const countryRules = useMemo(() => getCountryTaxRules(country), [country]);
  const availableCompanyTypes = useMemo(() => {
    return Object.keys(countryRules.companyTypeRules) as CompanyType[];
  }, [countryRules]);
  
  const dynamicForm = useMemo(() => {
    return generateDynamicForm(country, employmentStatus, companyType);
  }, [country, employmentStatus, companyType]);
  
  // Calculate tax preview
  const taxPreview = useMemo(() => {
    // Convert all values to numbers for calculation
    const numericData: Record<string, number> = {};
    Object.keys(incomeData).forEach(key => {
      const value = incomeData[key];
      numericData[key] = typeof value === 'string' ? (parseFloat(value) || 0) : value;
    });
    return calculateTaxPreview(country, companyType, numericData);
  }, [country, companyType, incomeData]);
  
  // Get smart suggestions
  const smartSuggestions = useMemo(() => {
    // Convert all values to numbers for suggestions
    const numericData: Record<string, number> = {};
    Object.keys(incomeData).forEach(key => {
      const value = incomeData[key];
      numericData[key] = typeof value === 'string' ? (parseFloat(value) || 0) : value;
    });
    return getSmartSuggestions(country, employmentStatus, companyType, numericData);
  }, [country, employmentStatus, companyType, incomeData]);
  
  // Load profile data if editing
  useEffect(() => {
    if (profile) {
      setProfileName(profile.name);
      setCountry(profile.country);
      setCompanyType(profile.companyType);
      setIsActive(profile.isActive);
      setNotes(profile.notes || '');
      setIncomeData({
        salaryIncome: profile.salaryIncome,
        businessIncome: profile.businessIncome,
        capitalGainsShort: profile.capitalGains.shortTerm,
        capitalGainsLong: profile.capitalGains.longTerm,
        dividends: profile.dividends,
        rentalIncome: profile.rentalIncome,
        cryptoGains: profile.cryptoGains,
        deductibleExpenses: profile.deductibleExpenses
      });
      // Determine employment status from profile
      if (profile.businessIncome > 0 && profile.salaryIncome === 0) {
        setEmploymentStatus('self_employed');
      } else if (profile.salaryIncome === 0 && profile.businessIncome === 0) {
        setEmploymentStatus('unemployed');
      } else {
        setEmploymentStatus('employed');
      }
    }
  }, [profile]);
  
  // Reset company type when country changes
  useEffect(() => {
    if (!availableCompanyTypes.includes(companyType)) {
      setCompanyType(availableCompanyTypes[0]);
    }
  }, [country, availableCompanyTypes, companyType]);
  
  // Handle form submission
  const handleSubmit = () => {
    // Convert all values to numbers before saving
    const numericData: Record<string, number> = {};
    Object.keys(incomeData).forEach(key => {
      const value = incomeData[key];
      numericData[key] = typeof value === 'string' ? (parseFloat(value) || 0) : value;
    });
    
    const formData: Omit<TaxProfile, 'id'> = {
      name: profileName,
      country,
      companyType,
      salaryIncome: numericData.salaryIncome || 0,
      businessIncome: numericData.businessIncome || 0,
      capitalGains: {
        shortTerm: numericData.capitalGainsShort || 0,
        longTerm: numericData.capitalGainsLong || 0
      },
      dividends: numericData.dividends || 0,
      rentalIncome: numericData.rentalIncome || 0,
      cryptoGains: numericData.cryptoGains || 0,
      deductibleExpenses: numericData.deductibleExpenses || 0,
      customIncomeSources: [],
      notes,
      isActive
    };
    
    if (profile) {
      onSave({ ...formData, id: profile.id });
    } else {
      onSave(formData);
    }
    
    onClose();
  };
  
  // Validate current step
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'basic':
        return profileName.trim().length > 0;
      case 'income':
        return true; // Income can be 0
      case 'review':
        return true;
      default:
        return false;
    }
  }, [currentStep, profileName]);
  
  if (!isOpen) return null;
  
  // Available countries
  const availableCountries = Object.keys(TAX_CONFIGS) as Country[];
  const filteredCountries = availableCountries.filter(c => 
    c.toLowerCase().includes(countrySearchQuery.toLowerCase())
  );
  
  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000003] p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-[900px] max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-t-2xl">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-500" />
              {profile ? 'Edit Tax Profile' : 'Create Tax Profile'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Smart tax calculations based on {countryRules.displayName} laws
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Progress Steps */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between">
            {(['basic', 'income', 'review'] as Step[]).map((step, index) => {
              const stepLabels = {
                basic: 'Basic Info',
                income: 'Income Details',
                review: 'Review & Save'
              };
              const isCompleted = 
                step === 'basic' ? currentStep !== 'basic' :
                step === 'income' ? currentStep === 'review' :
                false;
              const isCurrent = step === currentStep;
              
              return (
                <React.Fragment key={step}>
                  <button
                    onClick={() => {
                      if (isCompleted || isCurrent) {
                        setCurrentStep(step);
                      }
                    }}
                    className={`flex-1 flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      isCurrent 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                        : isCompleted
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isCurrent 
                        ? 'bg-blue-500 text-white' 
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                    }`}>
                      {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                    </div>
                    <span className="text-sm font-medium">{stepLabels[step]}</span>
                  </button>
                  {index < 2 && (
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mx-1" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
        
        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === 'basic' && (
            <div className="space-y-6 animate-fade-in">
              {/* Profile Name */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-gray-200">
                  Profile Name *
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full p-3 border-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors"
                  placeholder="e.g., 2024 Tax Profile"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Give your tax profile a memorable name
                </p>
              </div>
              
              {/* Country Selection */}
              <div className="relative">
                <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-gray-200">
                  Country *
                </label>
                <button
                  type="button"
                  onClick={() => setCountrySearchOpen(!countrySearchOpen)}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 dark:bg-gray-800 text-gray-900 dark:text-white flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getCountryFlag(country)}</span>
                    <div className="text-left">
                      <div className="font-medium">{country}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {countryRules.currency} ({countryRules.currencySymbol})
                      </div>
                    </div>
                  </div>
                  <svg 
                    className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${countrySearchOpen ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {countrySearchOpen && (
                  <div className="absolute z-[15010] w-full mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl max-h-[400px] overflow-hidden">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      <input
                        type="text"
                        value={countrySearchQuery}
                        onChange={(e) => setCountrySearchQuery(e.target.value)}
                        placeholder="Search countries..."
                        className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-[320px] overflow-y-auto">
                      {filteredCountries.map(c => {
                        const config = TAX_CONFIGS[c];
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              setCountry(c);
                              setCountrySearchOpen(false);
                              setCountrySearchQuery('');
                            }}
                            className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center gap-3 transition-colors"
                          >
                            <span className="text-2xl">{getCountryFlag(c)}</span>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-white">{c}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {config.currency} • {config.currencySymbol}
                              </div>
                            </div>
                            {c === country && <Check className="w-5 h-5 text-blue-500" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Employment Status */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-gray-200">
                  Employment Status *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(['employed', 'self_employed', 'unemployed', 'retired', 'student'] as EmploymentStatus[]).map(status => {
                    const labels = {
                      employed: { icon: '💼', label: 'Employed' },
                      self_employed: { icon: '🏢', label: 'Self-Employed' },
                      unemployed: { icon: '⏸️', label: 'Unemployed' },
                      retired: { icon: '🏖️', label: 'Retired' },
                      student: { icon: '🎓', label: 'Student' }
                    };
                    const isSelected = employmentStatus === status;
                    
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setEmploymentStatus(status)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="text-2xl mb-1">{labels[status].icon}</div>
                        <div className={`text-sm font-medium ${
                          isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                        }`}>
                          {labels[status].label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Company Type */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-gray-200 flex items-center gap-2">
                  Company Type *
                  <button
                    type="button"
                    onMouseEnter={() => setShowTooltip('companyType')}
                    onMouseLeave={() => setShowTooltip(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 relative"
                  >
                    <HelpCircle className="w-4 h-4" />
                    {showTooltip === 'companyType' && (
                      <div className="absolute left-0 top-6 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl z-50">
                        Select your business structure. This affects which deductions and tax rates apply.
                      </div>
                    )}
                  </button>
                </label>
                <div className="space-y-2">
                  {availableCompanyTypes.map(type => {
                    const rules = countryRules.companyTypeRules[type];
                    if (!rules) return null;
                    
                    const isSelected = companyType === type;
                    
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setCompanyType(type)}
                        className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className={`font-semibold mb-1 ${
                              isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                            }`}>
                              {rules.displayName}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                              {rules.description}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {rules.advantages.slice(0, 2).map((adv, idx) => (
                                <span key={idx} className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                                  ✓ {adv}
                                </span>
                              ))}
                            </div>
                          </div>
                          {isSelected && <Check className="w-5 h-5 text-blue-500 flex-shrink-0 ml-2" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
          {/* Step 2: Income Details */}
          {currentStep === 'income' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                      Enter your annual income
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      All amounts should be in {countryRules.currency} ({countryRules.currencySymbol}). Enter 0 for categories that don't apply.
                    </div>
                  </div>
                </div>
              </div>
              
              {dynamicForm.map(category => (
                <div key={category.id} className="bg-white dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{category.icon}</span>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{category.label}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{category.description}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {category.fields.map(field => (
                      <div key={field.id}>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          {field.label}
                          {field.tooltip && (
                            <button
                              type="button"
                              onMouseEnter={() => setShowTooltip(field.id)}
                              onMouseLeave={() => setShowTooltip(null)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 relative"
                            >
                              <HelpCircle className="w-4 h-4" />
                              {showTooltip === field.id && (
                                <div className="absolute left-0 top-6 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl z-50">
                                  {field.tooltip}
                                </div>
                              )}
                            </button>
                          )}
                        </label>
                        <input
                          type="number"
                          value={incomeData[field.id] || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setIncomeData({
                              ...incomeData,
                              [field.id]: value === '' ? 0 : parseFloat(value)
                            });
                          }}
                          onFocus={(e) => {
                            // Clear the 0 when focusing if it's the default value
                            if (incomeData[field.id] === 0) {
                              setIncomeData({
                                ...incomeData,
                                [field.id]: ''
                              });
                            }
                          }}
                          onBlur={(e) => {
                            // Set back to 0 if empty on blur
                            if (e.target.value === '') {
                              setIncomeData({
                                ...incomeData,
                                [field.id]: 0
                              });
                            }
                          }}
                          className="w-full p-3 border-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors"
                          placeholder={field.placeholder || "0.00"}
                          step="0.01"
                          min="0"
                        />
                        {field.helpText && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {field.helpText}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {/* Real-time Tax Preview */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-5 border-2 border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Tax Preview</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Income</div>
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(taxPreview.totalIncome, country)}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Est. Tax</div>
                    <div className="text-lg font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(taxPreview.estimatedTax, country)}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Net Income</div>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(taxPreview.netIncome, country)}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Tax Rate</div>
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {taxPreview.effectiveRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 3: Review */}
          {currentStep === 'review' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6 border-2 border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3 mb-4">
                  <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">Review Your Tax Profile</h4>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Profile Name</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{profileName}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Country</div>
                      <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <span>{getCountryFlag(country)}</span>
                        {country}
                      </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Company Type</div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {getCompanyTypeName(companyType)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">Tax Summary</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Total Income</div>
                        <div className="text-sm font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(taxPreview.totalIncome, country)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Estimated Tax</div>
                        <div className="text-sm font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(taxPreview.estimatedTax, country)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Net Income</div>
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(taxPreview.netIncome, country)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Effective Rate</div>
                        <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                          {taxPreview.effectiveRate.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Smart Suggestions */}
              {smartSuggestions.length > 0 && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-5 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">Smart Tax Tips</h4>
                  </div>
                  <div className="space-y-2">
                    {smartSuggestions.map((suggestion, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span>{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-gray-200">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 border-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors"
                  rows={3}
                  placeholder="Add any notes about this tax profile..."
                />
              </div>
              
              {/* Active Toggle */}
              <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-900 dark:text-gray-200">
                  Set as active profile (calculations will use this profile)
                </label>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 p-6 pt-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            {currentStep !== 'basic' && (
              <button
                type="button"
                onClick={() => {
                  const steps: Step[] = ['basic', 'income', 'review'];
                  const currentIndex = steps.indexOf(currentStep);
                  if (currentIndex > 0) {
                    setCurrentStep(steps[currentIndex - 1]);
                  }
                }}
                className="px-5 py-2.5 rounded-lg border-2 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>
          
          <div className="flex gap-3">
            {currentStep !== 'review' ? (
              <button
                type="button"
                onClick={() => {
                  const steps: Step[] = ['basic', 'income', 'review'];
                  const currentIndex = steps.indexOf(currentStep);
                  if (currentIndex < steps.length - 1) {
                    setCurrentStep(steps[currentIndex + 1]);
                  }
                }}
                disabled={!canProceed}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-bold hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-bold hover:from-green-600 hover:to-blue-600 transition-all shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                {profile ? 'Update Profile' : 'Create Profile'}
              </button>
            )}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

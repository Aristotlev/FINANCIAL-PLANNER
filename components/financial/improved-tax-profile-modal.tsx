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
  HelpCircle,
  DollarSign,
  Search
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
import { TaxProfile } from "../../lib/types/tax-profile";

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
      setIsActive(profile.isActive ?? false);
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
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[1000003] transition-all duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-[#0D0D0D] border border-white/10 p-6 rounded-3xl w-[900px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Sparkles className="w-5 h-5 text-cyan-500" />
              </div>
              {profile ? 'Edit Tax Profile' : 'Create Tax Profile'}
            </h3>
            <p className="text-sm text-gray-400 mt-1 ml-12">
              Smart tax calculations based on {countryRules.displayName} laws
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Progress Steps */}
        <div className="px-4 pb-8">
          <div className="relative flex items-center justify-between max-w-2xl mx-auto">
            {/* Connecting Line */}
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-0.5 bg-white/10 -z-10 rounded-full" />
            <div 
              className="absolute left-0 top-1/2 transform -translate-y-1/2 h-0.5 bg-cyan-500 transition-all duration-500 rounded-full"
              style={{ 
                width: currentStep === 'basic' ? '0%' : currentStep === 'income' ? '50%' : '100%' 
              }} 
            />

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
                <button
                  key={step}
                  onClick={() => {
                    if (isCompleted || isCurrent) {
                      setCurrentStep(step);
                    }
                  }}
                  className={`flex flex-col items-center gap-3 group bg-[#0D0D0D] px-2 transition-all duration-300 ${
                    !isCompleted && !isCurrent ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                  }`}
                  disabled={!isCompleted && !isCurrent}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isCurrent 
                      ? 'bg-cyan-500 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-110' 
                      : isCompleted
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-[#1A1A1A] border-white/10 text-gray-500'
                  }`}>
                    {isCompleted ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">{index + 1}</span>}
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                    isCurrent 
                      ? 'text-white' 
                      : isCompleted
                      ? 'text-emerald-500'
                      : 'text-gray-500'
                  }`}>
                    {stepLabels[step]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Form Content */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
          {/* Step 1: Basic Info */}
          {currentStep === 'basic' && (
            <div className="space-y-6 animate-fade-in">
              {/* Profile Name */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">
                  Profile Name *
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white placeholder-gray-600 transition-all font-medium"
                  placeholder="e.g., 2026 Tax Profile"
                  required
                />
              </div>
              
              {/* Country Selection */}
              <div className="relative group">
                <label className="block text-sm font-medium mb-2 text-gray-400">
                  Country *
                </label>
                <button
                  type="button"
                  onClick={() => setCountrySearchOpen(!countrySearchOpen)}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none transition-all duration-300 flex items-center justify-between group-hover:bg-white/5 ${
                    countrySearchOpen 
                      ? 'bg-[#1A1A1A] border-cyan-500/50 ring-2 ring-cyan-500/20' 
                      : 'bg-[#1A1A1A] border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl w-8 h-8 flex items-center justify-center">
                      {getCountryFlag(country)}
                    </span>
                    <div className="text-left">
                      <div className="font-bold text-white text-base">{country}</div>
                      <div className="text-xs font-medium text-gray-400 flex items-center gap-1">
                        <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">
                          {countryRules.currency}
                        </span>
                        <span>Tax System Loaded</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${countrySearchOpen ? 'rotate-90' : ''}`} />
                </button>
                
                {countrySearchOpen && (
                  <div className="absolute z-[15010] w-full mt-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl max-h-[300px] overflow-hidden animate-fade-in">
                    <div className="p-3 border-b border-white/10 sticky top-0 z-10 bg-[#1A1A1A]">
                      <div className="relative">
                        <input
                          type="text"
                          value={countrySearchQuery}
                          onChange={(e) => setCountrySearchQuery(e.target.value)}
                          placeholder="Search countries..."
                          className="w-full pl-10 pr-4 py-2 text-sm border border-white/10 rounded-lg bg-black/20 text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent outline-none"
                          autoFocus
                        />
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                      </div>
                    </div>
                    <div className="max-h-[240px] overflow-y-auto p-2 space-y-1">
                      {filteredCountries.map(c => {
                        const config = TAX_CONFIGS[c];
                        const isSelected = c === country;
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              setCountry(c);
                              setCountrySearchOpen(false);
                              setCountrySearchQuery('');
                            }}
                            className={`w-full p-3 text-left rounded-lg flex items-center gap-3 transition-all duration-200 ${
                              isSelected 
                                ? 'bg-cyan-500/20 border border-cyan-500/30' 
                                : 'hover:bg-white/5 border border-transparent'
                            }`}
                          >
                            <span className="text-xl w-6 h-6 flex items-center justify-center">
                              {getCountryFlag(c)}
                            </span>
                            <div className="flex-1">
                              <div className={`font-medium ${isSelected ? 'text-cyan-400' : 'text-white'}`}>
                                {c}
                              </div>
                              <div className="text-xs text-gray-500">
                                {config.currency} • {config.currencySymbol}
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-cyan-500" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Employment Status */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">
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
                        className={`p-4 rounded-xl border transition-all text-left ${
                          isSelected
                            ? 'border-cyan-500/50 bg-cyan-500/10'
                            : 'border-white/10 bg-[#1A1A1A] hover:bg-white/5'
                        }`}
                      >
                        <div className="text-2xl mb-2">{labels[status].icon}</div>
                        <div className={`text-sm font-medium ${
                          isSelected ? 'text-cyan-400' : 'text-white'
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
                <label className="block text-sm font-medium mb-2 text-gray-400 flex items-center gap-2">
                  Company Type *
                  <button
                    type="button"
                    onMouseEnter={() => setShowTooltip('companyType')}
                    onMouseLeave={() => setShowTooltip(null)}
                    className="text-gray-500 hover:text-white transition-colors relative"
                  >
                    <HelpCircle className="w-4 h-4" />
                    {showTooltip === 'companyType' && (
                      <div className="absolute left-0 top-6 w-64 bg-gray-900 border border-white/10 text-gray-300 text-xs rounded-xl p-3 shadow-xl z-50 backdrop-blur-xl">
                        Select your business structure. This affects which deductions and tax rates apply.
                      </div>
                    )}
                  </button>
                </label>
                <div className="space-y-3">
                  {availableCompanyTypes.map(type => {
                    const rules = countryRules.companyTypeRules[type];
                    if (!rules) return null;
                    
                    const isSelected = companyType === type;
                    
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setCompanyType(type)}
                        className={`w-full p-4 rounded-xl border transition-all text-left ${
                          isSelected
                            ? 'border-cyan-500/50 bg-cyan-500/10'
                            : 'border-white/10 bg-[#1A1A1A] hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className={`font-semibold mb-1 ${
                              isSelected ? 'text-cyan-400' : 'text-white'
                            }`}>
                              {rules.displayName}
                            </div>
                            <div className="text-xs text-gray-400 mb-2">
                              {rules.description}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {rules.advantages.slice(0, 2).map((adv, idx) => (
                                <span key={idx} className="text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                                  ✓ {adv}
                                </span>
                              ))}
                            </div>
                          </div>
                          {isSelected && <Check className="w-5 h-5 text-cyan-500 flex-shrink-0 ml-2" />}
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
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-cyan-400 mb-1">
                      Enter your annual income
                    </div>
                    <div className="text-xs text-cyan-400/70">
                      All amounts should be in {countryRules.currency} ({countryRules.currencySymbol}). Enter 0 for categories that don't apply.
                    </div>
                  </div>
                </div>
              </div>
              
              {dynamicForm.map(category => (
                <div key={category.id} className="bg-[#1A1A1A] rounded-2xl p-5 border border-white/10">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <h4 className="font-bold text-white text-sm">{category.label}</h4>
                      <p className="text-xs text-gray-400">{category.description}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {category.fields.map(field => (
                      <div key={field.id}>
                        <label className="block text-sm font-medium mb-2 text-gray-400 flex items-center gap-2">
                          {field.label}
                          {field.tooltip && (
                            <button
                              type="button"
                              onMouseEnter={() => setShowTooltip(field.id)}
                              onMouseLeave={() => setShowTooltip(null)}
                              className="text-gray-500 hover:text-white transition-colors relative"
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                              {showTooltip === field.id && (
                                <div className="absolute left-0 top-6 w-64 bg-gray-900 border border-white/10 text-gray-300 text-xs rounded-xl p-3 shadow-xl z-50 backdrop-blur-xl">
                                  {field.tooltip}
                                </div>
                              )}
                            </button>
                          )}
                        </label>
                        <div className="relative group">
                          <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-500 transition-colors" />
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
                              if (incomeData[field.id] === 0) setIncomeData({...incomeData, [field.id]: ''});
                            }}
                            onBlur={(e) => {
                              if (e.target.value === '') setIncomeData({...incomeData, [field.id]: 0});
                            }}
                            className="w-full pl-11 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white placeholder-gray-600 transition-all font-mono font-medium"
                            placeholder={field.placeholder || "0.00"}
                            step="0.01"
                            min="0"
                          />
                        </div>
                        {field.helpText && (
                          <p className="text-xs text-gray-500 mt-1.5 ml-1">
                            {field.helpText}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {/* Real-time Tax Preview */}
              <div className="bg-[#1A1A1A] rounded-2xl p-5 border border-white/10 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <Calculator className="w-32 h-32 text-white" />
                </div>
                
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-cyan-500/20 rounded-lg">
                      <Calculator className="w-5 h-5 text-cyan-500" />
                    </div>
                    <h4 className="font-bold text-white">Tax Preview</h4>
                  </div>
                  <div className="text-xs font-medium px-2 py-1 bg-white/5 rounded-lg border border-white/10 text-gray-400">
                    Estimated based on {countryRules.displayName}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 relative z-10">
                  <div className="bg-[#0D0D0D] rounded-xl p-4 border border-white/5">
                    <div className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Total Income</div>
                    <div className="text-base font-bold text-white font-mono truncate">
                      {formatCurrency(taxPreview.totalIncome, country)}
                    </div>
                  </div>
                  <div className="bg-[#0D0D0D] rounded-xl p-4 border border-white/5">
                    <div className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Est. Tax</div>
                    <div className="text-base font-bold text-red-400 font-mono truncate">
                      {formatCurrency(taxPreview.estimatedTax, country)}
                    </div>
                  </div>
                  <div className="bg-[#0D0D0D] rounded-xl p-4 border border-white/5">
                    <div className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Net Income</div>
                    <div className="text-base font-bold text-emerald-400 font-mono truncate">
                      {formatCurrency(taxPreview.netIncome, country)}
                    </div>
                  </div>
                  <div className="bg-[#0D0D0D] rounded-xl p-4 border border-white/5">
                    <div className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Tax Rate</div>
                    <div className="text-base font-bold text-cyan-400 font-mono truncate">
                      {taxPreview.effectiveRate.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Visual Tax Rate Bar */}
                <div className="bg-[#0D0D0D] rounded-xl p-4 border border-white/5 relative z-10">
                  <div className="flex justify-between text-xs mb-3">
                    <span className="font-medium text-gray-400">Effective Tax Rate (Breakdown)</span>
                    <span className="font-bold text-white">{taxPreview.effectiveRate.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-emerald-500" 
                      style={{ width: `${100 - taxPreview.effectiveRate}%` }}
                    />
                    <div 
                      className="h-full bg-red-500" 
                      style={{ width: `${taxPreview.effectiveRate}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] mt-2 text-gray-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span>Keep ({100 - taxPreview.effectiveRate > 0 ? (100 - taxPreview.effectiveRate).toFixed(1) : 0}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span>Tax ({taxPreview.effectiveRate.toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 3: Review */}
          {currentStep === 'review' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-gradient-to-br from-white/5 to-white/0 rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-emerald-500/20 rounded-full">
                    <Check className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h4 className="text-lg font-bold text-white">Review Your Tax Profile</h4>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-[#1A1A1A] rounded-xl p-4 border border-white/5">
                    <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-bold">Profile Name</div>
                    <div className="font-medium text-white">{profileName}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#1A1A1A] rounded-xl p-4 border border-white/5">
                      <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-bold">Country</div>
                      <div className="font-medium text-white flex items-center gap-2">
                        <span>{getCountryFlag(country)}</span>
                        {country}
                      </div>
                    </div>
                    
                    <div className="bg-[#1A1A1A] rounded-xl p-4 border border-white/5">
                      <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-bold">Company Type</div>
                      <div className="font-medium text-white">
                        {getCompanyTypeName(companyType)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-[#1A1A1A] rounded-xl p-4 border border-white/5">
                    <div className="text-xs text-gray-500 mb-4 uppercase tracking-wider font-bold">Tax Summary</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Total Income</div>
                        <div className="text-sm font-bold text-white font-mono">
                          {formatCurrency(taxPreview.totalIncome, country)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Estimated Tax</div>
                        <div className="text-sm font-bold text-red-400 font-mono">
                          {formatCurrency(taxPreview.estimatedTax, country)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Net Income</div>
                        <div className="text-sm font-bold text-emerald-400 font-mono">
                          {formatCurrency(taxPreview.netIncome, country)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Effective Rate</div>
                        <div className="text-sm font-bold text-cyan-400 font-mono">
                          {taxPreview.effectiveRate.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Smart Suggestions */}
              {smartSuggestions.length > 0 && (
                <div className="bg-purple-500/10 rounded-xl p-5 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                    <h4 className="font-bold text-purple-100">Smart Tax Tips</h4>
                  </div>
                  <div className="space-y-3">
                    {smartSuggestions.map((suggestion, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-sm text-purple-200/80">
                         <div className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                        <span>{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white placeholder-gray-600 transition-all font-medium resize-none"
                  rows={3}
                  placeholder="Add any notes about this tax profile..."
                />
              </div>
              
              {/* Active Toggle */}
              <div className="flex items-center gap-3 bg-[#1A1A1A] rounded-xl p-4 border border-white/5 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setIsActive(!isActive)}>
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isActive ? 'bg-cyan-500 border-cyan-500' : 'border-gray-600'}`}>
                  {isActive && <Check className="w-3 h-3 text-white" />}
                </div>
                <label className="text-sm font-medium text-white cursor-pointer select-none">
                  Set as active profile (calculations will use this profile)
                </label>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-4 pt-6 mt-2 border-t border-white/10">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-colors"
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
                className="px-6 py-3 rounded-xl border border-cyan-500/30 text-cyan-400 font-medium hover:bg-cyan-500/10 transition-colors flex items-center gap-2"
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
                className="px-8 py-3 bg-[#0D0D0D] border border-white/20 text-white rounded-xl font-bold hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="px-8 py-3 bg-[#0D0D0D] border border-white/20 text-white rounded-xl font-bold hover:bg-white/10 transition-all flex items-center gap-2"
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

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}

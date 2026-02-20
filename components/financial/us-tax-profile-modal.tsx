/**
 * US Tax Profile Modal - Enhanced State-Specific Tax System
 * Provides accurate tax calculations based on US state laws
 */

'use client';

import React, { useState, useMemo } from 'react';
import { X, MapPin, DollarSign, Briefcase, TrendingUp, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  USState,
  getAllUSStates,
  US_STATE_TAX_DATA,
  getNoIncomeTaxStates
} from '@/lib/us-state-tax-data';
import {
  USTaxProfile,
  calculateUSTaxes,
  getStateTaxInsights,
  getUSSmartSuggestions,
  compareStates
} from '@/lib/us-tax-wizard-system';

interface USTaxProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: USTaxProfile, calculation: any) => void;
  existingProfile?: Partial<USTaxProfile>;
}

export function USTaxProfileModal({ isOpen, onClose, onSave, existingProfile }: USTaxProfileModalProps) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<USTaxProfile>>({
    state: existingProfile?.state || 'California',
    filingStatus: existingProfile?.filingStatus || 'single',
    employmentStatus: existingProfile?.employmentStatus || 'employed',
    standardDeduction: true,
    ...existingProfile
  });

  // Update profile field
  const updateProfile = (field: keyof USTaxProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  // Calculate taxes in real-time
  const taxCalculation = useMemo(() => {
    if (!profile.state || !profile.filingStatus || !profile.employmentStatus) return null;
    
    try {
      return calculateUSTaxes(profile as USTaxProfile);
    } catch (error) {
      return null;
    }
  }, [profile]);

  // Get state insights
  const stateInsights = useMemo(() => {
    if (!profile.state) return null;
    return getStateTaxInsights(profile.state);
  }, [profile.state]);

  // Get smart suggestions
  const smartSuggestions = useMemo(() => {
    if (!taxCalculation || !profile.state) return [];
    return getUSSmartSuggestions(profile as USTaxProfile, taxCalculation);
  }, [profile, taxCalculation]);

  // Get state comparison
  const stateComparison = useMemo(() => {
    if (!profile.state || !taxCalculation) return [];
    
    const income = taxCalculation.breakdown.grossIncome;
    if (income === 0) return [];
    
    const similarStates = [profile.state];
    const noTaxStates = getNoIncomeTaxStates();
    
    // Add a no-tax state for comparison
    if (!noTaxStates.includes(profile.state)) {
      similarStates.push('Florida' as USState);
    }
    
    // Add a high-tax state for comparison
    if (profile.state !== 'California') {
      similarStates.push('California' as USState);
    }
    
    return compareStates(similarStates, income, profile.filingStatus || 'single').slice(0, 3);
  }, [profile, taxCalculation]);

  const handleSubmit = () => {
    if (taxCalculation) {
      onSave(profile as USTaxProfile, taxCalculation);
      onClose();
    }
  };

  if (!isOpen) return null;

  const allStates = getAllUSStates();
  const noTaxStates = getNoIncomeTaxStates();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[1000003] p-4" onClick={onClose}>
      <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <MapPin className="w-5 h-5 text-cyan-400" />
                </div>
                🇺🇸 US Tax Profile Wizard
              </h2>
              <p className="text-sm text-gray-500 mt-1 ml-12">
                State-specific tax calculations for accurate planning
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
          <div className="flex items-center gap-2 mt-6">
            {[1, 2, 3, 4].map((s) => (
              <React.Fragment key={s}>
                <div className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                  s <= step ? 'bg-cyan-500' : 'bg-white/10'
                }`} />
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[11px] text-gray-600 uppercase tracking-widest font-bold">
            <span>Location</span>
            <span>Status</span>
            <span>Income</span>
            <span>Review</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Step 1: State & Filing Status */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  Select Your State
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-2 bg-black/20 rounded-2xl border border-white/5 custom-scrollbar">
                  {allStates.map((state) => {
                    const isNoTax = noTaxStates.includes(state);
                    return (
                      <button
                        key={state}
                        onClick={() => updateProfile('state', state)}
                        className={`p-3 rounded-xl text-left transition-all ${
                          profile.state === state
                            ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-lg'
                            : 'bg-[#1A1A1A] border border-white/5 text-white hover:bg-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="font-medium text-sm">{state}</div>
                        {isNoTax && (
                          <div className="text-[10px] mt-1 text-emerald-400 font-bold">
                            ✨ No income tax
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* State Insights */}
              {stateInsights && (
                <div className="bg-cyan-500/10 rounded-2xl p-4 border border-cyan-500/20">
                  <h4 className="font-bold text-cyan-300 mb-2 text-sm">
                    {stateInsights.title}
                  </h4>
                  <div className="space-y-2 text-sm">
                    {stateInsights.insights.map((insight, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-cyan-200/70">
                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-cyan-400" />
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Filing Status
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'single', label: 'Single' },
                    { value: 'married-joint', label: 'Married Filing Jointly' },
                    { value: 'married-separate', label: 'Married Filing Separately' },
                    { value: 'head-of-household', label: 'Head of Household' }
                  ].map((status) => (
                    <button
                      key={status.value}
                      onClick={() => updateProfile('filingStatus', status.value)}
                      className={`p-3 rounded-xl text-sm font-medium transition-all ${
                        profile.filingStatus === status.value
                          ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                          : 'bg-[#1A1A1A] border border-white/10 text-white hover:bg-white/5'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Employment Status */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Briefcase className="w-4 h-4 text-cyan-400" />
                  Employment Status
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'employed', label: 'Employed (W-2)', icon: '💼' },
                    { value: 'self-employed', label: 'Self-Employed', icon: '👔' },
                    { value: 'unemployed', label: 'Unemployed', icon: '🔍' },
                    { value: 'retired', label: 'Retired', icon: '🏖️' }
                  ].map((status) => (
                    <button
                      key={status.value}
                      onClick={() => updateProfile('employmentStatus', status.value)}
                      className={`p-4 rounded-xl transition-all text-left ${
                        profile.employmentStatus === status.value
                          ? 'bg-cyan-500/20 border border-cyan-500/40'
                          : 'bg-[#1A1A1A] border border-white/10 hover:bg-white/5'
                      }`}
                    >
                      <div className="text-2xl mb-2">{status.icon}</div>
                      <div className={`text-sm font-medium ${profile.employmentStatus === status.value ? 'text-cyan-300' : 'text-white'}`}>{status.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Business Type (for self-employed) */}
              {profile.employmentStatus === 'self-employed' && (
                <div>
                  <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Business Structure
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'sole-proprietor', label: 'Sole Proprietor' },
                      { value: 'llc', label: 'LLC' },
                      { value: 's-corp', label: 'S-Corporation' },
                      { value: 'c-corp', label: 'C-Corporation' }
                    ].map((type) => (
                      <button
                        key={type.value}
                        onClick={() => updateProfile('businessType', type.value)}
                        className={`p-3 rounded-xl text-sm font-medium transition-all ${
                          profile.businessType === type.value
                            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                            : 'bg-[#1A1A1A] border border-white/10 text-white hover:bg-white/5'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>

                  {/* Business Structure Info */}
                  {profile.businessType === 'llc' && profile.state && (
                    <div className="mt-3 p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                      <div className="text-sm text-yellow-300">
                        💡 LLC Annual Fee in {profile.state}: ${US_STATE_TAX_DATA[profile.state].llcTaxTreatment.annualFees || 0}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Income Details */}
          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-cyan-400" />
                Income Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* W-2 Income */}
                {(profile.employmentStatus === 'employed' || profile.employmentStatus === 'self-employed') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      W-2 Salary Income
                    </label>
                    <div className="relative group">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                      <input
                        type="number"
                        value={profile.w2Income || ''}
                        onChange={(e) => updateProfile('w2Income', parseFloat(e.target.value) || 0)}
                        onFocus={(e) => { if (profile.w2Income === 0) updateProfile('w2Income', ''); }}
                        onBlur={(e) => { if (e.target.value === '') updateProfile('w2Income', 0); }}
                        className="w-full pl-11 pr-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white placeholder-gray-600 transition-all font-mono font-medium"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}

                {/* Self-Employment Income */}
                {profile.employmentStatus === 'self-employed' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Business / 1099 Income
                      </label>
                      <div className="relative group">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                        <input
                          type="number"
                          value={profile.businessIncome || ''}
                          onChange={(e) => updateProfile('businessIncome', parseFloat(e.target.value) || 0)}
                          onFocus={(e) => { if (profile.businessIncome === 0) updateProfile('businessIncome', ''); }}
                          onBlur={(e) => { if (e.target.value === '') updateProfile('businessIncome', 0); }}
                          className="w-full pl-11 pr-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white placeholder-gray-600 transition-all font-mono font-medium"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Business Expenses
                      </label>
                      <div className="relative group">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                        <input
                          type="number"
                          value={profile.businessExpenses || ''}
                          onChange={(e) => updateProfile('businessExpenses', parseFloat(e.target.value) || 0)}
                          onFocus={(e) => { if (profile.businessExpenses === 0) updateProfile('businessExpenses', ''); }}
                          onBlur={(e) => { if (e.target.value === '') updateProfile('businessExpenses', 0); }}
                          className="w-full pl-11 pr-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white placeholder-gray-600 transition-all font-mono font-medium"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Investment Income */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Capital Gains
                  </label>
                  <div className="relative group">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                    <input
                      type="number"
                      value={profile.capitalGains || ''}
                      onChange={(e) => updateProfile('capitalGains', parseFloat(e.target.value) || 0)}
                      onFocus={(e) => { if (profile.capitalGains === 0) updateProfile('capitalGains', ''); }}
                      onBlur={(e) => { if (e.target.value === '') updateProfile('capitalGains', 0); }}
                      className="w-full pl-11 pr-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white placeholder-gray-600 transition-all font-mono font-medium"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Dividends
                  </label>
                  <div className="relative group">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                    <input
                      type="number"
                      value={profile.dividends || ''}
                      onChange={(e) => updateProfile('dividends', parseFloat(e.target.value) || 0)}
                      onFocus={(e) => { if (profile.dividends === 0) updateProfile('dividends', ''); }}
                      onBlur={(e) => { if (e.target.value === '') updateProfile('dividends', 0); }}
                      className="w-full pl-11 pr-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white placeholder-gray-600 transition-all font-mono font-medium"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Retirement Contributions */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Retirement Contributions (401k, IRA)
                  </label>
                  <div className="relative group">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                    <input
                      type="number"
                      value={profile.retirementContributions || ''}
                      onChange={(e) => updateProfile('retirementContributions', parseFloat(e.target.value) || 0)}
                      onFocus={(e) => { if (profile.retirementContributions === 0) updateProfile('retirementContributions', ''); }}
                      onBlur={(e) => { if (e.target.value === '') updateProfile('retirementContributions', 0); }}
                      className="w-full pl-11 pr-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white placeholder-gray-600 transition-all font-mono font-medium"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Real-time Preview */}
              {taxCalculation && taxCalculation.breakdown.grossIncome > 0 && (
                <div className="bg-[#1A1A1A] rounded-2xl p-5 border border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <TrendingUp className="w-24 h-24 text-white" />
                  </div>
                  <div className="flex items-center gap-2 mb-4 relative z-10">
                    <div className="p-1.5 bg-cyan-500/20 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-cyan-400" />
                    </div>
                    <h4 className="font-bold text-white text-sm">Live Preview</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
                    {[
                      { label: 'Gross Income', value: `$${taxCalculation.breakdown.grossIncome.toLocaleString()}`, color: 'text-white' },
                      { label: 'Federal Tax', value: `$${taxCalculation.federalIncomeTax.toLocaleString()}`, color: 'text-red-400' },
                      { label: 'State Tax', value: `$${taxCalculation.stateIncomeTax.toLocaleString()}`, color: 'text-orange-400' },
                      { label: 'Net Income', value: `$${taxCalculation.netIncome.toLocaleString()}`, color: 'text-emerald-400' },
                    ].map((item) => (
                      <div key={item.label} className="bg-black/30 rounded-xl p-3 text-center">
                        <div className={`text-base font-black font-mono ${item.color}`}>{item.value}</div>
                        <div className="text-[10px] text-gray-600 mt-0.5">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review & Save */}
          {step === 4 && taxCalculation && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                Tax Summary & Recommendations
              </h3>

              {/* Tax Breakdown Hero */}
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-white/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
                <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Total Tax Liability</div>
                <div className="text-4xl font-black font-mono text-red-400 mb-4">
                  ${taxCalculation.totalTaxLiability.toLocaleString()}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-600 mb-0.5">Effective Rate</div>
                    <div className="text-xl font-black font-mono text-orange-400">{taxCalculation.totalEffectiveRate.toFixed(2)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-0.5">Net Income</div>
                    <div className="text-xl font-black font-mono text-emerald-400">${taxCalculation.netIncome.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#111] rounded-2xl p-4 border border-red-500/10">
                  <div className="text-xs text-red-400 font-bold uppercase tracking-widest mb-1">Federal Income Tax</div>
                  <div className="text-2xl font-black font-mono text-red-400">
                    ${taxCalculation.federalIncomeTax.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {taxCalculation.federalEffectiveRate.toFixed(2)}% effective rate
                  </div>
                </div>

                <div className="bg-[#111] rounded-2xl p-4 border border-orange-500/10">
                  <div className="text-xs text-orange-400 font-bold uppercase tracking-widest mb-1">
                    {profile.state} State Tax
                  </div>
                  <div className="text-2xl font-black font-mono text-orange-400">
                    ${taxCalculation.stateIncomeTax.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {taxCalculation.stateEffectiveRate.toFixed(2)}% effective rate
                  </div>
                </div>

                {taxCalculation.selfEmploymentTax > 0 && (
                  <div className="bg-[#111] rounded-2xl p-4 border border-yellow-500/10">
                    <div className="text-xs text-yellow-400 font-bold uppercase tracking-widest mb-1">Self-Employment Tax</div>
                    <div className="text-2xl font-black font-mono text-yellow-400">
                      ${taxCalculation.selfEmploymentTax.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Social Security + Medicare</div>
                  </div>
                )}

                {taxCalculation.annualLLCFees > 0 && (
                  <div className="bg-[#111] rounded-2xl p-4 border border-purple-500/10">
                    <div className="text-xs text-purple-400 font-bold uppercase tracking-widest mb-1">LLC Annual Fees</div>
                    <div className="text-2xl font-black font-mono text-purple-400">
                      ${taxCalculation.annualLLCFees.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {/* Smart Suggestions */}
              {smartSuggestions.length > 0 && (
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/5 rounded-2xl p-5 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-400" />
                    <h4 className="font-bold text-purple-300 text-sm uppercase tracking-wider">Smart Tax Tips</h4>
                    <span className="ml-auto text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full font-bold">
                      {smartSuggestions.length} tips
                    </span>
                  </div>
                  <div className="space-y-2">
                    {smartSuggestions.map((suggestion, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-2.5 bg-black/20 rounded-xl">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0 mt-2" />
                        <span className="text-sm text-purple-200/80">{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* State Comparison */}
              {stateComparison.length > 1 && (
                <div className="bg-[#111] rounded-2xl p-5 border border-white/5">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                    State Tax Comparison
                  </h4>
                  <div className="space-y-2">
                    {stateComparison.map((comp) => {
                      const isCurrent = comp.state === profile.state;
                      const maxTax = Math.max(...stateComparison.map((x) => x.stateTax), 1);
                      return (
                        <div key={comp.state} className={`p-3 rounded-xl border transition-all ${isCurrent ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-white/5'}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-sm font-semibold ${isCurrent ? 'text-cyan-400' : 'text-white'}`}>
                              {comp.state} {isCurrent && <span className="text-[10px] text-cyan-500 ml-1">● current</span>}
                            </span>
                            <span className="text-sm font-mono font-bold text-white">
                              {comp.stateTax === 0 ? 'FREE' : `$${comp.stateTax.toLocaleString()}`} <span className="text-gray-500">({comp.effectiveRate.toFixed(2)}%)</span>
                            </span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${comp.stateTax === 0 ? 'bg-emerald-500' : isCurrent ? 'bg-cyan-500' : 'bg-gray-600'}`}
                              style={{ width: `${Math.max((comp.stateTax / maxTax) * 100, comp.stateTax === 0 ? 1 : 1)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex justify-between items-center">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="px-6 py-2.5 border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl transition-colors font-medium disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Back
          </button>

          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2.5 border border-white/10 text-gray-400 hover:bg-white/5 rounded-xl transition-colors text-sm font-medium">
              Cancel
            </button>
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-6 py-2.5 bg-[#0D0D0D] border border-white/20 text-white rounded-xl hover:bg-white/10 transition-all font-bold"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-[#0D0D0D] border border-emerald-500/30 text-emerald-400 rounded-xl hover:bg-emerald-500/10 transition-all font-bold flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Save Tax Profile
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>
    </div>
  );
}

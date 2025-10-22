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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                🇺🇸 US Tax Profile Wizard
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                State-specific tax calculations for accurate planning
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-6">
            {[1, 2, 3, 4].map((s) => (
              <React.Fragment key={s}>
                <div className={`flex-1 h-2 rounded-full transition-all ${
                  s <= step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`} />
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600 dark:text-gray-400">
            <span>Location</span>
            <span>Status</span>
            <span>Income</span>
            <span>Review</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: State & Filing Status */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Select Your State
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  {allStates.map((state) => {
                    const isNoTax = noTaxStates.includes(state);
                    return (
                      <button
                        key={state}
                        onClick={() => updateProfile('state', state)}
                        className={`p-3 rounded-lg text-left transition-all ${
                          profile.state === state
                            ? 'bg-blue-600 text-white shadow-lg scale-105'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="font-medium text-sm">{state}</div>
                        {isNoTax && (
                          <div className="text-xs mt-1 opacity-90">
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
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    {stateInsights.title}
                  </h4>
                  <div className="space-y-2 text-sm">
                    {stateInsights.insights.map((insight, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-blue-800 dark:text-blue-200">
                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                      className={`p-3 rounded-lg text-sm transition-all ${
                        profile.filingStatus === status.value
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
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
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <Briefcase className="w-5 h-5 text-blue-600" />
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
                      className={`p-4 rounded-lg transition-all ${
                        profile.employmentStatus === status.value
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <div className="text-2xl mb-2">{status.icon}</div>
                      <div className="text-sm font-medium">{status.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Business Type (for self-employed) */}
              {profile.employmentStatus === 'self-employed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                        className={`p-3 rounded-lg text-sm transition-all ${
                          profile.businessType === type.value
                            ? 'bg-green-600 text-white shadow-md'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>

                  {/* Business Structure Info */}
                  {profile.businessType === 'llc' && profile.state && (
                    <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="text-sm text-yellow-800 dark:text-yellow-200">
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
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                Income Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* W-2 Income */}
                {(profile.employmentStatus === 'employed' || profile.employmentStatus === 'self-employed') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      W-2 Salary Income
                    </label>
                    <input
                      type="number"
                      value={profile.w2Income || ''}
                      onChange={(e) => updateProfile('w2Income', parseFloat(e.target.value) || 0)}
                      onFocus={(e) => { if (profile.w2Income === 0) updateProfile('w2Income', ''); }}
                      onBlur={(e) => { if (e.target.value === '') updateProfile('w2Income', 0); }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="$0"
                    />
                  </div>
                )}

                {/* Self-Employment Income */}
                {profile.employmentStatus === 'self-employed' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Business/1099 Income
                      </label>
                      <input
                        type="number"
                        value={profile.businessIncome || ''}
                        onChange={(e) => updateProfile('businessIncome', parseFloat(e.target.value) || 0)}
                        onFocus={(e) => { if (profile.businessIncome === 0) updateProfile('businessIncome', ''); }}
                        onBlur={(e) => { if (e.target.value === '') updateProfile('businessIncome', 0); }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="$0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Business Expenses
                      </label>
                      <input
                        type="number"
                        value={profile.businessExpenses || ''}
                        onChange={(e) => updateProfile('businessExpenses', parseFloat(e.target.value) || 0)}
                        onFocus={(e) => { if (profile.businessExpenses === 0) updateProfile('businessExpenses', ''); }}
                        onBlur={(e) => { if (e.target.value === '') updateProfile('businessExpenses', 0); }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="$0"
                      />
                    </div>
                  </>
                )}

                {/* Investment Income */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Capital Gains
                  </label>
                  <input
                    type="number"
                    value={profile.capitalGains || ''}
                    onChange={(e) => updateProfile('capitalGains', parseFloat(e.target.value) || 0)}
                    onFocus={(e) => { if (profile.capitalGains === 0) updateProfile('capitalGains', ''); }}
                    onBlur={(e) => { if (e.target.value === '') updateProfile('capitalGains', 0); }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="$0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dividends
                  </label>
                  <input
                    type="number"
                    value={profile.dividends || ''}
                    onChange={(e) => updateProfile('dividends', parseFloat(e.target.value) || 0)}
                    onFocus={(e) => { if (profile.dividends === 0) updateProfile('dividends', ''); }}
                    onBlur={(e) => { if (e.target.value === '') updateProfile('dividends', 0); }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="$0"
                  />
                </div>

                {/* Retirement Contributions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Retirement Contributions (401k, IRA)
                  </label>
                  <input
                    type="number"
                    value={profile.retirementContributions || ''}
                    onChange={(e) => updateProfile('retirementContributions', parseFloat(e.target.value) || 0)}
                    onFocus={(e) => { if (profile.retirementContributions === 0) updateProfile('retirementContributions', ''); }}
                    onBlur={(e) => { if (e.target.value === '') updateProfile('retirementContributions', 0); }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="$0"
                  />
                </div>
              </div>

              {/* Real-time Preview */}
              {taxCalculation && taxCalculation.breakdown.grossIncome > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">Quick Preview</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">Gross Income</div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        ${taxCalculation.breakdown.grossIncome.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">Federal Tax</div>
                      <div className="font-semibold text-red-600 dark:text-red-400">
                        ${taxCalculation.federalIncomeTax.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">State Tax</div>
                      <div className="font-semibold text-orange-600 dark:text-orange-400">
                        ${taxCalculation.stateIncomeTax.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">Net Income</div>
                      <div className="font-semibold text-green-600 dark:text-green-400">
                        ${taxCalculation.netIncome.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review & Save */}
          {step === 4 && taxCalculation && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Tax Summary & Recommendations
              </h3>

              {/* Tax Breakdown */}
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-6 text-white">
                <div className="text-sm opacity-90 mb-1">Total Tax Liability</div>
                <div className="text-4xl font-bold mb-4">
                  ${taxCalculation.totalTaxLiability.toLocaleString()}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="opacity-75">Effective Rate</div>
                    <div className="text-xl font-semibold">{taxCalculation.totalEffectiveRate.toFixed(2)}%</div>
                  </div>
                  <div>
                    <div className="opacity-75">Net Income</div>
                    <div className="text-xl font-semibold">${taxCalculation.netIncome.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                  <div className="text-sm text-red-600 dark:text-red-400 mb-1">Federal Income Tax</div>
                  <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                    ${taxCalculation.federalIncomeTax.toLocaleString()}
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {taxCalculation.federalEffectiveRate.toFixed(2)}% effective rate
                  </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                  <div className="text-sm text-orange-600 dark:text-orange-400 mb-1">
                    {profile.state} State Tax
                  </div>
                  <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                    ${taxCalculation.stateIncomeTax.toLocaleString()}
                  </div>
                  <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    {taxCalculation.stateEffectiveRate.toFixed(2)}% effective rate
                  </div>
                </div>

                {taxCalculation.selfEmploymentTax > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                    <div className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">Self-Employment Tax</div>
                    <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                      ${taxCalculation.selfEmploymentTax.toLocaleString()}
                    </div>
                    <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      Social Security + Medicare
                    </div>
                  </div>
                )}

                {taxCalculation.annualLLCFees > 0 && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                    <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">LLC Annual Fees</div>
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      ${taxCalculation.annualLLCFees.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {/* Smart Suggestions */}
              {smartSuggestions.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Smart Tax Tips
                  </h4>
                  <div className="space-y-2">
                    {smartSuggestions.map((suggestion, idx) => (
                      <div key={idx} className="text-sm text-green-800 dark:text-green-200 flex items-start gap-2">
                        <span className="flex-shrink-0 mt-1">•</span>
                        <span>{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* State Comparison */}
              {stateComparison.length > 1 && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    State Tax Comparison
                  </h4>
                  <div className="space-y-2">
                    {stateComparison.map((comp) => (
                      <div key={comp.state} className="flex items-center justify-between text-sm">
                        <span className={`font-medium ${comp.state === profile.state ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {comp.state}
                        </span>
                        <span className="text-gray-900 dark:text-white font-semibold">
                          ${comp.stateTax.toLocaleString()} ({comp.effectiveRate.toFixed(2)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>

          <div className="flex gap-3">
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Save Tax Profile
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

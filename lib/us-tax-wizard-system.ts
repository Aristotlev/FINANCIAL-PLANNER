/**
 * US Tax Wizard System
 * Enhanced system for US users with state-level tax accuracy
 */

import { 
  USState, 
  US_STATE_TAX_DATA, 
  getAllUSStates, 
  getNoIncomeTaxStates,
  calculateStateIncomeTax,
  StateTaxConfig 
} from './us-state-tax-data';

export interface USTaxProfile {
  // Basic info
  state: USState;
  filingStatus: 'single' | 'married-joint' | 'married-separate' | 'head-of-household';
  employmentStatus: 'employed' | 'self-employed' | 'unemployed' | 'retired';
  
  // Business info (for self-employed)
  businessType?: 'sole-proprietor' | 'llc' | 's-corp' | 'c-corp' | 'partnership';
  businessIncome?: number;
  businessExpenses?: number;
  
  // Income details
  w2Income?: number;
  selfEmploymentIncome?: number;
  capitalGains?: number;
  dividends?: number;
  interest?: number;
  rentalIncome?: number;
  otherIncome?: number;
  
  // Deductions
  standardDeduction?: boolean;
  itemizedDeductions?: number;
  businessDeductions?: number;
  retirementContributions?: number;
}

export interface USTaxCalculationResult {
  // Federal taxes
  federalIncomeTax: number;
  federalEffectiveRate: number;
  federalMarginalRate: number;
  
  // State taxes
  stateIncomeTax: number;
  stateEffectiveRate: number;
  stateMarginalRate: number;
  
  // Additional taxes
  selfEmploymentTax: number;
  franchiseTax?: number;
  grossReceiptsTax?: number;
  
  // LLC/Business fees
  annualLLCFees: number;
  
  // Totals
  totalTaxLiability: number;
  totalEffectiveRate: number;
  netIncome: number;
  
  // Breakdown
  breakdown: {
    grossIncome: number;
    adjustedGrossIncome: number;
    taxableIncome: number;
    deductions: number;
  };
}

// Federal tax brackets 2025 (single filer)
const FEDERAL_TAX_BRACKETS_2025_SINGLE = [
  { min: 0, max: 11600, rate: 10 },
  { min: 11600, max: 47150, rate: 12 },
  { min: 47150, max: 100525, rate: 22 },
  { min: 100525, max: 191950, rate: 24 },
  { min: 191950, max: 243725, rate: 32 },
  { min: 243725, max: 609350, rate: 35 },
  { min: 609350, max: Infinity, rate: 37 }
];

const FEDERAL_TAX_BRACKETS_2025_MARRIED = [
  { min: 0, max: 23200, rate: 10 },
  { min: 23200, max: 94300, rate: 12 },
  { min: 94300, max: 201050, rate: 22 },
  { min: 201050, max: 383900, rate: 24 },
  { min: 383900, max: 487450, rate: 32 },
  { min: 487450, max: 731200, rate: 35 },
  { min: 731200, max: Infinity, rate: 37 }
];

const FEDERAL_STANDARD_DEDUCTION_2025 = {
  single: 14600,
  'married-joint': 29200,
  'married-separate': 14600,
  'head-of-household': 21900
};

/**
 * Calculate comprehensive US tax liability
 */
export function calculateUSTaxes(profile: USTaxProfile): USTaxCalculationResult {
  const stateConfig = US_STATE_TAX_DATA[profile.state];
  
  // Calculate gross income
  const grossIncome = 
    (profile.w2Income || 0) +
    (profile.selfEmploymentIncome || 0) +
    (profile.businessIncome || 0) +
    (profile.capitalGains || 0) +
    (profile.dividends || 0) +
    (profile.interest || 0) +
    (profile.rentalIncome || 0) +
    (profile.otherIncome || 0);
  
  // Calculate self-employment tax (15.3% on net earnings)
  let selfEmploymentTax = 0;
  if (profile.selfEmploymentIncome || profile.businessIncome) {
    const netSelfEmployment = 
      (profile.selfEmploymentIncome || 0) + 
      (profile.businessIncome || 0) - 
      (profile.businessExpenses || 0);
    selfEmploymentTax = netSelfEmployment * 0.9235 * 0.153; // 92.35% of net × 15.3%
  }
  
  // Calculate AGI (adjusted gross income)
  const adjustedGrossIncome = grossIncome - (selfEmploymentTax / 2) - (profile.retirementContributions || 0);
  
  // Calculate deductions
  const standardDeduction = FEDERAL_STANDARD_DEDUCTION_2025[profile.filingStatus];
  const deductions = profile.standardDeduction !== false 
    ? standardDeduction 
    : (profile.itemizedDeductions || 0);
  
  // Calculate taxable income
  const taxableIncome = Math.max(0, adjustedGrossIncome - deductions);
  
  // Calculate federal income tax
  const brackets = profile.filingStatus === 'married-joint' 
    ? FEDERAL_TAX_BRACKETS_2025_MARRIED 
    : FEDERAL_TAX_BRACKETS_2025_SINGLE;
  
  let federalIncomeTax = 0;
  let federalMarginalRate = 0;
  
  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break;
    
    const bracketMax = bracket.max === Infinity ? taxableIncome : bracket.max;
    const taxableInBracket = Math.min(taxableIncome, bracketMax) - bracket.min;
    
    if (taxableInBracket > 0) {
      federalIncomeTax += (taxableInBracket * bracket.rate) / 100;
      federalMarginalRate = bracket.rate;
    }
  }
  
  const federalEffectiveRate = grossIncome > 0 ? (federalIncomeTax / grossIncome) * 100 : 0;
  
  // Calculate state income tax
  const stateResult = calculateStateIncomeTax(profile.state, adjustedGrossIncome);
  
  // Calculate additional taxes
  let franchiseTax = 0;
  if (stateConfig.additionalTaxes.franchise && profile.businessType) {
    // Simplified calculation - would need more detailed implementation
    franchiseTax = stateConfig.llcTaxTreatment.annualFees || 0;
  }
  
  let grossReceiptsTax = 0;
  if (stateConfig.additionalTaxes.grossReceipts && profile.businessIncome) {
    // Simplified - actual rates vary by state and revenue
    const revenue = profile.businessIncome;
    if (revenue > 1000000) { // Example threshold
      grossReceiptsTax = revenue * 0.003; // Example 0.3% rate
    }
  }
  
  // Annual LLC fees
  const annualLLCFees = profile.businessType === 'llc' 
    ? (stateConfig.llcTaxTreatment.annualFees || 0) 
    : 0;
  
  // Calculate totals
  const totalTaxLiability = 
    federalIncomeTax + 
    stateResult.tax + 
    selfEmploymentTax + 
    franchiseTax + 
    grossReceiptsTax + 
    annualLLCFees;
  
  const totalEffectiveRate = grossIncome > 0 ? (totalTaxLiability / grossIncome) * 100 : 0;
  const netIncome = grossIncome - totalTaxLiability;
  
  return {
    federalIncomeTax,
    federalEffectiveRate,
    federalMarginalRate,
    stateIncomeTax: stateResult.tax,
    stateEffectiveRate: stateResult.effectiveRate,
    stateMarginalRate: stateResult.marginalRate,
    selfEmploymentTax,
    franchiseTax,
    grossReceiptsTax,
    annualLLCFees,
    totalTaxLiability,
    totalEffectiveRate,
    netIncome,
    breakdown: {
      grossIncome,
      adjustedGrossIncome,
      taxableIncome,
      deductions
    }
  };
}

/**
 * Get state-specific tax insights
 */
export function getStateTaxInsights(state: USState): {
  title: string;
  insights: string[];
  advantages: string[];
  considerations: string[];
} {
  const config = US_STATE_TAX_DATA[state];
  const insights: string[] = [];
  const advantages: string[] = [];
  const considerations: string[] = [];
  
  // Income tax insights
  if (config.individualIncomeTax.structure === 'None') {
    insights.push(`${state} has NO state income tax`);
    advantages.push('Keep more of your earnings');
    advantages.push('Simpler tax filing');
  } else if (config.individualIncomeTax.structure === 'Flat') {
    const rate = config.individualIncomeTax.brackets[0]?.rate || 0;
    insights.push(`${state} has a flat ${rate}% income tax`);
    advantages.push('Simple and predictable tax rate');
  } else {
    insights.push(`${state} uses progressive (graduated) tax brackets`);
    const topRate = config.individualIncomeTax.brackets[config.individualIncomeTax.brackets.length - 1]?.rate || 0;
    insights.push(`Top marginal rate: ${topRate}%`);
  }
  
  // Sales tax
  if (config.additionalTaxes.salesTax === 0) {
    advantages.push('No state sales tax');
  } else {
    insights.push(`State sales tax: ${config.additionalTaxes.salesTax}%`);
  }
  
  // Business-friendly features
  if (!config.corporateIncomeTax.hasTax) {
    advantages.push('No corporate income tax');
  }
  
  if (config.llcTaxTreatment.annualFees === 0 || !config.llcTaxTreatment.annualFees) {
    advantages.push('No or minimal LLC annual fees');
  } else if (config.llcTaxTreatment.annualFees > 500) {
    considerations.push(`High LLC fees: $${config.llcTaxTreatment.annualFees}/year`);
  }
  
  // Additional taxes
  if (config.additionalTaxes.franchise) {
    considerations.push('Franchise/privilege tax applies to businesses');
  }
  
  if (config.additionalTaxes.grossReceipts) {
    considerations.push('Gross receipts tax on business revenue');
  }
  
  // Special notes
  if (config.individualIncomeTax.notes) {
    insights.push(config.individualIncomeTax.notes);
  }
  
  if (config.llcTaxTreatment.stateSpecificRules) {
    considerations.push(config.llcTaxTreatment.stateSpecificRules);
  }
  
  return {
    title: `${state} Tax Profile`,
    insights,
    advantages,
    considerations
  };
}

/**
 * Get smart suggestions based on US tax profile
 */
export function getUSSmartSuggestions(profile: USTaxProfile, calculation: USTaxCalculationResult): string[] {
  const suggestions: string[] = [];
  const stateConfig = US_STATE_TAX_DATA[profile.state];
  
  // High tax burden
  if (calculation.totalEffectiveRate > 30) {
    suggestions.push('⚠️ Your effective tax rate is above 30%. Consider consulting a tax professional for optimization strategies.');
  }
  
  // State relocation benefits
  const noTaxStates = getNoIncomeTaxStates();
  if (!noTaxStates.includes(profile.state) && calculation.stateIncomeTax > 10000) {
    suggestions.push(`💡 You are paying $${calculation.stateIncomeTax.toLocaleString()} in state taxes. States like Florida, Texas, and Nevada have no income tax.`);
  }
  
  // Self-employment optimization
  if (profile.employmentStatus === 'self-employed' && calculation.selfEmploymentTax > 5000) {
    suggestions.push('💡 Consider forming an S-Corp to potentially reduce self-employment taxes once income exceeds $60k.');
  }
  
  // Retirement contributions
  if ((profile.retirementContributions || 0) < 10000 && calculation.grossIncome > 50000) {
    suggestions.push('💡 Maximize retirement contributions (401k, IRA) to reduce taxable income and save for the future.');
  }
  
  // LLC considerations
  if (profile.businessType === 'llc' && stateConfig.llcTaxTreatment.annualFees > 500) {
    suggestions.push(`⚠️ ${profile.state} charges $${stateConfig.llcTaxTreatment.annualFees}/year for LLCs. Consider if this structure is optimal.`);
  }
  
  // Franchise tax states
  if (stateConfig.additionalTaxes.franchise && profile.businessIncome && profile.businessIncome > 100000) {
    suggestions.push('⚠️ Your state has franchise tax. Ensure you are accounting for this in your business planning.');
  }
  
  // Gross receipts tax
  if (stateConfig.additionalTaxes.grossReceipts && profile.businessIncome && profile.businessIncome > 500000) {
    suggestions.push('⚠️ Your state has a gross receipts tax. This applies to revenue, not profit - plan accordingly.');
  }
  
  // Standard vs itemized deduction
  if (profile.standardDeduction !== false && (profile.itemizedDeductions || 0) > FEDERAL_STANDARD_DEDUCTION_2025[profile.filingStatus]) {
    suggestions.push('💡 Your itemized deductions may exceed the standard deduction. Consider itemizing to save more.');
  }
  
  // Capital gains optimization
  if ((profile.capitalGains || 0) > 50000) {
    suggestions.push('💡 Consider tax-loss harvesting to offset capital gains and reduce tax liability.');
  }
  
  // Business expense tracking
  if (profile.businessIncome && (!profile.businessExpenses || profile.businessExpenses < profile.businessIncome * 0.1)) {
    suggestions.push('💡 Ensure you are tracking ALL business expenses. Most self-employed individuals can deduct 20-40% of revenue.');
  }
  
  return suggestions;
}

/**
 * Compare multiple states for tax planning
 */
export function compareStates(
  states: USState[],
  baseIncome: number,
  filingStatus: USTaxProfile['filingStatus']
): Array<{
  state: USState;
  stateTax: number;
  effectiveRate: number;
  insights: ReturnType<typeof getStateTaxInsights>;
}> {
  return states.map(state => {
    const result = calculateStateIncomeTax(state, baseIncome);
    const insights = getStateTaxInsights(state);
    
    return {
      state,
      stateTax: result.tax,
      effectiveRate: result.effectiveRate,
      insights
    };
  }).sort((a, b) => a.stateTax - b.stateTax); // Sort by lowest tax first
}

/**
 * Get recommended states for specific situations
 */
export function getRecommendedStates(situation: {
  hasBusinessIncome: boolean;
  highEarner: boolean; // > $200k
  remotework: boolean;
}): {
  recommended: USState[];
  reasons: Record<string, string>;
} {
  const recommended: USState[] = [];
  const reasons: Record<string, string> = {};
  
  const noTaxStates = getNoIncomeTaxStates();
  
  if (situation.highEarner) {
    // High earners benefit most from no-income-tax states
    ['Florida', 'Texas', 'Nevada', 'Washington', 'Tennessee', 'Wyoming'].forEach(state => {
      if (noTaxStates.includes(state as USState)) {
        recommended.push(state as USState);
        reasons[state] = 'No state income tax - save thousands annually';
      }
    });
  }
  
  if (situation.hasBusinessIncome) {
    // Business-friendly states
    ['Wyoming', 'Nevada', 'Delaware', 'South Dakota'].forEach(state => {
      if (!recommended.includes(state as USState)) {
        recommended.push(state as USState);
        reasons[state] = 'Excellent for business formation and low fees';
      }
    });
  }
  
  if (situation.remotework) {
    // Best remote work states (low tax + quality of life)
    ['Florida', 'Texas', 'North Carolina', 'Colorado'].forEach(state => {
      if (!recommended.includes(state as USState)) {
        recommended.push(state as USState);
        reasons[state] = 'Popular for remote workers with good infrastructure';
      }
    });
  }
  
  return { recommended, reasons };
}

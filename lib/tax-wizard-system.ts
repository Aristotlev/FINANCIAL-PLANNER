/**
 * Tax Wizard System
 * Provides intelligent, country-specific tax guidance and form generation
 */

import { 
  Country, 
  CompanyType, 
  TAX_CONFIGS, 
  getCompanyTypesForCountry,
  TaxCalculationInput,
  calculateTotalTax
} from './tax-calculator';

// Employment status types
export type EmploymentStatus = 
  | 'employed'
  | 'self_employed'
  | 'unemployed'
  | 'retired'
  | 'student';

// Income category for better organization
export interface IncomeCategory {
  id: string;
  label: string;
  description: string;
  icon: string;
  fields: IncomeField[];
  applicable: boolean; // Whether this category applies to the user
}

// Individual income field
export interface IncomeField {
  id: string;
  label: string;
  description?: string;
  type: 'number' | 'toggle';
  placeholder?: string;
  defaultValue: number | boolean;
  tooltip?: string;
  helpText?: string;
}

// Country-specific rules and guidance
export interface CountryTaxRules {
  country: Country;
  displayName: string;
  currency: string;
  currencySymbol: string;
  flag: string;
  
  // Employment status rules
  employmentStatusSupport: {
    employed: {
      supported: boolean;
      requiredFields: string[];
      optionalFields: string[];
      taxBenefits: string[];
    };
    selfEmployed: {
      supported: boolean;
      requiredFields: string[];
      optionalFields: string[];
      taxBenefits: string[];
    };
    unemployed: {
      supported: boolean;
      benefits: string[];
      taxImplications: string[];
    };
    retired: {
      supported: boolean;
      pensionTaxRate: number;
      exemptions: string[];
    };
  };
  
  // Company type rules
  companyTypeRules: {
    [key in CompanyType]?: {
      displayName: string;
      description: string;
      taxRate: number;
      advantages: string[];
      disadvantages: string[];
      recommendedFor: string[];
    };
  };
  
  // Income categories that apply
  incomeCategories: string[]; // IDs of applicable categories
  
  // Standard deductions and allowances
  standardDeductions: {
    employed: number;
    selfEmployed: number;
    retired: number;
  };
  
  // Tax tips specific to country
  taxTips: string[];
  
  // Important deadlines
  taxDeadlines: {
    filing: string;
    payment: string;
  };
}

// Flag mapping
const COUNTRY_FLAGS: Record<Country, string> = {
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

/**
 * Get country flag emoji
 */
export function getCountryFlag(country: Country): string {
  return COUNTRY_FLAGS[country] || '🌍';
}

/**
 * Standard income categories
 */
export const INCOME_CATEGORIES: IncomeCategory[] = [
  {
    id: 'employment',
    label: 'Employment Income',
    description: 'Salary, wages, and employment benefits',
    icon: '💼',
    applicable: true,
    fields: [
      {
        id: 'salaryIncome',
        label: 'Annual Salary/Wages',
        description: 'Your total gross salary before taxes',
        type: 'number',
        placeholder: '0.00',
        defaultValue: 0,
        tooltip: 'Include all salary, bonuses, and employment income',
        helpText: 'This is your gross income before any deductions'
      }
    ]
  },
  {
    id: 'business',
    label: 'Business Income',
    description: 'Self-employment, freelance, and business profits',
    icon: '🏢',
    applicable: true,
    fields: [
      {
        id: 'businessIncome',
        label: 'Business/Self-Employment Income',
        description: 'Net profit from your business',
        type: 'number',
        placeholder: '0.00',
        defaultValue: 0,
        tooltip: 'After business expenses',
        helpText: 'Enter your net business income (revenue minus expenses)'
      }
    ]
  },
  {
    id: 'investments',
    label: 'Investment Income',
    description: 'Capital gains, dividends, and interest',
    icon: '📈',
    applicable: true,
    fields: [
      {
        id: 'capitalGainsShort',
        label: 'Short-term Capital Gains',
        description: 'Assets held less than 1 year',
        type: 'number',
        placeholder: '0.00',
        defaultValue: 0,
        tooltip: 'Gains from assets held < 1 year',
        helpText: 'Usually taxed at higher rates'
      },
      {
        id: 'capitalGainsLong',
        label: 'Long-term Capital Gains',
        description: 'Assets held 1 year or more',
        type: 'number',
        placeholder: '0.00',
        defaultValue: 0,
        tooltip: 'Gains from assets held ≥ 1 year',
        helpText: 'Usually taxed at preferential rates'
      },
      {
        id: 'dividends',
        label: 'Dividend Income',
        description: 'Dividends from stocks and funds',
        type: 'number',
        placeholder: '0.00',
        defaultValue: 0,
        tooltip: 'Qualified and non-qualified dividends',
        helpText: 'Income from stock dividends'
      }
    ]
  },
  {
    id: 'property',
    label: 'Property Income',
    description: 'Rental income and property gains',
    icon: '🏠',
    applicable: true,
    fields: [
      {
        id: 'rentalIncome',
        label: 'Rental Income',
        description: 'Net rental income from properties',
        type: 'number',
        placeholder: '0.00',
        defaultValue: 0,
        tooltip: 'After property expenses',
        helpText: 'Total rental income minus expenses'
      }
    ]
  },
  {
    id: 'crypto',
    label: 'Cryptocurrency',
    description: 'Crypto trading and staking income',
    icon: '₿',
    applicable: true,
    fields: [
      {
        id: 'cryptoGains',
        label: 'Crypto Gains',
        description: 'Realized gains from crypto trading',
        type: 'number',
        placeholder: '0.00',
        defaultValue: 0,
        tooltip: 'Gains from selling or trading crypto',
        helpText: 'Usually treated as capital gains'
      }
    ]
  },
  {
    id: 'deductions',
    label: 'Deductions & Expenses',
    description: 'Tax-deductible expenses',
    icon: '📝',
    applicable: true,
    fields: [
      {
        id: 'deductibleExpenses',
        label: 'Deductible Expenses',
        description: 'Business and tax-deductible expenses',
        type: 'number',
        placeholder: '0.00',
        defaultValue: 0,
        tooltip: 'Expenses that reduce taxable income',
        helpText: 'Business expenses, home office, equipment, etc.'
      }
    ]
  }
];

/**
 * Get country-specific tax rules and guidance
 */
export function getCountryTaxRules(country: Country): CountryTaxRules {
  const config = TAX_CONFIGS[country];
  const companyTypes = getCompanyTypesForCountry(country);
  
  // Build company type rules
  const companyTypeRules: CountryTaxRules['companyTypeRules'] = {};
  
  for (const type of companyTypes) {
    switch (type) {
      case 'individual':
        companyTypeRules[type] = {
          displayName: 'Individual/Employed',
          description: 'Standard employment or personal income',
          taxRate: config.incomeTaxBrackets[config.incomeTaxBrackets.length - 1].rate,
          advantages: ['Simple tax filing', 'Standard deductions', 'No corporate requirements'],
          disadvantages: ['Higher tax rates on income', 'Limited deductions', 'No liability protection'],
          recommendedFor: ['Employees', 'First-time taxpayers', 'Low to moderate income']
        };
        break;
      case 'sole_proprietor':
        companyTypeRules[type] = {
          displayName: 'Sole Proprietor',
          description: 'Self-employed individual business owner',
          taxRate: config.incomeTaxBrackets[config.incomeTaxBrackets.length - 1].rate,
          advantages: ['Full control', 'More deductions', 'Simple structure', 'Pass-through taxation'],
          disadvantages: ['Personal liability', 'Self-employment tax', 'Harder to raise capital'],
          recommendedFor: ['Freelancers', 'Small business owners', 'Consultants']
        };
        break;
      case 'llc':
        companyTypeRules[type] = {
          displayName: 'LLC (Limited Liability Company)',
          description: 'Flexible business structure with liability protection',
          taxRate: 0,
          advantages: ['Liability protection', 'Pass-through taxation', 'Flexible management', 'Credibility'],
          disadvantages: ['More paperwork', 'State fees', 'Self-employment tax on profits'],
          recommendedFor: ['Growing businesses', 'Multiple owners', 'Real estate investors']
        };
        break;
      case 'corporation':
      case 'ltd':
      case 'pty_ltd':
        companyTypeRules[type] = {
          displayName: type === 'corporation' ? 'C Corporation' : type === 'ltd' ? 'Ltd' : 'Pty Ltd',
          description: 'Separate legal entity with corporate taxation',
          taxRate: type === 'corporation' ? 21 : type === 'ltd' ? 19 : 25,
          advantages: ['Limited liability', 'Easier to raise capital', 'Better for employees', 'Unlimited shareholders'],
          disadvantages: ['Double taxation', 'More regulations', 'Complex structure', 'Higher costs'],
          recommendedFor: ['Large businesses', 'Companies seeking investment', 'International operations']
        };
        break;
      case 's_corporation':
        companyTypeRules[type] = {
          displayName: 'S Corporation',
          description: 'Pass-through taxation with corporate benefits',
          taxRate: 0,
          advantages: ['Pass-through taxation', 'Avoid self-employment tax', 'Limited liability', 'Credibility'],
          disadvantages: ['Strict requirements', 'Limited to 100 shareholders', 'Must be US citizens', 'More paperwork'],
          recommendedFor: ['Profitable small businesses', 'Owner-operators', 'Dividend distributions']
        };
        break;
      case 'partnership':
        companyTypeRules[type] = {
          displayName: 'Partnership',
          description: 'Business owned by two or more people',
          taxRate: 0,
          advantages: ['Pass-through taxation', 'Shared responsibilities', 'More capital', 'Simple formation'],
          disadvantages: ['Joint liability', 'Profit sharing', 'Potential conflicts', 'Unlimited liability'],
          recommendedFor: ['Co-founded businesses', 'Professional services', 'Joint ventures']
        };
        break;
    }
  }
  
  // Country-specific tax tips
  const taxTips: string[] = [];
  
  if (country === 'USA') {
    taxTips.push(
      'Maximize 401(k) contributions to reduce taxable income',
      'Consider HSA contributions for triple tax benefits',
      'Track charitable donations for deductions',
      'Hold investments over 1 year for lower capital gains rates'
    );
  } else if (country === 'UK') {
    taxTips.push(
      'Maximize ISA contributions for tax-free investment growth',
      'Use pension contributions to reduce income tax',
      'Consider salary sacrifice schemes',
      'Track capital gains to use annual exemption'
    );
  } else if (country === 'Greece') {
    taxTips.push(
      'Keep detailed records of all business expenses',
      'Consider salary vs dividend optimization for businesses',
      'Track rental property expenses for deductions',
      'Use tax-advantaged savings accounts'
    );
  } else if (['Germany', 'France', 'Netherlands'].includes(country)) {
    taxTips.push(
      'Maximize pension contributions for tax benefits',
      'Keep records of all work-related expenses',
      'Consider income splitting with spouse',
      'Use tax-deductible insurance premiums'
    );
  } else if (['Singapore', 'UAE'].includes(country)) {
    taxTips.push(
      `${country} offers favorable tax rates - maximize investment income`,
      'No capital gains tax on investments',
      'Consider CPF contributions (Singapore) for retirement',
      'Take advantage of tax exemptions for new businesses'
    );
  } else {
    taxTips.push(
      `Understand ${country}'s tax brackets to optimize income`,
      'Keep detailed records of all income and expenses',
      'Consider professional tax advice for complex situations',
      'Plan ahead for quarterly or annual tax payments'
    );
  }
  
  return {
    country,
    displayName: country,
    currency: config.currency,
    currencySymbol: config.currencySymbol,
    flag: getCountryFlag(country),
    employmentStatusSupport: {
      employed: {
        supported: true,
        requiredFields: ['salaryIncome'],
        optionalFields: ['capitalGains', 'dividends', 'rentalIncome'],
        taxBenefits: ['Standard deduction', 'Employer benefits', 'Pension contributions']
      },
      selfEmployed: {
        supported: true,
        requiredFields: ['businessIncome'],
        optionalFields: ['deductibleExpenses', 'capitalGains'],
        taxBenefits: ['Business expense deductions', 'Home office deduction', 'Equipment depreciation']
      },
      unemployed: {
        supported: true,
        benefits: ['Unemployment benefits may be taxable', 'Lower income tax liability', 'May qualify for credits'],
        taxImplications: ['Report unemployment benefits as income', 'May have withholding options', 'Check eligibility for tax credits']
      },
      retired: {
        supported: true,
        pensionTaxRate: config.incomeTaxBrackets[1]?.rate || 15,
        exemptions: ['Higher standard deduction', 'Pension income may be partially exempt', 'Senior tax credits']
      }
    },
    companyTypeRules,
    incomeCategories: ['employment', 'business', 'investments', 'property', 'crypto', 'deductions'],
    standardDeductions: {
      employed: config.deductions.standard,
      selfEmployed: config.deductions.standard * 1.2, // Slightly higher for self-employed
      retired: config.deductions.standard * 1.3 // Higher for retirees
    },
    taxTips,
    taxDeadlines: {
      filing: country === 'USA' ? 'April 15' : country === 'UK' ? 'January 31' : 'Check local laws',
      payment: country === 'USA' ? 'Quarterly + April 15' : 'Varies by country'
    }
  };
}

/**
 * Generate dynamic form based on employment status and country
 */
export function generateDynamicForm(
  country: Country,
  employmentStatus: EmploymentStatus,
  companyType: CompanyType
): IncomeCategory[] {
  const rules = getCountryTaxRules(country);
  const categories = INCOME_CATEGORIES.map(cat => ({ ...cat }));
  
  // Filter categories based on employment status
  switch (employmentStatus) {
    case 'employed':
      // Emphasize employment income, optional others
      categories.find(c => c.id === 'employment')!.applicable = true;
      categories.find(c => c.id === 'business')!.applicable = false;
      break;
      
    case 'self_employed':
      // Emphasize business income
      categories.find(c => c.id === 'employment')!.applicable = false;
      categories.find(c => c.id === 'business')!.applicable = true;
      break;
      
    case 'unemployed':
      // Minimal categories
      categories.find(c => c.id === 'employment')!.applicable = false;
      categories.find(c => c.id === 'business')!.applicable = false;
      break;
      
    case 'retired':
      // Focus on pension and investments
      categories.find(c => c.id === 'employment')!.label = 'Pension Income';
      categories.find(c => c.id === 'business')!.applicable = false;
      break;
  }
  
  return categories.filter(c => c.applicable);
}

/**
 * Calculate tax with real-time preview
 */
export function calculateTaxPreview(
  country: Country,
  companyType: CompanyType,
  incomeData: Record<string, number>
): {
  totalIncome: number;
  estimatedTax: number;
  netIncome: number;
  effectiveRate: number;
  breakdown: {
    incomeTax: number;
    socialSecurity: number;
    other: number;
  };
} {
  const input: TaxCalculationInput = {
    country,
    companyType,
    salaryIncome: incomeData.salaryIncome || 0,
    businessIncome: incomeData.businessIncome || 0,
    capitalGains: {
      shortTerm: incomeData.capitalGainsShort || 0,
      longTerm: incomeData.capitalGainsLong || 0
    },
    dividends: incomeData.dividends || 0,
    rentalIncome: incomeData.rentalIncome || 0,
    cryptoGains: incomeData.cryptoGains || 0,
    deductibleExpenses: incomeData.deductibleExpenses || 0
  };
  
  const result = calculateTotalTax(input);
  
  return {
    totalIncome: result.totalIncome,
    estimatedTax: result.totalTax,
    netIncome: result.netIncome,
    effectiveRate: result.totalTaxRate,
    breakdown: {
      incomeTax: result.incomeTax.amount,
      socialSecurity: result.socialSecurity.amount,
      other: result.capitalGainsTax.amount + result.dividendTax.amount + (result.corporateTax?.amount || 0)
    }
  };
}

/**
 * Get smart suggestions based on user profile
 */
export function getSmartSuggestions(
  country: Country,
  employmentStatus: EmploymentStatus,
  companyType: CompanyType,
  incomeData: Record<string, number>
): string[] {
  const suggestions: string[] = [];
  const rules = getCountryTaxRules(country);
  const totalIncome = Object.values(incomeData).reduce((a, b) => a + b, 0);
  
  // Employment-specific suggestions
  if (employmentStatus === 'employed' && incomeData.salaryIncome > 50000) {
    suggestions.push('💡 Consider maximizing retirement contributions to reduce taxable income');
  }
  
  if (employmentStatus === 'self_employed' && incomeData.businessIncome > 0) {
    suggestions.push('💼 Track all business expenses - home office, equipment, software, travel');
    if (incomeData.businessIncome > 100000) {
      suggestions.push('🏢 Consider incorporating to optimize taxes (consult a tax professional)');
    }
  }
  
  // Investment suggestions
  if ((incomeData.capitalGainsShort || 0) > (incomeData.capitalGainsLong || 0)) {
    suggestions.push('⏳ Hold investments longer for lower long-term capital gains rates');
  }
  
  // Country-specific suggestions
  suggestions.push(...rules.taxTips.slice(0, 2).map(tip => '💰 ' + tip));
  
  return suggestions;
}

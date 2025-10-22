/**
 * Tax Calculator Library
 * Handles tax calculations for different countries, company types, and income sources
 * Now with enhanced EU tax integration using comprehensive 2025 data
 */

import {
  calculateEUIndividualTax,
  calculateEUCorporateTax,
  getEUTaxConfig,
  getAllEUCountries
} from './eu-tax-data';

// Country tax systems
export type Country = 
  | 'USA'
  | 'UK'
  | 'Canada'
  | 'Germany'
  | 'France'
  | 'Australia'
  | 'Japan'
  | 'Singapore'
  | 'UAE'
  | 'Switzerland'
  | 'Netherlands'
  | 'Spain'
  | 'Italy'
  | 'Greece'
  | 'Portugal'
  | 'Brazil'
  | 'Mexico'
  | 'India'
  | 'China'
  | 'South Korea'
  | 'New Zealand'
  | 'Belgium'
  | 'Sweden'
  | 'Norway'
  | 'Denmark'
  | 'Finland'
  | 'Austria'
  | 'Poland'
  | 'Czech Republic'
  | 'Ireland'
  | 'Israel'
  | 'Turkey'
  | 'Thailand'
  | 'Malaysia'
  | 'Indonesia'
  | 'Philippines'
  | 'Vietnam'
  | 'Argentina'
  | 'Chile'
  | 'Colombia'
  | 'Peru';

// Company types
export type CompanyType = 
  | 'individual'
  | 'sole_proprietor'
  | 'llc'
  | 'corporation'
  | 's_corporation'
  | 'partnership'
  | 'ltd'
  | 'gmbh'
  | 'sarl'
  | 'pty_ltd'
  | 'kk'
  | 'pte_ltd';

// Income types
export type IncomeType = 
  | 'salary'
  | 'capital_gains'
  | 'dividends'
  | 'rental'
  | 'business'
  | 'freelance'
  | 'crypto'
  | 'stocks'
  | 'side_hustle'
  | 'royalties'
  | 'investment_income'
  | 'alimony'
  | 'pension'
  | 'social_security'
  | 'consulting'
  | 'commission'
  | 'bonus'
  | 'interest'
  | 'trust_income'
  | 'annuity'
  | 'disability'
  | 'unemployment'
  | 'lottery_winnings'
  | 'inheritance'
  | 'gifts'
  | 'tips'
  | 'self_employment'
  | 'partnership_income'
  | 'foreign_income'
  | 'custom';

// Tax treatment for income types
export type TaxTreatment = 
  | 'ordinary_income'
  | 'capital_gains'
  | 'qualified_dividends'
  | 'passive_income'
  | 'business_income'
  | 'exempt'
  | 'preferential';

// Custom income source interface
export interface CustomIncomeSource {
  id: string;
  label: string;
  amount: number;
  incomeType: IncomeType;
  taxTreatment: TaxTreatment;
  notes?: string;
}

// Tax bracket interface
export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
}

// Country tax configuration
export interface CountryTaxConfig {
  country: Country;
  currency: string;
  currencySymbol: string;
  incomeTaxBrackets: TaxBracket[];
  capitalGainsTax: {
    shortTerm: number; // < 1 year
    longTerm: number;  // >= 1 year
  };
  dividendTax: number;
  vatGst: number; // VAT/GST rate
  socialSecurity?: {
    employee: number;
    employer: number;
    cap?: number;
  };
  deductions: {
    standard: number;
    personalAllowance: number;
  };
}

// Company type tax rules
export interface CompanyTaxRules {
  companyType: CompanyType;
  corporateTaxRate: number;
  ownerSalaryTaxable: boolean;
  profitDistributionTax: number;
  allowsPassThrough: boolean; // Pass-through taxation
  deductibleExpenses: string[];
}

// Tax data by country
export const TAX_CONFIGS: Record<Country, CountryTaxConfig> = {
  USA: {
    country: 'USA',
    currency: 'USD',
    currencySymbol: '$',
    incomeTaxBrackets: [
      { min: 0, max: 11000, rate: 10 },
      { min: 11000, max: 44725, rate: 12 },
      { min: 44725, max: 95375, rate: 22 },
      { min: 95375, max: 182100, rate: 24 },
      { min: 182100, max: 231250, rate: 32 },
      { min: 231250, max: 578125, rate: 35 },
      { min: 578125, max: null, rate: 37 }
    ],
    capitalGainsTax: {
      shortTerm: 37, // Taxed as ordinary income
      longTerm: 20   // 0%, 15%, or 20% based on income
    },
    dividendTax: 20, // Qualified dividends
    vatGst: 0, // No federal VAT, state sales tax varies
    socialSecurity: {
      employee: 7.65,
      employer: 7.65,
      cap: 160200
    },
    deductions: {
      standard: 13850,
      personalAllowance: 0
    }
  },
  UK: {
    country: 'UK',
    currency: 'GBP',
    currencySymbol: '£',
    incomeTaxBrackets: [
      { min: 0, max: 12570, rate: 0 },      // Personal allowance
      { min: 12570, max: 50270, rate: 20 },  // Basic rate
      { min: 50270, max: 125140, rate: 40 }, // Higher rate
      { min: 125140, max: null, rate: 45 }   // Additional rate
    ],
    capitalGainsTax: {
      shortTerm: 20,
      longTerm: 20
    },
    dividendTax: 39.35, // Higher rate + dividend tax
    vatGst: 20,
    socialSecurity: {
      employee: 12,
      employer: 13.8
    },
    deductions: {
      standard: 0,
      personalAllowance: 12570
    }
  },
  Canada: {
    country: 'Canada',
    currency: 'CAD',
    currencySymbol: '$',
    incomeTaxBrackets: [
      { min: 0, max: 53359, rate: 15 },
      { min: 53359, max: 106717, rate: 20.5 },
      { min: 106717, max: 165430, rate: 26 },
      { min: 165430, max: 235675, rate: 29 },
      { min: 235675, max: null, rate: 33 }
    ],
    capitalGainsTax: {
      shortTerm: 26.5, // 50% of gains taxed at marginal rate
      longTerm: 13.25  // 50% inclusion rate
    },
    dividendTax: 25.38,
    vatGst: 5, // Federal GST only
    socialSecurity: {
      employee: 5.95,
      employer: 5.95,
      cap: 66600
    },
    deductions: {
      standard: 15000,
      personalAllowance: 15000
    }
  },
  Germany: {
    country: 'Germany',
    currency: 'EUR',
    currencySymbol: '€',
    incomeTaxBrackets: [
      { min: 0, max: 11604, rate: 0 },
      { min: 11604, max: 17005, rate: 14 },
      { min: 17005, max: 66760, rate: 24 },
      { min: 66760, max: 277825, rate: 42 },
      { min: 277825, max: null, rate: 45 }
    ],
    capitalGainsTax: {
      shortTerm: 26.375,
      longTerm: 26.375 // Flat 25% + solidarity surcharge
    },
    dividendTax: 26.375,
    vatGst: 19,
    socialSecurity: {
      employee: 20.3,
      employer: 19.7
    },
    deductions: {
      standard: 1230,
      personalAllowance: 11604
    }
  },
  France: {
    country: 'France',
    currency: 'EUR',
    currencySymbol: '€',
    incomeTaxBrackets: [
      { min: 0, max: 11294, rate: 0 },
      { min: 11294, max: 28797, rate: 11 },
      { min: 28797, max: 82341, rate: 30 },
      { min: 82341, max: 177106, rate: 41 },
      { min: 177106, max: null, rate: 45 }
    ],
    capitalGainsTax: {
      shortTerm: 30,
      longTerm: 30 // Flat tax (PFU)
    },
    dividendTax: 30,
    vatGst: 20,
    socialSecurity: {
      employee: 22,
      employer: 45
    },
    deductions: {
      standard: 0,
      personalAllowance: 11294
    }
  },
  Australia: {
    country: 'Australia',
    currency: 'AUD',
    currencySymbol: '$',
    incomeTaxBrackets: [
      { min: 0, max: 18200, rate: 0 },
      { min: 18200, max: 45000, rate: 19 },
      { min: 45000, max: 120000, rate: 32.5 },
      { min: 120000, max: 180000, rate: 37 },
      { min: 180000, max: null, rate: 45 }
    ],
    capitalGainsTax: {
      shortTerm: 37,  // Taxed at marginal rate
      longTerm: 18.5  // 50% discount
    },
    dividendTax: 30, // Franking credits available
    vatGst: 10,
    socialSecurity: {
      employee: 11.5, // Superannuation
      employer: 11.5
    },
    deductions: {
      standard: 0,
      personalAllowance: 18200
    }
  },
  Japan: {
    country: 'Japan',
    currency: 'JPY',
    currencySymbol: '¥',
    incomeTaxBrackets: [
      { min: 0, max: 1950000, rate: 5 },
      { min: 1950000, max: 3300000, rate: 10 },
      { min: 3300000, max: 6950000, rate: 20 },
      { min: 6950000, max: 9000000, rate: 23 },
      { min: 9000000, max: 18000000, rate: 33 },
      { min: 18000000, max: 40000000, rate: 40 },
      { min: 40000000, max: null, rate: 45 }
    ],
    capitalGainsTax: {
      shortTerm: 20.315,
      longTerm: 20.315 // Flat 20.315%
    },
    dividendTax: 20.315,
    vatGst: 10, // Consumption tax
    socialSecurity: {
      employee: 15.5,
      employer: 15.5
    },
    deductions: {
      standard: 480000,
      personalAllowance: 480000
    }
  },
  Singapore: {
    country: 'Singapore',
    currency: 'SGD',
    currencySymbol: '$',
    incomeTaxBrackets: [
      { min: 0, max: 20000, rate: 0 },
      { min: 20000, max: 30000, rate: 2 },
      { min: 30000, max: 40000, rate: 3.5 },
      { min: 40000, max: 80000, rate: 7 },
      { min: 80000, max: 120000, rate: 11.5 },
      { min: 120000, max: 160000, rate: 15 },
      { min: 160000, max: 200000, rate: 18 },
      { min: 200000, max: 240000, rate: 19 },
      { min: 240000, max: 280000, rate: 19.5 },
      { min: 280000, max: 320000, rate: 20 },
      { min: 320000, max: 500000, rate: 22 },
      { min: 500000, max: 1000000, rate: 23 },
      { min: 1000000, max: null, rate: 24 }
    ],
    capitalGainsTax: {
      shortTerm: 0, // No capital gains tax
      longTerm: 0
    },
    dividendTax: 0, // One-tier tax system
    vatGst: 9,
    socialSecurity: {
      employee: 20, // CPF
      employer: 17
    },
    deductions: {
      standard: 0,
      personalAllowance: 20000
    }
  },
  UAE: {
    country: 'UAE',
    currency: 'AED',
    currencySymbol: 'د.إ',
    incomeTaxBrackets: [
      { min: 0, max: null, rate: 0 } // No personal income tax
    ],
    capitalGainsTax: {
      shortTerm: 0,
      longTerm: 0
    },
    dividendTax: 0,
    vatGst: 5,
    socialSecurity: {
      employee: 5,  // For UAE nationals only
      employer: 12.5
    },
    deductions: {
      standard: 0,
      personalAllowance: 0
    }
  },
  Switzerland: {
    country: 'Switzerland',
    currency: 'CHF',
    currencySymbol: 'Fr',
    incomeTaxBrackets: [
      { min: 0, max: 17800, rate: 0 },
      { min: 17800, max: 31600, rate: 0.77 },
      { min: 31600, max: 41400, rate: 0.88 },
      { min: 41400, max: 55200, rate: 2.64 },
      { min: 55200, max: 72500, rate: 2.97 },
      { min: 72500, max: 78100, rate: 5.94 },
      { min: 78100, max: 103600, rate: 6.6 },
      { min: 103600, max: 134600, rate: 8.8 },
      { min: 134600, max: 176000, rate: 11 },
      { min: 176000, max: 755200, rate: 13.2 },
      { min: 755200, max: null, rate: 11.5 }
    ],
    capitalGainsTax: {
      shortTerm: 0, // Taxed as income
      longTerm: 0   // No capital gains tax for individuals
    },
    dividendTax: 0, // Included in income tax
    vatGst: 8.1,
    socialSecurity: {
      employee: 10.6,
      employer: 10.6
    },
    deductions: {
      standard: 0,
      personalAllowance: 17800
    }
  },
  Netherlands: {
    country: 'Netherlands',
    currency: 'EUR',
    currencySymbol: '€',
    incomeTaxBrackets: [
      { min: 0, max: 73031, rate: 36.97 },
      { min: 73031, max: null, rate: 49.5 }
    ],
    capitalGainsTax: {
      shortTerm: 32, // Deemed return taxation
      longTerm: 32
    },
    dividendTax: 26.9,
    vatGst: 21,
    socialSecurity: {
      employee: 27.65,
      employer: 20
    },
    deductions: {
      standard: 2888,
      personalAllowance: 0
    }
  },
  Spain: {
    country: 'Spain',
    currency: 'EUR',
    currencySymbol: '€',
    incomeTaxBrackets: [
      { min: 0, max: 12450, rate: 19 },
      { min: 12450, max: 20200, rate: 24 },
      { min: 20200, max: 35200, rate: 30 },
      { min: 35200, max: 60000, rate: 37 },
      { min: 60000, max: 300000, rate: 45 },
      { min: 300000, max: null, rate: 47 }
    ],
    capitalGainsTax: {
      shortTerm: 26,
      longTerm: 26 // Separate scale: 19-26%
    },
    dividendTax: 26,
    vatGst: 21,
    socialSecurity: {
      employee: 6.35,
      employer: 29.9
    },
    deductions: {
      standard: 5550,
      personalAllowance: 5550
    }
  },
  Italy: {
    country: 'Italy',
    currency: 'EUR',
    currencySymbol: '€',
    incomeTaxBrackets: [
      { min: 0, max: 15000, rate: 23 },
      { min: 15000, max: 28000, rate: 25 },
      { min: 28000, max: 50000, rate: 35 },
      { min: 50000, max: null, rate: 43 }
    ],
    capitalGainsTax: {
      shortTerm: 26,
      longTerm: 26
    },
    dividendTax: 26,
    vatGst: 22,
    socialSecurity: {
      employee: 9.19,
      employer: 30
    },
    deductions: {
      standard: 0,
      personalAllowance: 8000
    }
  },
  Greece: {
    country: 'Greece',
    currency: 'EUR',
    currencySymbol: '€',
    incomeTaxBrackets: [
      { min: 0, max: 10000, rate: 9 },
      { min: 10000, max: 20000, rate: 22 },
      { min: 20000, max: 30000, rate: 28 },
      { min: 30000, max: 40000, rate: 36 },
      { min: 40000, max: null, rate: 44 }
    ],
    capitalGainsTax: {
      shortTerm: 15,
      longTerm: 15
    },
    dividendTax: 5,
    vatGst: 24,
    socialSecurity: {
      employee: 16,
      employer: 24.81
    },
    deductions: {
      standard: 0,
      personalAllowance: 10000
    }
  },
  Portugal: {
    country: 'Portugal',
    currency: 'EUR',
    currencySymbol: '€',
    incomeTaxBrackets: [
      { min: 0, max: 7479, rate: 14.5 },
      { min: 7479, max: 11284, rate: 23 },
      { min: 11284, max: 15992, rate: 26.5 },
      { min: 15992, max: 20700, rate: 28.5 },
      { min: 20700, max: 26355, rate: 35 },
      { min: 26355, max: 38632, rate: 37 },
      { min: 38632, max: 50483, rate: 43.5 },
      { min: 50483, max: 78834, rate: 45 },
      { min: 78834, max: null, rate: 48 }
    ],
    capitalGainsTax: {
      shortTerm: 28,
      longTerm: 28
    },
    dividendTax: 28,
    vatGst: 23,
    socialSecurity: {
      employee: 11,
      employer: 23.75
    },
    deductions: {
      standard: 4104,
      personalAllowance: 0
    }
  },
  Brazil: {
    country: 'Brazil',
    currency: 'BRL',
    currencySymbol: 'R$',
    incomeTaxBrackets: [
      { min: 0, max: 24511.92, rate: 0 },
      { min: 24511.92, max: 33919.80, rate: 7.5 },
      { min: 33919.80, max: 45012.60, rate: 15 },
      { min: 45012.60, max: 55976.16, rate: 22.5 },
      { min: 55976.16, max: null, rate: 27.5 }
    ],
    capitalGainsTax: {
      shortTerm: 15,
      longTerm: 15
    },
    dividendTax: 0, // Exempt (paid at corporate level)
    vatGst: 17, // ICMS average
    socialSecurity: {
      employee: 14,
      employer: 20,
      cap: 7507.49
    },
    deductions: {
      standard: 2259.20,
      personalAllowance: 24511.92
    }
  },
  Mexico: {
    country: 'Mexico',
    currency: 'MXN',
    currencySymbol: '$',
    incomeTaxBrackets: [
      { min: 0, max: 8952.49, rate: 1.92 },
      { min: 8952.49, max: 75984.55, rate: 6.40 },
      { min: 75984.55, max: 133536.07, rate: 10.88 },
      { min: 133536.07, max: 155229.80, rate: 16.00 },
      { min: 155229.80, max: 185852.57, rate: 17.92 },
      { min: 185852.57, max: 374837.88, rate: 21.36 },
      { min: 374837.88, max: 590795.99, rate: 23.52 },
      { min: 590795.99, max: 1127926.84, rate: 30.00 },
      { min: 1127926.84, max: 1503902.46, rate: 32.00 },
      { min: 1503902.46, max: 4511707.37, rate: 34.00 },
      { min: 4511707.37, max: null, rate: 35.00 }
    ],
    capitalGainsTax: {
      shortTerm: 35,
      longTerm: 35
    },
    dividendTax: 10,
    vatGst: 16,
    socialSecurity: {
      employee: 2.375,
      employer: 20.4
    },
    deductions: {
      standard: 0,
      personalAllowance: 8952.49
    }
  },
  India: {
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    incomeTaxBrackets: [
      { min: 0, max: 300000, rate: 0 },
      { min: 300000, max: 600000, rate: 5 },
      { min: 600000, max: 900000, rate: 10 },
      { min: 900000, max: 1200000, rate: 15 },
      { min: 1200000, max: 1500000, rate: 20 },
      { min: 1500000, max: null, rate: 30 }
    ],
    capitalGainsTax: {
      shortTerm: 15, // Securities, 30% for other assets
      longTerm: 10  // Above ₹1 lakh
    },
    dividendTax: 10,
    vatGst: 18, // GST
    socialSecurity: {
      employee: 12, // EPF
      employer: 13.61
    },
    deductions: {
      standard: 50000,
      personalAllowance: 300000
    }
  },
  China: {
    country: 'China',
    currency: 'CNY',
    currencySymbol: '¥',
    incomeTaxBrackets: [
      { min: 0, max: 36000, rate: 3 },
      { min: 36000, max: 144000, rate: 10 },
      { min: 144000, max: 300000, rate: 20 },
      { min: 300000, max: 420000, rate: 25 },
      { min: 420000, max: 660000, rate: 30 },
      { min: 660000, max: 960000, rate: 35 },
      { min: 960000, max: null, rate: 45 }
    ],
    capitalGainsTax: {
      shortTerm: 20,
      longTerm: 20
    },
    dividendTax: 20,
    vatGst: 13,
    socialSecurity: {
      employee: 10.5,
      employer: 32
    },
    deductions: {
      standard: 60000,
      personalAllowance: 60000
    }
  },
  'South Korea': {
    country: 'South Korea',
    currency: 'KRW',
    currencySymbol: '₩',
    incomeTaxBrackets: [
      { min: 0, max: 14000000, rate: 6 },
      { min: 14000000, max: 50000000, rate: 15 },
      { min: 50000000, max: 88000000, rate: 24 },
      { min: 88000000, max: 150000000, rate: 35 },
      { min: 150000000, max: 300000000, rate: 38 },
      { min: 300000000, max: 500000000, rate: 40 },
      { min: 500000000, max: 1000000000, rate: 42 },
      { min: 1000000000, max: null, rate: 45 }
    ],
    capitalGainsTax: {
      shortTerm: 22,
      longTerm: 22
    },
    dividendTax: 14,
    vatGst: 10,
    socialSecurity: {
      employee: 9.5,
      employer: 9.5
    },
    deductions: {
      standard: 1500000,
      personalAllowance: 1500000
    }
  },
  'New Zealand': {
    country: 'New Zealand',
    currency: 'NZD',
    currencySymbol: '$',
    incomeTaxBrackets: [
      { min: 0, max: 14000, rate: 10.5 },
      { min: 14000, max: 48000, rate: 17.5 },
      { min: 48000, max: 70000, rate: 30 },
      { min: 70000, max: 180000, rate: 33 },
      { min: 180000, max: null, rate: 39 }
    ],
    capitalGainsTax: {
      shortTerm: 0, // No CGT except for traders
      longTerm: 0
    },
    dividendTax: 33,
    vatGst: 15,
    socialSecurity: {
      employee: 0, // No separate social security
      employer: 0
    },
    deductions: {
      standard: 0,
      personalAllowance: 0
    }
  },
  Belgium: {
    country: 'Belgium',
    currency: 'EUR',
    currencySymbol: '€',
    incomeTaxBrackets: [
      { min: 0, max: 15200, rate: 25 },
      { min: 15200, max: 26830, rate: 40 },
      { min: 26830, max: 46440, rate: 45 },
      { min: 46440, max: null, rate: 50 }
    ],
    capitalGainsTax: {
      shortTerm: 33,
      longTerm: 0 // Usually exempt for individuals
    },
    dividendTax: 30,
    vatGst: 21,
    socialSecurity: {
      employee: 13.07,
      employer: 25
    },
    deductions: {
      standard: 0,
      personalAllowance: 10160
    }
  },
  Sweden: {
    country: 'Sweden',
    currency: 'SEK',
    currencySymbol: 'kr',
    incomeTaxBrackets: [
      { min: 0, max: 598500, rate: 32 },
      { min: 598500, max: null, rate: 52 } // 32% + 20% state tax
    ],
    capitalGainsTax: {
      shortTerm: 30,
      longTerm: 30
    },
    dividendTax: 30,
    vatGst: 25,
    socialSecurity: {
      employee: 7,
      employer: 31.42
    },
    deductions: {
      standard: 14000,
      personalAllowance: 0
    }
  },
  Norway: {
    country: 'Norway',
    currency: 'NOK',
    currencySymbol: 'kr',
    incomeTaxBrackets: [
      { min: 0, max: 198350, rate: 22 },
      { min: 198350, max: 267900, rate: 23.5 },
      { min: 267900, max: 643800, rate: 25.1 },
      { min: 643800, max: 1099250, rate: 27.7 },
      { min: 1099250, max: null, rate: 29.4 }
    ],
    capitalGainsTax: {
      shortTerm: 22,
      longTerm: 22
    },
    dividendTax: 22,
    vatGst: 25,
    socialSecurity: {
      employee: 8.2,
      employer: 14.1
    },
    deductions: {
      standard: 104450,
      personalAllowance: 0
    }
  },
  Denmark: {
    country: 'Denmark',
    currency: 'DKK',
    currencySymbol: 'kr',
    incomeTaxBrackets: [
      { min: 0, max: 568900, rate: 37.48 },
      { min: 568900, max: null, rate: 52.07 } // Includes municipal tax
    ],
    capitalGainsTax: {
      shortTerm: 42,
      longTerm: 42 // Or 27% for low gains
    },
    dividendTax: 42,
    vatGst: 25,
    socialSecurity: {
      employee: 8,
      employer: 0
    },
    deductions: {
      standard: 48000,
      personalAllowance: 48000
    }
  },
  Finland: {
    country: 'Finland',
    currency: 'EUR',
    currencySymbol: '€',
    incomeTaxBrackets: [
      { min: 0, max: 19900, rate: 12.64 },
      { min: 19900, max: 29700, rate: 19.25 },
      { min: 29700, max: 49000, rate: 30.25 },
      { min: 49000, max: 85800, rate: 34 },
      { min: 85800, max: null, rate: 44 }
    ],
    capitalGainsTax: {
      shortTerm: 30,
      longTerm: 34 // Above €30,000
    },
    dividendTax: 25.5, // Listed companies
    vatGst: 24,
    socialSecurity: {
      employee: 9.48,
      employer: 23.86
    },
    deductions: {
      standard: 0,
      personalAllowance: 0
    }
  },
  Austria: {
    country: 'Austria',
    currency: 'EUR',
    currencySymbol: '€',
    incomeTaxBrackets: [
      { min: 0, max: 12816, rate: 0 },
      { min: 12816, max: 20818, rate: 20 },
      { min: 20818, max: 34513, rate: 30 },
      { min: 34513, max: 66612, rate: 41 },
      { min: 66612, max: 99266, rate: 48 },
      { min: 99266, max: 1000000, rate: 50 },
      { min: 1000000, max: null, rate: 55 }
    ],
    capitalGainsTax: {
      shortTerm: 27.5,
      longTerm: 27.5
    },
    dividendTax: 27.5,
    vatGst: 20,
    socialSecurity: {
      employee: 18.12,
      employer: 21.23
    },
    deductions: {
      standard: 0,
      personalAllowance: 12816
    }
  },
  Poland: {
    country: 'Poland',
    currency: 'PLN',
    currencySymbol: 'zł',
    incomeTaxBrackets: [
      { min: 0, max: 120000, rate: 12 },
      { min: 120000, max: null, rate: 32 }
    ],
    capitalGainsTax: {
      shortTerm: 19,
      longTerm: 19
    },
    dividendTax: 19,
    vatGst: 23,
    socialSecurity: {
      employee: 13.71,
      employer: 19.48
    },
    deductions: {
      standard: 30000,
      personalAllowance: 30000
    }
  },
  'Czech Republic': {
    country: 'Czech Republic',
    currency: 'CZK',
    currencySymbol: 'Kč',
    incomeTaxBrackets: [
      { min: 0, max: null, rate: 15 } // Flat tax
    ],
    capitalGainsTax: {
      shortTerm: 15,
      longTerm: 0 // Exempt after 3 years
    },
    dividendTax: 15,
    vatGst: 21,
    socialSecurity: {
      employee: 11,
      employer: 33.8
    },
    deductions: {
      standard: 30840,
      personalAllowance: 30840
    }
  },
  Ireland: {
    country: 'Ireland',
    currency: 'EUR',
    currencySymbol: '€',
    incomeTaxBrackets: [
      { min: 0, max: 40000, rate: 20 },
      { min: 40000, max: null, rate: 40 }
    ],
    capitalGainsTax: {
      shortTerm: 33,
      longTerm: 33
    },
    dividendTax: 51, // Taxed as income
    vatGst: 23,
    socialSecurity: {
      employee: 4,
      employer: 11.05
    },
    deductions: {
      standard: 1775,
      personalAllowance: 1775
    }
  },
  Israel: {
    country: 'Israel',
    currency: 'ILS',
    currencySymbol: '₪',
    incomeTaxBrackets: [
      { min: 0, max: 77400, rate: 10 },
      { min: 77400, max: 110880, rate: 14 },
      { min: 110880, max: 178080, rate: 20 },
      { min: 178080, max: 247440, rate: 31 },
      { min: 247440, max: 514920, rate: 35 },
      { min: 514920, max: 721560, rate: 47 },
      { min: 721560, max: null, rate: 50 }
    ],
    capitalGainsTax: {
      shortTerm: 25,
      longTerm: 25
    },
    dividendTax: 30,
    vatGst: 17,
    socialSecurity: {
      employee: 7,
      employer: 7.6
    },
    deductions: {
      standard: 33720,
      personalAllowance: 33720
    }
  },
  Turkey: {
    country: 'Turkey',
    currency: 'TRY',
    currencySymbol: '₺',
    incomeTaxBrackets: [
      { min: 0, max: 70000, rate: 15 },
      { min: 70000, max: 150000, rate: 20 },
      { min: 150000, max: 550000, rate: 27 },
      { min: 550000, max: 1900000, rate: 35 },
      { min: 1900000, max: null, rate: 40 }
    ],
    capitalGainsTax: {
      shortTerm: 40,
      longTerm: 0 // Exempt after 2 years
    },
    dividendTax: 10,
    vatGst: 20,
    socialSecurity: {
      employee: 14,
      employer: 20.5
    },
    deductions: {
      standard: 0,
      personalAllowance: 70000
    }
  },
  Thailand: {
    country: 'Thailand',
    currency: 'THB',
    currencySymbol: '฿',
    incomeTaxBrackets: [
      { min: 0, max: 150000, rate: 0 },
      { min: 150000, max: 300000, rate: 5 },
      { min: 300000, max: 500000, rate: 10 },
      { min: 500000, max: 750000, rate: 15 },
      { min: 750000, max: 1000000, rate: 20 },
      { min: 1000000, max: 2000000, rate: 25 },
      { min: 2000000, max: 5000000, rate: 30 },
      { min: 5000000, max: null, rate: 35 }
    ],
    capitalGainsTax: {
      shortTerm: 15,
      longTerm: 0 // Exempt for securities
    },
    dividendTax: 10,
    vatGst: 7,
    socialSecurity: {
      employee: 5,
      employer: 5
    },
    deductions: {
      standard: 60000,
      personalAllowance: 150000
    }
  },
  Malaysia: {
    country: 'Malaysia',
    currency: 'MYR',
    currencySymbol: 'RM',
    incomeTaxBrackets: [
      { min: 0, max: 5000, rate: 0 },
      { min: 5000, max: 20000, rate: 1 },
      { min: 20000, max: 35000, rate: 3 },
      { min: 35000, max: 50000, rate: 8 },
      { min: 50000, max: 70000, rate: 14 },
      { min: 70000, max: 100000, rate: 21 },
      { min: 100000, max: 400000, rate: 24 },
      { min: 400000, max: 600000, rate: 24.5 },
      { min: 600000, max: 1000000, rate: 25 },
      { min: 1000000, max: null, rate: 30 }
    ],
    capitalGainsTax: {
      shortTerm: 0, // No CGT
      longTerm: 0
    },
    dividendTax: 0, // Single tier system
    vatGst: 0, // No GST currently
    socialSecurity: {
      employee: 11, // EPF
      employer: 13
    },
    deductions: {
      standard: 9000,
      personalAllowance: 9000
    }
  },
  Indonesia: {
    country: 'Indonesia',
    currency: 'IDR',
    currencySymbol: 'Rp',
    incomeTaxBrackets: [
      { min: 0, max: 60000000, rate: 5 },
      { min: 60000000, max: 250000000, rate: 15 },
      { min: 250000000, max: 500000000, rate: 25 },
      { min: 500000000, max: 5000000000, rate: 30 },
      { min: 5000000000, max: null, rate: 35 }
    ],
    capitalGainsTax: {
      shortTerm: 0.1, // 0.1% final tax for stocks
      longTerm: 0.1
    },
    dividendTax: 10,
    vatGst: 11,
    socialSecurity: {
      employee: 6.24,
      employer: 10.24
    },
    deductions: {
      standard: 54000000,
      personalAllowance: 54000000
    }
  },
  Philippines: {
    country: 'Philippines',
    currency: 'PHP',
    currencySymbol: '₱',
    incomeTaxBrackets: [
      { min: 0, max: 250000, rate: 0 },
      { min: 250000, max: 400000, rate: 15 },
      { min: 400000, max: 800000, rate: 20 },
      { min: 800000, max: 2000000, rate: 25 },
      { min: 2000000, max: 8000000, rate: 30 },
      { min: 8000000, max: null, rate: 35 }
    ],
    capitalGainsTax: {
      shortTerm: 15,
      longTerm: 6 // For real property
    },
    dividendTax: 10,
    vatGst: 12,
    socialSecurity: {
      employee: 4.5, // SSS
      employer: 9.5
    },
    deductions: {
      standard: 0,
      personalAllowance: 250000
    }
  },
  Vietnam: {
    country: 'Vietnam',
    currency: 'VND',
    currencySymbol: '₫',
    incomeTaxBrackets: [
      { min: 0, max: 60000000, rate: 5 },
      { min: 60000000, max: 120000000, rate: 10 },
      { min: 120000000, max: 216000000, rate: 15 },
      { min: 216000000, max: 384000000, rate: 20 },
      { min: 384000000, max: 624000000, rate: 25 },
      { min: 624000000, max: 960000000, rate: 30 },
      { min: 960000000, max: null, rate: 35 }
    ],
    capitalGainsTax: {
      shortTerm: 0.1, // 0.1% for securities transfer
      longTerm: 0.1
    },
    dividendTax: 5,
    vatGst: 10,
    socialSecurity: {
      employee: 10.5,
      employer: 21.5
    },
    deductions: {
      standard: 11000000,
      personalAllowance: 11000000
    }
  },
  Argentina: {
    country: 'Argentina',
    currency: 'ARS',
    currencySymbol: '$',
    incomeTaxBrackets: [
      { min: 0, max: 487380, rate: 5 },
      { min: 487380, max: 974760, rate: 9 },
      { min: 974760, max: 1462140, rate: 12 },
      { min: 1462140, max: 1949520, rate: 15 },
      { min: 1949520, max: 2436900, rate: 19 },
      { min: 2436900, max: 3411660, rate: 23 },
      { min: 3411660, max: 5361180, rate: 27 },
      { min: 5361180, max: 7310700, rate: 31 },
      { min: 7310700, max: null, rate: 35 }
    ],
    capitalGainsTax: {
      shortTerm: 15,
      longTerm: 15
    },
    dividendTax: 7,
    vatGst: 21,
    socialSecurity: {
      employee: 17,
      employer: 21.17
    },
    deductions: {
      standard: 487380,
      personalAllowance: 487380
    }
  },
  Chile: {
    country: 'Chile',
    currency: 'CLP',
    currencySymbol: '$',
    incomeTaxBrackets: [
      { min: 0, max: 8038512, rate: 0 },
      { min: 8038512, max: 17863359, rate: 4 },
      { min: 17863359, max: 29772265, rate: 8 },
      { min: 29772265, max: 41681171, rate: 13.5 },
      { min: 41681171, max: 53590077, rate: 23 },
      { min: 53590077, max: 71453436, rate: 30.4 },
      { min: 71453436, max: 178633588, rate: 35.5 },
      { min: 178633588, max: null, rate: 40 }
    ],
    capitalGainsTax: {
      shortTerm: 40,
      longTerm: 10 // For stocks after 1 year
    },
    dividendTax: 0, // Integrated with income tax
    vatGst: 19,
    socialSecurity: {
      employee: 10,
      employer: 0 // Paid by employee
    },
    deductions: {
      standard: 0,
      personalAllowance: 8038512
    }
  },
  Colombia: {
    country: 'Colombia',
    currency: 'COP',
    currencySymbol: '$',
    incomeTaxBrackets: [
      { min: 0, max: 52229000, rate: 0 },
      { min: 52229000, max: 81642000, rate: 19 },
      { min: 81642000, max: 131055000, rate: 28 },
      { min: 131055000, max: 196593000, rate: 33 },
      { min: 196593000, max: 327655000, rate: 35 },
      { min: 327655000, max: 523717000, rate: 37 },
      { min: 523717000, max: null, rate: 39 }
    ],
    capitalGainsTax: {
      shortTerm: 15,
      longTerm: 10
    },
    dividendTax: 10,
    vatGst: 19,
    socialSecurity: {
      employee: 4,
      employer: 20.5
    },
    deductions: {
      standard: 0,
      personalAllowance: 52229000
    }
  },
  Peru: {
    country: 'Peru',
    currency: 'PEN',
    currencySymbol: 'S/',
    incomeTaxBrackets: [
      { min: 0, max: 31250, rate: 8 },
      { min: 31250, max: 62500, rate: 14 },
      { min: 62500, max: 125000, rate: 17 },
      { min: 125000, max: 200000, rate: 20 },
      { min: 200000, max: null, rate: 30 }
    ],
    capitalGainsTax: {
      shortTerm: 5,
      longTerm: 5
    },
    dividendTax: 5,
    vatGst: 18,
    socialSecurity: {
      employee: 13,
      employer: 9
    },
    deductions: {
      standard: 31250,
      personalAllowance: 31250
    }
  }
};

// Company tax rules by type
export const COMPANY_TAX_RULES: Record<string, CompanyTaxRules> = {
  individual: {
    companyType: 'individual',
    corporateTaxRate: 0,
    ownerSalaryTaxable: true,
    profitDistributionTax: 0,
    allowsPassThrough: true,
    deductibleExpenses: ['home_office', 'equipment', 'software']
  },
  sole_proprietor: {
    companyType: 'sole_proprietor',
    corporateTaxRate: 0,
    ownerSalaryTaxable: true,
    profitDistributionTax: 0,
    allowsPassThrough: true,
    deductibleExpenses: ['business_expenses', 'equipment', 'office', 'travel', 'marketing']
  },
  llc: {
    companyType: 'llc',
    corporateTaxRate: 0, // Pass-through by default
    ownerSalaryTaxable: true,
    profitDistributionTax: 0,
    allowsPassThrough: true,
    deductibleExpenses: ['all_business_expenses', 'salaries', 'rent', 'equipment', 'marketing', 'R&D']
  },
  corporation: {
    companyType: 'corporation',
    corporateTaxRate: 21, // US federal corporate tax
    ownerSalaryTaxable: true,
    profitDistributionTax: 20, // Dividend tax
    allowsPassThrough: false,
    deductibleExpenses: ['all_business_expenses', 'salaries', 'benefits', 'R&D', 'depreciation']
  },
  s_corporation: {
    companyType: 's_corporation',
    corporateTaxRate: 0, // Pass-through
    ownerSalaryTaxable: true,
    profitDistributionTax: 0,
    allowsPassThrough: true,
    deductibleExpenses: ['all_business_expenses', 'reasonable_salaries', 'benefits']
  },
  partnership: {
    companyType: 'partnership',
    corporateTaxRate: 0,
    ownerSalaryTaxable: true,
    profitDistributionTax: 0,
    allowsPassThrough: true,
    deductibleExpenses: ['all_business_expenses', 'partner_draws']
  },
  ltd: {
    companyType: 'ltd',
    corporateTaxRate: 19, // UK corporate tax
    ownerSalaryTaxable: true,
    profitDistributionTax: 39.35, // UK dividend tax
    allowsPassThrough: false,
    deductibleExpenses: ['all_business_expenses', 'salaries', 'pensions', 'equipment']
  },
  gmbh: {
    companyType: 'gmbh',
    corporateTaxRate: 30, // Germany: 15% + solidarity + trade tax
    ownerSalaryTaxable: true,
    profitDistributionTax: 26.375,
    allowsPassThrough: false,
    deductibleExpenses: ['all_business_expenses', 'salaries', 'depreciation']
  },
  sarl: {
    companyType: 'sarl',
    corporateTaxRate: 25, // France corporate tax
    ownerSalaryTaxable: true,
    profitDistributionTax: 30,
    allowsPassThrough: false,
    deductibleExpenses: ['all_business_expenses', 'salaries', 'social_charges']
  },
  pty_ltd: {
    companyType: 'pty_ltd',
    corporateTaxRate: 25, // Australia corporate tax
    ownerSalaryTaxable: true,
    profitDistributionTax: 30,
    allowsPassThrough: false,
    deductibleExpenses: ['all_business_expenses', 'salaries', 'superannuation']
  },
  kk: {
    companyType: 'kk',
    corporateTaxRate: 30.62, // Japan: national + local
    ownerSalaryTaxable: true,
    profitDistributionTax: 20.315,
    allowsPassThrough: false,
    deductibleExpenses: ['all_business_expenses', 'salaries', 'depreciation']
  },
  pte_ltd: {
    companyType: 'pte_ltd',
    corporateTaxRate: 17, // Singapore corporate tax
    ownerSalaryTaxable: true,
    profitDistributionTax: 0, // No dividend tax
    allowsPassThrough: false,
    deductibleExpenses: ['all_business_expenses', 'salaries', 'CPF']
  }
};

/**
 * EU Tax Integration Helpers
 */

/**
 * Check if a country is an EU member state with enhanced tax data
 */
export function isEUCountry(country: Country): boolean {
  const euCountries = getAllEUCountries();
  return euCountries.includes(country as any);
}

/**
 * Get EU tax configuration for a country
 * Returns null if country is not in EU or not yet implemented
 */
export function getEUConfig(country: Country) {
  if (!isEUCountry(country)) return null;
  try {
    return getEUTaxConfig(country as any);
  } catch {
    return null;
  }
}

/**
 * Calculate tax using EU-enhanced data if available
 * Falls back to legacy calculation if EU data not available
 */
export function calculateTaxWithEUSupport(
  country: Country,
  employmentIncome: number,
  capitalGains: number = 0,
  dividends: number = 0
) {
  if (isEUCountry(country)) {
    try {
      // Use enhanced EU calculation
      return calculateEUIndividualTax(
        country as any,
        employmentIncome,
        capitalGains,
        dividends
      );
    } catch (error) {
      console.warn(`EU tax calculation failed for ${country}, falling back to legacy`, error);
    }
  }
  
  // Fall back to legacy calculation
  const config = TAX_CONFIGS[country];
  const incomeTaxResult = calculateIncomeTax(
    employmentIncome,
    config.incomeTaxBrackets,
    config.deductions.standard
  );
  
  return {
    incomeTax: incomeTaxResult.tax,
    socialSecurity: config.socialSecurity 
      ? (Math.min(employmentIncome, config.socialSecurity.cap || Infinity) * config.socialSecurity.employee) / 100
      : 0,
    capitalGainsTax: (capitalGains * config.capitalGainsTax.longTerm) / 100,
    dividendTax: (dividends * config.dividendTax) / 100,
    totalTax: 0, // Calculated below
    effectiveRate: 0, // Calculated below
    netIncome: 0 // Calculated below
  };
}

/**
 * Calculate income tax based on progressive tax brackets
 */
export function calculateIncomeTax(
  income: number,
  taxBrackets: TaxBracket[],
  deductions: number = 0
): { tax: number; effectiveRate: number; marginalRate: number; breakdown: { bracket: TaxBracket; taxInBracket: number }[] } {
  const taxableIncome = Math.max(0, income - deductions);
  let totalTax = 0;
  let marginalRate = 0;
  const breakdown: { bracket: TaxBracket; taxInBracket: number }[] = [];

  for (const bracket of taxBrackets) {
    if (taxableIncome <= bracket.min) break;

    const bracketMax = bracket.max || Infinity;
    const taxableInBracket = Math.min(taxableIncome, bracketMax) - bracket.min;
    
    if (taxableInBracket > 0) {
      const taxInBracket = (taxableInBracket * bracket.rate) / 100;
      totalTax += taxInBracket;
      marginalRate = bracket.rate;
      breakdown.push({ bracket, taxInBracket });
    }
  }

  const effectiveRate = income > 0 ? (totalTax / income) * 100 : 0;

  return {
    tax: totalTax,
    effectiveRate,
    marginalRate,
    breakdown
  };
}

/**
 * Calculate capital gains tax
 */
export function calculateCapitalGainsTax(
  gains: number,
  holdingPeriod: 'short' | 'long',
  country: Country
): { tax: number; rate: number } {
  const config = TAX_CONFIGS[country];
  const rate = holdingPeriod === 'short' ? config.capitalGainsTax.shortTerm : config.capitalGainsTax.longTerm;
  const tax = (gains * rate) / 100;

  return { tax, rate };
}

/**
 * Calculate total tax liability including all sources
 */
export interface TaxCalculationInput {
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
}

export interface TaxCalculationResult {
  country: Country;
  companyType: CompanyType;
  currencySymbol: string;
  
  // Income breakdown
  totalIncome: number;
  taxableIncome: number;
  
  // Tax calculations
  incomeTax: {
    amount: number;
    effectiveRate: number;
    marginalRate: number;
  };
  capitalGainsTax: {
    amount: number;
    rate: number;
  };
  dividendTax: {
    amount: number;
    rate: number;
  };
  corporateTax?: {
    amount: number;
    rate: number;
  };
  socialSecurity: {
    amount: number;
    rate: number;
  };
  vatGst: {
    rate: number;
  };
  
  // Totals
  totalTax: number;
  totalTaxRate: number;
  netIncome: number;
  
  // Optimization suggestions
  suggestions: string[];
}

export function calculateTotalTax(input: TaxCalculationInput): TaxCalculationResult {
  const countryConfig = TAX_CONFIGS[input.country];
  const companyRules = COMPANY_TAX_RULES[input.companyType];
  
  // Process custom income sources
  let customOrdinaryIncome = 0;
  let customCapitalGains = 0;
  let customDividends = 0;
  let customBusinessIncome = 0;
  let customExemptIncome = 0;

  if (input.customIncomeSources && input.customIncomeSources.length > 0) {
    for (const source of input.customIncomeSources) {
      switch (source.taxTreatment) {
        case 'ordinary_income':
          customOrdinaryIncome += source.amount;
          break;
        case 'capital_gains':
          customCapitalGains += source.amount;
          break;
        case 'qualified_dividends':
          customDividends += source.amount;
          break;
        case 'business_income':
          customBusinessIncome += source.amount;
          break;
        case 'exempt':
          customExemptIncome += source.amount;
          break;
        case 'passive_income':
          customOrdinaryIncome += source.amount;
          break;
        case 'preferential':
          // Treat as long-term capital gains
          customCapitalGains += source.amount;
          break;
      }
    }
  }
  
  // Calculate total income including custom sources
  const totalIncome = 
    input.salaryIncome + 
    input.businessIncome + 
    input.capitalGains.shortTerm + 
    input.capitalGains.longTerm + 
    input.dividends + 
    input.rentalIncome + 
    input.cryptoGains +
    customOrdinaryIncome +
    customCapitalGains +
    customDividends +
    customBusinessIncome +
    customExemptIncome;

  // Calculate deductions
  const standardDeduction = countryConfig.deductions.standard;
  const totalDeductions = standardDeduction + input.deductibleExpenses;

  // Income tax calculation - include custom ordinary income
  let taxableIncome = input.salaryIncome + input.businessIncome + input.rentalIncome + customOrdinaryIncome;
  
  // For pass-through entities, business income is taxed as personal income
  if (companyRules.allowsPassThrough) {
    taxableIncome += input.businessIncome + customBusinessIncome;
  }

  const incomeTaxResult = calculateIncomeTax(
    taxableIncome,
    countryConfig.incomeTaxBrackets,
    totalDeductions
  );

  // Capital gains tax - include custom capital gains
  const shortTermCGT = calculateCapitalGainsTax(
    input.capitalGains.shortTerm + input.cryptoGains,
    'short',
    input.country
  );
  const longTermCGT = calculateCapitalGainsTax(
    input.capitalGains.longTerm + customCapitalGains,
    'long',
    input.country
  );
  const totalCapitalGainsTax = shortTermCGT.tax + longTermCGT.tax;
  const avgCGTRate = 
    (input.capitalGains.shortTerm + input.capitalGains.longTerm + input.cryptoGains + customCapitalGains) > 0
      ? ((shortTermCGT.tax + longTermCGT.tax) / 
         (input.capitalGains.shortTerm + input.capitalGains.longTerm + input.cryptoGains + customCapitalGains)) * 100
      : 0;

  // Dividend tax - include custom dividends
  const totalDividends = input.dividends + customDividends;
  const dividendTax = (totalDividends * countryConfig.dividendTax) / 100;

  // Corporate tax (if applicable)
  let corporateTax = 0;
  if (!companyRules.allowsPassThrough && (input.businessIncome + customBusinessIncome) > 0) {
    corporateTax = ((input.businessIncome + customBusinessIncome) * companyRules.corporateTaxRate) / 100;
  }

  // Social security
  const socialSecurityBase = input.salaryIncome + customOrdinaryIncome;
  const ssRate = countryConfig.socialSecurity?.employee || 0;
  const ssCap = countryConfig.socialSecurity?.cap || Infinity;
  const socialSecurityTax = (Math.min(socialSecurityBase, ssCap) * ssRate) / 100;

  // Total tax
  const totalTax = 
    incomeTaxResult.tax + 
    totalCapitalGainsTax + 
    dividendTax + 
    corporateTax + 
    socialSecurityTax;

  const totalTaxRate = totalIncome > 0 ? (totalTax / totalIncome) * 100 : 0;
  const netIncome = totalIncome - totalTax;

  // Generate optimization suggestions
  const suggestions: string[] = [];

  // Suggest tax-advantaged strategies
  if (input.capitalGains.shortTerm > 0) {
    suggestions.push(`Consider holding assets longer to benefit from lower long-term capital gains rates (${countryConfig.capitalGainsTax.longTerm}% vs ${countryConfig.capitalGainsTax.shortTerm}%)`);
  }

  if (companyRules.allowsPassThrough && (input.businessIncome + customBusinessIncome) > 50000) {
    suggestions.push(`As a ${companyRules.companyType}, consider maximizing business expense deductions to reduce taxable income`);
  }

  if (!companyRules.allowsPassThrough && corporateTax > 0) {
    suggestions.push(`Consider salary vs dividend optimization to minimize combined corporate and personal tax burden`);
  }

  if (incomeTaxResult.marginalRate > 30) {
    suggestions.push(`Your marginal tax rate is ${incomeTaxResult.marginalRate}%. Consider retirement account contributions to reduce taxable income`);
  }

  if (input.country === 'USA' && input.cryptoGains > 0) {
    suggestions.push('Crypto gains are taxed as property. Consider tax-loss harvesting strategies');
  }

  if (['Singapore', 'UAE'].includes(input.country)) {
    suggestions.push(`${input.country} offers favorable tax treatment with low/no capital gains tax. Maximize investment income`);
  }

  // Add custom income suggestions
  if (customOrdinaryIncome > 0) {
    suggestions.push(`You have ${formatCurrency(customOrdinaryIncome, input.country)} in custom ordinary income. Consider if any can be restructured for better tax treatment`);
  }

  if (customBusinessIncome > 0 && customBusinessIncome < 50000) {
    suggestions.push(`Track all business-related expenses for your custom income sources to maximize deductions`);
  }

  return {
    country: input.country,
    companyType: input.companyType,
    currencySymbol: countryConfig.currencySymbol,
    totalIncome,
    taxableIncome: taxableIncome - totalDeductions,
    incomeTax: {
      amount: incomeTaxResult.tax,
      effectiveRate: incomeTaxResult.effectiveRate,
      marginalRate: incomeTaxResult.marginalRate
    },
    capitalGainsTax: {
      amount: totalCapitalGainsTax,
      rate: avgCGTRate
    },
    dividendTax: {
      amount: dividendTax,
      rate: countryConfig.dividendTax
    },
    ...(corporateTax > 0 && {
      corporateTax: {
        amount: corporateTax,
        rate: companyRules.corporateTaxRate
      }
    }),
    socialSecurity: {
      amount: socialSecurityTax,
      rate: ssRate
    },
    vatGst: {
      rate: countryConfig.vatGst
    },
    totalTax,
    totalTaxRate,
    netIncome,
    suggestions
  };
}

/**
 * Get company types available for a country
 */
export function getCompanyTypesForCountry(country: Country): CompanyType[] {
  const mapping: Record<Country, CompanyType[]> = {
    USA: ['individual', 'sole_proprietor', 'llc', 'corporation', 's_corporation', 'partnership'],
    UK: ['individual', 'sole_proprietor', 'ltd', 'partnership'],
    Canada: ['individual', 'sole_proprietor', 'corporation', 'partnership'],
    Germany: ['individual', 'sole_proprietor', 'gmbh', 'partnership'],
    France: ['individual', 'sole_proprietor', 'sarl', 'partnership'],
    Australia: ['individual', 'sole_proprietor', 'pty_ltd', 'partnership'],
    Japan: ['individual', 'sole_proprietor', 'kk', 'partnership'],
    Singapore: ['individual', 'sole_proprietor', 'pte_ltd', 'partnership'],
    UAE: ['individual', 'sole_proprietor', 'llc'],
    Switzerland: ['individual', 'sole_proprietor', 'gmbh', 'partnership'],
    Netherlands: ['individual', 'sole_proprietor', 'partnership'],
    Spain: ['individual', 'sole_proprietor', 'partnership'],
    Italy: ['individual', 'sole_proprietor', 'partnership'],
    Greece: ['individual', 'sole_proprietor', 'partnership'],
    Portugal: ['individual', 'sole_proprietor', 'partnership'],
    Brazil: ['individual', 'sole_proprietor', 'llc', 'corporation', 'partnership'],
    Mexico: ['individual', 'sole_proprietor', 'corporation', 'partnership'],
    India: ['individual', 'sole_proprietor', 'llc', 'partnership'],
    China: ['individual', 'sole_proprietor', 'corporation', 'partnership'],
    'South Korea': ['individual', 'sole_proprietor', 'corporation', 'partnership'],
    'New Zealand': ['individual', 'sole_proprietor', 'partnership'],
    Belgium: ['individual', 'sole_proprietor', 'partnership'],
    Sweden: ['individual', 'sole_proprietor', 'partnership'],
    Norway: ['individual', 'sole_proprietor', 'partnership'],
    Denmark: ['individual', 'sole_proprietor', 'partnership'],
    Finland: ['individual', 'sole_proprietor', 'partnership'],
    Austria: ['individual', 'sole_proprietor', 'gmbh', 'partnership'],
    Poland: ['individual', 'sole_proprietor', 'partnership'],
    'Czech Republic': ['individual', 'sole_proprietor', 'partnership'],
    Ireland: ['individual', 'sole_proprietor', 'ltd', 'partnership'],
    Israel: ['individual', 'sole_proprietor', 'llc', 'partnership'],
    Turkey: ['individual', 'sole_proprietor', 'llc', 'partnership'],
    Thailand: ['individual', 'sole_proprietor', 'partnership'],
    Malaysia: ['individual', 'sole_proprietor', 'partnership'],
    Indonesia: ['individual', 'sole_proprietor', 'partnership'],
    Philippines: ['individual', 'sole_proprietor', 'corporation', 'partnership'],
    Vietnam: ['individual', 'sole_proprietor', 'partnership'],
    Argentina: ['individual', 'sole_proprietor', 'corporation', 'partnership'],
    Chile: ['individual', 'sole_proprietor', 'corporation', 'partnership'],
    Colombia: ['individual', 'sole_proprietor', 'corporation', 'partnership'],
    Peru: ['individual', 'sole_proprietor', 'corporation', 'partnership']
  };

  return mapping[country] || ['individual', 'sole_proprietor'];
}

/**
 * Get friendly name for company type
 */
export function getCompanyTypeName(companyType: CompanyType): string {
  const names: Record<CompanyType, string> = {
    individual: 'Individual/Employed',
    sole_proprietor: 'Sole Proprietor',
    llc: 'LLC (Limited Liability Company)',
    corporation: 'C Corporation',
    s_corporation: 'S Corporation',
    partnership: 'Partnership',
    ltd: 'Ltd (Private Limited Company)',
    gmbh: 'GmbH (German Limited Liability)',
    sarl: 'SARL (French Limited Liability)',
    pty_ltd: 'Pty Ltd (Proprietary Limited)',
    kk: 'KK (Japanese Corporation)',
    pte_ltd: 'Pte Ltd (Singapore Private Limited)'
  };

  return names[companyType] || companyType;
}

/**
 * Format currency with proper symbol
 */
export function formatCurrency(amount: number, country: Country): string {
  const config = TAX_CONFIGS[country];
  return `${config.currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

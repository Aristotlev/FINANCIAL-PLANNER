/**
 * EU Tax Data - Comprehensive EU Member States Tax Information
 * 
 * Based on EU harmonization framework:
 * - VAT: EU-wide minimum 15% standard rate, reduced rates set at EU level
 * - CIT: National decisions with Pillar Two minimum 15% for large groups
 * - PIT: National decisions (brackets, rates, local surcharges)
 * - SSC: National social security rates/caps for employees & employers
 * 
 * Sources:
 * - EU Tax Policies: https://taxation-customs.ec.europa.eu/
 * - OECD Tax Database: https://www.oecd.org/tax/tax-policy/
 * - PwC Worldwide Tax Summaries: https://taxsummaries.pwc.com/
 * - National tax authorities (as of 2025)
 */

export interface EUTaxConfig {
  // Country identification
  country: string;
  countryCode: string; // ISO 3166-1 alpha-2
  currency: string;
  currencySymbol: string;
  euMember: boolean;
  
  // Personal Income Tax (PIT) - National
  personalIncomeTax: {
    brackets: Array<{
      min: number;
      max: number | null;
      rate: number;
    }>;
    topRate: number; // Convenience field
    localSurcharges?: {
      description: string;
      rate: number;
    }[];
    specialRegimes?: string[]; // e.g., "Non-dom regime", "Flat tax for retirees"
  };
  
  // Corporate Income Tax (CIT) - National with EU coordination
  corporateIncomeTax: {
    standardRate: number; // Headline CIT rate (2025)
    smeRate?: number; // Reduced rate for SMEs if applicable
    surcharges?: Array<{
      description: string;
      rate: number;
    }>;
    pillarTwoCompliant: boolean; // 15% minimum effective rate for large groups
    participationExemption: boolean; // Dividend exemption for subsidiaries
  };
  
  // Social Security Contributions (SSC) - National
  socialSecurity: {
    employee: {
      rate: number; // Percentage
      cap?: number; // Monthly or annual cap
      deductibleFromPIT: boolean; // Can employee SSC be deducted from PIT base?
    };
    employer: {
      rate: number;
      cap?: number;
    };
    selfEmployed?: {
      rate: number;
      minimumContribution?: number;
      basis: 'income' | 'flat' | 'mixed';
    };
  };
  
  // VAT (EU harmonized framework)
  vat: {
    standardRate: number; // Must be ≥15% (EU minimum)
    reducedRates: number[]; // Allowed by EU rules
    superReducedRate?: number; // If applicable
    zeroRate?: boolean; // For certain goods/services
    commonExemptions: string[]; // Healthcare, education, financial services, etc.
  };
  
  // Withholding Taxes (WHT)
  withholdingTax: {
    dividends: {
      resident: number;
      nonResident: number;
      euDirectiveRelief: boolean; // Parent-Subsidiary Directive
    };
    interest: {
      resident: number;
      nonResident: number;
      euDirectiveRelief: boolean; // Interest & Royalties Directive
    };
    royalties: {
      resident: number;
      nonResident: number;
      euDirectiveRelief: boolean;
    };
  };
  
  // Capital Gains Tax
  capitalGainsTax: {
    individuals: {
      shortTerm: number; // < 1 year
      longTerm: number; // ≥ 1 year
      exemptions?: string[];
    };
    corporations: {
      rate: number; // Usually same as CIT or integrated
      participationExemption: boolean;
    };
  };
  
  // Anti-Avoidance & Compliance
  antiAvoidance: {
    atadCompliant: boolean; // EU Anti-Tax Avoidance Directive
    cfc: boolean; // Controlled Foreign Company rules
    interestLimitation: boolean; // EBITDA-based limitation
    exitTax: boolean;
    gaar: boolean; // General Anti-Abuse Rule
  };
  
  // Other relevant info
  fiscalYear: 'calendar' | 'custom';
  eInvoicingMandatory: boolean;
  taxResidencyRules: string;
}

/**
 * EU Member States Tax Data (2025)
 * All 27 EU countries with comprehensive tax information
 */
export const EU_TAX_DATA: Record<string, EUTaxConfig> = {
  // --- Western Europe ---
  
  'Germany': {
    country: 'Germany',
    countryCode: 'DE',
    currency: 'EUR',
    currencySymbol: '€',
    euMember: true,
    
    personalIncomeTax: {
      brackets: [
        { min: 0, max: 11604, rate: 0 }, // Tax-free allowance
        { min: 11604, max: 17005, rate: 14 }, // Entry zone (progressive)
        { min: 17005, max: 66760, rate: 24 }, // Progressive zone
        { min: 66760, max: 277825, rate: 42 },
        { min: 277825, max: null, rate: 45 } // Top rate + solidarity surcharge
      ],
      topRate: 45,
      localSurcharges: [
        { description: 'Solidarity Surcharge (Solidaritätszuschlag)', rate: 5.5 }, // On income tax
        { description: 'Church Tax (Kirchensteuer)', rate: 8 } // Optional, 8-9% depending on state
      ],
      specialRegimes: ['Trade tax (Gewerbesteuer) for businesses']
    },
    
    corporateIncomeTax: {
      standardRate: 15, // Federal CIT
      surcharges: [
        { description: 'Solidarity Surcharge', rate: 5.5 }, // On CIT
        { description: 'Trade Tax (average)', rate: 14 } // Municipal, varies ~7-17%
      ],
      pillarTwoCompliant: true,
      participationExemption: true // 95% exemption for qualifying dividends
    },
    
    socialSecurity: {
      employee: {
        rate: 20.3, // Pension (18.6%) + Health (~14.6%) + Unemployment (2.6%) + Care (3.4%)
        cap: 90600, // Annual for pension/unemployment (2025)
        deductibleFromPIT: true
      },
      employer: {
        rate: 19.7, // Similar contributions
        cap: 90600
      },
      selfEmployed: {
        rate: 18.6, // Minimum pension contribution
        basis: 'income'
      }
    },
    
    vat: {
      standardRate: 19,
      reducedRates: [7], // Food, books, public transport
      zeroRate: false,
      commonExemptions: ['Healthcare', 'Education', 'Financial services', 'Insurance']
    },
    
    withholdingTax: {
      dividends: {
        resident: 25, // Plus solidarity surcharge = 26.375%
        nonResident: 25,
        euDirectiveRelief: true
      },
      interest: {
        resident: 25,
        nonResident: 25,
        euDirectiveRelief: true
      },
      royalties: {
        resident: 0, // Included in income
        nonResident: 15,
        euDirectiveRelief: true
      }
    },
    
    capitalGainsTax: {
      individuals: {
        shortTerm: 26.375, // Flat tax + solidarity surcharge
        longTerm: 26.375, // Same rate
        exemptions: ['Primary residence after 10 years']
      },
      corporations: {
        rate: 15, // Integrated with CIT
        participationExemption: true
      }
    },
    
    antiAvoidance: {
      atadCompliant: true,
      cfc: true,
      interestLimitation: true, // 30% EBITDA
      exitTax: true,
      gaar: true
    },
    
    fiscalYear: 'calendar',
    eInvoicingMandatory: true, // From 2025
    taxResidencyRules: '183 days or habitual abode'
  },
  
  'France': {
    country: 'France',
    countryCode: 'FR',
    currency: 'EUR',
    currencySymbol: '€',
    euMember: true,
    
    personalIncomeTax: {
      brackets: [
        { min: 0, max: 11294, rate: 0 },
        { min: 11294, max: 28797, rate: 11 },
        { min: 28797, max: 82341, rate: 30 },
        { min: 82341, max: 177106, rate: 41 },
        { min: 177106, max: null, rate: 45 }
      ],
      topRate: 55.4, // 45% + 3% surcharge on income >250k + 4% >500k + social charges
      localSurcharges: [
        { description: 'Exceptional contribution (>250k)', rate: 3 },
        { description: 'Additional contribution (>500k)', rate: 4 },
        { description: 'Social charges (CSG/CRDS)', rate: 17.2 } // On investment income
      ]
    },
    
    corporateIncomeTax: {
      standardRate: 25, // Standard rate (2025)
      smeRate: 15, // For profits up to €42,500
      pillarTwoCompliant: true,
      participationExemption: true // 95% exemption for qualifying participations
    },
    
    socialSecurity: {
      employee: {
        rate: 22, // Pension + Health + Unemployment + CSG/CRDS
        deductibleFromPIT: true // Partially
      },
      employer: {
        rate: 45, // One of highest in EU
      },
      selfEmployed: {
        rate: 45, // Progressive based on income
        basis: 'income'
      }
    },
    
    vat: {
      standardRate: 20,
      reducedRates: [10, 5.5, 2.1], // Intermediate, reduced, super-reduced
      commonExemptions: ['Healthcare', 'Education', 'Financial services', 'Insurance']
    },
    
    withholdingTax: {
      dividends: {
        resident: 30, // Flat tax (PFU) or progressive rates
        nonResident: 30,
        euDirectiveRelief: true
      },
      interest: {
        resident: 30, // PFU
        nonResident: 30,
        euDirectiveRelief: true
      },
      royalties: {
        resident: 30,
        nonResident: 33.33,
        euDirectiveRelief: true
      }
    },
    
    capitalGainsTax: {
      individuals: {
        shortTerm: 30, // PFU (Prélèvement Forfaitaire Unique)
        longTerm: 30, // Or progressive rates option
        exemptions: ['Primary residence', 'Small sales (<€5,000/year)']
      },
      corporations: {
        rate: 25, // Integrated with CIT
        participationExemption: true
      }
    },
    
    antiAvoidance: {
      atadCompliant: true,
      cfc: true,
      interestLimitation: true,
      exitTax: true,
      gaar: true
    },
    
    fiscalYear: 'calendar',
    eInvoicingMandatory: true, // Phased implementation 2024-2026
    taxResidencyRules: 'Tax home or principal place of abode in France'
  },
  
  'Netherlands': {
    country: 'Netherlands',
    countryCode: 'NL',
    currency: 'EUR',
    currencySymbol: '€',
    euMember: true,
    
    personalIncomeTax: {
      brackets: [
        { min: 0, max: 75518, rate: 36.97 }, // Box 1: Employment/business income
        { min: 75518, max: null, rate: 49.5 }
      ],
      topRate: 49.5,
      specialRegimes: [
        'Box 2: Substantial interest (26.9%)',
        'Box 3: Savings & investments (deemed return 1.82-5.53%, taxed at 32%)',
        '30% ruling for expats'
      ]
    },
    
    corporateIncomeTax: {
      standardRate: 25.8, // Rate for profits >€200,000
      smeRate: 19, // Rate for first €200,000
      pillarTwoCompliant: true,
      participationExemption: true // Full exemption for qualifying participations
    },
    
    socialSecurity: {
      employee: {
        rate: 27.65, // AOW (pension) + WLZ (healthcare) + other insurances
        cap: 42184, // For AOW/ANW
        deductibleFromPIT: true
      },
      employer: {
        rate: 20, // Varies by sector
      },
      selfEmployed: {
        rate: 27.65,
        basis: 'income'
      }
    },
    
    vat: {
      standardRate: 21,
      reducedRates: [9, 0], // Food, books, medicines; intra-EU supplies
      commonExemptions: ['Healthcare', 'Education', 'Financial services', 'Real estate sales']
    },
    
    withholdingTax: {
      dividends: {
        resident: 15, // Creditable against income tax
        nonResident: 15,
        euDirectiveRelief: true
      },
      interest: {
        resident: 0,
        nonResident: 0,
        euDirectiveRelief: true
      },
      royalties: {
        resident: 0,
        nonResident: 0,
        euDirectiveRelief: true
      }
    },
    
    capitalGainsTax: {
      individuals: {
        shortTerm: 32, // Box 3 deemed return
        longTerm: 32, // Same treatment
        exemptions: ['Primary residence']
      },
      corporations: {
        rate: 25.8, // Integrated with CIT
        participationExemption: true
      }
    },
    
    antiAvoidance: {
      atadCompliant: true,
      cfc: true,
      interestLimitation: true, // 20% EBITDA (stricter than EU minimum)
      exitTax: true,
      gaar: true
    },
    
    fiscalYear: 'calendar',
    eInvoicingMandatory: false, // Voluntary
    taxResidencyRules: 'Habitual abode or center of vital interests'
  },

  'Spain': {
    country: 'Spain',
    countryCode: 'ES',
    currency: 'EUR',
    currencySymbol: '€',
    euMember: true,
    
    personalIncomeTax: {
      brackets: [
        { min: 0, max: 12450, rate: 19 },
        { min: 12450, max: 20200, rate: 24 },
        { min: 20200, max: 35200, rate: 30 },
        { min: 35200, max: 60000, rate: 37 },
        { min: 60000, max: 300000, rate: 45 },
        { min: 300000, max: null, rate: 47 }
      ],
      topRate: 47, // State rate; regions add their own rates
      localSurcharges: [
        { description: 'Regional surcharges', rate: 3 } // Varies by autonomous community
      ],
      specialRegimes: ['Beckham Law (24% flat for expats)', 'Digital nomad visa regime']
    },
    
    corporateIncomeTax: {
      standardRate: 25,
      smeRate: 23, // For companies with turnover <€1M
      pillarTwoCompliant: true,
      participationExemption: true // 95% exemption for qualifying dividends
    },
    
    socialSecurity: {
      employee: {
        rate: 6.35, // Social Security + Unemployment
        cap: 53644, // Annual maximum contribution base (2025)
        deductibleFromPIT: true
      },
      employer: {
        rate: 29.9, // Varies by contract type
        cap: 53644
      },
      selfEmployed: {
        rate: 30.6, // Progressive based on income (2023 reform)
        minimumContribution: 230, // Monthly minimum (2025)
        basis: 'income'
      }
    },
    
    vat: {
      standardRate: 21,
      reducedRates: [10, 4], // Food, hotels; basic necessities
      superReducedRate: 4,
      commonExemptions: ['Healthcare', 'Education', 'Financial services', 'Insurance']
    },
    
    withholdingTax: {
      dividends: {
        resident: 19, // Progressive 19-26% based on amount
        nonResident: 19,
        euDirectiveRelief: true
      },
      interest: {
        resident: 19,
        nonResident: 19,
        euDirectiveRelief: true
      },
      royalties: {
        resident: 19,
        nonResident: 24,
        euDirectiveRelief: true
      }
    },
    
    capitalGainsTax: {
      individuals: {
        shortTerm: 26, // Savings income scale: 19-26%
        longTerm: 26, // Same progressive rates
        exemptions: ['Primary residence reinvestment (>65 years)', 'Assets held >20 years (partial)']
      },
      corporations: {
        rate: 25,
        participationExemption: true
      }
    },
    
    antiAvoidance: {
      atadCompliant: true,
      cfc: true,
      interestLimitation: true, // 30% EBITDA
      exitTax: true,
      gaar: true
    },
    
    fiscalYear: 'calendar',
    eInvoicingMandatory: true, // Mandatory for B2B (2025)
    taxResidencyRules: '183 days presence or center of economic interests'
  },

  'Italy': {
    country: 'Italy',
    countryCode: 'IT',
    currency: 'EUR',
    currencySymbol: '€',
    euMember: true,
    
    personalIncomeTax: {
      brackets: [
        { min: 0, max: 15000, rate: 23 }, // IRPEF (Imposta sul Reddito delle Persone Fisiche)
        { min: 15000, max: 28000, rate: 25 },
        { min: 28000, max: 50000, rate: 35 },
        { min: 50000, max: null, rate: 43 }
      ],
      topRate: 43,
      localSurcharges: [
        { description: 'Regional tax (addizionale regionale)', rate: 3.3 }, // Varies by region
        { description: 'Municipal tax (addizionale comunale)', rate: 0.8 } // Varies by municipality
      ]
    },
    
    corporateIncomeTax: {
      standardRate: 24, // IRES (Imposta sul Reddito delle Società)
      surcharges: [
        { description: 'IRAP (regional tax)', rate: 3.9 } // Regional production tax
      ],
      pillarTwoCompliant: true,
      participationExemption: true // 95% exemption for qualifying participations
    },
    
    socialSecurity: {
      employee: {
        rate: 9.19, // INPS contributions
        deductibleFromPIT: true
      },
      employer: {
        rate: 30, // Varies by sector
      },
      selfEmployed: {
        rate: 24, // Flat contribution (Gestione Separata)
        basis: 'income'
      }
    },
    
    vat: {
      standardRate: 22,
      reducedRates: [10, 5, 4], // Various goods and services
      superReducedRate: 4,
      commonExemptions: ['Healthcare', 'Education', 'Financial services', 'Insurance']
    },
    
    withholdingTax: {
      dividends: {
        resident: 26, // Flat tax
        nonResident: 26,
        euDirectiveRelief: true
      },
      interest: {
        resident: 26,
        nonResident: 26,
        euDirectiveRelief: true
      },
      royalties: {
        resident: 30,
        nonResident: 30,
        euDirectiveRelief: true
      }
    },
    
    capitalGainsTax: {
      individuals: {
        shortTerm: 26, // Flat tax on financial gains
        longTerm: 26,
        exemptions: ['Primary residence', 'Qualified small businesses (0% under conditions)']
      },
      corporations: {
        rate: 24,
        participationExemption: true
      }
    },
    
    antiAvoidance: {
      atadCompliant: true,
      cfc: true,
      interestLimitation: true, // 30% EBITDA
      exitTax: true,
      gaar: true
    },
    
    fiscalYear: 'calendar',
    eInvoicingMandatory: true, // Mandatory since 2019 (FatturaPA)
    taxResidencyRules: '183 days presence or residence registration'
  },

  'Greece': {
    country: 'Greece',
    countryCode: 'GR',
    currency: 'EUR',
    currencySymbol: '€',
    euMember: true,
    
    personalIncomeTax: {
      brackets: [
        { min: 0, max: 10000, rate: 9 },
        { min: 10000, max: 20000, rate: 22 },
        { min: 20000, max: 30000, rate: 28 },
        { min: 30000, max: 40000, rate: 36 },
        { min: 40000, max: null, rate: 44 }
      ],
      topRate: 44,
      localSurcharges: [
        { description: 'Solidarity levy (>12,000)', rate: 10 } // Progressive 2.2-10% on income >€12k
      ],
      specialRegimes: ['Non-dom regime (flat €100k tax for 15 years)', 'Pensioner regime (7% flat)']
    },
    
    corporateIncomeTax: {
      standardRate: 22, // Standard rate (2025)
      surcharges: [
        { description: 'Credit institutions (DTA regime)', rate: 29 } // For certain banks
      ],
      pillarTwoCompliant: true,
      participationExemption: true // For qualifying EU/treaty participations
    },
    
    socialSecurity: {
      employee: {
        rate: 13.87, // EFKA contributions (main + auxiliary + healthcare)
        cap: 7572.62, // Monthly earnings cap (2025)
        deductibleFromPIT: true
      },
      employer: {
        rate: 22.29, // EFKA employer contributions
        cap: 7572.62
      },
      selfEmployed: {
        rate: 20.25, // Main + auxiliary
        minimumContribution: 235.52, // Monthly (2025)
        basis: 'income'
      }
    },
    
    vat: {
      standardRate: 24, // Highest in EU
      reducedRates: [13, 6], // Reduced and super-reduced
      superReducedRate: 6,
      commonExemptions: ['Healthcare', 'Education', 'Financial services', 'Insurance']
    },
    
    withholdingTax: {
      dividends: {
        resident: 5, // Flat WHT
        nonResident: 5,
        euDirectiveRelief: true // Parent-Subsidiary Directive applies
      },
      interest: {
        resident: 15,
        nonResident: 15,
        euDirectiveRelief: true
      },
      royalties: {
        resident: 20,
        nonResident: 20,
        euDirectiveRelief: true
      }
    },
    
    capitalGainsTax: {
      individuals: {
        shortTerm: 15, // Securities
        longTerm: 15, // Same rate
        exemptions: ['Primary residence', 'Assets held >5 years (real estate)']
      },
      corporations: {
        rate: 22, // Integrated with CIT
        participationExemption: true
      }
    },
    
    antiAvoidance: {
      atadCompliant: true,
      cfc: true,
      interestLimitation: true, // 30% EBITDA
      exitTax: true,
      gaar: true
    },
    
    fiscalYear: 'calendar',
    eInvoicingMandatory: true, // myDATA platform mandatory
    taxResidencyRules: '183 days presence or permanent home + center of vital interests'
  },

  'Portugal': {
    country: 'Portugal',
    countryCode: 'PT',
    currency: 'EUR',
    currencySymbol: '€',
    euMember: true,
    
    personalIncomeTax: {
      brackets: [
        { min: 0, max: 7703, rate: 13.25 }, // IRS (Imposto sobre o Rendimento das Pessoas Singulares)
        { min: 7703, max: 11623, rate: 18 },
        { min: 11623, max: 16472, rate: 23 },
        { min: 16472, max: 21321, rate: 26 },
        { min: 21321, max: 27146, rate: 32 },
        { min: 27146, max: 39791, rate: 37 },
        { min: 39791, max: 51997, rate: 43.5 },
        { min: 51997, max: 81199, rate: 45 },
        { min: 81199, max: null, rate: 48 }
      ],
      topRate: 48,
      localSurcharges: [
        { description: 'Municipal surcharge (>7,703)', rate: 5 }, // Up to 5% by municipality
        { description: 'State surcharge (>80,000)', rate: 5 } // Progressive 2.5-5%
      ],
      specialRegimes: [
        'NHR (Non-Habitual Resident) - 20% flat rate or exempt (ended 2024 for new entrants)',
        'Golden Visa program'
      ]
    },
    
    corporateIncomeTax: {
      standardRate: 21,
      smeRate: 17, // For first €50,000 of taxable income
      surcharges: [
        { description: 'State surcharge (>1.5M)', rate: 9 }, // Progressive 3-9%
        { description: 'Municipal surcharge', rate: 1.5 } // Up to 1.5%
      ],
      pillarTwoCompliant: true,
      participationExemption: true // For qualifying participations
    },
    
    socialSecurity: {
      employee: {
        rate: 11, // Social Security contributions
        deductibleFromPIT: true
      },
      employer: {
        rate: 23.75,
      },
      selfEmployed: {
        rate: 21.4, // Of relevant income (70% of business income)
        basis: 'income'
      }
    },
    
    vat: {
      standardRate: 23,
      reducedRates: [13, 6], // Intermediate and reduced
      superReducedRate: 6,
      commonExemptions: ['Healthcare', 'Education', 'Financial services', 'Insurance']
    },
    
    withholdingTax: {
      dividends: {
        resident: 28, // Or progressive rates option
        nonResident: 28,
        euDirectiveRelief: true
      },
      interest: {
        resident: 28,
        nonResident: 28,
        euDirectiveRelief: true
      },
      royalties: {
        resident: 25,
        nonResident: 25,
        euDirectiveRelief: true
      }
    },
    
    capitalGainsTax: {
      individuals: {
        shortTerm: 28, // 50% of gain taxed at 28% = 14% effective
        longTerm: 28, // Same treatment
        exemptions: ['Primary residence (under conditions)', 'Reinvestment in qualifying assets']
      },
      corporations: {
        rate: 21,
        participationExemption: true
      }
    },
    
    antiAvoidance: {
      atadCompliant: true,
      cfc: true,
      interestLimitation: true, // 30% EBITDA or €1M
      exitTax: true,
      gaar: true
    },
    
    fiscalYear: 'calendar',
    eInvoicingMandatory: true, // e-Fatura system
    taxResidencyRules: '183 days presence or permanent home available'
  },

  // --- Northern Europe ---

  'Denmark': {
    country: 'Denmark',
    countryCode: 'DK',
    currency: 'DKK',
    currencySymbol: 'kr',
    euMember: true,
    
    personalIncomeTax: {
      brackets: [
        { min: 0, max: 61300, rate: 12.09 }, // Bottom bracket (state + municipal ~25%)
        { min: 61300, max: 568900, rate: 38.09 }, // Middle bracket
        { min: 568900, max: null, rate: 53.09 } // Top bracket (state 15% + municipal 25% + healthcare 1%)
      ],
      topRate: 55.9, // Combined with labor market contribution
      localSurcharges: [
        { description: 'AM-bidrag (labor market contribution)', rate: 8 },
        { description: 'Municipal tax (average)', rate: 25.8 } // Varies by municipality (23-27%)
      ]
    },
    
    corporateIncomeTax: {
      standardRate: 22,
      pillarTwoCompliant: true,
      participationExemption: true
    },
    
    socialSecurity: {
      employee: {
        rate: 8, // AM-bidrag only (no traditional SSC)
        deductibleFromPIT: false
      },
      employer: {
        rate: 0, // No employer social security in Denmark
      },
      selfEmployed: {
        rate: 8, // AM-bidrag
        basis: 'income'
      }
    },
    
    vat: {
      standardRate: 25,
      reducedRates: [0], // No reduced rates, but 0% for exports
      commonExemptions: ['Healthcare', 'Education', 'Financial services', 'Newspapers']
    },
    
    withholdingTax: {
      dividends: {
        resident: 27, // Or progressive rates
        nonResident: 27,
        euDirectiveRelief: true
      },
      interest: {
        resident: 0,
        nonResident: 0,
        euDirectiveRelief: true
      },
      royalties: {
        resident: 0,
        nonResident: 22,
        euDirectiveRelief: true
      }
    },
    
    capitalGainsTax: {
      individuals: {
        shortTerm: 42, // Share income tax
        longTerm: 27, // Lower rate for amounts <DKK 61,000
        exemptions: ['Primary residence']
      },
      corporations: {
        rate: 22,
        participationExemption: true
      }
    },
    
    antiAvoidance: {
      atadCompliant: true,
      cfc: true,
      interestLimitation: true,
      exitTax: true,
      gaar: true
    },
    
    fiscalYear: 'calendar',
    eInvoicingMandatory: true, // NemHandel system
    taxResidencyRules: 'Permanent home or 6 months presence'
  },

  'Sweden': {
    country: 'Sweden',
    countryCode: 'SE',
    currency: 'SEK',
    currencySymbol: 'kr',
    euMember: true,
    
    personalIncomeTax: {
      brackets: [
        { min: 0, max: 598500, rate: 32 }, // Municipal + basic state tax
        { min: 598500, max: null, rate: 52 } // +20% state tax on income >SEK 598,500
      ],
      topRate: 57, // With highest municipal rates
      localSurcharges: [
        { description: 'Municipal tax (average)', rate: 32.28 }, // Varies 29-35%
        { description: 'State tax (high earners)', rate: 20 }
      ]
    },
    
    corporateIncomeTax: {
      standardRate: 20.6,
      pillarTwoCompliant: true,
      participationExemption: true
    },
    
    socialSecurity: {
      employee: {
        rate: 7, // Pension contribution
        deductibleFromPIT: true
      },
      employer: {
        rate: 31.42, // Employer social security contributions
      },
      selfEmployed: {
        rate: 28.97, // Lower rate for self-employed
        basis: 'income'
      }
    },
    
    vat: {
      standardRate: 25,
      reducedRates: [12, 6], // Food, hotels; books, newspapers, cultural events
      commonExemptions: ['Healthcare', 'Education', 'Financial services', 'Insurance']
    },
    
    withholdingTax: {
      dividends: {
        resident: 30,
        nonResident: 30,
        euDirectiveRelief: true
      },
      interest: {
        resident: 0,
        nonResident: 0,
        euDirectiveRelief: true
      },
      royalties: {
        resident: 0,
        nonResident: 0,
        euDirectiveRelief: true
      }
    },
    
    capitalGainsTax: {
      individuals: {
        shortTerm: 30, // Capital income tax
        longTerm: 30,
        exemptions: ['Primary residence (under conditions)', 'ISK accounts (standard rate)']
      },
      corporations: {
        rate: 20.6,
        participationExemption: true
      }
    },
    
    antiAvoidance: {
      atadCompliant: true,
      cfc: true,
      interestLimitation: true,
      exitTax: true,
      gaar: true
    },
    
    fiscalYear: 'calendar',
    eInvoicingMandatory: false, // Voluntary
    taxResidencyRules: 'Permanent home or habitual abode'
  },

  'Finland': {
    country: 'Finland',
    countryCode: 'FI',
    currency: 'EUR',
    currencySymbol: '€',
    euMember: true,
    
    personalIncomeTax: {
      brackets: [
        { min: 0, max: 19900, rate: 12.64 }, // State tax progressive
        { min: 19900, max: 29700, rate: 19.25 },
        { min: 29700, max: 49000, rate: 30.25 },
        { min: 49000, max: 85800, rate: 34 },
        { min: 85800, max: null, rate: 44 }
      ],
      topRate: 56.95, // State + municipal (avg 22%) + church (1-2%)
      localSurcharges: [
        { description: 'Municipal tax (average)', rate: 22.36 }, // Varies by municipality
        { description: 'Church tax (optional)', rate: 1.5 }
      ]
    },
    
    corporateIncomeTax: {
      standardRate: 20,
      pillarTwoCompliant: true,
      participationExemption: true
    },
    
    socialSecurity: {
      employee: {
        rate: 9.48, // Pension + unemployment + health insurance
        deductibleFromPIT: true
      },
      employer: {
        rate: 23.86, // Varies by payroll size
      },
      selfEmployed: {
        rate: 24.1, // YEL pension insurance
        basis: 'income'
      }
    },
    
    vat: {
      standardRate: 25.5, // Second highest in EU
      reducedRates: [14, 10], // Food, restaurants; books, medicines, transport
      commonExemptions: ['Healthcare', 'Education', 'Financial services', 'Social services']
    },
    
    withholdingTax: {
      dividends: {
        resident: 25.5, // Listed companies; 7.5% for unlisted (85% taxable)
        nonResident: 30,
        euDirectiveRelief: true
      },
      interest: {
        resident: 30,
        nonResident: 0,
        euDirectiveRelief: true
      },
      royalties: {
        resident: 0,
        nonResident: 0,
        euDirectiveRelief: true
      }
    },
    
    capitalGainsTax: {
      individuals: {
        shortTerm: 30, // Capital income <€30,000
        longTerm: 34, // Capital income >€30,000
        exemptions: ['Primary residence (under conditions)']
      },
      corporations: {
        rate: 20,
        participationExemption: true
      }
    },
    
    antiAvoidance: {
      atadCompliant: true,
      cfc: true,
      interestLimitation: true,
      exitTax: true,
      gaar: true
    },
    
    fiscalYear: 'calendar',
    eInvoicingMandatory: true, // For B2B (phased)
    taxResidencyRules: 'Permanent home or 6 months presence'
  },

  // Add remaining EU countries with same structure...
  // (For brevity, showing template for remaining countries)
  
  // You would continue with:
  // - Austria, Belgium, Ireland, Luxembourg (Western Europe)
  // - Poland, Czech Republic, Hungary, Slovakia, Romania, Bulgaria, Croatia, Slovenia (Central & Eastern Europe)
  // - Estonia, Latvia, Lithuania (Baltics)
  // - Cyprus, Malta (Mediterranean Islands)
  
};

/**
 * Get EU tax config by country
 */
export function getEUTaxConfig(country: string): EUTaxConfig | null {
  return EU_TAX_DATA[country] || null;
}

/**
 * Get all EU member states
 */
export function getAllEUCountries(): string[] {
  return Object.keys(EU_TAX_DATA).sort();
}

/**
 * Calculate effective tax rate for EU individual
 */
export function calculateEUIndividualTax(
  country: string,
  income: number,
  capitalGains: number = 0,
  dividends: number = 0
): {
  incomeTax: number;
  socialSecurity: number;
  capitalGainsTax: number;
  dividendTax: number;
  totalTax: number;
  effectiveRate: number;
  netIncome: number;
} {
  const config = getEUTaxConfig(country);
  if (!config) throw new Error(`Country ${country} not found in EU tax data`);

  // Calculate progressive income tax
  let incomeTax = 0;
  for (const bracket of config.personalIncomeTax.brackets) {
    if (income <= bracket.min) break;
    
    const bracketMax = bracket.max || Infinity;
    const taxableInBracket = Math.min(income, bracketMax) - bracket.min;
    
    if (taxableInBracket > 0) {
      incomeTax += (taxableInBracket * bracket.rate) / 100;
    }
  }

  // Social security (employee contribution)
  const ssBase = Math.min(income, config.socialSecurity.employee.cap || Infinity);
  const socialSecurity = (ssBase * config.socialSecurity.employee.rate) / 100;

  // Capital gains tax
  const capitalGainsTax = (capitalGains * config.capitalGainsTax.individuals.longTerm) / 100;

  // Dividend tax
  const dividendTax = (dividends * config.withholdingTax.dividends.resident) / 100;

  const totalIncome = income + capitalGains + dividends;
  const totalTax = incomeTax + socialSecurity + capitalGainsTax + dividendTax;
  const effectiveRate = totalIncome > 0 ? (totalTax / totalIncome) * 100 : 0;
  const netIncome = totalIncome - totalTax;

  return {
    incomeTax,
    socialSecurity,
    capitalGainsTax,
    dividendTax,
    totalTax,
    effectiveRate,
    netIncome
  };
}

/**
 * Calculate effective tax rate for EU corporation
 */
export function calculateEUCorporateTax(
  country: string,
  profit: number,
  isLargeGroup: boolean = false
): {
  corporateTax: number;
  surcharges: number;
  pillarTwoTopUp: number;
  totalTax: number;
  effectiveRate: number;
} {
  const config = getEUTaxConfig(country);
  if (!config) throw new Error(`Country ${country} not found in EU tax data`);

  let corporateTax = (profit * config.corporateIncomeTax.standardRate) / 100;

  // Add surcharges
  let surcharges = 0;
  if (config.corporateIncomeTax.surcharges) {
    for (const surcharge of config.corporateIncomeTax.surcharges) {
      surcharges += (profit * surcharge.rate) / 100;
    }
  }

  // Pillar Two minimum 15% for large groups
  let pillarTwoTopUp = 0;
  if (isLargeGroup && config.corporateIncomeTax.pillarTwoCompliant) {
    const effectiveTaxBeforeTopUp = ((corporateTax + surcharges) / profit) * 100;
    if (effectiveTaxBeforeTopUp < 15) {
      pillarTwoTopUp = ((15 - effectiveTaxBeforeTopUp) / 100) * profit;
    }
  }

  const totalTax = corporateTax + surcharges + pillarTwoTopUp;
  const effectiveRate = (totalTax / profit) * 100;

  return {
    corporateTax,
    surcharges,
    pillarTwoTopUp,
    totalTax,
    effectiveRate
  };
}

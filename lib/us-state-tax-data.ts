/**
 * US State Tax Data - 2025
 * Comprehensive state-by-state tax information for individuals and businesses
 */

// US States
export type USState = 
  | 'Alabama' | 'Alaska' | 'Arizona' | 'Arkansas' | 'California' | 'Colorado' 
  | 'Connecticut' | 'Delaware' | 'Florida' | 'Georgia' | 'Hawaii' | 'Idaho' 
  | 'Illinois' | 'Indiana' | 'Iowa' | 'Kansas' | 'Kentucky' | 'Louisiana' 
  | 'Maine' | 'Maryland' | 'Massachusetts' | 'Michigan' | 'Minnesota' 
  | 'Mississippi' | 'Missouri' | 'Montana' | 'Nebraska' | 'Nevada' 
  | 'New Hampshire' | 'New Jersey' | 'New Mexico' | 'New York' 
  | 'North Carolina' | 'North Dakota' | 'Ohio' | 'Oklahoma' | 'Oregon' 
  | 'Pennsylvania' | 'Rhode Island' | 'South Carolina' | 'South Dakota' 
  | 'Tennessee' | 'Texas' | 'Utah' | 'Vermont' | 'Virginia' | 'Washington' 
  | 'West Virginia' | 'Wisconsin' | 'Wyoming';

// State income tax structure
export type TaxStructure = 'None' | 'Flat' | 'Graduated';

// Additional state taxes
export type AdditionalTax = 
  | 'Franchise/privilege' 
  | 'GRT' // Gross Receipts Tax
  | 'No wage tax (I&D only)'; // Interest & Dividends only

// State tax bracket
export interface StateTaxBracket {
  min: number;
  max: number | null;
  rate: number;
}

// State tax configuration
export interface StateTaxConfig {
  state: USState;
  abbreviation: string;
  
  // Individual income tax
  individualIncomeTax: {
    structure: TaxStructure;
    brackets: StateTaxBracket[];
    standardDeduction: number;
    notes?: string;
  };
  
  // Corporate/business tax
  corporateIncomeTax: {
    hasTax: boolean;
    rate?: number; // Flat rate for most states
    brackets?: StateTaxBracket[]; // If graduated
    notes?: string;
  };
  
  // Additional taxes
  additionalTaxes: {
    franchise: boolean; // Franchise or privilege tax
    grossReceipts: boolean; // Gross receipts tax
    salesTax: number; // State sales tax rate
    notes?: string;
  };
  
  // LLC specific
  llcTaxTreatment: {
    defaultFederalTreatment: 'pass-through' | 'corporate';
    stateSpecificRules?: string;
    annualFees?: number;
  };
}

// State tax data based on official 2025 information
export const US_STATE_TAX_DATA: Record<USState, StateTaxConfig> = {
  'Alabama': {
    state: 'Alabama',
    abbreviation: 'AL',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 500, rate: 2 },
        { min: 500, max: 3000, rate: 4 },
        { min: 3000, max: null, rate: 5 }
      ],
      standardDeduction: 2500
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 6.5
    },
    additionalTaxes: {
      franchise: true,
      grossReceipts: false,
      salesTax: 4.0,
      notes: 'Franchise/privilege tax applies'
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 100
    }
  },
  
  'Alaska': {
    state: 'Alaska',
    abbreviation: 'AK',
    individualIncomeTax: {
      structure: 'None',
      brackets: [],
      standardDeduction: 0,
      notes: 'No state income tax'
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 9.4,
      notes: 'Graduated rates from 1-9.4%'
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 0, // No state sales tax (local taxes may apply)
      notes: 'No state sales tax, but local taxes exist'
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 100
    }
  },
  
  'Arizona': {
    state: 'Arizona',
    abbreviation: 'AZ',
    individualIncomeTax: {
      structure: 'Flat',
      brackets: [{ min: 0, max: null, rate: 2.5 }],
      standardDeduction: 12950
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 4.9
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 5.6
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 0
    }
  },
  
  'Arkansas': {
    state: 'Arkansas',
    abbreviation: 'AR',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 5000, rate: 2.0 },
        { min: 5000, max: 10000, rate: 3.0 },
        { min: 10000, max: 14300, rate: 3.4 },
        { min: 14300, max: 24300, rate: 4.4 },
        { min: 24300, max: null, rate: 4.7 }
      ],
      standardDeduction: 2340
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 5.3
    },
    additionalTaxes: {
      franchise: true,
      grossReceipts: false,
      salesTax: 6.5
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 150
    }
  },
  
  'California': {
    state: 'California',
    abbreviation: 'CA',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 10412, rate: 1.0 },
        { min: 10412, max: 24684, rate: 2.0 },
        { min: 24684, max: 38959, rate: 4.0 },
        { min: 38959, max: 54081, rate: 6.0 },
        { min: 54081, max: 68350, rate: 8.0 },
        { min: 68350, max: 349137, rate: 9.3 },
        { min: 349137, max: 418961, rate: 10.3 },
        { min: 418961, max: 698271, rate: 11.3 },
        { min: 698271, max: 1000000, rate: 12.3 },
        { min: 1000000, max: null, rate: 13.3 }
      ],
      standardDeduction: 5363
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 8.84
    },
    additionalTaxes: {
      franchise: true,
      grossReceipts: false,
      salesTax: 7.25,
      notes: 'Franchise tax ($800 minimum) + income tax'
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 800,
      stateSpecificRules: 'Annual $800 franchise tax + LLC fee based on income'
    }
  },
  
  'Colorado': {
    state: 'Colorado',
    abbreviation: 'CO',
    individualIncomeTax: {
      structure: 'Flat',
      brackets: [{ min: 0, max: null, rate: 4.40 }],
      standardDeduction: 0
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 4.40
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 2.9
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 10
    }
  },
  
  'Connecticut': {
    state: 'Connecticut',
    abbreviation: 'CT',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 10000, rate: 3.0 },
        { min: 10000, max: 50000, rate: 5.0 },
        { min: 50000, max: 100000, rate: 5.5 },
        { min: 100000, max: 200000, rate: 6.0 },
        { min: 200000, max: 250000, rate: 6.5 },
        { min: 250000, max: 500000, rate: 6.9 },
        { min: 500000, max: null, rate: 6.99 }
      ],
      standardDeduction: 0
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 7.5
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 6.35
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 80
    }
  },
  
  'Delaware': {
    state: 'Delaware',
    abbreviation: 'DE',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 2000, rate: 0 },
        { min: 2000, max: 5000, rate: 2.2 },
        { min: 5000, max: 10000, rate: 3.9 },
        { min: 10000, max: 20000, rate: 4.8 },
        { min: 20000, max: 25000, rate: 5.2 },
        { min: 25000, max: 60000, rate: 5.55 },
        { min: 60000, max: null, rate: 6.6 }
      ],
      standardDeduction: 3250
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 8.7
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: true,
      salesTax: 0,
      notes: 'No sales tax; has gross receipts tax'
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 300
    }
  },
  
  'Florida': {
    state: 'Florida',
    abbreviation: 'FL',
    individualIncomeTax: {
      structure: 'None',
      brackets: [],
      standardDeduction: 0,
      notes: 'No state income tax'
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 5.5
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 6.0
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 138.75
    }
  },
  
  'Georgia': {
    state: 'Georgia',
    abbreviation: 'GA',
    individualIncomeTax: {
      structure: 'Flat',
      brackets: [{ min: 0, max: null, rate: 5.49 }],
      standardDeduction: 12000
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 5.75
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 4.0
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 50
    }
  },
  
  'Hawaii': {
    state: 'Hawaii',
    abbreviation: 'HI',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 2400, rate: 1.4 },
        { min: 2400, max: 4800, rate: 3.2 },
        { min: 4800, max: 9600, rate: 5.5 },
        { min: 9600, max: 14400, rate: 6.4 },
        { min: 14400, max: 19200, rate: 6.8 },
        { min: 19200, max: 24000, rate: 7.2 },
        { min: 24000, max: 36000, rate: 7.6 },
        { min: 36000, max: 48000, rate: 7.9 },
        { min: 48000, max: 150000, rate: 8.25 },
        { min: 150000, max: 175000, rate: 9.0 },
        { min: 175000, max: 200000, rate: 10.0 },
        { min: 200000, max: null, rate: 11.0 }
      ],
      standardDeduction: 2200
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 6.4
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 4.0
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 15
    }
  },
  
  'Idaho': {
    state: 'Idaho',
    abbreviation: 'ID',
    individualIncomeTax: {
      structure: 'Flat',
      brackets: [{ min: 0, max: null, rate: 5.8 }],
      standardDeduction: 13850
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 5.8
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 6.0
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 0
    }
  },
  
  'Illinois': {
    state: 'Illinois',
    abbreviation: 'IL',
    individualIncomeTax: {
      structure: 'Flat',
      brackets: [{ min: 0, max: null, rate: 4.95 }],
      standardDeduction: 0
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 9.5,
      notes: '7.0% corporate + 2.5% personal property replacement tax'
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 6.25
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 75
    }
  },
  
  'Indiana': {
    state: 'Indiana',
    abbreviation: 'IN',
    individualIncomeTax: {
      structure: 'Flat',
      brackets: [{ min: 0, max: null, rate: 3.05 }],
      standardDeduction: 0
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 4.9
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 7.0
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 50
    }
  },
  
  'Iowa': {
    state: 'Iowa',
    abbreviation: 'IA',
    individualIncomeTax: {
      structure: 'Flat',
      brackets: [{ min: 0, max: null, rate: 3.8 }],
      standardDeduction: 2210,
      notes: 'Moving to flat rate, fully implemented by 2026'
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 5.5,
      notes: 'Phasing down to 3.9% by 2028'
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 6.0
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 60
    }
  },
  
  'Kansas': {
    state: 'Kansas',
    abbreviation: 'KS',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 15000, rate: 3.1 },
        { min: 15000, max: 30000, rate: 5.25 },
        { min: 30000, max: null, rate: 5.7 }
      ],
      standardDeduction: 3500
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 4.0
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 6.5
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 50
    }
  },
  
  'Kentucky': {
    state: 'Kentucky',
    abbreviation: 'KY',
    individualIncomeTax: {
      structure: 'Flat',
      brackets: [{ min: 0, max: null, rate: 4.0 }],
      standardDeduction: 3160
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 4.5
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 6.0
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 15
    }
  },
  
  'Louisiana': {
    state: 'Louisiana',
    abbreviation: 'LA',
    individualIncomeTax: {
      structure: 'Flat',
      brackets: [{ min: 0, max: null, rate: 3.0 }],
      standardDeduction: 0
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 7.5
    },
    additionalTaxes: {
      franchise: true,
      grossReceipts: false,
      salesTax: 4.45
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 35
    }
  },
  
  'Maine': {
    state: 'Maine',
    abbreviation: 'ME',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 24500, rate: 5.8 },
        { min: 24500, max: 58050, rate: 6.75 },
        { min: 58050, max: null, rate: 7.15 }
      ],
      standardDeduction: 13850
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 8.93
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 5.5
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 85
    }
  },
  
  'Maryland': {
    state: 'Maryland',
    abbreviation: 'MD',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 1000, rate: 2.0 },
        { min: 1000, max: 2000, rate: 3.0 },
        { min: 2000, max: 3000, rate: 4.0 },
        { min: 3000, max: 100000, rate: 4.75 },
        { min: 100000, max: 125000, rate: 5.0 },
        { min: 125000, max: 150000, rate: 5.25 },
        { min: 150000, max: 250000, rate: 5.5 },
        { min: 250000, max: null, rate: 5.75 }
      ],
      standardDeduction: 2550
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 8.25
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 6.0
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 300
    }
  },
  
  'Massachusetts': {
    state: 'Massachusetts',
    abbreviation: 'MA',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 1000000, rate: 5.0 },
        { min: 1000000, max: null, rate: 9.0 }
      ],
      standardDeduction: 0,
      notes: '4% surtax on income > $1M'
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 8.0
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 6.25
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 500
    }
  },
  
  'Michigan': {
    state: 'Michigan',
    abbreviation: 'MI',
    individualIncomeTax: {
      structure: 'Flat',
      brackets: [{ min: 0, max: null, rate: 4.25 }],
      standardDeduction: 5400
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 6.0
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 6.0
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 25
    }
  },
  
  'Minnesota': {
    state: 'Minnesota',
    abbreviation: 'MN',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 30070, rate: 5.35 },
        { min: 30070, max: 98760, rate: 6.8 },
        { min: 98760, max: 183340, rate: 7.85 },
        { min: 183340, max: null, rate: 9.85 }
      ],
      standardDeduction: 13175
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 9.8
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 6.875
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 0
    }
  },
  
  'Mississippi': {
    state: 'Mississippi',
    abbreviation: 'MS',
    individualIncomeTax: {
      structure: 'Flat',
      brackets: [{ min: 0, max: null, rate: 4.7 }],
      standardDeduction: 2300,
      notes: 'Phasing down, will be 4.0% by 2026'
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 4.0
    },
    additionalTaxes: {
      franchise: true,
      grossReceipts: false,
      salesTax: 7.0
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 0
    }
  },
  
  'Missouri': {
    state: 'Missouri',
    abbreviation: 'MO',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 1207, rate: 0 },
        { min: 1207, max: 2414, rate: 2.0 },
        { min: 2414, max: 3621, rate: 2.5 },
        { min: 3621, max: 4828, rate: 3.0 },
        { min: 4828, max: 6035, rate: 3.5 },
        { min: 6035, max: 7242, rate: 4.0 },
        { min: 7242, max: 8449, rate: 4.5 },
        { min: 8449, max: null, rate: 4.8 }
      ],
      standardDeduction: 13850
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 4.0
    },
    additionalTaxes: {
      franchise: true,
      grossReceipts: false,
      salesTax: 4.225
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 0
    }
  },
  
  'Montana': {
    state: 'Montana',
    abbreviation: 'MT',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 20500, rate: 4.7 },
        { min: 20500, max: 52900, rate: 5.9 },
        { min: 52900, max: null, rate: 6.5 }
      ],
      standardDeduction: 5450
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 6.75
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 0
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 20
    }
  },
  
  'Nebraska': {
    state: 'Nebraska',
    abbreviation: 'NE',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 3700, rate: 2.46 },
        { min: 3700, max: 22170, rate: 3.51 },
        { min: 22170, max: 35730, rate: 5.01 },
        { min: 35730, max: null, rate: 6.64 }
      ],
      standardDeduction: 8100
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 5.2
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 5.5
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 10
    }
  },
  
  'Nevada': {
    state: 'Nevada',
    abbreviation: 'NV',
    individualIncomeTax: {
      structure: 'None',
      brackets: [],
      standardDeduction: 0,
      notes: 'No state income tax'
    },
    corporateIncomeTax: {
      hasTax: false,
      notes: 'No corporate income tax; has commerce tax (GRT)'
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: true,
      salesTax: 6.85,
      notes: 'Commerce tax (gross receipts) over $4M revenue'
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 350,
      stateSpecificRules: 'Annual business license fee + commerce tax if applicable'
    }
  },
  
  'New Hampshire': {
    state: 'New Hampshire',
    abbreviation: 'NH',
    individualIncomeTax: {
      structure: 'None',
      brackets: [],
      standardDeduction: 0,
      notes: 'No wage tax; formerly taxed interest & dividends (repealed)'
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 7.5
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 0
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 100
    }
  },
  
  'New Jersey': {
    state: 'New Jersey',
    abbreviation: 'NJ',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 20000, rate: 1.4 },
        { min: 20000, max: 35000, rate: 1.75 },
        { min: 35000, max: 40000, rate: 3.5 },
        { min: 40000, max: 75000, rate: 5.525 },
        { min: 75000, max: 500000, rate: 6.37 },
        { min: 500000, max: 1000000, rate: 8.97 },
        { min: 1000000, max: null, rate: 10.75 }
      ],
      standardDeduction: 0
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 9.0
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 6.625
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 75
    }
  },
  
  'New Mexico': {
    state: 'New Mexico',
    abbreviation: 'NM',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 5500, rate: 1.7 },
        { min: 5500, max: 11000, rate: 3.2 },
        { min: 11000, max: 16000, rate: 4.7 },
        { min: 16000, max: 210000, rate: 4.9 },
        { min: 210000, max: null, rate: 5.9 }
      ],
      standardDeduction: 13850
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 5.9
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 5.125
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 50
    }
  },
  
  'New York': {
    state: 'New York',
    abbreviation: 'NY',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 8500, rate: 4.0 },
        { min: 8500, max: 11700, rate: 4.5 },
        { min: 11700, max: 13900, rate: 5.25 },
        { min: 13900, max: 80650, rate: 5.5 },
        { min: 80650, max: 215400, rate: 6.0 },
        { min: 215400, max: 1077550, rate: 6.85 },
        { min: 1077550, max: 5000000, rate: 9.65 },
        { min: 5000000, max: 25000000, rate: 10.3 },
        { min: 25000000, max: null, rate: 10.9 }
      ],
      standardDeduction: 8000
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 6.5
    },
    additionalTaxes: {
      franchise: true,
      grossReceipts: false,
      salesTax: 4.0,
      notes: 'NYC adds additional local taxes'
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 25,
      stateSpecificRules: 'Filing fee + potential franchise tax based on income'
    }
  },
  
  'North Carolina': {
    state: 'North Carolina',
    abbreviation: 'NC',
    individualIncomeTax: {
      structure: 'Flat',
      brackets: [{ min: 0, max: null, rate: 4.5 }],
      standardDeduction: 12750
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 2.5
    },
    additionalTaxes: {
      franchise: true,
      grossReceipts: false,
      salesTax: 4.75
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 200
    }
  },
  
  'North Dakota': {
    state: 'North Dakota',
    abbreviation: 'ND',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 44725, rate: 1.95 },
        { min: 44725, max: 105050, rate: 2.5 },
        { min: 105050, max: 225975, rate: 2.7 },
        { min: 225975, max: null, rate: 2.9 }
      ],
      standardDeduction: 13850
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 4.31
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 5.0
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 50
    }
  },
  
  'Ohio': {
    state: 'Ohio',
    abbreviation: 'OH',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 26050, rate: 0 },
        { min: 26050, max: 46100, rate: 2.75 },
        { min: 46100, max: 92150, rate: 3.226 },
        { min: 92150, max: 115300, rate: 3.688 },
        { min: 115300, max: null, rate: 3.75 }
      ],
      standardDeduction: 0
    },
    corporateIncomeTax: {
      hasTax: false,
      notes: 'No corporate income tax; has Commercial Activity Tax (CAT)'
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: true,
      salesTax: 5.75,
      notes: 'Commercial Activity Tax (CAT) on gross receipts'
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 0,
      stateSpecificRules: 'Subject to CAT if receipts > $150k'
    }
  },
  
  'Oklahoma': {
    state: 'Oklahoma',
    abbreviation: 'OK',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 1000, rate: 0.25 },
        { min: 1000, max: 2500, rate: 0.75 },
        { min: 2500, max: 3750, rate: 1.75 },
        { min: 3750, max: 4900, rate: 2.75 },
        { min: 4900, max: 7200, rate: 3.75 },
        { min: 7200, max: null, rate: 4.75 }
      ],
      standardDeduction: 6350
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 4.0
    },
    additionalTaxes: {
      franchise: true,
      grossReceipts: false,
      salesTax: 4.5
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 25
    }
  },
  
  'Oregon': {
    state: 'Oregon',
    abbreviation: 'OR',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 4050, rate: 4.75 },
        { min: 4050, max: 10200, rate: 6.75 },
        { min: 10200, max: 125000, rate: 8.75 },
        { min: 125000, max: null, rate: 9.9 }
      ],
      standardDeduction: 2605
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 6.6
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: true,
      salesTax: 0,
      notes: 'Corporate Activity Tax (CAT) on gross receipts > $1M'
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 100
    }
  },
  
  'Pennsylvania': {
    state: 'Pennsylvania',
    abbreviation: 'PA',
    individualIncomeTax: {
      structure: 'Flat',
      brackets: [{ min: 0, max: null, rate: 3.07 }],
      standardDeduction: 0
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 8.99
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 6.0
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 70
    }
  },
  
  'Rhode Island': {
    state: 'Rhode Island',
    abbreviation: 'RI',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 73450, rate: 3.75 },
        { min: 73450, max: 166950, rate: 4.75 },
        { min: 166950, max: null, rate: 5.99 }
      ],
      standardDeduction: 10400
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 7.0
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 7.0
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 50
    }
  },
  
  'South Carolina': {
    state: 'South Carolina',
    abbreviation: 'SC',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 3200, rate: 0 },
        { min: 3200, max: 16040, rate: 3.0 },
        { min: 16040, max: null, rate: 6.4 }
      ],
      standardDeduction: 13850
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 5.0
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 6.0
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 0
    }
  },
  
  'South Dakota': {
    state: 'South Dakota',
    abbreviation: 'SD',
    individualIncomeTax: {
      structure: 'None',
      brackets: [],
      standardDeduction: 0,
      notes: 'No state income tax'
    },
    corporateIncomeTax: {
      hasTax: false,
      notes: 'No corporate income tax'
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 4.2
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 50
    }
  },
  
  'Tennessee': {
    state: 'Tennessee',
    abbreviation: 'TN',
    individualIncomeTax: {
      structure: 'None',
      brackets: [],
      standardDeduction: 0,
      notes: 'No state income tax'
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 6.5
    },
    additionalTaxes: {
      franchise: true,
      grossReceipts: true,
      salesTax: 7.0,
      notes: 'Franchise & excise tax'
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 300
    }
  },
  
  'Texas': {
    state: 'Texas',
    abbreviation: 'TX',
    individualIncomeTax: {
      structure: 'None',
      brackets: [],
      standardDeduction: 0,
      notes: 'No state income tax'
    },
    corporateIncomeTax: {
      hasTax: false,
      notes: 'No corporate income tax; has franchise tax'
    },
    additionalTaxes: {
      franchise: true,
      grossReceipts: true,
      salesTax: 6.25,
      notes: 'Franchise tax (margin tax) on gross receipts'
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 0,
      stateSpecificRules: 'Franchise tax applies if revenue > $1.23M'
    }
  },
  
  'Utah': {
    state: 'Utah',
    abbreviation: 'UT',
    individualIncomeTax: {
      structure: 'Flat',
      brackets: [{ min: 0, max: null, rate: 4.55 }],
      standardDeduction: 0
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 4.55
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 6.1
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 18
    }
  },
  
  'Vermont': {
    state: 'Vermont',
    abbreviation: 'VT',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 45400, rate: 3.35 },
        { min: 45400, max: 110050, rate: 6.6 },
        { min: 110050, max: 229550, rate: 7.6 },
        { min: 229550, max: null, rate: 8.75 }
      ],
      standardDeduction: 7350
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 6.0
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 6.0
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 35
    }
  },
  
  'Virginia': {
    state: 'Virginia',
    abbreviation: 'VA',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 3000, rate: 2.0 },
        { min: 3000, max: 5000, rate: 3.0 },
        { min: 5000, max: 17000, rate: 5.0 },
        { min: 17000, max: null, rate: 5.75 }
      ],
      standardDeduction: 8000
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 6.0
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 5.3
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 50
    }
  },
  
  'Washington': {
    state: 'Washington',
    abbreviation: 'WA',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 250000, rate: 0 },
        { min: 250000, max: null, rate: 7.0 }
      ],
      standardDeduction: 0,
      notes: 'Capital gains tax only on gains > $250k'
    },
    corporateIncomeTax: {
      hasTax: false,
      notes: 'No corporate income tax'
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: true,
      salesTax: 6.5,
      notes: 'Business & Occupation (B&O) tax on gross receipts'
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 69,
      stateSpecificRules: 'B&O tax applies based on business activity'
    }
  },
  
  'West Virginia': {
    state: 'West Virginia',
    abbreviation: 'WV',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 10000, rate: 2.36 },
        { min: 10000, max: 25000, rate: 3.15 },
        { min: 25000, max: 40000, rate: 3.54 },
        { min: 40000, max: 60000, rate: 4.72 },
        { min: 60000, max: null, rate: 5.12 }
      ],
      standardDeduction: 0
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 6.5
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 6.0
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 25
    }
  },
  
  'Wisconsin': {
    state: 'Wisconsin',
    abbreviation: 'WI',
    individualIncomeTax: {
      structure: 'Graduated',
      brackets: [
        { min: 0, max: 13810, rate: 3.5 },
        { min: 13810, max: 27630, rate: 4.4 },
        { min: 27630, max: 304170, rate: 5.3 },
        { min: 304170, max: null, rate: 7.65 }
      ],
      standardDeduction: 12760
    },
    corporateIncomeTax: {
      hasTax: true,
      rate: 7.9
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 5.0
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 25
    }
  },
  
  'Wyoming': {
    state: 'Wyoming',
    abbreviation: 'WY',
    individualIncomeTax: {
      structure: 'None',
      brackets: [],
      standardDeduction: 0,
      notes: 'No state income tax'
    },
    corporateIncomeTax: {
      hasTax: false,
      notes: 'No corporate income tax'
    },
    additionalTaxes: {
      franchise: false,
      grossReceipts: false,
      salesTax: 4.0
    },
    llcTaxTreatment: {
      defaultFederalTreatment: 'pass-through',
      annualFees: 60
    }
  }
};

// Helper function to get state data
export function getStateTaxData(state: USState): StateTaxConfig {
  return US_STATE_TAX_DATA[state];
}

// Helper function to get all states
export function getAllUSStates(): USState[] {
  return Object.keys(US_STATE_TAX_DATA) as USState[];
}

// Helper function to get states by tax structure
export function getStatesByTaxStructure(structure: TaxStructure): USState[] {
  return getAllUSStates().filter(
    state => US_STATE_TAX_DATA[state].individualIncomeTax.structure === structure
  );
}

// Helper function to get no-income-tax states
export function getNoIncomeTaxStates(): USState[] {
  return getStatesByTaxStructure('None');
}

// Helper function to calculate state income tax
export function calculateStateIncomeTax(
  state: USState,
  income: number
): {
  tax: number;
  effectiveRate: number;
  marginalRate: number;
  breakdown: { bracket: StateTaxBracket; taxInBracket: number }[];
} {
  const config = US_STATE_TAX_DATA[state];
  const { brackets, standardDeduction } = config.individualIncomeTax;
  
  if (brackets.length === 0) {
    return { tax: 0, effectiveRate: 0, marginalRate: 0, breakdown: [] };
  }
  
  const taxableIncome = Math.max(0, income - standardDeduction);
  let totalTax = 0;
  let marginalRate = 0;
  const breakdown: { bracket: StateTaxBracket; taxInBracket: number }[] = [];
  
  for (const bracket of brackets) {
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
  
  return { tax: totalTax, effectiveRate, marginalRate, breakdown };
}

// Get state emoji flag (state abbreviations)
export function getStateAbbreviation(state: USState): string {
  return US_STATE_TAX_DATA[state].abbreviation;
}

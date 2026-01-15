import { Country, CompanyType } from '../tax-calculator';

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
  customIncomeSources: any[];
  notes: string;
  isActive?: boolean;
  employmentStatus?: string;
}

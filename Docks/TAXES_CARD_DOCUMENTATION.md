# Taxes Card - Smart Tax Calculator

## Overview

The **Taxes Card** is a comprehensive tax calculation system that intelligently calculates taxes based on:
- **Country tax laws** (15+ countries supported)
- **Company type** (individual, LLC, corporation, etc.)
- **Income sources** (salary, business, capital gains, dividends, rental, crypto)
- **Deductions and expenses**

## Features

### 🌍 Multi-Country Support

The system supports tax calculations for 15+ countries with accurate tax brackets and rules:

- **USA** - Federal income tax with progressive brackets, capital gains (0-20%), Social Security
- **UK** - PAYE system, personal allowance, National Insurance
- **Canada** - Federal tax system, CPP contributions
- **Germany** - Progressive income tax, solidarity surcharge
- **France** - Progressive tax with PFU flat tax option
- **Australia** - Income tax with Medicare levy
- **Japan** - National and local tax combined
- **Singapore** - Low progressive tax, no capital gains tax
- **UAE** - No personal income tax, 5% VAT
- **Switzerland** - Cantonal and federal tax
- **Netherlands** - Box system taxation
- **Spain** - Progressive income tax
- **Italy** - IRPEF progressive tax
- **Greece** - Progressive income tax
- **Portugal** - IRS progressive tax

### 🏢 Company Type Support

Different company structures are taxed differently. Supported types:

#### Pass-Through Entities (No Corporate Tax)
- **Individual/Employed** - Standard employee taxation
- **Sole Proprietor** - Self-employment tax
- **LLC** (US) - Pass-through by default
- **S Corporation** (US) - Pass-through with reasonable salary requirement
- **Partnership** - Income passes to partners

#### Corporate Entities (Double Taxation)
- **C Corporation** (US) - 21% federal corporate tax + dividend tax
- **Ltd** (UK) - 19% corporate tax
- **GmbH** (Germany) - ~30% combined corporate tax
- **SARL** (France) - 25% corporate tax
- **Pty Ltd** (Australia) - 25% corporate tax
- **KK** (Japan) - 30.62% combined corporate tax
- **Pte Ltd** (Singapore) - 17% corporate tax

### 💰 Income Source Tracking

Track multiple income sources with appropriate tax treatment:

1. **Salary Income** - W-2 wages, taxed at ordinary income rates
2. **Business Income** - Self-employment, Schedule C
3. **Short-term Capital Gains** - Assets held < 1 year (higher tax rate)
4. **Long-term Capital Gains** - Assets held ≥ 1 year (preferential rates)
5. **Dividends** - Qualified vs non-qualified dividend treatment
6. **Rental Income** - Real estate rental income
7. **Crypto Gains** - Cryptocurrency profits (treated as property)

### 📊 Tax Calculation Components

The system calculates:

#### Income Tax
- Progressive tax brackets
- Marginal tax rate (highest bracket you're in)
- Effective tax rate (actual percentage paid)
- Standard deduction or personal allowance

#### Capital Gains Tax
- Short-term rate (same as ordinary income)
- Long-term preferential rate
- Weighted average based on your holdings

#### Dividend Tax
- Country-specific dividend tax rates
- Corporate dividend distribution tax
- One-tier vs two-tier tax systems

#### Corporate Tax (if applicable)
- Corporate income tax on business profits
- Pass-through vs corporate entity treatment

#### Social Security / Payroll Tax
- Employee contributions
- Income caps where applicable
- CPF, National Insurance, etc.

#### VAT/GST
- Standard rates for goods and services
- Information only (not calculated on income)

### 🎯 Tax Optimization Suggestions

The system provides intelligent suggestions based on your profile:

- **Capital Gains Timing** - Hold assets longer for lower rates
- **Business Expense Maximization** - Deduct all eligible expenses
- **Salary vs Dividend Optimization** - For corporate entities
- **Retirement Account Contributions** - Reduce taxable income
- **Tax-Loss Harvesting** - Offset gains with losses
- **Geographic Advantages** - Leverage favorable tax jurisdictions

### 📱 User Interface

#### Dashboard Card
- Shows total tax liability
- Effective tax rate
- Net income after tax
- Quick summary of active profile

#### Hover Preview
- Total income breakdown
- Major tax components
- Net income calculation

#### Full Modal View

**Overview Tab**
- Tax components breakdown
- Income sources visualization
- Effective vs marginal rates
- Four key metrics (Income, Tax, Net, Rate)

**Tax Breakdown Tab**
- Detailed tax calculations
- Income tax with marginal/effective rates
- All tax types with percentages
- VAT/GST information

**Optimization Tips Tab**
- Personalized tax strategies
- Country-specific recommendations
- Company structure suggestions
- Timing and planning tips

#### Profile Management
- Create multiple tax profiles
- Compare different scenarios
- Set one profile as active
- Edit and delete profiles
- Profile switching

## How to Use

### 1. Create Your First Tax Profile

Click **"Add Profile"** and enter:

**Basic Information:**
- Profile Name (e.g., "2024 Tax Year")
- Country (your tax residence)
- Company Type (your employment/business structure)

**Income Sources:**
- Salary/Wages
- Business Income
- Short-term Capital Gains
- Long-term Capital Gains
- Dividends
- Rental Income
- Crypto Gains
- Deductible Expenses

**Settings:**
- Optional notes
- Check "Set as active profile" to use this profile

### 2. View Tax Calculations

Once you create a profile, the card will show:
- Total tax liability
- Effective tax rate
- Net income after all taxes
- Breakdown by tax type

### 3. Explore Tax Breakdown

Click the card to open the detailed view:
- **Overview** - See all tax components and income sources
- **Breakdown** - Detailed rates and calculations
- **Optimization** - Smart suggestions to reduce taxes

### 4. Scenario Planning

Create multiple profiles to compare:
- Different countries
- Company structures
- Income levels
- Investment strategies

Set any profile as "Active" to use it on the dashboard.

## Technical Architecture

### Tax Calculation Engine

**Location:** `lib/tax-calculator.ts`

**Key Functions:**
- `calculateIncomeTax()` - Progressive bracket calculations
- `calculateCapitalGainsTax()` - Short/long term gains
- `calculateTotalTax()` - Comprehensive tax calculation
- `getCompanyTypesForCountry()` - Valid company types per country
- `formatCurrency()` - Locale-specific formatting

**Tax Configuration:**
- `TAX_CONFIGS` - Country-specific tax rules and brackets
- `COMPANY_TAX_RULES` - Company type tax treatment
- All rates updated for 2024/2025 tax year

### Data Storage

**Development:** 
- Currently uses `localStorage` for instant functionality
- No backend required to test

**Production Ready:**
- Supabase schema provided in `supabase-tax-profiles-schema.sql`
- Row Level Security (RLS) enabled
- User data isolation
- Automatic timestamp tracking

**Migration Path:**
- Uncomment Supabase code in `SupabaseDataService`
- Run the SQL schema in your Supabase project
- Data automatically syncs to database

### Component Structure

**Tax Card Component:** `components/financial/taxes-card.tsx`
- `TaxesCard` - Main dashboard card
- `TaxesHoverContent` - Quick preview on hover
- `TaxesModalContent` - Full detailed view
- `AddEditTaxProfileModal` - Profile creation/editing

**Integration:**
- Follows same pattern as other financial cards
- Uses `EnhancedFinancialCard` wrapper
- Supports drag-and-drop reordering
- Can be hidden/shown like other cards

## Database Schema

Run `supabase-tax-profiles-schema.sql` in your Supabase SQL editor:

```sql
-- Creates tax_profiles table
-- Enables Row Level Security
-- Sets up policies for user data isolation
-- Adds indexes for performance
-- Creates update triggers
```

**Table: `tax_profiles`**
- `id` - Unique identifier
- `user_id` - Foreign key to auth.users
- `name` - Profile name
- `country` - Country code
- `company_type` - Business structure
- `salary_income` - W-2 wages
- `business_income` - Self-employment income
- `capital_gains_short_term` - < 1 year gains
- `capital_gains_long_term` - ≥ 1 year gains
- `dividends` - Dividend income
- `rental_income` - Rental property income
- `crypto_gains` - Cryptocurrency gains
- `deductible_expenses` - Business deductions
- `notes` - Optional notes
- `is_active` - Active profile flag
- `created_at` - Timestamp
- `updated_at` - Auto-updated timestamp

## Tax Law Accuracy

**Important Disclaimers:**

⚠️ **This tool provides estimates only**
- Tax laws change frequently
- Individual situations vary
- Many deductions and credits not included
- State/provincial taxes not calculated (US, Canada)
- Always consult a tax professional

**Data Sources:**
- Based on 2024/2025 tax year rules
- Federal/national tax rates only
- Standard deductions and allowances
- Simplified calculations for clarity

**Not Included:**
- Tax credits (child tax credit, etc.)
- Itemized deductions
- Alternative Minimum Tax (AMT)
- State/local taxes
- Marriage filing status variations
- Phase-outs for high earners
- Foreign tax credits
- Specific industry deductions

## Customization

### Adding a New Country

Edit `lib/tax-calculator.ts`:

```typescript
export const TAX_CONFIGS: Record<Country, CountryTaxConfig> = {
  // ... existing countries
  YOUR_COUNTRY: {
    country: 'YOUR_COUNTRY',
    currency: 'USD',
    currencySymbol: '$',
    incomeTaxBrackets: [
      { min: 0, max: 10000, rate: 10 },
      { min: 10000, max: null, rate: 20 }
    ],
    capitalGainsTax: {
      shortTerm: 20,
      longTerm: 15
    },
    dividendTax: 15,
    vatGst: 10,
    socialSecurity: {
      employee: 5,
      employer: 5
    },
    deductions: {
      standard: 5000,
      personalAllowance: 5000
    }
  }
};
```

### Adding a Company Type

```typescript
export const COMPANY_TAX_RULES: Record<string, CompanyTaxRules> = {
  // ... existing types
  your_company_type: {
    companyType: 'your_company_type',
    corporateTaxRate: 21,
    ownerSalaryTaxable: true,
    profitDistributionTax: 20,
    allowsPassThrough: false,
    deductibleExpenses: ['all_business_expenses']
  }
};
```

### Updating Tax Rates

Tax rates are centralized in `TAX_CONFIGS` for easy updates:
1. Find your country in the config
2. Update `incomeTaxBrackets`, `capitalGainsTax`, etc.
3. Changes apply immediately

## Development

### Testing

1. Create a test profile with known values
2. Verify calculations match official tax calculators
3. Test multiple scenarios
4. Compare different countries

### Future Enhancements

Potential features to add:
- [ ] State/provincial tax calculations
- [ ] Tax credit support
- [ ] Multi-year projections
- [ ] Quarterly estimated tax calculator
- [ ] Tax document upload/import
- [ ] Integration with accounting software
- [ ] Real-time tax law updates API
- [ ] Tax professional collaboration
- [ ] Audit risk assessment
- [ ] Tax optimization AI

## Support

**Questions about the feature?**
- Check the code comments in `lib/tax-calculator.ts`
- Review example profiles in the UI
- Compare with official tax calculators

**Tax Law Questions?**
- Consult a licensed tax professional
- Visit your country's tax authority website
- This tool is for estimation only

## License

Part of the Money Hub App financial management system.

---

**Version:** 1.0.0  
**Last Updated:** October 2025  
**Tax Year:** 2024/2025

"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  X, Check, ChevronRight, ChevronLeft, MapPin, Zap,
  BarChart3, Lightbulb, Building2, Info, Layers, Flag,
  Users, Briefcase, CheckCircle2, Calculator, Globe
} from "lucide-react";
import {
  USState, getAllUSStates, getNoIncomeTaxStates, US_STATE_TAX_DATA
} from "@/lib/us-state-tax-data";
import {
  USTaxProfile, USTaxCalculationResult, calculateUSTaxes,
  getStateTaxInsights, getUSSmartSuggestions, compareStates
} from "@/lib/us-tax-wizard-system";
import {
  calculateEUIndividualTax, getEUTaxConfig, getAllEUCountries
} from "@/lib/eu-tax-data";
import { TAX_CONFIGS, Country } from "@/lib/tax-calculator";
import { TaxProfile } from "@/lib/types/tax-profile";

// ─── Country catalogue ────────────────────────────────────────────────────────

interface CountryOption {
  code: string;
  name: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  region: string;
  taxType: "no-income-tax" | "territorial" | "worldwide";
  personalTaxMax: number;
  corporateTax: number;
  notes: string;
}

const COUNTRY_OPTIONS: CountryOption[] = [
  // Zero / very low personal tax
  { code: "UAE", name: "United Arab Emirates", flag: "🇦🇪", currency: "AED", currencySymbol: "د.إ", region: "Middle East", taxType: "no-income-tax", personalTaxMax: 0, corporateTax: 9, notes: "0% personal income tax. 9% CIT since 2023. No CGT. Popular expat hub." },
  { code: "Saudi Arabia", name: "Saudi Arabia", flag: "🇸🇦", currency: "SAR", currencySymbol: "﷼", region: "Middle East", taxType: "no-income-tax", personalTaxMax: 0, corporateTax: 20, notes: "0% personal income tax for residents. 20% CIT on foreign-owned entities. Zakat for Saudi nationals." },
  { code: "Qatar", name: "Qatar", flag: "🇶🇦", currency: "QAR", currencySymbol: "﷼", region: "Middle East", taxType: "no-income-tax", personalTaxMax: 0, corporateTax: 10, notes: "No personal income tax. 10% CIT. QFC entities may qualify for 10% or 0%." },
  { code: "Bahrain", name: "Bahrain", flag: "🇧🇭", currency: "BHD", currencySymbol: "BD", region: "Middle East", taxType: "no-income-tax", personalTaxMax: 0, corporateTax: 0, notes: "No income tax and no corporate tax (except oil sector). VAT 10%." },
  { code: "Kuwait", name: "Kuwait", flag: "🇰🇼", currency: "KWD", currencySymbol: "KD", region: "Middle East", taxType: "no-income-tax", personalTaxMax: 0, corporateTax: 15, notes: "No personal income tax. 15% CIT on foreign companies only." },
  { code: "Singapore", name: "Singapore", flag: "🇸🇬", currency: "SGD", currencySymbol: "S$", region: "Asia-Pacific", taxType: "territorial", personalTaxMax: 24, corporateTax: 17, notes: "Territorial — foreign income not taxed if not remitted. No capital gains tax. Effective rate ~8.5% for SMEs." },
  { code: "Hong Kong", name: "Hong Kong", flag: "🇭🇰", currency: "HKD", currencySymbol: "HK$", region: "Asia-Pacific", taxType: "territorial", personalTaxMax: 17, corporateTax: 16.5, notes: "Territorial. Max salaries tax 17% (or 15% standard rate). No CGT, no inheritance tax, no VAT." },
  { code: "Cayman Islands", name: "Cayman Islands", flag: "🇰🇾", currency: "KYD", currencySymbol: "CI$", region: "Americas", taxType: "no-income-tax", personalTaxMax: 0, corporateTax: 0, notes: "No income, corporate or capital gains taxes. Popular offshore jurisdiction." },

  // USA
  { code: "USA", name: "United States", flag: "🇺🇸", currency: "USD", currencySymbol: "$", region: "Americas", taxType: "worldwide", personalTaxMax: 37, corporateTax: 21, notes: "Federal 10–37% + state income tax. Worldwide taxation including US citizens abroad. SALT deduction capped." },

  // Europe — favorable / special regimes
  { code: "Estonia", name: "Estonia", flag: "🇪🇪", currency: "EUR", currencySymbol: "€", region: "Europe", taxType: "worldwide", personalTaxMax: 22, corporateTax: 0, notes: "0% CIT on retained profits — only distributed profits taxed at 20%. e-Residency program. EU member." },
  { code: "Ireland", name: "Ireland", flag: "🇮🇪", currency: "EUR", currencySymbol: "€", region: "Europe", taxType: "worldwide", personalTaxMax: 40, corporateTax: 12.5, notes: "12.5% CIT on trading income — one of EU's lowest. 15% minimum for large groups (Pillar 2). EU gateway." },
  { code: "Portugal", name: "Portugal", flag: "🇵🇹", currency: "EUR", currencySymbol: "€", region: "Europe", taxType: "worldwide", personalTaxMax: 53, corporateTax: 21, notes: "NHR regime: 10% flat on foreign income for 10 years. Golden Visa. Popular for digital nomads and retirees." },
  { code: "Greece", name: "Greece", flag: "🇬🇷", currency: "EUR", currencySymbol: "€", region: "Europe", taxType: "worldwide", personalTaxMax: 44, corporateTax: 22, notes: "7% flat on foreign-source pension (retirees). 100k€ flat tax for HNWIs moving residency to Greece." },
  { code: "Italy", name: "Italy", flag: "🇮🇹", currency: "EUR", currencySymbol: "€", region: "Europe", taxType: "worldwide", personalTaxMax: 43, corporateTax: 24, notes: "100k€ annual flat tax for new residents on all foreign income. 7% flat in southern regions for retirees." },
  { code: "Spain", name: "Spain", flag: "🇪🇸", currency: "EUR", currencySymbol: "€", region: "Europe", taxType: "worldwide", personalTaxMax: 47, corporateTax: 25, notes: "Beckham Law: 24% flat tax for first 6 years for qualifying expat employees. Golden Visa program." },
  { code: "Malta", name: "Malta", flag: "🇲🇹", currency: "EUR", currencySymbol: "€", region: "Europe", taxType: "worldwide", personalTaxMax: 35, corporateTax: 5, notes: "Effective CIT ~5% with refund system. Non-dom status available for expats. EU member." },
  { code: "Cyprus", name: "Cyprus", flag: "🇨🇾", currency: "EUR", currencySymbol: "€", region: "Europe", taxType: "territorial", personalTaxMax: 35, corporateTax: 12.5, notes: "12.5% CIT. Non-dom: no tax on dividends/interest for 17 years. 0% CGT (except local property). EU member." },
  { code: "Switzerland", name: "Switzerland", flag: "🇨🇭", currency: "CHF", currencySymbol: "Fr", region: "Europe", taxType: "worldwide", personalTaxMax: 13, corporateTax: 19, notes: "Federal income tax ~11.5%. Canton rates vary widely. Lump-sum taxation for HNWIs. No capital gains tax (individuals)." },
  { code: "Germany", name: "Germany", flag: "🇩🇪", currency: "EUR", currencySymbol: "€", region: "Europe", taxType: "worldwide", personalTaxMax: 45, corporateTax: 30, notes: "45% top rate + solidarity surcharge. High social security (~20%). Church tax optional. Trade tax on business." },
  { code: "France", name: "France", flag: "🇫🇷", currency: "EUR", currencySymbol: "€", region: "Europe", taxType: "worldwide", personalTaxMax: 45, corporateTax: 25, notes: "High social charges (~22% employee). 30% flat tax (PFU) on investment income. ISF wealth tax abolished." },
  { code: "Netherlands", name: "Netherlands", flag: "🇳🇱", currency: "EUR", currencySymbol: "€", region: "Europe", taxType: "worldwide", personalTaxMax: 49.5, corporateTax: 25.8, notes: "30% ruling for expats (net salary uplift for 5 years). Box system: Box 3 deemed return on investments." },
  { code: "Belgium", name: "Belgium", flag: "🇧🇪", currency: "EUR", currencySymbol: "€", region: "Europe", taxType: "worldwide", personalTaxMax: 50, corporateTax: 25, notes: "50% top rate + communal surcharges. No CGT on shares held >5y. 15% withholding on dividends." },
  { code: "UK", name: "United Kingdom", flag: "🇬🇧", currency: "GBP", currencySymbol: "£", region: "Europe", taxType: "worldwide", personalTaxMax: 45, corporateTax: 25, notes: "45% additional rate. Non-dom status abolished April 2025. ISA allowances £20k/yr. 18-28% CGT on property." },
  { code: "Sweden", name: "Sweden", flag: "🇸🇪", currency: "SEK", currencySymbol: "kr", region: "Europe", taxType: "worldwide", personalTaxMax: 57, corporateTax: 20.6, notes: "Top rate ~57% (state + municipal). 20.6% CIT. No wealth tax. ISK account for tax-efficient investing." },
  { code: "Denmark", name: "Denmark", flag: "🇩🇰", currency: "DKK", currencySymbol: "kr", region: "Europe", taxType: "worldwide", personalTaxMax: 55.9, corporateTax: 22, notes: "Top rate 55.9% (state + municipal). 22% CIT. Researcher scheme: 32.84% flat for expat researchers." },
  { code: "Norway", name: "Norway", flag: "🇳🇴", currency: "NOK", currencySymbol: "kr", region: "Europe", taxType: "worldwide", personalTaxMax: 47.4, corporateTax: 22, notes: "22% CIT. 22% base personal + 15% progression. Wealth tax applies. Oil/gas sector ~78% effective rate." },
  { code: "Poland", name: "Poland", flag: "🇵🇱", currency: "PLN", currencySymbol: "zł", region: "Europe", taxType: "worldwide", personalTaxMax: 32, corporateTax: 19, notes: "32% top rate (>120k PLN). Estonian CIT model available (0% on retained profits). IP Box: 5% for qualifying IP income." },

  // Asia-Pacific
  { code: "Japan", name: "Japan", flag: "🇯🇵", currency: "JPY", currencySymbol: "¥", region: "Asia-Pacific", taxType: "worldwide", personalTaxMax: 55, corporateTax: 23.2, notes: "45% national + 10% inhabitant tax = ~55%. Worldwide taxation applies after 5 years residency." },
  { code: "South Korea", name: "South Korea", flag: "🇰🇷", currency: "KRW", currencySymbol: "₩", region: "Asia-Pacific", taxType: "worldwide", personalTaxMax: 49.5, corporateTax: 24, notes: "45% top rate + 10% local = 49.5%. High inheritance/gift taxes. Social security ~8%." },
  { code: "Thailand", name: "Thailand", flag: "🇹🇭", currency: "THB", currencySymbol: "฿", region: "Asia-Pacific", taxType: "territorial", personalTaxMax: 35, corporateTax: 20, notes: "Territorial: foreign income taxed only if remitted in same year. LTR Visa: 17% flat tax for HNWIs. Elite Visa available." },
  { code: "Malaysia", name: "Malaysia", flag: "🇲🇾", currency: "MYR", currencySymbol: "RM", region: "Asia-Pacific", taxType: "territorial", personalTaxMax: 30, corporateTax: 24, notes: "Territorial. Foreign remittances now taxable (since 2024 for most residents). MM2H visa for long-stay." },
  { code: "Australia", name: "Australia", flag: "🇦🇺", currency: "AUD", currencySymbol: "A$", region: "Asia-Pacific", taxType: "worldwide", personalTaxMax: 45, corporateTax: 30, notes: "50% CGT discount for assets held >1 year. Superannuation 11.5% mandatory. Medicare levy 2%." },
  { code: "New Zealand", name: "New Zealand", flag: "🇳🇿", currency: "NZD", currencySymbol: "NZ$", region: "Asia-Pacific", taxType: "worldwide", personalTaxMax: 39, corporateTax: 28, notes: "No CGT (except specific situations). KiwiSaver 3% employee contribution. 39% top rate on income >$180k." },
  { code: "Indonesia", name: "Indonesia", flag: "🇮🇩", currency: "IDR", currencySymbol: "Rp", region: "Asia-Pacific", taxType: "worldwide", personalTaxMax: 35, corporateTax: 22, notes: "35% top rate. Territorial for non-residents. Tax holiday incentives in special economic zones." },

  // Americas
  { code: "Canada", name: "Canada", flag: "🇨🇦", currency: "CAD", currencySymbol: "C$", region: "Americas", taxType: "worldwide", personalTaxMax: 33, corporateTax: 15, notes: "Federal 33% + provincial up to ~25%. TFSA and RRSP tax wrappers. 50% CGT inclusion rate (proposed changes)." },
  { code: "Mexico", name: "Mexico", flag: "🇲🇽", currency: "MXN", currencySymbol: "$", region: "Americas", taxType: "worldwide", personalTaxMax: 35, corporateTax: 30, notes: "35% top rate. Worldwide taxation. IETU and levies on businesses. Wealth of treaty network." },
  { code: "Brazil", name: "Brazil", flag: "🇧🇷", currency: "BRL", currencySymbol: "R$", region: "Americas", taxType: "worldwide", personalTaxMax: 27.5, corporateTax: 34, notes: "IRPJ (15%) + CSLL (9%) + CSSL surtax = ~34% effective CIT. IOF on forex. High compliance burden." },
  { code: "Panama", name: "Panama", flag: "🇵🇦", currency: "USD", currencySymbol: "$", region: "Americas", taxType: "territorial", personalTaxMax: 25, corporateTax: 25, notes: "Territorial system — foreign income not taxed. No CGT on offshore gains. Pensionado visa popular." },
  { code: "Paraguay", name: "Paraguay", flag: "🇵🇾", currency: "PYG", currencySymbol: "₲", region: "Americas", taxType: "territorial", personalTaxMax: 10, corporateTax: 10, notes: "10% flat tax on all income (territorial). Very low cost of living. Easy residency for investors." },
  { code: "Uruguay", name: "Uruguay", flag: "🇺🇾", currency: "UYU", currencySymbol: "$U", region: "Americas", taxType: "territorial", personalTaxMax: 36, corporateTax: 25, notes: "Territorial on foreign income for first 11 years. 7-36% progressive personal. Stable and transparent." },
];

const REGIONS = ["All", "Middle East", "Europe", "Americas", "Asia-Pacific"];

// ─── US-specific constants ─────────────────────────────────────────────────────

const FILING_STATUSES = [
  { id: "single", label: "Single", icon: "👤", desc: "Not married" },
  { id: "married-joint", label: "Married Joint", icon: "👫", desc: "Filing together" },
  { id: "married-separate", label: "Married Separate", icon: "👤👤", desc: "Filing apart" },
  { id: "head-of-household", label: "Head of Household", icon: "🏠", desc: "Unmarried with dependents" },
] as const;

const EMPLOYMENT_STATUSES = [
  { id: "employed", label: "Employee", icon: "💼", desc: "Salary / wages from employer" },
  { id: "self-employed", label: "Self-Employed", icon: "🏢", desc: "Freelancer / founder / contractor" },
  { id: "unemployed", label: "Passive / Investor", icon: "📊", desc: "Investment income only" },
  { id: "retired", label: "Retired", icon: "🏖️", desc: "Pension / retirement income" },
] as const;

const BUSINESS_TYPES = [
  { id: "sole-proprietor", label: "Sole Proprietor", desc: "Schedule C, simplest structure" },
  { id: "llc", label: "LLC", desc: "Pass-through + liability protection" },
  { id: "s-corp", label: "S-Corp", desc: "Reduce SE tax on higher income" },
  { id: "c-corp", label: "C-Corp", desc: "21% flat corporate rate" },
  { id: "partnership", label: "Partnership", desc: "Multiple owners, pass-through" },
] as const;

// ─── Cross-border presets ──────────────────────────────────────────────────────

interface CrossBorderPreset {
  id: string;
  label: string;
  icon: string;
  residencyCountry: string;
  companyCountry: string;
  tag: string;
  benefit: string;
  desc: string;
}

const CROSS_BORDER_PRESETS: CrossBorderPreset[] = [
  { id: "uae-estonia", label: "UAE + Estonian OÜ", icon: "🇦🇪🇪🇪", residencyCountry: "UAE", companyCountry: "Estonia", tag: "Most Popular", benefit: "~0% on retained profits", desc: "0% UAE personal tax + 0% Estonian CIT on retained profits (only distributed dividends taxed)" },
  { id: "uae-uk", label: "UAE + UK Ltd", icon: "🇦🇪🇬🇧", residencyCountry: "UAE", companyCountry: "UK", tag: "Popular for Brits", benefit: "0% personal, 25% corporate", desc: "No UAE personal income tax. UK Ltd pays 25% CIT. No personal dividend tax if resident in UAE." },
  { id: "uae-sg", label: "UAE + Singapore Pte", icon: "🇦🇪🇸🇬", residencyCountry: "UAE", companyCountry: "Singapore", tag: "Asia-MENA", benefit: "~8–12% effective rate", desc: "UAE personal tax 0% + Singapore CIT 17% with startup exemptions. Strong treaty network." },
  { id: "portugal-nhr", label: "Portugal NHR", icon: "🇵🇹", residencyCountry: "Portugal", companyCountry: "Portugal", tag: "EU Gateway", benefit: "10% flat on foreign income", desc: "Non-Habitual Resident: 10% flat on foreign-source income for 10 years. Full EU residency + DTA network." },
  { id: "cyprus-nondom", label: "Cyprus Non-Dom", icon: "🇨🇾", residencyCountry: "Cyprus", companyCountry: "Cyprus", tag: "EU + 0% Dividends", benefit: "0% on dividends/interest 17yr", desc: "Non-dom status: 0% on dividends and interest income for 17 years. 12.5% CIT. EU member state." },
  { id: "singapore-resident", label: "Singapore Resident", icon: "🇸🇬", residencyCountry: "Singapore", companyCountry: "Singapore", tag: "Asia Hub", benefit: "~8.5% effective corporate", desc: "Territorial system, no CGT, no dividend tax. 17% CIT with partial exemptions for SMEs." },
  { id: "thailand-ltr", label: "Thailand LTR Visa", icon: "🇹🇭", residencyCountry: "Thailand", companyCountry: "UAE", tag: "Lifestyle + 0%", benefit: "17% flat or 0% on non-remitted", desc: "LTR Visa: 17% flat income tax for eligible HNWIs. Foreign income not remitted = not taxed." },
  { id: "paraguay-flat", label: "Paraguay Flat Tax", icon: "🇵🇾", residencyCountry: "Paraguay", companyCountry: "Paraguay", tag: "Ultra-Low Tax", benefit: "10% flat, territorial", desc: "10% flat tax, territorial system. One of the lowest-tax countries with easy residency for investors." },
];

// ─── Tax calculation engine ────────────────────────────────────────────────────

interface GlobalCalcResult {
  grossIncome: number;
  incomeTax: number;
  socialSecurity: number;
  capitalGainsTax: number;
  dividendTax: number;
  totalTax: number;
  effectiveRate: number;
  netIncome: number;
  breakdown: { label: string; value: number; rate: number; color: string }[];
  topMarginalRate: number;
  currency: string;
  currencySymbol: string;
}

function calcGlobal(
  countryCode: string,
  salary: number,
  business: number,
  capitalGains: number,
  dividends: number,
  rental: number,
  other: number,
  deductions: number,
  crossBorder: boolean,
  companyCountry: string
): GlobalCalcResult {
  const opt = COUNTRY_OPTIONS.find((c) => c.code === countryCode);
  const symbol = opt?.currencySymbol ?? "$";
  const currency = opt?.currency ?? "USD";
  const gross = salary + business + capitalGains + dividends + rental + other;

  if (gross === 0) {
    return { grossIncome: 0, incomeTax: 0, socialSecurity: 0, capitalGainsTax: 0, dividendTax: 0, totalTax: 0, effectiveRate: 0, netIncome: 0, breakdown: [], topMarginalRate: 0, currency, currencySymbol: symbol };
  }

  // Zero personal tax countries
  const zeroTaxCountries = ["UAE", "Saudi Arabia", "Qatar", "Bahrain", "Kuwait", "Cayman Islands"];
  if (zeroTaxCountries.includes(countryCode)) {
    let corpTax = 0;
    let corpLabel = "";
    if (crossBorder && business > 0) {
      if (companyCountry === "Estonia") {
        corpTax = 0; corpLabel = "Estonia OÜ (retained, 0%)";
      } else {
        const cfg = TAX_CONFIGS[companyCountry as Country];
        if (cfg) {
          let t = 0;
          for (const b of cfg.incomeTaxBrackets) {
            if (business <= b.min) break;
            const bMax = b.max ?? Infinity;
            t += ((Math.min(business, bMax) - b.min) * b.rate) / 100;
          }
          corpTax = t; corpLabel = `${companyCountry} corp tax`;
        }
      }
    }
    const totalTax = corpTax;
    return {
      grossIncome: gross, incomeTax: 0, socialSecurity: 0, capitalGainsTax: 0, dividendTax: 0,
      totalTax, effectiveRate: gross > 0 ? (totalTax / gross) * 100 : 0, netIncome: gross - totalTax,
      topMarginalRate: 0, currency, currencySymbol: symbol,
      breakdown: [
        ...(corpTax > 0 ? [{ label: corpLabel || "Corporate Tax", value: corpTax, rate: (corpTax / gross) * 100, color: "#f97316" }] : []),
        { label: "Personal Income Tax", value: 0, rate: 0, color: "#22c55e" },
      ],
    };
  }

  // EU countries
  const euCountries = getAllEUCountries();
  if (euCountries.includes(countryCode)) {
    try {
      const taxableIncome = Math.max(0, salary + other - deductions);
      const result = calculateEUIndividualTax(countryCode, taxableIncome, capitalGains, dividends);
      const cfg = getEUTaxConfig(countryCode);
      const topRate = cfg?.personalIncomeTax.topRate ?? 30;
      const rentalTax = (rental * topRate) / 100;
      const businessTax = (business * topRate) / 100;
      const totalTax = result.totalTax + rentalTax + businessTax;

      return {
        grossIncome: gross, incomeTax: result.incomeTax + businessTax,
        socialSecurity: result.socialSecurity, capitalGainsTax: result.capitalGainsTax,
        dividendTax: result.dividendTax, totalTax,
        effectiveRate: gross > 0 ? (totalTax / gross) * 100 : 0,
        netIncome: gross - totalTax, topMarginalRate: topRate, currency, currencySymbol: symbol,
        breakdown: [
          { label: "Income Tax", value: result.incomeTax + businessTax, rate: gross > 0 ? ((result.incomeTax + businessTax) / gross) * 100 : 0, color: "#ef4444" },
          ...(result.socialSecurity > 0 ? [{ label: "Social Security", value: result.socialSecurity, rate: gross > 0 ? (result.socialSecurity / gross) * 100 : 0, color: "#f97316" }] : []),
          ...(result.capitalGainsTax > 0 ? [{ label: "Capital Gains Tax", value: result.capitalGainsTax, rate: gross > 0 ? (result.capitalGainsTax / gross) * 100 : 0, color: "#eab308" }] : []),
          ...(result.dividendTax > 0 ? [{ label: "Dividend Tax", value: result.dividendTax, rate: gross > 0 ? (result.dividendTax / gross) * 100 : 0, color: "#a855f7" }] : []),
          ...(rentalTax > 0 ? [{ label: "Rental Income Tax", value: rentalTax, rate: gross > 0 ? (rentalTax / gross) * 100 : 0, color: "#06b6d4" }] : []),
        ],
      };
    } catch { /* fallthrough */ }
  }

  // Territorial countries (Thailand, Malaysia, Singapore, Panama, etc.)
  if (opt?.taxType === "territorial") {
    const cfg = TAX_CONFIGS[countryCode as Country];
    if (cfg) {
      const taxableLocal = Math.max(0, salary + other - deductions - cfg.deductions.personalAllowance - cfg.deductions.standard);
      let incomeTax = 0; let topMarginalRate = 0;
      for (const b of cfg.incomeTaxBrackets) {
        if (taxableLocal <= b.min) break;
        const bMax = b.max ?? Infinity;
        const t = Math.min(taxableLocal, bMax) - b.min;
        if (t > 0) { incomeTax += (t * b.rate) / 100; topMarginalRate = b.rate; }
      }
      const ss = cfg.socialSecurity ? (Math.min(gross, cfg.socialSecurity.cap ?? Infinity) * cfg.socialSecurity.employee) / 100 : 0;
      const cgTax = (capitalGains * cfg.capitalGainsTax.longTerm) / 100;
      const divTax = (dividends * cfg.dividendTax) / 100;
      const totalTax = incomeTax + ss + cgTax + divTax;
      return {
        grossIncome: gross, incomeTax, socialSecurity: ss, capitalGainsTax: cgTax, dividendTax: divTax,
        totalTax, effectiveRate: gross > 0 ? (totalTax / gross) * 100 : 0, netIncome: gross - totalTax,
        topMarginalRate, currency, currencySymbol: symbol,
        breakdown: [
          ...(incomeTax > 0 ? [{ label: "Income Tax", value: incomeTax, rate: gross > 0 ? (incomeTax / gross) * 100 : 0, color: "#ef4444" }] : []),
          ...(ss > 0 ? [{ label: "Social Security", value: ss, rate: gross > 0 ? (ss / gross) * 100 : 0, color: "#f97316" }] : []),
          ...(cgTax > 0 ? [{ label: "Capital Gains Tax", value: cgTax, rate: gross > 0 ? (cgTax / gross) * 100 : 0, color: "#eab308" }] : []),
          ...(divTax > 0 ? [{ label: "Dividend Tax", value: divTax, rate: gross > 0 ? (divTax / gross) * 100 : 0, color: "#a855f7" }] : []),
        ],
      };
    }
  }

  // Generic from TAX_CONFIGS (Japan, Korea, Australia, Canada, etc.)
  const cfg = TAX_CONFIGS[countryCode as Country];
  if (cfg) {
    const taxable = Math.max(0, salary + other + business - deductions - cfg.deductions.personalAllowance - cfg.deductions.standard);
    let incomeTax = 0; let topMarginalRate = 0;
    for (const b of cfg.incomeTaxBrackets) {
      if (taxable <= b.min) break;
      const bMax = b.max ?? Infinity;
      const t = Math.min(taxable, bMax) - b.min;
      if (t > 0) { incomeTax += (t * b.rate) / 100; topMarginalRate = b.rate; }
    }
    const ss = cfg.socialSecurity ? (Math.min(gross, cfg.socialSecurity.cap ?? Infinity) * cfg.socialSecurity.employee) / 100 : 0;
    const cgTax = (capitalGains * cfg.capitalGainsTax.longTerm) / 100;
    const divTax = (dividends * cfg.dividendTax) / 100;
    const totalTax = incomeTax + ss + cgTax + divTax;
    return {
      grossIncome: gross, incomeTax, socialSecurity: ss, capitalGainsTax: cgTax, dividendTax: divTax,
      totalTax, effectiveRate: gross > 0 ? (totalTax / gross) * 100 : 0, netIncome: gross - totalTax,
      topMarginalRate, currency, currencySymbol: symbol,
      breakdown: [
        ...(incomeTax > 0 ? [{ label: "Income Tax", value: incomeTax, rate: gross > 0 ? (incomeTax / gross) * 100 : 0, color: "#ef4444" }] : []),
        ...(ss > 0 ? [{ label: "Social Security", value: ss, rate: gross > 0 ? (ss / gross) * 100 : 0, color: "#f97316" }] : []),
        ...(cgTax > 0 ? [{ label: "Capital Gains Tax", value: cgTax, rate: gross > 0 ? (cgTax / gross) * 100 : 0, color: "#eab308" }] : []),
        ...(divTax > 0 ? [{ label: "Dividend Tax", value: divTax, rate: gross > 0 ? (divTax / gross) * 100 : 0, color: "#a855f7" }] : []),
      ],
    };
  }

  // Fallback (no data)
  return { grossIncome: gross, incomeTax: 0, socialSecurity: 0, capitalGainsTax: 0, dividendTax: 0, totalTax: 0, effectiveRate: 0, netIncome: gross, topMarginalRate: 0, currency, currencySymbol: symbol, breakdown: [] };
}

// ─── Reusable UI ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color = "white", large = false }: { label: string; value: string; sub?: string; color?: "white" | "red" | "green" | "blue" | "orange"; large?: boolean }) {
  const cls = { white: "text-white", red: "text-red-400", green: "text-emerald-400", blue: "text-blue-400", orange: "text-orange-400" }[color];
  return (
    <div className="bg-[#111] rounded-xl p-4 border border-white/5">
      <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">{label}</div>
      <div className={`font-mono font-bold ${large ? "text-2xl" : "text-lg"} ${cls}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function CurrencyInput({ label, value, onChange, hint, optional, symbol = "$" }: { label: string; value: number; onChange: (n: number) => void; hint?: string; optional?: boolean; symbol?: string }) {
  const [raw, setRaw] = useState(value === 0 ? "" : String(value));
  useEffect(() => { setRaw(value === 0 ? "" : String(value)); }, [value]);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-gray-400">{label}</label>
        {optional && <span className="text-[10px] text-gray-600 uppercase tracking-wider">Optional</span>}
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{symbol}</span>
        <input type="number" min={0} step={1000} value={raw}
          onChange={(e) => { setRaw(e.target.value); onChange(parseFloat(e.target.value) || 0); }}
          onFocus={() => { if (value === 0) setRaw(""); }}
          onBlur={() => { if (raw === "") { setRaw(""); onChange(0); } }}
          placeholder="0"
          className="w-full pl-8 pr-4 py-3 bg-[#111] border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder-gray-700 transition-all"
        />
      </div>
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

function CountryPicker({ value, onChange, label }: { value: string; onChange: (c: string) => void; label?: string }) {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("All");
  const [open, setOpen] = useState(false);
  const sel = COUNTRY_OPTIONS.find((c) => c.code === value);
  const filtered = COUNTRY_OPTIONS.filter((c) => {
    const rOk = region === "All" || c.region === region;
    const qOk = !q || c.name.toLowerCase().includes(q.toLowerCase());
    return rOk && qOk;
  });
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${open ? "bg-[#1A1A1A] border-blue-500/50 ring-2 ring-blue-500/20" : "bg-[#1A1A1A] border-white/10 hover:bg-white/5"}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{sel?.flag ?? "🌍"}</span>
          <div className="text-left">
            <div className="font-bold text-white">{sel?.name ?? (label ?? "Select Country")}</div>
            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
              <span>{sel?.currency}</span>
              {sel && <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${sel.taxType === "no-income-tax" ? "bg-emerald-500/20 text-emerald-400" : sel.taxType === "territorial" ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"}`}>{sel.taxType === "no-income-tax" ? "0% Personal" : sel.taxType === "territorial" ? "Territorial" : "Worldwide"}</span>}
            </div>
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-full bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-3 border-b border-white/10 space-y-2">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search country…" className="w-full bg-black/30 text-white text-sm px-3 py-2 rounded-lg border border-white/10 outline-none focus:ring-2 focus:ring-blue-500/40" />
            <div className="flex gap-1 flex-wrap">
              {REGIONS.map((r) => <button key={r} onClick={() => setRegion(r)} className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${region === r ? "bg-blue-500 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>{r}</button>)}
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2 space-y-0.5">
            {filtered.map((c) => (
              <button key={c.code} onClick={() => { onChange(c.code); setOpen(false); setQ(""); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${c.code === value ? "bg-blue-500/20 text-blue-400" : "hover:bg-white/5 text-white"}`}>
                <span className="text-xl flex-shrink-0">{c.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{c.name}</div>
                  <div className="text-[10px] text-gray-500 truncate">{c.notes.slice(0, 58)}…</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-xs font-bold ${c.personalTaxMax === 0 ? "text-emerald-400" : c.personalTaxMax < 25 ? "text-blue-400" : "text-gray-400"}`}>{c.personalTaxMax === 0 ? "0%" : `↑${c.personalTaxMax}%`}</div>
                  <div className="text-[10px] text-gray-600">personal</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatePicker({ value, onChange }: { value: USState; onChange: (s: USState) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  // Deduplicated, sorted list
  const allStates = useMemo(() => {
    const seen = new Set<string>();
    return getAllUSStates().filter((s) => { if (seen.has(s)) return false; seen.add(s); return true; }).sort() as USState[];
  }, []);
  const noTax = useMemo(() => new Set(getNoIncomeTaxStates()), []);
  const filtered = q ? allStates.filter((s) => s.toLowerCase().includes(q.toLowerCase())) : allStates;
  // No-tax states first, then alphabetical
  const sorted = q ? filtered : [...filtered.filter(s => noTax.has(s)), ...filtered.filter(s => !noTax.has(s))];
  const topRate = US_STATE_TAX_DATA[value]?.individualIncomeTax?.brackets?.slice(-1)[0]?.rate ?? 0;

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${open ? "bg-[#1A1A1A] border-blue-500/50 ring-2 ring-blue-500/20" : "bg-[#1A1A1A] border-white/10 hover:bg-white/5"}`}>
        <div className="flex items-center gap-3">
          <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <div>
            <div className="font-bold text-white">{value}</div>
            <div className="text-xs mt-0.5">{noTax.has(value) ? <span className="text-emerald-400 font-semibold">✨ No State Income Tax</span> : <span className="text-gray-400">Top rate: {topRate}%</span>}</div>
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-full bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-3 border-b border-white/10">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search state…" className="w-full bg-black/30 text-white text-sm px-3 py-2 rounded-lg border border-white/10 outline-none focus:ring-2 focus:ring-blue-500/40" />
          </div>
          <div className="max-h-[280px] overflow-y-auto p-2">
            {!q && <div className="px-2 pt-1 pb-0.5 text-[10px] text-gray-500 font-bold uppercase tracking-wider">✨ No Income Tax States</div>}
            {sorted.map((s) => {
              const isNoTax = noTax.has(s);
              const rate = US_STATE_TAX_DATA[s]?.individualIncomeTax?.brackets?.slice(-1)[0]?.rate ?? 0;
              return (
                <button key={s} onClick={() => { onChange(s); setOpen(false); setQ(""); }}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${s === value ? "bg-blue-500/20 text-blue-400" : "hover:bg-white/5 text-white"}`}>
                  <span className="font-medium text-sm">{s}</span>
                  <span className={`text-xs ${isNoTax ? "text-emerald-400 font-semibold" : "text-gray-400"}`}>{isNoTax ? "No Tax" : `${rate}%`}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BracketBar({ taxableIncome, filingStatus }: { taxableIncome: number; filingStatus: USTaxProfile["filingStatus"] }) {
  const brackets = filingStatus === "married-joint"
    ? [{ min: 0, max: 23200, rate: 10, color: "#22c55e" }, { min: 23200, max: 94300, rate: 12, color: "#84cc16" }, { min: 94300, max: 201050, rate: 22, color: "#eab308" }, { min: 201050, max: 383900, rate: 24, color: "#f97316" }, { min: 383900, max: 487450, rate: 32, color: "#ef4444" }, { min: 487450, max: 731200, rate: 35, color: "#dc2626" }, { min: 731200, max: Infinity, rate: 37, color: "#991b1b" }]
    : [{ min: 0, max: 11600, rate: 10, color: "#22c55e" }, { min: 11600, max: 47150, rate: 12, color: "#84cc16" }, { min: 47150, max: 100525, rate: 22, color: "#eab308" }, { min: 100525, max: 191950, rate: 24, color: "#f97316" }, { min: 191950, max: 243725, rate: 32, color: "#ef4444" }, { min: 243725, max: 609350, rate: 35, color: "#dc2626" }, { min: 609350, max: Infinity, rate: 37, color: "#991b1b" }];
  const maxDisplay = Math.max(taxableIncome * 1.2, 100000);
  let marginalRate = 0;
  for (const b of brackets) { if (taxableIncome > b.min) marginalRate = b.rate; }
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 font-medium">Federal Tax Brackets</span>
        <span className="text-xs font-bold text-orange-400">Marginal: {marginalRate}%</span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {brackets.map((b) => {
          const bMax = b.max === Infinity ? maxDisplay : Math.min(b.max, maxDisplay);
          const width = ((bMax - b.min) / maxDisplay) * 100;
          const filled = taxableIncome > b.min;
          const partial = filled && taxableIncome < (b.max === Infinity ? Infinity : b.max);
          const pct = partial ? ((taxableIncome - b.min) / (bMax - b.min)) * 100 : filled ? 100 : 0;
          return (
            <div key={b.rate} className="relative rounded-sm overflow-hidden" style={{ width: `${width}%`, backgroundColor: "#1a1a1a" }}>
              <div className="absolute inset-y-0 left-0 transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: b.color }} />
            </div>
          );
        })}
      </div>
      {taxableIncome > 0 && <div className="mt-1 text-xs text-center font-medium" style={{ color: marginalRate > 25 ? "#ef4444" : marginalRate > 15 ? "#f97316" : "#22c55e" }}>In the {marginalRate}% federal bracket</div>}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtShort(n: number, sym = "$") { const a = Math.abs(n); if (a >= 1e6) return `${sym}${(a / 1e6).toFixed(2)}M`; if (a >= 1000) return `${sym}${(a / 1000).toFixed(1)}K`; return `${sym}${Math.round(a).toLocaleString()}`; }
function fmtFull(n: number, sym = "$") { return `${sym}${Math.round(Math.abs(n)).toLocaleString()}`; }

// ─── Main modal ───────────────────────────────────────────────────────────────

type Step = "location" | "income" | "deductions" | "summary";

interface SmartTaxProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: Omit<TaxProfile, "id"> | TaxProfile) => void;
  profile?: TaxProfile | null;
}

export function SmartTaxProfileModal({ isOpen, onClose, onSave, profile }: SmartTaxProfileModalProps) {
  const [step, setStep] = useState<Step>("location");
  const [profileName, setProfileName] = useState(profile?.name ?? "");
  const [selectedCountry, setSelectedCountry] = useState<string>(() => {
    if (profile?.notes) {
      const m = profile.notes.match(/Residency: ([^|]+)/);
      if (m) return m[1].trim();
    }
    return profile?.country ?? "UAE";
  });

  // Cross-border
  const [crossBorder, setCrossBorder] = useState(false);
  const [companyCountry, setCompanyCountry] = useState("Estonia");
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // US state
  const [usProfile, setUSProfile] = useState<USTaxProfile>({
    state: "Florida" as USState, filingStatus: "single", employmentStatus: "employed",
    standardDeduction: true, w2Income: 0, selfEmploymentIncome: 0, businessIncome: 0,
    capitalGains: 0, dividends: 0, interest: 0, rentalIncome: 0, otherIncome: 0,
    businessExpenses: 0, itemizedDeductions: 0, retirementContributions: 0,
  });

  // Global income
  const [income, setInc] = useState({ salary: 0, business: 0, capitalGains: 0, dividends: 0, rental: 0, other: 0 });
  const [deductions, setDeductions] = useState(0);
  const [employmentStatus, setEmployStatus] = useState<"employed" | "self-employed" | "unemployed" | "retired">("employed");

  // Seed form state from profile when editing
  useEffect(() => {
    if (!isOpen) return;
    setStep("location");

    if (!profile) {
      // Reset to defaults for a new profile
      setProfileName("");
      setSelectedCountry("UAE");
      setCrossBorder(false);
      setCompanyCountry("Estonia");
      setActivePreset(null);
      setUSProfile({ state: "Florida" as USState, filingStatus: "single", employmentStatus: "employed", standardDeduction: true, w2Income: 0, selfEmploymentIncome: 0, businessIncome: 0, capitalGains: 0, dividends: 0, interest: 0, rentalIncome: 0, otherIncome: 0, businessExpenses: 0, itemizedDeductions: 0, retirementContributions: 0 });
      setInc({ salary: 0, business: 0, capitalGains: 0, dividends: 0, rental: 0, other: 0 });
      setDeductions(0);
      setEmployStatus("employed");
      return;
    }

    // Populate from saved profile
    setProfileName(profile.name);

    const residencyMatch = profile.notes?.match(/Residency:\s*([^|]+)/);
    const companyMatch = profile.notes?.match(/Company:\s*([^|]+)/);
    const stateMatch = profile.notes?.match(/State:\s*([^|]+)/);
    const filingMatch = profile.notes?.match(/Filing:\s*([^|]+)/);
    const isCrossBorder = profile.notes?.includes("Cross-Border") ?? false;

    const country = residencyMatch?.[1]?.trim() ?? profile.country ?? "UAE";
    setSelectedCountry(country);
    setCrossBorder(isCrossBorder);
    if (isCrossBorder && companyMatch) setCompanyCountry(companyMatch[1].trim());
    setActivePreset(null);

    const isUSA = country === "USA";

    if (isUSA) {
      const state = (stateMatch?.[1]?.trim() as USState) ?? "Florida";
      const filing = (filingMatch?.[1]?.trim() as USTaxProfile["filingStatus"]) ?? "single";
      const empStatus = (profile.businessIncome > 0 && profile.salaryIncome === 0 ? "self-employed" : "employed") as USTaxProfile["employmentStatus"];
      setUSProfile({
        state,
        filingStatus: filing,
        employmentStatus: empStatus,
        standardDeduction: true,
        w2Income: profile.salaryIncome ?? 0,
        selfEmploymentIncome: profile.businessIncome ?? 0,
        businessIncome: profile.businessIncome ?? 0,
        capitalGains: (profile.capitalGains?.shortTerm ?? 0) + (profile.capitalGains?.longTerm ?? 0),
        dividends: profile.dividends ?? 0,
        interest: 0,
        rentalIncome: profile.rentalIncome ?? 0,
        otherIncome: 0,
        businessExpenses: profile.deductibleExpenses ?? 0,
        itemizedDeductions: 0,
        retirementContributions: 0,
      });
    } else {
      setInc({
        salary: profile.salaryIncome ?? 0,
        business: profile.businessIncome ?? 0,
        capitalGains: (profile.capitalGains?.shortTerm ?? 0) + (profile.capitalGains?.longTerm ?? 0),
        dividends: profile.dividends ?? 0,
        rental: profile.rentalIncome ?? 0,
        other: 0,
      });
      setDeductions(profile.deductibleExpenses ?? 0);
      setEmployStatus(
        (profile.businessIncome > 0 && profile.salaryIncome === 0 ? "self-employed" : "employed") as "employed" | "self-employed" | "unemployed" | "retired"
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, profile]);

  const isUSA = selectedCountry === "USA";
  const countryOpt = COUNTRY_OPTIONS.find((c) => c.code === selectedCountry);
  const sym = countryOpt?.currencySymbol ?? "$";

  const updUS = useCallback(<K extends keyof USTaxProfile>(k: K, v: USTaxProfile[K]) => setUSProfile((p) => ({ ...p, [k]: v })), []);

  const usCalc = useMemo<USTaxCalculationResult | null>(() => {
    if (!isUSA) return null;
    try { return calculateUSTaxes(usProfile); } catch { return null; }
  }, [isUSA, usProfile]);

  const globalCalc = useMemo<GlobalCalcResult | null>(() => {
    if (isUSA) return null;
    return calcGlobal(selectedCountry, income.salary, income.business, income.capitalGains, income.dividends, income.rental, income.other, deductions, crossBorder, companyCountry);
  }, [isUSA, selectedCountry, income, deductions, crossBorder, companyCountry]);

  const usSuggestions = useMemo(() => usCalc ? getUSSmartSuggestions(usProfile, usCalc) : [], [usCalc, usProfile]);
  const usStateInsights = useMemo(() => isUSA ? getStateTaxInsights(usProfile.state) : null, [isUSA, usProfile.state]);
  const usStateComps = useMemo(() => {
    if (!usCalc || usCalc.breakdown.grossIncome === 0) return [];
    const compare = ["Florida", "Texas", "Nevada"] as USState[];
    const states = [usProfile.state, ...compare.filter((s) => s !== usProfile.state)];
    return compareStates(states, usCalc.breakdown.grossIncome, usProfile.filingStatus).slice(0, 4);
  }, [usCalc, usProfile.state, usProfile.filingStatus]);

  const totalTax = isUSA ? (usCalc?.totalTaxLiability ?? 0) : (globalCalc?.totalTax ?? 0);
  const netIncome = isUSA ? (usCalc?.netIncome ?? 0) : (globalCalc?.netIncome ?? 0);
  const effectiveRate = isUSA ? (usCalc?.totalEffectiveRate ?? 0) : (globalCalc?.effectiveRate ?? 0);
  const grossIncome = isUSA ? (usCalc?.breakdown.grossIncome ?? 0) : (globalCalc?.grossIncome ?? 0);
  const hasIncome = grossIncome > 0;

  const steps: Step[] = ["location", "income", "deductions", "summary"];
  const stepLabels: Record<Step, string> = { location: "Location & Status", income: "Income", deductions: "Deductions", summary: "Summary" };
  const currentIndex = steps.indexOf(step);
  const canNext = step === "location" ? profileName.trim().length > 0 : true;

  const handlePreset = (p: CrossBorderPreset) => {
    setActivePreset(p.id); setSelectedCountry(p.residencyCountry);
    setCompanyCountry(p.companyCountry); setCrossBorder(true);
  };

  const handleSave = () => {
    const compTypeMap: Record<string, TaxProfile["companyType"]> = {
      "llc": "llc", "s-corp": "s_corporation", "c-corp": "corporation",
      "partnership": "partnership", "sole-proprietor": "sole_proprietor",
    };
    const p: Omit<TaxProfile, "id"> = {
      name: profileName,
      country: isUSA ? "USA" : (selectedCountry as Country),
      companyType: isUSA ? (compTypeMap[usProfile.businessType ?? ""] ?? "individual") : "individual",
      salaryIncome: isUSA ? (usProfile.w2Income ?? 0) : income.salary,
      businessIncome: isUSA ? ((usProfile.businessIncome ?? 0) + (usProfile.selfEmploymentIncome ?? 0)) : income.business,
      capitalGains: { shortTerm: isUSA ? (usProfile.capitalGains ?? 0) : income.capitalGains, longTerm: 0 },
      dividends: isUSA ? (usProfile.dividends ?? 0) : income.dividends,
      rentalIncome: isUSA ? (usProfile.rentalIncome ?? 0) : income.rental,
      cryptoGains: 0,
      deductibleExpenses: isUSA ? (usProfile.businessExpenses ?? usProfile.itemizedDeductions ?? 0) : deductions,
      customIncomeSources: [],
      notes: isUSA
        ? `State: ${usProfile.state} | Filing: ${usProfile.filingStatus} | Effective Rate: ${usCalc?.totalEffectiveRate.toFixed(1) ?? 0}%`
        : crossBorder
        ? `Residency: ${selectedCountry} | Company: ${companyCountry} | Structure: Cross-Border | Effective Rate: ${effectiveRate.toFixed(1)}%`
        : `Residency: ${selectedCountry} | Effective Rate: ${effectiveRate.toFixed(1)}%`,
      isActive: false,
    };
    onSave(profile ? { ...p, id: profile.id } : p);
    onClose();
  };

  if (!isOpen) return null;
  const selfEmployed = isUSA ? usProfile.employmentStatus === "self-employed" : employmentStatus === "self-employed";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[1000003]" onClick={onClose}>
      <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl w-[980px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl"><Calculator className="w-5 h-5 text-blue-400" /></div>
            <div>
              <h2 className="text-xl font-bold text-white">{profile ? "Edit Tax Profile" : "New Tax Profile"}</h2>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                <Globe className="w-3 h-3" />
                {crossBorder
                  ? `${countryOpt?.flag} ${selectedCountry} residency · ${COUNTRY_OPTIONS.find(c => c.code === companyCountry)?.flag} ${companyCountry} company`
                  : `${countryOpt?.flag ?? ""} ${countryOpt?.name ?? selectedCountry} · Real-time calculations`}
              </p>
            </div>
          </div>
          {hasIncome && (
            <div className="hidden lg:flex items-center gap-6">
              <div className="text-right"><div className="text-[10px] text-gray-500 uppercase tracking-widest">Total Tax</div><div className="text-lg font-bold text-red-400 font-mono">{fmtShort(totalTax, sym)}</div></div>
              <div className="text-right"><div className="text-[10px] text-gray-500 uppercase tracking-widest">Net Income</div><div className="text-lg font-bold text-emerald-400 font-mono">{fmtShort(netIncome, sym)}</div></div>
              <div className="text-right"><div className="text-[10px] text-gray-500 uppercase tracking-widest">Rate</div><div className="text-lg font-bold text-orange-400 font-mono">{effectiveRate.toFixed(1)}%</div></div>
            </div>
          )}
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors ml-4"><X className="w-5 h-5" /></button>
        </div>

        {/* Step bar */}
        <div className="px-8 py-4 flex items-center gap-2 flex-shrink-0">
          {steps.map((s, i) => {
            const done = i < currentIndex; const active = s === step;
            return (
              <React.Fragment key={s}>
                <button onClick={() => { if (done || active) setStep(s); }} disabled={!done && !active}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${active ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : done ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-gray-600 cursor-not-allowed"}`}>
                  {done ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
                  <span className="hidden sm:inline">{stepLabels[s]}</span>
                </button>
                {i < steps.length - 1 && <div className={`flex-1 h-0.5 rounded-full ${done ? "bg-emerald-500/40" : "bg-white/5"}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Two-column layout */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* LEFT: Form */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">

            {/* ── STEP 1: Location & Status ── */}
            {step === "location" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Profile Name *</label>
                  <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="e.g., 2026 UAE + Estonia Setup" className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl text-white font-medium placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all" />
                </div>

                {/* Cross-border toggle */}
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-purple-400" />
                      <span className="font-bold text-white text-sm">Cross-Border Structure</span>
                    </div>
                    <button type="button" onClick={() => setCrossBorder(!crossBorder)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${crossBorder ? "bg-purple-500" : "bg-white/10"}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${crossBorder ? "left-6" : "left-1"}`} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">Enable if your personal tax residency is in a different country from where your company is registered.</p>
                  {crossBorder && (
                    <div className="mt-5 space-y-5">
                      {/* Primary: free-form pickers */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5"><Flag className="w-3 h-3 text-purple-400" /> Where do you live?</div>
                          <CountryPicker value={selectedCountry} onChange={(c) => { setSelectedCountry(c); setActivePreset(null); }} />
                          <p className="text-[10px] text-gray-600 mt-1">Your personal tax residency country</p>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5"><Building2 className="w-3 h-3 text-purple-400" /> Where is your company?</div>
                          <CountryPicker value={companyCountry} onChange={(c) => { setCompanyCountry(c); setActivePreset(null); }} />
                          <p className="text-[10px] text-gray-600 mt-1">Country of incorporation / registration</p>
                        </div>
                      </div>

                      {/* Live effective rate preview */}
                      {globalCalc && (
                        <div className="bg-black/30 rounded-xl px-4 py-3 flex items-center justify-between border border-white/5">
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="text-base">{COUNTRY_OPTIONS.find(c => c.code === selectedCountry)?.flag}</span>
                            <span>{selectedCountry}</span>
                            <span className="text-gray-600">personal</span>
                            <span className="text-gray-600 mx-1">+</span>
                            <span className="text-base">{COUNTRY_OPTIONS.find(c => c.code === companyCountry)?.flag}</span>
                            <span>{companyCountry}</span>
                            <span className="text-gray-600">company</span>
                          </div>
                          <div className={`text-sm font-black font-mono ${globalCalc.effectiveRate < 5 ? "text-emerald-400" : globalCalc.effectiveRate < 20 ? "text-blue-400" : "text-orange-400"}`}>
                            {globalCalc.grossIncome > 0 ? `${globalCalc.effectiveRate.toFixed(1)}% effective` : "Enter income →"}
                          </div>
                        </div>
                      )}

                      {/* Secondary: collapsible presets */}
                      <details className="group">
                        <summary className="cursor-pointer text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1.5 select-none list-none">
                          <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
                          Quick-fill from common structures
                        </summary>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {CROSS_BORDER_PRESETS.map((p) => (
                            <button key={p.id} type="button" onClick={() => handlePreset(p)}
                              className={`p-3 rounded-xl border text-left transition-all ${activePreset === p.id ? "border-purple-500/50 bg-purple-500/10" : "border-white/10 bg-black/20 hover:bg-white/5"}`}>
                              <div className="text-base mb-1">{p.icon}</div>
                              <div className={`text-xs font-bold leading-tight mb-1 ${activePreset === p.id ? "text-purple-300" : "text-white"}`}>{p.label}</div>
                              <div className="text-[10px] text-emerald-400 font-semibold">{p.benefit}</div>
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-600 mt-2">Selecting a preset fills the pickers above — you can change them freely afterwards.</p>
                      </details>
                    </div>
                  )}
                </div>

                {/* Country of residence (non cross-border) */}
                {!crossBorder && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2"><Globe className="w-4 h-4" /> Country of Residence *</label>
                    <CountryPicker value={selectedCountry} onChange={setSelectedCountry} />
                    {countryOpt && (
                      <div className="mt-3 bg-[#111] rounded-xl p-4 border border-white/5">
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Tax Overview</div>
                        <p className="text-xs text-gray-300 mb-3">{countryOpt.notes}</p>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="bg-black/30 rounded-lg p-2"><div className="text-gray-500 mb-0.5">Max Personal</div><div className={`font-black font-mono text-sm ${countryOpt.personalTaxMax === 0 ? "text-emerald-400" : "text-white"}`}>{countryOpt.personalTaxMax}%</div></div>
                          <div className="bg-black/30 rounded-lg p-2"><div className="text-gray-500 mb-0.5">Corporate</div><div className="font-black font-mono text-sm text-white">{countryOpt.corporateTax}%</div></div>
                          <div className="bg-black/30 rounded-lg p-2"><div className="text-gray-500 mb-0.5">System</div><div className="font-bold text-blue-300 text-[11px] mt-0.5 capitalize">{countryOpt.taxType.replace("-", " ")}</div></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* US: state picker */}
                {isUSA && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2"><MapPin className="w-4 h-4" /> State of Residence *</label>
                    <StatePicker value={usProfile.state} onChange={(s) => updUS("state", s)} />
                    {usStateInsights && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {usStateInsights.advantages.slice(0, 2).map((a, i) => <span key={i} className="text-[11px] px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">✓ {a}</span>)}
                        {usStateInsights.considerations.slice(0, 1).map((c, i) => <span key={i} className="text-[11px] px-2.5 py-1 bg-orange-500/10 text-orange-400 rounded-lg border border-orange-500/20">⚠ {c}</span>)}
                      </div>
                    )}
                  </div>
                )}

                {/* US: filing status */}
                {isUSA && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2"><Users className="w-4 h-4" /> Filing Status *</label>
                    <div className="grid grid-cols-2 gap-3">
                      {FILING_STATUSES.map((fs) => {
                        const sel = usProfile.filingStatus === fs.id;
                        return (
                          <button key={fs.id} type="button" onClick={() => updUS("filingStatus", fs.id as USTaxProfile["filingStatus"])}
                            className={`p-3 rounded-xl border text-left transition-all ${sel ? "border-blue-500/50 bg-blue-500/10" : "border-white/10 bg-[#1A1A1A] hover:bg-white/5"}`}>
                            <div className="flex items-center gap-2 mb-0.5"><span className="text-xl">{fs.icon}</span><span className={`text-sm font-semibold ${sel ? "text-blue-400" : "text-white"}`}>{fs.label}</span></div>
                            <p className="text-xs text-gray-500">{fs.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Employment type (both US and global) */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2"><Briefcase className="w-4 h-4" /> Employment / Income Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {EMPLOYMENT_STATUSES.map((es) => {
                      const sel = isUSA ? usProfile.employmentStatus === es.id : employmentStatus === es.id;
                      return (
                        <button key={es.id} type="button" onClick={() => isUSA ? updUS("employmentStatus", es.id as USTaxProfile["employmentStatus"]) : setEmployStatus(es.id)}
                          className={`p-3 rounded-xl border text-left transition-all ${sel ? "border-blue-500/50 bg-blue-500/10" : "border-white/10 bg-[#1A1A1A] hover:bg-white/5"}`}>
                          <div className="flex items-center gap-2 mb-0.5"><span className="text-lg">{es.icon}</span><span className={`text-sm font-semibold ${sel ? "text-blue-400" : "text-white"}`}>{es.label}</span></div>
                          <p className="text-xs text-gray-500">{es.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* US business structure */}
                {isUSA && selfEmployed && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2"><Building2 className="w-4 h-4" /> Business Structure</label>
                    <div className="space-y-2">
                      {BUSINESS_TYPES.map((bt) => {
                        const sel = usProfile.businessType === bt.id;
                        return (
                          <button key={bt.id} type="button" onClick={() => updUS("businessType", bt.id as USTaxProfile["businessType"])}
                            className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${sel ? "border-blue-500/50 bg-blue-500/10" : "border-white/10 bg-[#1A1A1A] hover:bg-white/5"}`}>
                            <div><span className={`text-sm font-semibold ${sel ? "text-blue-400" : "text-white"}`}>{bt.label}</span><p className="text-xs text-gray-500">{bt.desc}</p></div>
                            {sel && <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 2: Income ── */}
            {step === "income" && (
              <div className="space-y-5">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-300">Enter <strong>annual</strong> figures in <strong>{countryOpt?.currency ?? "local currency"}</strong>. Calculator updates live as you type.</p>
                </div>

                {isUSA ? (
                  <>
                    {usProfile.employmentStatus !== "self-employed" && (
                      <CurrencyInput label="W-2 / Salary Income" value={usProfile.w2Income ?? 0} onChange={(v) => updUS("w2Income", v)} hint="Gross wages from employment (Box 1 on W-2)" />
                    )}
                    {selfEmployed && (
                      <>
                        <CurrencyInput label="Self-Employment Income" value={usProfile.selfEmploymentIncome ?? 0} onChange={(v) => updUS("selfEmploymentIncome", v)} hint="Net profit before SE tax deduction" />
                        <CurrencyInput label="Business Expenses" value={usProfile.businessExpenses ?? 0} onChange={(v) => updUS("businessExpenses", v)} hint="Deductible operating expenses" optional />
                      </>
                    )}
                    <div className="border-t border-white/5 pt-4">
                      <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Investment Income</p>
                      <div className="space-y-4">
                        <CurrencyInput label="Capital Gains" value={usProfile.capitalGains ?? 0} onChange={(v) => updUS("capitalGains", v)} hint="Realized gains from stocks, crypto, property" optional />
                        <CurrencyInput label="Qualified Dividends" value={usProfile.dividends ?? 0} onChange={(v) => updUS("dividends", v)} optional />
                        <CurrencyInput label="Interest Income" value={usProfile.interest ?? 0} onChange={(v) => updUS("interest", v)} optional />
                      </div>
                    </div>
                    <div className="border-t border-white/5 pt-4">
                      <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Other Income</p>
                      <div className="space-y-4">
                        <CurrencyInput label="Rental Income" value={usProfile.rentalIncome ?? 0} onChange={(v) => updUS("rentalIncome", v)} optional />
                        <CurrencyInput label="Other Income" value={usProfile.otherIncome ?? 0} onChange={(v) => updUS("otherIncome", v)} hint="Alimony, 1099-MISC, etc." optional />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {(employmentStatus === "employed" || employmentStatus === "retired") && (
                      <CurrencyInput label="Salary / Employment Income" symbol={sym} value={income.salary} onChange={(v) => setInc(p => ({ ...p, salary: v }))} hint="Annual gross before tax" />
                    )}
                    {selfEmployed && (
                      <CurrencyInput label="Business / Self-Employment Income" symbol={sym} value={income.business} onChange={(v) => setInc(p => ({ ...p, business: v }))} hint="Net profit from business activity" />
                    )}
                    <div className="border-t border-white/5 pt-4">
                      <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Investment Income</p>
                      <div className="space-y-4">
                        <CurrencyInput label="Capital Gains" symbol={sym} value={income.capitalGains} onChange={(v) => setInc(p => ({ ...p, capitalGains: v }))} hint="Realized gains (stocks, crypto, property)" optional />
                        <CurrencyInput label="Dividends" symbol={sym} value={income.dividends} onChange={(v) => setInc(p => ({ ...p, dividends: v }))} optional />
                        <CurrencyInput label="Rental Income" symbol={sym} value={income.rental} onChange={(v) => setInc(p => ({ ...p, rental: v }))} optional />
                      </div>
                    </div>
                    <div className="border-t border-white/5 pt-4">
                      <CurrencyInput label="Other Income" symbol={sym} value={income.other} onChange={(v) => setInc(p => ({ ...p, other: v }))} hint="Interest, royalties, freelance, etc." optional />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── STEP 3: Deductions ── */}
            {step === "deductions" && (
              <div className="space-y-5">
                {isUSA ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-3">Deduction Method</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: true as boolean, label: "Standard Deduction", sub: usProfile.filingStatus === "married-joint" ? "$29,200 (2025)" : "$14,600 (2025)", recommended: true },
                          { id: false as boolean, label: "Itemized Deductions", sub: "Mortgage interest, SALT, charity…", recommended: false },
                        ].map((opt) => {
                          const sel = usProfile.standardDeduction === opt.id;
                          return (
                            <button key={String(opt.id)} type="button" onClick={() => updUS("standardDeduction", opt.id)}
                              className={`p-4 rounded-xl border text-left transition-all ${sel ? "border-blue-500/50 bg-blue-500/10" : "border-white/10 bg-[#1A1A1A] hover:bg-white/5"}`}>
                              <div className={`font-semibold text-sm mb-1 ${sel ? "text-blue-400" : "text-white"}`}>{opt.label}</div>
                              <div className="text-xs text-gray-500">{opt.sub}</div>
                              {opt.recommended && <div className="mt-2 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">✓ Recommended</div>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {!usProfile.standardDeduction && (
                      <CurrencyInput label="Total Itemized Deductions" value={usProfile.itemizedDeductions ?? 0} onChange={(v) => updUS("itemizedDeductions", v)} hint="Mortgage interest, SALT (cap $10k), charity, etc." />
                    )}
                    <CurrencyInput label="Retirement Contributions" value={usProfile.retirementContributions ?? 0} onChange={(v) => updUS("retirementContributions", v)} hint="401(k) up to $23,000 · IRA up to $7,000 (2025)" optional />
                    {usCalc && (
                      <div className="bg-[#1A1A1A] rounded-xl p-4 border border-white/10">
                        <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">Deduction Impact</div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-gray-400">AGI</span><span className="font-mono font-bold text-white">{fmtFull(usCalc.breakdown.adjustedGrossIncome)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-400">Deductions</span><span className="font-mono font-bold text-emerald-400">−{fmtFull(usCalc.breakdown.deductions)}</span></div>
                          <div className="flex justify-between border-t border-white/5 pt-2"><span className="text-gray-400 font-semibold">Taxable Income</span><span className="font-mono font-bold text-blue-400">{fmtFull(usCalc.breakdown.taxableIncome)}</span></div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-blue-300">Enter deductible expenses applicable in <strong>{countryOpt?.name ?? selectedCountry}</strong> — business costs, pension contributions, personal allowances, etc.</p>
                    </div>
                    <CurrencyInput label="Total Deductible Expenses / Allowances" symbol={sym} value={deductions} onChange={setDeductions} hint="Business costs, pension contributions, personal allowances" optional />
                    {globalCalc && globalCalc.grossIncome > 0 && (
                      <div className="bg-[#1A1A1A] rounded-xl p-4 border border-white/10">
                        <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">Deduction Impact</div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-gray-400">Gross Income</span><span className="font-mono font-bold text-white">{fmtFull(globalCalc.grossIncome, sym)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-400">Deductions</span><span className="font-mono font-bold text-emerald-400">−{fmtFull(deductions, sym)}</span></div>
                          <div className="flex justify-between border-t border-white/5 pt-2"><span className="text-gray-400 font-semibold">Taxable Base</span><span className="font-mono font-bold text-blue-400">{fmtFull(Math.max(0, globalCalc.grossIncome - deductions), sym)}</span></div>
                        </div>
                      </div>
                    )}
                    {crossBorder && (
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                        <div className="text-xs font-bold text-purple-300 mb-1 flex items-center gap-2"><Layers className="w-3.5 h-3.5" /> Cross-Border Note</div>
                        <p className="text-xs text-purple-200/70">Deductions apply at residency-country level. Company-level deductions (e.g. Estonian OÜ operating costs) are separate from personal deductions.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── STEP 4: Summary ── */}
            {step === "summary" && (
              <div className="space-y-5">
                {/* Big number */}
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6">
                  <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Total Tax Liability</div>
                  <div className="text-4xl font-black font-mono text-white mb-1">{fmtFull(totalTax, sym)}</div>
                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    <span className="text-sm text-gray-400">Effective: <span className="font-bold text-orange-400">{effectiveRate.toFixed(2)}%</span></span>
                    <span className="text-sm text-gray-400">Net: <span className="font-bold text-emerald-400">{fmtFull(netIncome, sym)}</span></span>
                  </div>
                  {grossIncome > 0 && (
                    <div className="mt-4">
                      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                        {isUSA && usCalc ? (
                          <>
                            <div className="bg-red-500 transition-all duration-700" style={{ width: `${(usCalc.federalIncomeTax / grossIncome) * 100}%` }} />
                            <div className="bg-orange-500 transition-all duration-700" style={{ width: `${(usCalc.stateIncomeTax / grossIncome) * 100}%` }} />
                            {usCalc.selfEmploymentTax > 0 && <div className="bg-yellow-500 transition-all duration-700" style={{ width: `${(usCalc.selfEmploymentTax / grossIncome) * 100}%` }} />}
                          </>
                        ) : globalCalc ? (
                          globalCalc.breakdown.filter(b => b.value > 0).map((b, i) => (
                            <div key={i} className="transition-all duration-700" style={{ width: `${(b.value / grossIncome) * 100}%`, backgroundColor: b.color }} />
                          ))
                        ) : null}
                        <div className="bg-emerald-500 transition-all duration-700 flex-1" />
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[11px] flex-wrap">
                        {isUSA && usCalc ? (
                          <>
                            <span className="flex items-center gap-1.5 text-red-400"><span className="w-2 h-2 bg-red-500 rounded-full" />Federal</span>
                            <span className="flex items-center gap-1.5 text-orange-400"><span className="w-2 h-2 bg-orange-500 rounded-full" />State</span>
                            {usCalc.selfEmploymentTax > 0 && <span className="flex items-center gap-1.5 text-yellow-400"><span className="w-2 h-2 bg-yellow-500 rounded-full" />SE Tax</span>}
                          </>
                        ) : globalCalc?.breakdown.filter(b => b.value > 0).map((b, i) => (
                          <span key={i} className="flex items-center gap-1.5" style={{ color: b.color }}><span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />{b.label}</span>
                        ))}
                        <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 bg-emerald-500 rounded-full" />Net Income</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Breakdown table */}
                <div className="bg-[#1A1A1A] rounded-xl p-5 border border-white/10 space-y-2">
                  <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">Tax Breakdown</div>
                  {isUSA && usCalc ? (
                    <>
                      {[
                        { label: "Gross Income", value: usCalc.breakdown.grossIncome, cls: "text-white" },
                        { label: "Taxable Income", value: usCalc.breakdown.taxableIncome, cls: "text-blue-400" },
                        { label: "Federal Income Tax", value: -usCalc.federalIncomeTax, cls: "text-red-400", rate: usCalc.federalEffectiveRate },
                        { label: `${usProfile.state} State Tax`, value: -usCalc.stateIncomeTax, cls: "text-orange-400", rate: usCalc.stateEffectiveRate },
                        ...(usCalc.selfEmploymentTax > 0 ? [{ label: "SE Tax (15.3%)", value: -usCalc.selfEmploymentTax, cls: "text-yellow-400" }] : []),
                        ...(usCalc.annualLLCFees > 0 ? [{ label: "LLC Annual Fees", value: -usCalc.annualLLCFees, cls: "text-orange-400" }] : []),
                      ].map((row, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                          <span className="text-sm text-gray-400">{row.label}</span>
                          <div className="text-right">
                            <span className={`text-sm font-mono font-bold ${row.cls}`}>{row.value < 0 ? `−${fmtFull(Math.abs(row.value))}` : fmtFull(row.value)}</span>
                            {"rate" in row && row.rate != null && <div className="text-[10px] text-gray-600">{(row.rate as number).toFixed(1)}% effective</div>}
                          </div>
                        </div>
                      ))}
                    </>
                  ) : globalCalc ? (
                    <>
                      <div className="flex justify-between py-1.5 border-b border-white/5"><span className="text-sm text-gray-400">Gross Income</span><span className="text-sm font-mono font-bold text-white">{fmtFull(globalCalc.grossIncome, sym)}</span></div>
                      {globalCalc.incomeTax > 0 && <div className="flex justify-between py-1.5 border-b border-white/5"><span className="text-sm text-gray-400">Income Tax</span><span className="text-sm font-mono font-bold text-red-400">−{fmtFull(globalCalc.incomeTax, sym)}</span></div>}
                      {globalCalc.socialSecurity > 0 && <div className="flex justify-between py-1.5 border-b border-white/5"><span className="text-sm text-gray-400">Social Security</span><span className="text-sm font-mono font-bold text-orange-400">−{fmtFull(globalCalc.socialSecurity, sym)}</span></div>}
                      {globalCalc.capitalGainsTax > 0 && <div className="flex justify-between py-1.5 border-b border-white/5"><span className="text-sm text-gray-400">Capital Gains Tax</span><span className="text-sm font-mono font-bold text-yellow-400">−{fmtFull(globalCalc.capitalGainsTax, sym)}</span></div>}
                      {globalCalc.dividendTax > 0 && <div className="flex justify-between py-1.5 border-b border-white/5"><span className="text-sm text-gray-400">Dividend Tax</span><span className="text-sm font-mono font-bold text-purple-400">−{fmtFull(globalCalc.dividendTax, sym)}</span></div>}
                    </>
                  ) : null}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-bold text-white">Net Income</span>
                    <span className="text-lg font-black font-mono text-emerald-400">{fmtFull(netIncome, sym)}</span>
                  </div>
                </div>

                {/* US state comparison */}
                {isUSA && usStateComps.length > 1 && (
                  <div className="bg-[#1A1A1A] rounded-xl p-5 border border-white/10">
                    <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> State Tax Comparison</div>
                    <div className="space-y-2">
                      {usStateComps.map((c) => {
                        const isCur = c.state === usProfile.state;
                        const maxTax = Math.max(...usStateComps.map((x) => x.stateTax), 1);
                        return (
                          <div key={c.state} className="flex items-center gap-3">
                            <div className={`w-28 text-xs font-medium ${isCur ? "text-blue-400 font-bold" : "text-gray-400"}`}>{c.state} {isCur && "●"}</div>
                            <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-700 ${c.stateTax === 0 ? "bg-emerald-500" : isCur ? "bg-blue-500" : "bg-gray-600"}`} style={{ width: `${Math.max((c.stateTax / maxTax) * 100, 2)}%` }} />
                            </div>
                            <span className={`text-xs font-mono font-bold w-24 text-right ${c.stateTax === 0 ? "text-emerald-400" : "text-white"}`}>{c.stateTax === 0 ? "$0 state" : fmtFull(c.stateTax)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Cross-border summary */}
                {crossBorder && (
                  <div className="bg-purple-500/10 rounded-xl p-5 border border-purple-500/20">
                    <div className="text-xs font-bold text-purple-300 mb-3 flex items-center gap-2"><Layers className="w-4 h-4" /> Cross-Border Structure</div>
                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div className="bg-black/20 rounded-lg p-3">
                        <div className="text-[10px] text-gray-500 uppercase mb-1">Residency</div>
                        <div className="font-bold text-white">{COUNTRY_OPTIONS.find(c => c.code === selectedCountry)?.flag} {selectedCountry}</div>
                        <div className="text-xs text-emerald-400 mt-0.5">{COUNTRY_OPTIONS.find(c => c.code === selectedCountry)?.personalTaxMax === 0 ? "0% personal income tax" : `${COUNTRY_OPTIONS.find(c => c.code === selectedCountry)?.personalTaxMax}% max personal`}</div>
                      </div>
                      <div className="bg-black/20 rounded-lg p-3">
                        <div className="text-[10px] text-gray-500 uppercase mb-1">Company</div>
                        <div className="font-bold text-white">{COUNTRY_OPTIONS.find(c => c.code === companyCountry)?.flag} {companyCountry}</div>
                        <div className="text-xs text-blue-400 mt-0.5">{COUNTRY_OPTIONS.find(c => c.code === companyCountry)?.corporateTax}% corporate tax</div>
                      </div>
                    </div>
                    <p className="text-xs text-purple-200/50">⚠️ Always consult a qualified tax attorney for cross-border structures. Substance requirements, CFC rules, and tax treaties may apply.</p>
                  </div>
                )}

                {/* US suggestions */}
                {isUSA && usSuggestions.length > 0 && (
                  <div className="bg-purple-500/10 rounded-xl p-5 border border-purple-500/20 space-y-3">
                    <div className="flex items-center gap-2"><Lightbulb className="w-4 h-4 text-purple-400" /><span className="text-xs text-purple-300 font-bold uppercase tracking-wider">Smart Recommendations</span></div>
                    {usSuggestions.map((s, i) => <div key={i} className="flex items-start gap-2.5 text-sm text-purple-200/80"><div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0 mt-2" />{s}</div>)}
                  </div>
                )}

                {/* US bracket bar */}
                {isUSA && usCalc && usCalc.breakdown.taxableIncome > 0 && (
                  <div className="bg-[#1A1A1A] rounded-xl p-5 border border-white/10">
                    <BracketBar taxableIncome={usCalc.breakdown.taxableIncome} filingStatus={usProfile.filingStatus} />
                  </div>
                )}

                {/* Non-US country insights */}
                {!isUSA && countryOpt && (
                  <div className="bg-[#111] rounded-xl p-5 border border-white/5 space-y-3">
                    <div className="text-xs text-gray-500 uppercase tracking-widest font-bold flex items-center gap-2"><Lightbulb className="w-4 h-4 text-yellow-400" /> {countryOpt.name} Tax Insights</div>
                    <p className="text-sm text-gray-300">{countryOpt.notes}</p>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-black/30 rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">Max Personal</div><div className={`text-lg font-black font-mono ${countryOpt.personalTaxMax === 0 ? "text-emerald-400" : "text-white"}`}>{countryOpt.personalTaxMax}%</div></div>
                      <div className="bg-black/30 rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">Corporate</div><div className="text-lg font-black font-mono text-white">{countryOpt.corporateTax}%</div></div>
                      <div className="bg-black/30 rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">System</div><div className="text-xs font-bold text-blue-300 mt-1 capitalize">{countryOpt.taxType.replace("-", " ")}</div></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Live panel */}
          <div className="w-[300px] flex-shrink-0 border-l border-white/10 bg-[#0A0A0A] p-6 overflow-y-auto space-y-4 custom-scrollbar hidden lg:flex flex-col">
            <div className="text-xs text-gray-500 uppercase tracking-widest font-bold flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-yellow-400" /> Live Calculator
            </div>
            {!hasIncome ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <div className="p-4 bg-white/5 rounded-2xl mb-4"><Calculator className="w-8 h-8 text-gray-600" /></div>
                <p className="text-gray-600 text-sm">Enter income to see<br />live calculations</p>
                {countryOpt && (
                  <div className={`mt-4 text-xs px-3 py-1.5 rounded-full font-bold ${countryOpt.personalTaxMax === 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-gray-500"}`}>
                    {countryOpt.flag} {countryOpt.personalTaxMax === 0 ? "0% personal tax!" : `Up to ${countryOpt.personalTaxMax}%`}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-br from-red-500/15 to-orange-500/10 border border-red-500/20 rounded-2xl p-5 text-center">
                  <div className="text-[11px] text-gray-500 uppercase tracking-widest mb-1">You Owe</div>
                  <div className="text-3xl font-black font-mono text-white">{fmtFull(totalTax, sym)}</div>
                  <div className="text-sm text-gray-400 mt-1">{effectiveRate.toFixed(2)}% effective rate</div>
                </div>

                <MetricCard label="Net Income" value={fmtFull(netIncome, sym)} sub={`${(100 - effectiveRate).toFixed(1)}% of gross`} color="green" />

                <div className="space-y-2">
                  <div className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Breakdown</div>
                  {isUSA && usCalc ? (
                    [
                      { label: "Federal", value: usCalc.federalIncomeTax, rate: usCalc.federalEffectiveRate, color: "bg-red-500" },
                      { label: usProfile.state, value: usCalc.stateIncomeTax, rate: usCalc.stateEffectiveRate, color: "bg-orange-500" },
                      ...(usCalc.selfEmploymentTax > 0 ? [{ label: "SE Tax", value: usCalc.selfEmploymentTax, rate: (usCalc.selfEmploymentTax / grossIncome) * 100, color: "bg-yellow-500" }] : []),
                    ].map((item, i) => (
                      <div key={i} className="bg-[#111] rounded-xl p-3 border border-white/5">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-gray-400 font-medium">{item.label}</span>
                          <span className="text-xs font-mono font-bold text-white">{fmtFull(item.value)}</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${item.color} transition-all duration-500`} style={{ width: `${Math.min(item.rate * 2, 100)}%` }} />
                        </div>
                        <div className="text-[10px] text-gray-600 mt-1">{item.rate.toFixed(2)}% effective</div>
                      </div>
                    ))
                  ) : globalCalc?.breakdown.filter(b => b.value > 0).map((b, i) => (
                    <div key={i} className="bg-[#111] rounded-xl p-3 border border-white/5">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-gray-400 font-medium">{b.label}</span>
                        <span className="text-xs font-mono font-bold text-white">{fmtFull(b.value, sym)}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(b.rate * 2, 100)}%`, backgroundColor: b.color }} />
                      </div>
                      <div className="text-[10px] text-gray-600 mt-1">{b.rate.toFixed(2)}% of gross</div>
                    </div>
                  ))}
                </div>

                {isUSA && usCalc && (
                  <div className="bg-[#111] rounded-xl p-4 border border-white/5">
                    <BracketBar taxableIncome={usCalc.breakdown.taxableIncome} filingStatus={usProfile.filingStatus} />
                  </div>
                )}

                <div className="bg-[#111] rounded-xl p-4 border border-white/5">
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-3">Monthly Snapshot</div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    {[
                      { label: "Gross/mo", value: fmtShort(grossIncome / 12, sym), color: "text-white" },
                      { label: "Tax/mo", value: fmtShort(totalTax / 12, sym), color: "text-red-400" },
                      { label: "Net/mo", value: fmtShort(netIncome / 12, sym), color: "text-emerald-400" },
                      { label: "Tax/day", value: fmtShort(totalTax / 365, sym), color: "text-orange-400" },
                    ].map((item) => (
                      <div key={item.label} className="bg-black/20 rounded-lg p-2">
                        <div className={`text-base font-bold font-mono ${item.color}`}>{item.value}</div>
                        <div className="text-[10px] text-gray-600">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {crossBorder && (
                  <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20 text-center">
                    <div className="text-2xl mb-1">{COUNTRY_OPTIONS.find(c => c.code === selectedCountry)?.flag}{COUNTRY_OPTIONS.find(c => c.code === companyCountry)?.flag}</div>
                    <div className="text-xs text-purple-300 font-bold">{selectedCountry} + {companyCountry}</div>
                    <div className="text-[10px] text-purple-400 mt-1">Cross-border structure active</div>
                  </div>
                )}

                {isUSA && usSuggestions.length > 0 && (
                  <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
                    <div className="text-[10px] text-purple-400 uppercase tracking-widest font-bold mb-2">Top Tip</div>
                    <p className="text-xs text-purple-200/80">{usSuggestions[0]}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-5 border-t border-white/10 flex-shrink-0">
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors">Cancel</button>
            {currentIndex > 0 && (
              <button onClick={() => setStep(steps[currentIndex - 1])} className="px-5 py-2.5 rounded-xl border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-sm font-medium transition-colors flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
          </div>
          {step !== "summary" ? (
            <button onClick={() => setStep(steps[currentIndex + 1])} disabled={!canNext} className="px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/20">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSave} className="px-8 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
              {profile ? "Update Profile" : "Save Profile"}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>
    </div>
  );
}

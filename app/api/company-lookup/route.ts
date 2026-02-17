/**
 * OmniFolio Proprietary Company Lookup API
 * 
 * 100% proprietary — uses ONLY free public data sources:
 * - SEC EDGAR submissions API (company info, CIK, SIC, filings, XBRL financials)
 * - SEC EDGAR company_tickers.json (ticker ↔ CIK mapping & search)
 * - Yahoo Finance public endpoints (real-time price/quote)
 * - Google Favicon service (company logos via website domain)
 * 
 * NO paid third-party APIs (no Bloomberg, etc.) — uses free public data sources only.
 * 
 * Copyright OmniFolio. All rights reserved.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSECEdgarClient } from '@/lib/api/sec-edgar-api';
import { apiGateway, CacheTTL } from '@/lib/api/external-api-gateway';

// ── Types ────────────────────────────────────────────────────────────

interface CompanyLookupResult {
  // Identity
  symbol: string;
  companyName: string;
  cik: string;
  sic: string;
  sicDescription: string;
  ein: string;
  stateOfIncorporation: string;
  fiscalYearEnd: string;
  
  // Contact & Address
  addresses: {
    business: { street1: string; street2?: string; city: string; state: string; zip: string; country?: string };
    mailing: { street1: string; street2?: string; city: string; state: string; zip: string; country?: string };
  };
  phone: string;
  website: string;
  
  // Exchange Info
  exchange: string;
  exchangeFullName: string;
  category: string; // e.g. "Large Accelerated Filer"
  
  // Branding
  logoUrl: string | null;
  
  // Market Data (from Yahoo Finance)
  price: number | null;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
  currency: string;
  
  // Flags
  isActivelyTrading: boolean;
  
  // SEC Filings (recent)
  recentFilings: Array<{
    form: string;
    filingDate: string;
    accessionNumber: string;
    primaryDocument: string;
    primaryDocumentUrl: string;
    description: string;
  }>;
  
  // XBRL Financials (annual)
  financials: Array<{
    periodEndDate: string;
    fiscalYear: string;
    revenue: number | null;
    netIncome: number | null;
    totalAssets: number | null;
    totalLiabilities: number | null;
    totalEquity: number | null;
    operatingCashFlow: number | null;
    earningsPerShareBasic: number | null;
    earningsPerShareDiluted: number | null;
  }>;
  
  // Metadata
  source: 'sec-edgar';
  lastUpdated: string;
}

// ── SIC Code Descriptions ────────────────────────────────────────────
// Top ~120 SIC codes mapped to human-readable sector/industry descriptions.
// Full SIC list: https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&SIC=

const SIC_DESCRIPTIONS: Record<string, { sector: string; industry: string }> = {
  '1000': { sector: 'Mining', industry: 'Metal Mining' },
  '1311': { sector: 'Energy', industry: 'Crude Petroleum & Natural Gas' },
  '1381': { sector: 'Energy', industry: 'Drilling Oil & Gas Wells' },
  '1382': { sector: 'Energy', industry: 'Oil & Gas Field Services' },
  '2000': { sector: 'Consumer Staples', industry: 'Food & Kindred Products' },
  '2011': { sector: 'Consumer Staples', industry: 'Meat Packing Plants' },
  '2013': { sector: 'Consumer Staples', industry: 'Sausages & Other Prepared Meats' },
  '2020': { sector: 'Consumer Staples', industry: 'Dairy Products' },
  '2030': { sector: 'Consumer Staples', industry: 'Canned & Preserved Fruits/Vegetables' },
  '2040': { sector: 'Consumer Staples', industry: 'Grain Mill Products' },
  '2050': { sector: 'Consumer Staples', industry: 'Bakery Products' },
  '2060': { sector: 'Consumer Staples', industry: 'Sugar & Confectionery Products' },
  '2080': { sector: 'Consumer Staples', industry: 'Beverages' },
  '2090': { sector: 'Consumer Staples', industry: 'Food Preparations' },
  '2100': { sector: 'Consumer Staples', industry: 'Tobacco Products' },
  '2200': { sector: 'Consumer Discretionary', industry: 'Textile Mill Products' },
  '2300': { sector: 'Consumer Discretionary', industry: 'Apparel & Textile Products' },
  '2400': { sector: 'Materials', industry: 'Lumber & Wood Products' },
  '2500': { sector: 'Consumer Discretionary', industry: 'Furniture & Fixtures' },
  '2600': { sector: 'Materials', industry: 'Paper & Allied Products' },
  '2700': { sector: 'Communication Services', industry: 'Printing & Publishing' },
  '2710': { sector: 'Communication Services', industry: 'Newspapers: Publishing or Publishing & Printing' },
  '2711': { sector: 'Communication Services', industry: 'Newspapers: Publishing or Publishing & Printing' },
  '2731': { sector: 'Communication Services', industry: 'Books: Publishing or Publishing & Printing' },
  '2741': { sector: 'Communication Services', industry: 'Miscellaneous Publishing' },
  '2800': { sector: 'Healthcare', industry: 'Chemicals & Allied Products' },
  '2810': { sector: 'Materials', industry: 'Industrial Chemicals' },
  '2820': { sector: 'Materials', industry: 'Plastics & Synthetic Resins' },
  '2830': { sector: 'Healthcare', industry: 'Drugs' },
  '2834': { sector: 'Healthcare', industry: 'Pharmaceutical Preparations' },
  '2835': { sector: 'Healthcare', industry: 'In Vitro & In Vivo Diagnostic Substances' },
  '2836': { sector: 'Healthcare', industry: 'Biological Products' },
  '2840': { sector: 'Consumer Staples', industry: 'Soap, Detergent, Cleaning Preparations' },
  '2860': { sector: 'Materials', industry: 'Industrial Chemicals' },
  '2870': { sector: 'Materials', industry: 'Agricultural Chemicals' },
  '2890': { sector: 'Materials', industry: 'Industrial Chemicals' },
  '2911': { sector: 'Energy', industry: 'Petroleum Refining' },
  '3000': { sector: 'Materials', industry: 'Rubber & Plastics Products' },
  '3100': { sector: 'Consumer Discretionary', industry: 'Leather & Leather Products' },
  '3200': { sector: 'Materials', industry: 'Stone, Clay, Glass Products' },
  '3300': { sector: 'Materials', industry: 'Primary Metal Industries' },
  '3400': { sector: 'Industrials', industry: 'Fabricated Metal Products' },
  '3500': { sector: 'Industrials', industry: 'Industrial & Commercial Machinery' },
  '3523': { sector: 'Industrials', industry: 'Farm Machinery & Equipment' },
  '3530': { sector: 'Industrials', industry: 'Construction & Mining Machinery' },
  '3540': { sector: 'Industrials', industry: 'Metalworking Machinery' },
  '3550': { sector: 'Industrials', industry: 'Special Industry Machinery' },
  '3559': { sector: 'Industrials', industry: 'Special Industry Machinery' },
  '3560': { sector: 'Industrials', industry: 'General Industrial Machinery' },
  '3570': { sector: 'Technology', industry: 'Computer & Office Equipment' },
  '3571': { sector: 'Technology', industry: 'Electronic Computers' },
  '3572': { sector: 'Technology', industry: 'Computer Storage Devices' },
  '3576': { sector: 'Technology', industry: 'Computer Communications Equipment' },
  '3577': { sector: 'Technology', industry: 'Computer Peripheral Equipment' },
  '3578': { sector: 'Technology', industry: 'Calculating & Accounting Machines' },
  '3579': { sector: 'Technology', industry: 'Office Machines' },
  '3580': { sector: 'Industrials', industry: 'Refrigeration & Heating Equipment' },
  '3590': { sector: 'Industrials', industry: 'Misc Industrial & Commercial Machinery' },
  '3600': { sector: 'Technology', industry: 'Electronic & Electrical Equipment' },
  '3612': { sector: 'Technology', industry: 'Power, Distribution & Specialty Transformers' },
  '3620': { sector: 'Industrials', industry: 'Electrical Industrial Apparatus' },
  '3630': { sector: 'Consumer Discretionary', industry: 'Household Appliances' },
  '3651': { sector: 'Technology', industry: 'Household Audio & Video Equipment' },
  '3669': { sector: 'Technology', industry: 'Communications Equipment' },
  '3670': { sector: 'Technology', industry: 'Electronic Components & Accessories' },
  '3672': { sector: 'Technology', industry: 'Printed Circuit Boards' },
  '3674': { sector: 'Technology', industry: 'Semiconductors & Related Devices' },
  '3678': { sector: 'Technology', industry: 'Electronic Connectors' },
  '3679': { sector: 'Technology', industry: 'Electronic Components' },
  '3690': { sector: 'Technology', industry: 'Electronic & Electrical Equipment' },
  '3711': { sector: 'Consumer Discretionary', industry: 'Motor Vehicles & Passenger Car Bodies' },
  '3714': { sector: 'Consumer Discretionary', industry: 'Motor Vehicle Parts & Accessories' },
  '3720': { sector: 'Industrials', industry: 'Aircraft & Parts' },
  '3721': { sector: 'Industrials', industry: 'Aircraft' },
  '3724': { sector: 'Industrials', industry: 'Aircraft Engines & Engine Parts' },
  '3728': { sector: 'Industrials', industry: 'Aircraft Parts & Auxiliary Equipment' },
  '3730': { sector: 'Industrials', industry: 'Ship & Boat Building & Repairing' },
  '3740': { sector: 'Industrials', industry: 'Railroad Equipment' },
  '3760': { sector: 'Industrials', industry: 'Guided Missiles & Space Vehicles' },
  '3790': { sector: 'Industrials', industry: 'Miscellaneous Transportation Equipment' },
  '3812': { sector: 'Industrials', industry: 'Defense Electronics & Communications Equipment' },
  '3822': { sector: 'Technology', industry: 'Industrial Instruments for Measurement' },
  '3823': { sector: 'Technology', industry: 'Industrial Instruments for Measurement' },
  '3825': { sector: 'Technology', industry: 'Instruments for Measuring & Testing' },
  '3826': { sector: 'Healthcare', industry: 'Laboratory Analytical Instruments' },
  '3827': { sector: 'Healthcare', industry: 'Optical Instruments & Lenses' },
  '3829': { sector: 'Technology', industry: 'Measuring & Controlling Devices' },
  '3841': { sector: 'Healthcare', industry: 'Surgical & Medical Instruments & Apparatus' },
  '3842': { sector: 'Healthcare', industry: 'Orthopedic, Prosthetic & Surgical Appliances' },
  '3845': { sector: 'Healthcare', industry: 'Electromedical & Electrotherapeutic Apparatus' },
  '3851': { sector: 'Healthcare', industry: 'Ophthalmic Goods' },
  '3861': { sector: 'Technology', industry: 'Photographic Equipment & Supplies' },
  '3900': { sector: 'Consumer Discretionary', industry: 'Miscellaneous Manufacturing' },
  '4011': { sector: 'Industrials', industry: 'Railroads, Line-Haul Operating' },
  '4013': { sector: 'Industrials', industry: 'Railroad Switching & Terminal Establishments' },
  '4100': { sector: 'Industrials', industry: 'Local & Suburban Transit' },
  '4210': { sector: 'Industrials', industry: 'Trucking & Courier Services' },
  '4213': { sector: 'Industrials', industry: 'Trucking (Except Local)' },
  '4400': { sector: 'Industrials', industry: 'Water Transportation' },
  '4412': { sector: 'Industrials', industry: 'Deep Sea Foreign Transportation of Freight' },
  '4500': { sector: 'Industrials', industry: 'Transportation by Air' },
  '4512': { sector: 'Industrials', industry: 'Air Transportation, Scheduled' },
  '4522': { sector: 'Industrials', industry: 'Air Transportation, Nonscheduled' },
  '4581': { sector: 'Industrials', industry: 'Airports, Flying Fields & Airport Terminal Services' },
  '4700': { sector: 'Industrials', industry: 'Transportation Services' },
  '4731': { sector: 'Industrials', industry: 'Arrangement of Transportation of Freight & Cargo' },
  '4812': { sector: 'Communication Services', industry: 'Telephone Communications' },
  '4813': { sector: 'Communication Services', industry: 'Telephone Communications' },
  '4822': { sector: 'Communication Services', industry: 'Telegraph & Other Message Communications' },
  '4832': { sector: 'Communication Services', industry: 'Radio Broadcasting Stations' },
  '4833': { sector: 'Communication Services', industry: 'Television Broadcasting Stations' },
  '4841': { sector: 'Communication Services', industry: 'Cable & Other Pay Television Services' },
  '4899': { sector: 'Communication Services', industry: 'Communications Services' },
  '4900': { sector: 'Utilities', industry: 'Electric, Gas & Sanitary Services' },
  '4911': { sector: 'Utilities', industry: 'Electric Services' },
  '4922': { sector: 'Utilities', industry: 'Natural Gas Distribution' },
  '4923': { sector: 'Utilities', industry: 'Natural Gas Transmission & Distribution' },
  '4924': { sector: 'Utilities', industry: 'Natural Gas Distribution' },
  '4931': { sector: 'Utilities', industry: 'Electric & Other Services Combined' },
  '4932': { sector: 'Utilities', industry: 'Gas & Other Services Combined' },
  '4941': { sector: 'Utilities', industry: 'Water Supply' },
  '4950': { sector: 'Utilities', industry: 'Sanitary Services' },
  '4953': { sector: 'Utilities', industry: 'Refuse Systems' },
  '4955': { sector: 'Utilities', industry: 'Hazardous Waste Management' },
  '5000': { sector: 'Consumer Discretionary', industry: 'Durable Goods — Wholesale' },
  '5040': { sector: 'Consumer Discretionary', industry: 'Professional & Commercial Equipment' },
  '5045': { sector: 'Technology', industry: 'Computers & Peripherals — Wholesale' },
  '5047': { sector: 'Healthcare', industry: 'Medical & Hospital Equipment — Wholesale' },
  '5050': { sector: 'Industrials', industry: 'Metals & Minerals — Wholesale' },
  '5060': { sector: 'Industrials', industry: 'Electrical Apparatus & Equipment — Wholesale' },
  '5065': { sector: 'Technology', industry: 'Electronic Parts & Equipment — Wholesale' },
  '5080': { sector: 'Industrials', industry: 'Industrial & Personal Service Paper — Wholesale' },
  '5090': { sector: 'Consumer Discretionary', industry: 'Durable Goods — Wholesale' },
  '5100': { sector: 'Consumer Staples', industry: 'Nondurable Goods — Wholesale' },
  '5110': { sector: 'Consumer Staples', industry: 'Paper & Paper Products — Wholesale' },
  '5122': { sector: 'Healthcare', industry: 'Drugs, Drug Proprietaries & Druggists Sundries' },
  '5140': { sector: 'Consumer Staples', industry: 'Groceries & Related Products — Wholesale' },
  '5150': { sector: 'Consumer Staples', industry: 'Farm-Product Raw Materials — Wholesale' },
  '5160': { sector: 'Materials', industry: 'Chemicals & Allied Products — Wholesale' },
  '5170': { sector: 'Energy', industry: 'Petroleum & Petroleum Products — Wholesale' },
  '5200': { sector: 'Consumer Discretionary', industry: 'Retail — Building Materials' },
  '5211': { sector: 'Consumer Discretionary', industry: 'Retail — Lumber & Building Materials' },
  '5271': { sector: 'Consumer Discretionary', industry: 'Retail — Mobile Home Dealers' },
  '5300': { sector: 'Consumer Staples', industry: 'Retail — General Merchandise Stores' },
  '5311': { sector: 'Consumer Staples', industry: 'Retail — Department Stores' },
  '5331': { sector: 'Consumer Staples', industry: 'Retail — Variety Stores' },
  '5400': { sector: 'Consumer Staples', industry: 'Retail — Food Stores' },
  '5411': { sector: 'Consumer Staples', industry: 'Retail — Grocery Stores' },
  '5412': { sector: 'Consumer Staples', industry: 'Retail — Convenience Stores' },
  '5500': { sector: 'Consumer Discretionary', industry: 'Retail — Auto Dealers & Gas Stations' },
  '5531': { sector: 'Consumer Discretionary', industry: 'Retail — Auto & Home Supply Stores' },
  '5600': { sector: 'Consumer Discretionary', industry: 'Retail — Apparel & Accessory Stores' },
  '5621': { sector: 'Consumer Discretionary', industry: "Retail — Women's Clothing Stores" },
  '5651': { sector: 'Consumer Discretionary', industry: 'Retail — Family Clothing Stores' },
  '5700': { sector: 'Consumer Discretionary', industry: 'Retail — Home Furniture & Equipment' },
  '5712': { sector: 'Consumer Discretionary', industry: 'Retail — Furniture Stores' },
  '5731': { sector: 'Consumer Discretionary', industry: 'Retail — Radio, TV & Consumer Electronics' },
  '5812': { sector: 'Consumer Discretionary', industry: 'Retail — Eating Places' },
  '5900': { sector: 'Consumer Discretionary', industry: 'Retail — Miscellaneous Retail' },
  '5912': { sector: 'Consumer Staples', industry: 'Retail — Drug Stores & Proprietary Stores' },
  '5940': { sector: 'Consumer Discretionary', industry: 'Retail — Sporting Goods & Toys' },
  '5944': { sector: 'Consumer Discretionary', industry: 'Retail — Jewelry Stores' },
  '5945': { sector: 'Consumer Discretionary', industry: 'Retail — Hobby, Toy & Game Shops' },
  '5960': { sector: 'Consumer Discretionary', industry: 'Retail — Nonstore Retailers' },
  '5961': { sector: 'Consumer Discretionary', industry: 'Retail — Catalog & Mail-Order Houses' },
  '5990': { sector: 'Consumer Discretionary', industry: 'Retail — Miscellaneous Retail Stores' },
  '6020': { sector: 'Financials', industry: 'State Commercial Banks — Depository' },
  '6021': { sector: 'Financials', industry: 'National Commercial Banks — Depository' },
  '6022': { sector: 'Financials', industry: 'State Commercial Banks — Depository' },
  '6029': { sector: 'Financials', industry: 'Commercial Banks' },
  '6035': { sector: 'Financials', industry: 'Savings Institution, Federally Chartered' },
  '6036': { sector: 'Financials', industry: 'Savings Institutions, Not Federally Chartered' },
  '6099': { sector: 'Financials', industry: 'Functions Related to Depository Banking' },
  '6111': { sector: 'Financials', industry: 'Federal & Federally-Sponsored Credit Agencies' },
  '6141': { sector: 'Financials', industry: 'Personal Credit Institutions' },
  '6153': { sector: 'Financials', industry: 'Short-Term Business Credit Institutions' },
  '6159': { sector: 'Financials', industry: 'Federal-Sponsored Credit Agencies' },
  '6162': { sector: 'Financials', industry: 'Mortgage Bankers, Loan Correspondents' },
  '6163': { sector: 'Financials', industry: 'Loan Brokers' },
  '6199': { sector: 'Financials', industry: 'Finance Services' },
  '6200': { sector: 'Financials', industry: 'Security & Commodity Brokers, Dealers' },
  '6211': { sector: 'Financials', industry: 'Security Brokers, Dealers & Flotation Companies' },
  '6282': { sector: 'Financials', industry: 'Investment Advice' },
  '6311': { sector: 'Financials', industry: 'Life Insurance' },
  '6321': { sector: 'Financials', industry: 'Accident & Health Insurance' },
  '6324': { sector: 'Financials', industry: 'Hospital & Medical Service Plans' },
  '6331': { sector: 'Financials', industry: 'Fire, Marine & Casualty Insurance' },
  '6351': { sector: 'Financials', industry: 'Surety Insurance' },
  '6399': { sector: 'Financials', industry: 'Insurance Carriers' },
  '6411': { sector: 'Financials', industry: 'Insurance Agents, Brokers & Service' },
  '6500': { sector: 'Real Estate', industry: 'Real Estate' },
  '6510': { sector: 'Real Estate', industry: 'Real Estate Operators & Lessors' },
  '6512': { sector: 'Real Estate', industry: 'Operators of Apartment Buildings' },
  '6552': { sector: 'Real Estate', industry: 'Land Subdividers & Developers' },
  '6726': { sector: 'Financials', industry: 'Investment Offices' },
  '6770': { sector: 'Financials', industry: 'Blank Checks' },
  '6792': { sector: 'Financials', industry: 'Investment Trusts, Not Elsewhere Classified' },
  '6795': { sector: 'Financials', industry: 'Trusts' },
  '6798': { sector: 'Real Estate', industry: 'Real Estate Investment Trusts' },
  '6799': { sector: 'Financials', industry: 'Investors' },
  '7000': { sector: 'Consumer Discretionary', industry: 'Hotels, Rooming Houses, Camps' },
  '7011': { sector: 'Consumer Discretionary', industry: 'Hotels & Motels' },
  '7200': { sector: 'Consumer Discretionary', industry: 'Laundry, Cleaning, Garment Services' },
  '7310': { sector: 'Industrials', industry: 'Services — Mailing, Reproduction, Stenographic' },
  '7311': { sector: 'Communication Services', industry: 'Services — Advertising' },
  '7320': { sector: 'Industrials', industry: 'Services — Consumer Credit Reporting & Collection' },
  '7330': { sector: 'Industrials', industry: 'Services — Misc Business Services' },
  '7361': { sector: 'Industrials', industry: 'Services — Help Supply Services' },
  '7363': { sector: 'Industrials', industry: 'Services — Help Supply Services' },
  '7370': { sector: 'Technology', industry: 'Services — Computer Programming, Data Processing' },
  '7371': { sector: 'Technology', industry: 'Services — Computer Programming, Data Processing' },
  '7372': { sector: 'Technology', industry: 'Services — Prepackaged Software' },
  '7374': { sector: 'Technology', industry: 'Services — Computer Processing & Data Preparation' },
  '7377': { sector: 'Technology', industry: 'Services — Computer Rental & Leasing' },
  '7380': { sector: 'Industrials', industry: 'Services — Misc Business Services' },
  '7381': { sector: 'Industrials', industry: 'Services — Detective, Guard & Armored Car Services' },
  '7389': { sector: 'Industrials', industry: 'Services — Misc Business Services' },
  '7500': { sector: 'Consumer Discretionary', industry: 'Services — Automotive Repair, Services & Parking' },
  '7600': { sector: 'Consumer Discretionary', industry: 'Services — Misc Repair Services' },
  '7812': { sector: 'Communication Services', industry: 'Services — Motion Picture & Tape Distribution' },
  '7819': { sector: 'Communication Services', industry: 'Services — Motion Picture & Video Tape Production' },
  '7822': { sector: 'Communication Services', industry: 'Motion Picture Distribution' },
  '7841': { sector: 'Communication Services', industry: 'Services — Video Tape Rental' },
  '7900': { sector: 'Communication Services', industry: 'Amusement & Recreation Services' },
  '7990': { sector: 'Communication Services', industry: 'Services — Amusement & Recreation' },
  '8000': { sector: 'Healthcare', industry: 'Health Services' },
  '8011': { sector: 'Healthcare', industry: 'Services — Offices & Clinics of Doctors of Medicine' },
  '8050': { sector: 'Healthcare', industry: 'Services — Skilled Nursing Care Facilities' },
  '8051': { sector: 'Healthcare', industry: 'Services — Skilled Nursing Care Facilities' },
  '8060': { sector: 'Healthcare', industry: 'Services — Hospitals' },
  '8062': { sector: 'Healthcare', industry: 'Services — General Medical & Surgical Hospitals' },
  '8071': { sector: 'Healthcare', industry: 'Services — Medical Laboratories' },
  '8082': { sector: 'Healthcare', industry: 'Services — Home Health Care Services' },
  '8090': { sector: 'Healthcare', industry: 'Services — Health Services' },
  '8093': { sector: 'Healthcare', industry: 'Services — Specialty Outpatient Facilities' },
  '8111': { sector: 'Industrials', industry: 'Services — Legal Services' },
  '8200': { sector: 'Consumer Discretionary', industry: 'Services — Educational Services' },
  '8300': { sector: 'Industrials', industry: 'Services — Social Services' },
  '8351': { sector: 'Consumer Discretionary', industry: 'Services — Child Day Care Services' },
  '8700': { sector: 'Industrials', industry: 'Services — Engineering, Accounting, Research, Management' },
  '8711': { sector: 'Industrials', industry: 'Services — Engineering Services' },
  '8731': { sector: 'Technology', industry: 'Services — Commercial Physical & Biological Research' },
  '8734': { sector: 'Technology', industry: 'Services — Testing Laboratories' },
  '8741': { sector: 'Industrials', industry: 'Services — Management Services' },
  '8742': { sector: 'Technology', industry: 'Services — Management Consulting Services' },
  '8744': { sector: 'Industrials', industry: 'Services — Facilities Support Management Services' },
  '8900': { sector: 'Industrials', industry: 'Services' },
  '9995': { sector: 'Financials', industry: 'Non-operating Establishments' },
};

function getSICDescription(sic: string): { sector: string; industry: string } {
  // Try exact match first
  if (SIC_DESCRIPTIONS[sic]) return SIC_DESCRIPTIONS[sic];
  // Try 2-digit prefix (broad category)
  const prefix2 = sic.substring(0, 2) + '00';
  if (SIC_DESCRIPTIONS[prefix2]) return SIC_DESCRIPTIONS[prefix2];
  return { sector: 'Other', industry: `SIC ${sic}` };
}

// ── Known domain map for logo resolution ──────────────────────────────

const TICKER_DOMAINS: Record<string, string> = {
  AAPL: 'apple.com', MSFT: 'microsoft.com', GOOGL: 'google.com', GOOG: 'google.com',
  AMZN: 'amazon.com', TSLA: 'tesla.com', NVDA: 'nvidia.com', META: 'meta.com',
  NFLX: 'netflix.com', ADBE: 'adobe.com', CRM: 'salesforce.com', ORCL: 'oracle.com',
  INTC: 'intel.com', AMD: 'amd.com', QCOM: 'qualcomm.com', CSCO: 'cisco.com',
  IBM: 'ibm.com', JPM: 'jpmorganchase.com', BAC: 'bankofamerica.com', WFC: 'wellsfargo.com',
  GS: 'goldmansachs.com', MS: 'morganstanley.com', V: 'visa.com', MA: 'mastercard.com',
  PYPL: 'paypal.com', SQ: 'block.xyz', COIN: 'coinbase.com', WMT: 'walmart.com',
  TGT: 'target.com', COST: 'costco.com', HD: 'homedepot.com', NKE: 'nike.com',
  SBUX: 'starbucks.com', MCD: 'mcdonalds.com', DIS: 'disney.com', BA: 'boeing.com',
  UNH: 'unitedhealthgroup.com', JNJ: 'jnj.com', PFE: 'pfizer.com', ABBV: 'abbvie.com',
  LLY: 'lilly.com', MRK: 'merck.com', TMO: 'thermofisher.com', ABT: 'abbott.com',
  PG: 'pg.com', KO: 'coca-cola.com', PEP: 'pepsico.com', PM: 'pmi.com',
  UPS: 'ups.com', FDX: 'fedex.com', CAT: 'caterpillar.com', DE: 'deere.com',
  XOM: 'exxonmobil.com', CVX: 'chevron.com', COP: 'conocophillips.com',
  BRK: 'berkshirehathaway.com', 'BRK.A': 'berkshirehathaway.com', 'BRK.B': 'berkshirehathaway.com',
  AVGO: 'broadcom.com', TXN: 'ti.com', MU: 'micron.com', LRCX: 'lamresearch.com',
  AMAT: 'appliedmaterials.com', KLAC: 'kla.com', SNPS: 'synopsys.com', CDNS: 'cadence.com',
  NOW: 'servicenow.com', SNOW: 'snowflake.com', PANW: 'paloaltonetworks.com',
  CRWD: 'crowdstrike.com', ZS: 'zscaler.com', DDOG: 'datadoghq.com', NET: 'cloudflare.com',
  SHOP: 'shopify.com', UBER: 'uber.com', LYFT: 'lyft.com',
  ABNB: 'airbnb.com', DASH: 'doordash.com', RBLX: 'roblox.com', U: 'unity.com',
  PLTR: 'palantir.com', PATH: 'uipath.com',
};

function getLogoUrl(ticker: string, website?: string): string | null {
  const upperTicker = ticker.toUpperCase();
  
  // Known domain
  if (TICKER_DOMAINS[upperTicker]) {
    return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${TICKER_DOMAINS[upperTicker]}&size=128`;
  }
  
  // Try to derive from SEC website field
  if (website) {
    try {
      let domain = website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
      if (domain) {
        return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`;
      }
    } catch {}
  }
  
  // Fallback: try ticker.com
  return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${ticker.toLowerCase()}.com&size=128`;
}

// ── Exchange mapping ──────────────────────────────────────────────────

const EXCHANGE_MAP: Record<string, string> = {
  NYSE: 'New York Stock Exchange',
  NASDAQ: 'Nasdaq Stock Market',
  Nasdaq: 'Nasdaq Stock Market',
  AMEX: 'NYSE American (AMEX)',
  BATS: 'Cboe BZX Exchange',
  CBOE: 'Cboe Exchange',
  OTC: 'Over-The-Counter',
  PINK: 'OTC Pink Sheets',
  OTCBB: 'OTC Bulletin Board',
};

// ── Server-side cache ─────────────────────────────────────────────────

const companyCache = new Map<string, { data: CompanyLookupResult; timestamp: number }>();
const searchCache = new Map<string, { data: any[]; timestamp: number }>();
const PROFILE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const SEARCH_CACHE_TTL = 60 * 60 * 1000;  // 1 hour

// ── Yahoo Finance price fetch ─────────────────────────────────────────

async function fetchYahooQuote(symbol: string): Promise<{
  price: number | null;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
  currency: string;
}> {
  try {
    const result = await apiGateway.cachedFetch(
      'yahoo-finance',
      `quote:${symbol}`,
      async () => {
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; OmniFolio/1.0)',
            },
          }
        );

        if (!response.ok) throw new Error(`Yahoo ${response.status}`);

        const data = await response.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta) throw new Error('No meta');

        const currentPrice = meta.regularMarketPrice ?? meta.previousClose ?? null;
        const previousClose = meta.previousClose ?? null;
        const change = currentPrice && previousClose ? currentPrice - previousClose : null;
        const changePercent = change && previousClose ? (change / previousClose) * 100 : null;

        return {
          price: currentPrice,
          change,
          changePercent,
          previousClose,
          currency: meta.currency || 'USD',
        };
      },
      CacheTTL.YAHOO_QUOTE,
    );

    return result.data;
  } catch (error) {
    console.warn(`[Company Lookup] Yahoo quote failed for ${symbol}:`, error);
    return { price: null, change: null, changePercent: null, previousClose: null, currency: 'USD' };
  }
}

// ── SEC Submissions — full company profile (via gateway) ──────────────

async function fetchSECSubmissions(cik: string, userAgent: string): Promise<any> {
  const normalizedCIK = cik.padStart(10, '0');
  const url = `https://data.sec.gov/submissions/CIK${normalizedCIK}.json`;

  const result = await apiGateway.cachedFetch(
    'sec-edgar',
    `submissions:${normalizedCIK}`,
    async () => {
      const response = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept-Encoding': 'gzip, deflate',
          'Host': 'data.sec.gov',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`SEC submissions ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    CacheTTL.SEC_COMPANY_PROFILE,
  );

  return result.data;
}

// ── SEC XBRL Company Facts — financials (via gateway) ─────────────────

async function fetchSECFinancials(cik: string, userAgent: string): Promise<Array<{
  periodEndDate: string;
  fiscalYear: string;
  revenue: number | null;
  netIncome: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  operatingCashFlow: number | null;
  earningsPerShareBasic: number | null;
  earningsPerShareDiluted: number | null;
}>> {
  try {
    const normalizedCIK = cik.padStart(10, '0');
    const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${normalizedCIK}.json`;

    const result = await apiGateway.cachedFetch(
      'sec-edgar',
      `xbrl:${normalizedCIK}`,
      async () => {
        const response = await fetch(url, {
          headers: {
            'User-Agent': userAgent,
            'Accept-Encoding': 'gzip, deflate',
            'Host': 'data.sec.gov',
          },
          cache: 'no-store',
        });

        if (!response.ok) return null;

        return response.json();
      },
      CacheTTL.SEC_XBRL_FINANCIALS,
    );

    const facts = result.data;
    if (!facts) return [];
    
    const usGaap = facts?.facts?.['us-gaap'];
    if (!usGaap) return [];

    // Collect annual (10-K) financials by period end date
    const periodData: Record<string, any> = {};

    const extractTag = (tags: string[], field: string) => {
      for (const tag of tags) {
        const values = usGaap[tag]?.units?.USD || usGaap[tag]?.units?.['USD/shares'];
        if (!values) continue;
        for (const item of values) {
          if (item.form !== '10-K') continue;
          const end = item.end;
          if (!end) continue;
          if (!periodData[end]) {
            periodData[end] = {
              periodEndDate: end,
              fiscalYear: item.fy?.toString() || '',
              revenue: null,
              netIncome: null,
              totalAssets: null,
              totalLiabilities: null,
              totalEquity: null,
              operatingCashFlow: null,
              earningsPerShareBasic: null,
              earningsPerShareDiluted: null,
            };
          }
          periodData[end][field] = item.val;
        }
        if (Object.keys(periodData).length > 0) break; // Use first matching tag
      }
    };

    extractTag(['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet'], 'revenue');
    extractTag(['NetIncomeLoss'], 'netIncome');
    extractTag(['Assets'], 'totalAssets');
    extractTag(['Liabilities'], 'totalLiabilities');
    extractTag(['StockholdersEquity'], 'totalEquity');
    extractTag(['NetCashProvidedByUsedInOperatingActivities'], 'operatingCashFlow');
    extractTag(['EarningsPerShareBasic'], 'earningsPerShareBasic');
    extractTag(['EarningsPerShareDiluted'], 'earningsPerShareDiluted');

    return Object.values(periodData)
      .sort((a: any, b: any) => (b.periodEndDate || '').localeCompare(a.periodEndDate || ''))
      .slice(0, 5); // Last 5 fiscal years
  } catch (error) {
    console.warn('[Company Lookup] XBRL financials failed:', error);
    return [];
  }
}

// ── GET /api/company-lookup ───────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const search = searchParams.get('search');

    const userAgent = process.env.SEC_USER_AGENT || 'OmniFolio/1.0 (support@omnifolio.app)';

    // ── Search mode ──────────────────────────────────────────────────

    if (search) {
      const searchKey = `search:${search.toLowerCase()}`;
      const cachedSearch = searchCache.get(searchKey);
      if (cachedSearch && Date.now() - cachedSearch.timestamp < SEARCH_CACHE_TTL) {
        return NextResponse.json({
          success: true,
          type: 'search',
          data: cachedSearch.data,
          source: 'sec-edgar',
          cached: true,
        });
      }

      // Use SEC company_tickers.json via our existing SEC EDGAR API
      const secApi = createSECEdgarClient();
      const results = await secApi.searchCompanies(search, 15);

      const formattedResults = results.map(r => ({
        symbol: r.ticker,
        name: r.name,
        cik: r.cik,
        exchange: r.exchange || '',
      }));

      searchCache.set(searchKey, { data: formattedResults, timestamp: Date.now() });

      return NextResponse.json({
        success: true,
        type: 'search',
        data: formattedResults,
        source: 'sec-edgar',
        cached: false,
      });
    }

    // ── Profile mode ─────────────────────────────────────────────────

    if (!symbol) {
      return NextResponse.json(
        { error: 'Provide symbol or search parameter.' },
        { status: 400 }
      );
    }

    const upperSymbol = symbol.toUpperCase().trim();

    // Check cache
    const cacheKey = `profile:${upperSymbol}`;
    const cached = companyCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_TTL) {
      return NextResponse.json({
        success: true,
        type: 'profile',
        data: cached.data,
        source: 'sec-edgar',
        cached: true,
      });
    }

    // Step 1: Resolve ticker → CIK via SEC
    const secApi = createSECEdgarClient();
    const mapping = await secApi.getCIKByTicker(upperSymbol);

    if (!mapping) {
      return NextResponse.json(
        { error: `Company not found for symbol: ${upperSymbol}. Use US stock ticker symbols (e.g., AAPL, TSLA, MSFT).` },
        { status: 404 }
      );
    }

    // Step 2: Fetch SEC submissions (company profile + filings) AND Yahoo quote AND XBRL financials in parallel
    const [submissions, yahooQuote, financials] = await Promise.all([
      fetchSECSubmissions(mapping.cik, userAgent),
      fetchYahooQuote(upperSymbol),
      fetchSECFinancials(mapping.cik, userAgent),
    ]);

    // Step 3: Parse SEC submissions data
    const addresses = submissions.addresses || {};
    const businessAddr = addresses.business || {};
    const mailingAddr = addresses.mailing || {};

    const sicCode = submissions.sic || '';
    const sicInfo = getSICDescription(sicCode);

    // Parse exchange from SEC data
    const exchanges: string[] = submissions.exchanges || [];
    const primaryExchange = exchanges[0] || '';
    const exchangeFullName = EXCHANGE_MAP[primaryExchange] || primaryExchange;

    // Parse recent filings
    const recentFilings = submissions.filings?.recent;
    const filingsList: CompanyLookupResult['recentFilings'] = [];
    if (recentFilings) {
      const count = Math.min(recentFilings.accessionNumber?.length || 0, 15);
      const directoryCIK = mapping.cik.replace(/^0+/, '');
      for (let i = 0; i < count; i++) {
        const accessionNumber = recentFilings.accessionNumber[i];
        const accessionPath = accessionNumber.replace(/-/g, '');
        filingsList.push({
          form: recentFilings.form[i],
          filingDate: recentFilings.filingDate[i],
          accessionNumber,
          primaryDocument: recentFilings.primaryDocument[i],
          primaryDocumentUrl: `https://www.sec.gov/Archives/edgar/data/${directoryCIK}/${accessionPath}/${recentFilings.primaryDocument[i]}`,
          description: recentFilings.primaryDocDescription?.[i] || recentFilings.form[i],
        });
      }
    }

    // Get company website from SEC
    const secWebsite = submissions.website || '';

    // Build result
    const result: CompanyLookupResult = {
      // Identity
      symbol: upperSymbol,
      companyName: submissions.name || mapping.name,
      cik: mapping.cik,
      sic: sicCode,
      sicDescription: `${sicInfo.sector} — ${sicInfo.industry}`,
      ein: submissions.ein || '',
      stateOfIncorporation: submissions.stateOfIncorporation || '',
      fiscalYearEnd: submissions.fiscalYearEnd || '',

      // Contact
      addresses: {
        business: {
          street1: businessAddr.street1 || '',
          street2: businessAddr.street2 || '',
          city: businessAddr.city || '',
          state: businessAddr.stateOrCountry || '',
          zip: businessAddr.zipCode || '',
          country: businessAddr.stateOrCountryDescription || '',
        },
        mailing: {
          street1: mailingAddr.street1 || '',
          street2: mailingAddr.street2 || '',
          city: mailingAddr.city || '',
          state: mailingAddr.stateOrCountry || '',
          zip: mailingAddr.zipCode || '',
          country: mailingAddr.stateOrCountryDescription || '',
        },
      },
      phone: submissions.phone || '',
      website: secWebsite ? (secWebsite.startsWith('http') ? secWebsite : `https://${secWebsite}`) : '',

      // Exchange
      exchange: primaryExchange,
      exchangeFullName,
      category: submissions.category || '',

      // Branding
      logoUrl: getLogoUrl(upperSymbol, secWebsite),

      // Market Data
      price: yahooQuote.price,
      change: yahooQuote.change,
      changePercent: yahooQuote.changePercent,
      previousClose: yahooQuote.previousClose,
      currency: yahooQuote.currency,

      // Flags
      isActivelyTrading: !!(yahooQuote.price && yahooQuote.price > 0),

      // Filings
      recentFilings: filingsList,

      // Financials
      financials,

      // Metadata
      source: 'sec-edgar',
      lastUpdated: new Date().toISOString(),
    };

    // Cache
    companyCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json({
      success: true,
      type: 'profile',
      data: result,
      source: 'sec-edgar',
      cached: false,
    });
  } catch (error: any) {
    console.error('[Company Lookup] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch company data' },
      { status: 500 }
    );
  }
}

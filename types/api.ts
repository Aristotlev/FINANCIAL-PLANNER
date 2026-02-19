/**
 * Omnifolio Proprietary API Types
 * 
 * Defines types for API keys, usage tracking, rate limits,
 * and all public API response formats.
 * 
 * Copyright OmniFolio. All rights reserved.
 */

// ==================== API KEY TYPES ====================

export type ApiKeyTier = 'free' | 'enterprise';
export type ApiKeyStatus = 'active' | 'revoked' | 'expired' | 'suspended';

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;        // First 8 chars for display (e.g., "omni_abc1...")
  key_hash: string;           // SHA-256 hash of the full key
  tier: ApiKeyTier;
  status: ApiKeyStatus;
  scopes: ApiScope[];         // Allowed API scopes
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  monthly_quota: number;
  monthly_usage: number;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export interface ApiKeyCreateRequest {
  name: string;
  tier?: ApiKeyTier;
  scopes?: ApiScope[];
  expires_in_days?: number;   // null = never expires
}

export interface ApiKeyCreateResponse {
  id: string;
  name: string;
  key: string;                // Full key - shown only once!
  key_prefix: string;
  tier: ApiKeyTier;
  scopes: ApiScope[];
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  monthly_quota: number;
  expires_at: string | null;
  created_at: string;
}

export interface ApiKeyListItem {
  id: string;
  name: string;
  key_prefix: string;
  tier: ApiKeyTier;
  status: ApiKeyStatus;
  scopes: ApiScope[];
  monthly_usage: number;
  monthly_quota: number;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

// ==================== API SCOPES ====================

export type ApiScope =
  | 'lobbying:read'          // Senate lobbying disclosures + OLI scores (US Senate LDA)
  | 'spending:read'          // Federal contract & spending data + OGI scores (USAspending.gov)
  | 'insider:read'           // SEC EDGAR Form 4 insider transactions + OIC scores
  | 'earnings:read'          // SEC EDGAR XBRL earnings surprises + OES scores
  | 'company:read'           // SEC EDGAR company profiles, CIK, SIC, filings index
  | 'sec:read'               // Full SEC EDGAR filings (10-K, 10-Q, 8-K, proxy, etc.)
  | 'economic:read'          // Economic & IPO calendars, earnings calendar
  | 'analytics:read'         // Market-sentiment indicators (Fear & Greed, etc.)
  | 'news:read'              // Financial news and market headlines
  | 'portfolio:read'         // User's own portfolio data (read-only)
  | 'portfolio:write'        // Modify user's portfolio
  | '*';                     // All scopes

export const API_SCOPE_DESCRIPTIONS: Record<ApiScope, string> = {
  'lobbying:read': 'Senate lobbying disclosure filings with proprietary OLI (OmniFolio Lobbying Influence) scores',
  'spending:read': 'Federal contract awards and spending data with proprietary OGI (OmniFolio Government Influence) scores',
  'insider:read': 'SEC EDGAR Form 4 insider transactions with proprietary OIC (OmniFolio Insider Confidence) scores',
  'earnings:read': 'SEC EDGAR XBRL earnings data with proprietary OES (OmniFolio Earnings Surprise) scores',
  'company:read': 'Company profiles sourced from SEC EDGAR: CIK, SIC, exchange, addresses, filings index',
  'sec:read': 'Full SEC EDGAR filing access: 10-K, 10-Q, 8-K, proxy, and XBRL financial data',
  'economic:read': 'Economic indicators, IPO calendar, earnings calendar, and macroeconomic event data',
  'analytics:read': 'Market-sentiment analytics including Fear & Greed Index and related signals',
  'news:read': 'Financial news and market headlines aggregated from public sources',
  'portfolio:read': 'Read your own portfolio holdings and performance data',
  'portfolio:write': 'Create, update, and delete portfolio entries',
  '*': 'Full access to all API endpoints',
};

// ==================== TIER CONFIGURATION ====================

export interface ApiTierConfig {
  tier: ApiKeyTier;
  name: string;
  description: string;
  api_access: boolean;
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  monthly_quota: number;
  max_keys: number;
  allowed_scopes: ApiScope[];
  price_monthly_usd: number;
  features: string[];
}

export const API_TIER_CONFIG: Record<ApiKeyTier, ApiTierConfig> = {
  free: {
    tier: 'free',
    name: 'Free',
    description: 'App-only plan — no external API access whatsoever',
    api_access: false,
    rate_limit_per_minute: 0,
    rate_limit_per_day: 0,
    monthly_quota: 0,
    max_keys: 0,
    allowed_scopes: [],
    price_monthly_usd: 0,
    features: [
      'No API access (app-only plan)',
      'Manual portfolio tracking',
      'Basic analytics',
      'Community support',
    ],
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    description: 'Full API access — the only plan with external API access',
    api_access: true,
    rate_limit_per_minute: 600,
    rate_limit_per_day: 500000,
    monthly_quota: 10000000,
    max_keys: 100,
    allowed_scopes: ['*'],
    price_monthly_usd: 1500,
    features: [
      '600 requests/minute',
      '500,000 requests/day',
      '10,000,000 requests/month',
      'All API scopes unlocked',
      'Senate lobbying + OLI scores',
      'Federal spending + OGI scores',
      'Insider transactions + OIC scores',
      'Earnings surprises + OES scores',
      'SEC EDGAR filings (10-K, 10-Q, 8-K)',
      'Company profiles (SEC EDGAR)',
      'Economic & IPO calendars',
      'Portfolio API access',
      'Up to 100 API keys',
      'Webhook notifications',
      'Custom rate limits',
      'Dedicated account manager',
      'Priority support — < 1 hour response',
      'SLA guarantee (99.9%)',
      'Custom integrations & onboarding',
      'IP whitelisting & advanced security',
    ],
  },
};

// ==================== USAGE TRACKING ====================

export interface ApiUsageLog {
  id: string;
  api_key_id: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  ip_address: string;
  user_agent: string;
  request_params: Record<string, any>;
  error_message: string | null;
  created_at: string;
}

export interface ApiUsageSummary {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time_ms: number;
  top_endpoints: { endpoint: string; count: number }[];
  requests_by_day: { date: string; count: number }[];
  requests_by_hour: { hour: number; count: number }[];
  quota_used: number;
  quota_remaining: number;
  quota_reset_date: string;
}

// ==================== API RESPONSE TYPES ====================

/** Standard API response wrapper */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiMeta {
  request_id: string;
  timestamp: string;
  version: string;
  rate_limit: {
    limit: number;
    remaining: number;
    reset: string;
  };
  cache?: {
    hit: boolean;
    ttl: number;
  };
}

// ==================== ENDPOINT-SPECIFIC RESPONSE TYPES ====================

/** GET /v1/lobbying?symbol=LMT */
export interface LobbyingResponse {
  symbol: string;
  company_name: string;
  oli_score: number;           // OmniFolio Lobbying Influence score 0–100
  oli_trend: 'increasing' | 'decreasing' | 'stable';
  total_amount_usd: number;
  filing_count: number;
  periods: {
    year: number;
    half: 1 | 2;
    amount_usd: number;
    agencies: string[];
    issues: string[];
  }[];
  top_agencies: string[];
  top_issues: string[];
  data_source: 'US Senate LDA';
  last_updated: string;
  cache_meta: { hit: boolean; ttl: number; expires_at: string };
}

/** GET /v1/spending?symbol=LMT */
export interface SpendingResponse {
  symbol: string;
  company_name: string;
  ogi_score: number;           // OmniFolio Government Influence score 0–100
  ogi_trend: 'increasing' | 'decreasing' | 'stable';
  total_obligations_usd: number;
  award_count: number;
  fiscal_years: {
    year: number;
    obligations_usd: number;
    award_count: number;
    top_agencies: string[];
    sectors: string[];
  }[];
  top_agencies: string[];
  top_sectors: string[];
  data_source: 'USAspending.gov';
  last_updated: string;
  cache_meta: { hit: boolean; ttl: number; expires_at: string };
}

/** GET /v1/insider?symbol=AAPL */
export interface InsiderResponse {
  symbol: string;
  company_name: string;
  oic_score: number;           // OmniFolio Insider Confidence score 0–100
  oic_trend: 'improving' | 'declining' | 'stable';
  net_shares_bought: number;
  net_value_usd: number;
  transaction_count: number;
  months: {
    month: string;             // YYYY-MM
    oic_score: number;
    buy_count: number;
    sell_count: number;
    net_shares: number;
  }[];
  transactions: {
    filing_date: string;
    insider_name: string;
    insider_title: string;
    transaction_type: 'buy' | 'sell' | 'award' | 'disposition';
    shares: number;
    price_per_share: number | null;
    total_value_usd: number | null;
    shares_owned_after: number;
    form4_url: string;
  }[];
  data_source: 'SEC EDGAR Form 4';
  last_updated: string;
  cache_meta: { hit: boolean; ttl: number; expires_at: string };
}

/** GET /v1/earnings-surprises?symbol=AAPL */
export interface EarningsSurprisesResponse {
  symbol: string;
  company_name: string;
  oes_score: number;           // OmniFolio Earnings Surprise score 0–100
  beat_streak: number;
  miss_streak: number;
  quarters: {
    period: string;            // e.g. "Q1 2024"
    fiscal_date_ending: string;
    report_date: string;
    eps_actual: number;
    eps_estimate: number | null;
    eps_surprise_pct: number | null;
    revenue_actual: number;
    revenue_estimate: number | null;
    revenue_surprise_pct: number | null;
    beat: boolean | null;
    oes_score: number;
    filing_url: string;
  }[];
  data_source: 'SEC EDGAR XBRL';
  last_updated: string;
  cache_meta: { hit: boolean; ttl: number; expires_at: string };
}

/** GET /v1/company?symbol=AAPL */
export interface CompanyResponse {
  symbol: string;
  company_name: string;
  cik: string;
  sic: string;
  sic_description: string;
  exchange: string;
  state_of_incorporation: string;
  fiscal_year_end: string;
  website: string;
  phone: string;
  logo_url: string | null;
  addresses: {
    business: { street1: string; city: string; state: string; zip: string; country?: string };
    mailing: { street1: string; city: string; state: string; zip: string; country?: string };
  };
  recent_filings: {
    accession_number: string;
    form_type: string;
    filing_date: string;
    document_url: string;
  }[];
  data_source: 'SEC EDGAR';
  last_updated: string;
}

/** GET /v1/economic/calendar */
export interface EconomicCalendarEvent {
  id: string;
  date: string;
  time: string | null;
  country: string;
  event: string;
  importance: 'low' | 'medium' | 'high';
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  source_url: string | null;
}

export interface EconomicCalendarResponse {
  events: EconomicCalendarEvent[];
  from: string;
  to: string;
}

/** GET /v1/economic/ipo-calendar */
export interface IpoCalendarEvent {
  id: string;
  date: string;
  symbol: string | null;
  company_name: string;
  exchange: string;
  price_range_low: number | null;
  price_range_high: number | null;
  shares_offered: number | null;
  status: 'upcoming' | 'priced' | 'filed' | 'withdrawn';
  source_url: string | null;
}

export interface IpoCalendarResponse {
  ipos: IpoCalendarEvent[];
  from: string;
  to: string;
}

/** GET /v1/health */
export interface HealthResponse {
  status: 'operational' | 'degraded' | 'outage';
  version: string;
  uptime: number;
  services: {
    name: string;
    status: 'up' | 'down' | 'degraded';
    latency_ms: number;
  }[];
}
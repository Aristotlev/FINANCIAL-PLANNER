'use client';

/**
 * Omnifolio API Documentation - Client Component
 * 
 * Interactive API documentation with:
 * - Endpoint reference with live examples
 * - Authentication guide
 * - Code snippets in multiple languages
 * - Tier comparison
 * - Rate limit info
 * 
 * Copyright OmniFolio. All rights reserved.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { API_TIER_CONFIG } from '@/types/api';

// ==================== ENDPOINT DATA ====================

interface EndpointDef {
  method: string;
  path: string;
  title: string;
  description: string;
  scope: string;
  parameters: { name: string; type: string; required: boolean; description: string }[];
  exampleResponse: string;
  curlExample: string;
}

const ENDPOINTS: EndpointDef[] = [
  {
    method: 'GET',
    path: '/api/v1/lobbying',
    title: 'Senate Lobbying',
    description: 'Senate LDA lobbying filings enriched with proprietary OLI (OmniFolio Lobbying Influence) scores. Returns spend breakdowns by year, targeted agencies, and issue categories.',
    scope: 'lobbying:read',
    parameters: [
      { name: 'symbol', type: 'string', required: true, description: 'Ticker symbol (e.g., LMT, RTX, BA)' },
      { name: 'years', type: 'number', required: false, description: 'Number of years of history to return (default: 3)' },
      { name: 'refresh', type: 'boolean', required: false, description: 'Force a cache bypass and re-fetch from Senate LDA (default: false)' },
      { name: 'activities', type: 'boolean', required: false, description: 'Include individual lobbying activity details (default: true)' },
    ],
    exampleResponse: `{
  "success": true,
  "data": {
    "symbol": "LMT",
    "company_name": "Lockheed Martin Corporation",
    "oli_score": 87,
    "oli_trend": "stable",
    "total_amount_usd": 54200000,
    "filing_count": 24,
    "top_agencies": ["Department of Defense", "Congress", "NASA"],
    "top_issues": ["Defense", "Budget/Appropriations", "Space"],
    "cache_meta": { "hit": true, "ttl": 3600, "expires_at": "2026-02-18T13:00:00Z" }
  },
  "meta": {
    "request_id": "req_m1abc123_xyz",
    "timestamp": "2026-02-18T12:00:01Z",
    "version": "1.0.0",
    "rate_limit": { "limit": 10, "remaining": 9, "reset": "2026-02-18T12:01:00Z" }
  }
}`,
    curlExample: `curl -X GET "https://www.omnifolio.app/api/v1/lobbying?symbol=LMT&years=3" \\
  -H "Authorization: Bearer omni_live_your_api_key_here"`,
  },
  {
    method: 'GET',
    path: '/api/v1/spending',
    title: 'Federal Spending & Contracts',
    description: 'Government contract awards sourced from USAspending.gov with proprietary OGI (OmniFolio Government Influence) scores. Fiscal-year breakdowns, obligation trends, and agency detail.',
    scope: 'spending:read',
    parameters: [
      { name: 'symbol', type: 'string', required: true, description: 'Ticker symbol (e.g., LMT, RTX, AMZN)' },
      { name: 'years', type: 'number', required: false, description: 'Number of fiscal years of history (default: 3)' },
      { name: 'refresh', type: 'boolean', required: false, description: 'Force re-fetch from USAspending.gov (default: false)' },
      { name: 'activities', type: 'boolean', required: false, description: 'Include individual award details (default: true)' },
    ],
    exampleResponse: `{
  "success": true,
  "data": {
    "symbol": "LMT",
    "company_name": "Lockheed Martin Corporation",
    "ogi_score": 94,
    "ogi_trend": "increasing",
    "total_obligations_usd": 62400000000,
    "award_count": 1847,
    "top_agencies": ["Dept. of Defense", "NASA", "Dept. of Energy"],
    "top_sectors": ["Aircraft Manufacturing", "Missile Systems", "IT Services"],
    "cache_meta": { "hit": false, "ttl": 3600, "expires_at": "2026-02-18T13:00:00Z" }
  },
  "meta": { ... }
}`,
    curlExample: `curl -X GET "https://www.omnifolio.app/api/v1/spending?symbol=LMT&years=3" \\
  -H "Authorization: Bearer omni_live_your_api_key_here"`,
  },
  {
    method: 'GET',
    path: '/api/v1/insider',
    title: 'Insider Transactions',
    description: 'SEC EDGAR Form 4 insider buy/sell data scored with proprietary OIC (OmniFolio Insider Confidence) metrics. Monthly aggregations, individual transaction detail, and trend direction.',
    scope: 'insider:read',
    parameters: [
      { name: 'symbol', type: 'string', required: true, description: 'Ticker symbol (e.g., AAPL, TSLA, MSFT)' },
      { name: 'months', type: 'number', required: false, description: 'Months of history to include (default: 24)' },
      { name: 'refresh', type: 'boolean', required: false, description: 'Force re-fetch from SEC EDGAR (default: false)' },
      { name: 'transactions', type: 'boolean', required: false, description: 'Include individual transaction rows (default: true)' },
    ],
    exampleResponse: `{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "company_name": "Apple Inc.",
    "oic_score": 62,
    "oic_trend": "declining",
    "net_shares_bought": -3450000,
    "net_value_usd": -684500000,
    "transaction_count": 47,
    "transactions": [
      {
        "filing_date": "2026-02-10",
        "insider_name": "Timothy D. Cook",
        "insider_title": "CEO",
        "transaction_type": "sell",
        "shares": 250000,
        "price_per_share": 198.50,
        "total_value_usd": 49625000,
        "form4_url": "https://www.sec.gov/Archives/edgar/..."
      }
    ],
    "cache_meta": { "hit": true, "ttl": 1800, "expires_at": "2026-02-18T12:30:00Z" }
  },
  "meta": { ... }
}`,
    curlExample: `curl -X GET "https://www.omnifolio.app/api/v1/insider?symbol=AAPL&months=12" \\
  -H "Authorization: Bearer omni_live_your_api_key_here"`,
  },
  {
    method: 'GET',
    path: '/api/v1/earnings-surprises',
    title: 'Earnings Surprises',
    description: 'Actual EPS & revenue from SEC EDGAR XBRL filings paired with consensus estimates. Proprietary OES (OmniFolio Earnings Surprise) scores, beat/miss streaks, and quarter-on-quarter analysis.',
    scope: 'earnings:read',
    parameters: [
      { name: 'symbol', type: 'string', required: true, description: 'Ticker symbol (e.g., AAPL, NVDA, MSFT)' },
      { name: 'quarters', type: 'number', required: false, description: 'Number of quarters to return (default: 8)' },
      { name: 'refresh', type: 'boolean', required: false, description: 'Force re-fetch from SEC EDGAR XBRL (default: false)' },
    ],
    exampleResponse: `{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "company_name": "Apple Inc.",
    "oes_score": 78,
    "beat_streak": 6,
    "miss_streak": 0,
    "quarters": [
      {
        "period": "Q1 2025",
        "fiscal_date_ending": "2024-12-28",
        "eps_actual": 2.40,
        "eps_estimate": 2.35,
        "eps_surprise_pct": 2.13,
        "revenue_actual": 124300000000,
        "revenue_surprise_pct": 1.8,
        "beat": true,
        "oes_score": 82,
        "filing_url": "https://www.sec.gov/Archives/edgar/..."
      }
    ],
    "cache_meta": { "hit": true, "ttl": 3600, "expires_at": "2026-02-18T13:00:00Z" }
  },
  "meta": { ... }
}`,
    curlExample: `curl -X GET "https://www.omnifolio.app/api/v1/earnings-surprises?symbol=AAPL&quarters=8" \\
  -H "Authorization: Bearer omni_live_your_api_key_here"`,
  },
  {
    method: 'GET',
    path: '/api/v1/company',
    title: 'Company Profile',
    description: 'Company data sourced from SEC EDGAR: CIK, SIC codes, exchange info, registered addresses, fiscal year-end, and a full filings index. No paid vendor required.',
    scope: 'company:read',
    parameters: [
      { name: 'symbol', type: 'string', required: false, description: 'Ticker symbol (e.g., AAPL). Required if search is not provided.' },
      { name: 'search', type: 'string', required: false, description: 'Free-text company name search. Required if symbol is not provided.' },
    ],
    exampleResponse: `{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "company_name": "Apple Inc.",
    "cik": "0000320193",
    "sic": "3571",
    "sic_description": "Electronic Computers",
    "exchange": "Nasdaq",
    "state_of_incorporation": "CA",
    "fiscal_year_end": "0930",
    "website": "https://www.apple.com",
    "phone": "408-996-1010",
    "recent_filings": [
      { "form_type": "10-Q", "filing_date": "2025-02-05", "document_url": "https://www.sec.gov/..." }
    ]
  },
  "meta": { ... }
}`,
    curlExample: `curl -X GET "https://www.omnifolio.app/api/v1/company?symbol=AAPL" \\
  -H "Authorization: Bearer omni_live_your_api_key_here"`,
  },
  {
    method: 'GET',
    path: '/api/v1/sec/filings',
    title: 'SEC Filings',
    description: 'Full access to SEC EDGAR filings: 10-K, 10-Q, 8-K, proxy statements, and XBRL financials. Served from Supabase-backed cache — always fast.',
    scope: 'sec:read',
    parameters: [
      { name: 'symbol', type: 'string', required: false, description: 'Ticker symbol. Required if cik is not provided.' },
      { name: 'cik', type: 'string', required: false, description: 'SEC CIK number. Required if symbol is not provided.' },
      { name: 'type', type: 'string', required: false, description: 'Filing type filter: 10-K | 10-Q | 8-K | DEF-14A | S-1 (default: all)' },
      { name: 'limit', type: 'number', required: false, description: 'Max results to return (default: 20, max: 100)' },
    ],
    exampleResponse: `{
  "success": true,
  "data": {
    "cik": "0000320193",
    "symbol": "AAPL",
    "company_name": "Apple Inc.",
    "filings": [
      {
        "accession_number": "0000320193-25-000012",
        "form_type": "10-Q",
        "filing_date": "2025-02-05",
        "report_date": "2024-12-28",
        "document_url": "https://www.sec.gov/Archives/edgar/..."
      }
    ],
    "total": 200
  },
  "meta": { ... }
}`,
    curlExample: `curl -X GET "https://www.omnifolio.app/api/v1/sec/filings?symbol=AAPL&type=10-Q&limit=10" \\
  -H "Authorization: Bearer omni_live_your_api_key_here"`,
  },
  {
    method: 'GET',
    path: '/api/v1/economic/calendar',
    title: 'Economic Calendar',
    description: 'High-impact macroeconomic events with importance ratings, actual vs forecast & previous values, and country filtering.',
    scope: 'economic:read',
    parameters: [
      { name: 'from', type: 'string', required: false, description: 'Start date ISO 8601 (default: today)' },
      { name: 'to', type: 'string', required: false, description: 'End date ISO 8601 (default: 7 days from now)' },
      { name: 'importance', type: 'string', required: false, description: 'Filter by importance: low | medium | high' },
      { name: 'country', type: 'string', required: false, description: 'ISO country code filter (e.g., US, EU, GB)' },
    ],
    exampleResponse: `{
  "success": true,
  "data": {
    "events": [
      {
        "id": "eco_us_cpi_202502",
        "date": "2026-02-12",
        "time": "08:30",
        "country": "US",
        "event": "CPI (YoY)",
        "importance": "high",
        "actual": "2.9%",
        "forecast": "2.8%",
        "previous": "2.7%"
      }
    ],
    "from": "2026-02-12",
    "to": "2026-02-19"
  },
  "meta": { ... }
}`,
    curlExample: `curl -X GET "https://www.omnifolio.app/api/v1/economic/calendar?importance=high&country=US" \\
  -H "Authorization: Bearer omni_live_your_api_key_here"`,
  },
  {
    method: 'GET',
    path: '/api/v1/economic/ipo-calendar',
    title: 'IPO Calendar',
    description: 'Upcoming and recent IPOs sourced from SEC EDGAR S-1 and S-11 filings. Price ranges, shares offered, exchange, and filing links.',
    scope: 'economic:read',
    parameters: [
      { name: 'from', type: 'string', required: false, description: 'Start date ISO 8601 (default: today)' },
      { name: 'to', type: 'string', required: false, description: 'End date ISO 8601 (default: 30 days from now)' },
      { name: 'refresh', type: 'boolean', required: false, description: 'Force re-fetch from SEC EDGAR (default: false)' },
    ],
    exampleResponse: `{
  "success": true,
  "data": {
    "ipos": [
      {
        "id": "ipo_sec_0001234567",
        "date": "2026-02-20",
        "symbol": "XMPL",
        "company_name": "Example Corp.",
        "exchange": "Nasdaq",
        "price_range_low": 18.00,
        "price_range_high": 22.00,
        "shares_offered": 10000000,
        "status": "upcoming",
        "source_url": "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=..."
      }
    ],
    "from": "2026-02-18",
    "to": "2026-03-18"
  },
  "meta": { ... }
}`,
    curlExample: `curl -X GET "https://www.omnifolio.app/api/v1/economic/ipo-calendar" \\
  -H "Authorization: Bearer omni_live_your_api_key_here"`,
  },
  {
    method: 'GET',
    path: '/api/v1/health',
    title: 'Health Check',
    description: 'Check the health status of the API and its upstream services. No authentication required.',
    scope: 'none',
    parameters: [],
    exampleResponse: `{
  "success": true,
  "data": {
    "status": "operational",
    "version": "1.0.0",
    "uptime": 86400,
    "services": [
      { "name": "lobbying", "status": "up", "latency_ms": 45 },
      { "name": "spending", "status": "up", "latency_ms": 52 },
      { "name": "insider", "status": "up", "latency_ms": 38 },
      { "name": "earnings-surprises", "status": "up", "latency_ms": 41 },
      { "name": "sec-filings", "status": "up", "latency_ms": 29 }
    ]
  }
}`,
    curlExample: `curl -X GET "https://www.omnifolio.app/api/v1/health"`,
  },
];

// ==================== COMPONENTS ====================

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
    PATCH: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    PUT: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${colors[method] || 'bg-gray-500/20 text-gray-400'}`}>
      {method}
    </span>
  );
}

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-[#0d1117] rounded-lg p-4 overflow-x-auto text-sm text-gray-300 border border-white/10">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: EndpointDef }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showResponse, setShowResponse] = useState(true);

  return (
    <div className="border border-white/10 rounded-xl bg-white/[0.02] overflow-hidden" id={endpoint.path.replace(/\//g, '-').slice(1)}>
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.03] transition-colors text-left"
      >
        <MethodBadge method={endpoint.method} />
        <code className="text-sm font-mono text-gray-300 flex-1">{endpoint.path}</code>
        <span className="text-gray-500 text-sm hidden sm:block">{endpoint.title}</span>
        <svg className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="border-t border-white/10 p-4 space-y-4">
          <p className="text-gray-400 text-sm">{endpoint.description}</p>

          {endpoint.scope !== 'none' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Required Scope:</span>
              <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded border border-violet-500/30">{endpoint.scope}</span>
            </div>
          )}

          {/* Parameters */}
          {endpoint.parameters.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Parameters</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-white/10">
                      <th className="pb-2 text-gray-500 font-medium">Name</th>
                      <th className="pb-2 text-gray-500 font-medium">Type</th>
                      <th className="pb-2 text-gray-500 font-medium">Required</th>
                      <th className="pb-2 text-gray-500 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoint.parameters.map((param) => (
                      <tr key={param.name} className="border-b border-white/5">
                        <td className="py-2 text-gray-300 font-mono">{param.name}</td>
                        <td className="py-2 text-gray-400">{param.type}</td>
                        <td className="py-2">
                          {param.required ? (
                            <span className="text-amber-400 text-xs">required</span>
                          ) : (
                            <span className="text-gray-600 text-xs">optional</span>
                          )}
                        </td>
                        <td className="py-2 text-gray-400">{param.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabs: cURL / Response */}
          <div>
            <div className="flex gap-1 mb-2">
              <button
                onClick={() => setShowResponse(false)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${!showResponse ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                cURL Example
              </button>
              <button
                onClick={() => setShowResponse(true)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${showResponse ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Response
              </button>
            </div>
            <CodeBlock code={showResponse ? endpoint.exampleResponse : endpoint.curlExample} language={showResponse ? 'json' : 'bash'} />
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== MAIN PAGE ====================

export function ApiDocsClient() {
  const [activeSection, setActiveSection] = useState('overview');

  const tiers = Object.values(API_TIER_CONFIG);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Omnifolio
            </Link>
            <span className="text-gray-500">/</span>
            <span className="text-gray-300 font-medium">API Docs</span>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">v1.0</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/api-pricing" className="text-sm text-gray-400 hover:text-white transition-colors">
              API Pricing
            </Link>
            <Link href="/settings" className="text-sm text-violet-400 hover:text-white transition-colors font-medium">
              Get API Key →
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <nav className="hidden lg:block w-56 shrink-0 sticky top-24 self-start">
            <ul className="space-y-1 text-sm">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'authentication', label: 'Authentication' },
                { id: 'rate-limits', label: 'Rate Limits' },
                { id: 'errors', label: 'Error Handling' },
                { id: 'endpoints', label: 'Endpoints' },
                { id: 'pricing', label: 'API Pricing' },
                { id: 'sdks', label: 'SDKs & Libraries' },
              ].map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={() => setActiveSection(item.id)}
                    className={`block px-3 py-1.5 rounded-md transition-colors ${
                      activeSection === item.id
                        ? 'bg-violet-500/10 text-violet-400'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Main Content */}
          <main className="flex-1 min-w-0 space-y-16">
            {/* Overview */}
            <section id="overview">
              <h1 className="text-4xl font-bold mb-4">
                <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  Omnifolio Financial Data API
                </span>
              </h1>
              <p className="text-lg text-gray-400 mb-6 max-w-3xl">
                Access real-time stock prices, cryptocurrency data, exchange rates, and market analytics
                through a simple, well-documented REST API. Built for developers by developers.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                  <div className="text-2xl mb-1">📊</div>
                  <div className="text-sm font-medium text-gray-300">Market Data</div>
                  <div className="text-xs text-gray-500 mt-1">Stocks, crypto, forex, indices, commodities</div>
                </div>
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                  <div className="text-2xl mb-1">⚡</div>
                  <div className="text-sm font-medium text-gray-300">Real-Time</div>
                  <div className="text-xs text-gray-500 mt-1">30-second cache, multiple data sources</div>
                </div>
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                  <div className="text-2xl mb-1">🔒</div>
                  <div className="text-sm font-medium text-gray-300">Secure</div>
                  <div className="text-xs text-gray-500 mt-1">API key auth, rate limiting, usage tracking</div>
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Quick Start</h3>
                <CodeBlock code={`# 1. Get your API key at https://www.omnifolio.app/settings
# 2. Make your first request:

curl -X GET "https://www.omnifolio.app/api/v1/market/quote?symbol=AAPL" \\
  -H "Authorization: Bearer omni_live_your_api_key_here"

# That's it! You'll get real-time Apple stock data.`} />
              </div>
            </section>

            {/* Authentication */}
            <section id="authentication">
              <h2 className="text-2xl font-bold mb-4 text-gray-200">Authentication</h2>
              <p className="text-gray-400 mb-4">
                All API requests (except <code className="text-violet-400">/v1/health</code>) require an API key.
                You can pass it in three ways:
              </p>

              <div className="space-y-3 mb-6">
                <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4">
                  <div className="text-sm font-medium text-emerald-400 mb-1">Authorization Header (Recommended)</div>
                  <CodeBlock code={`Authorization: Bearer omni_live_your_api_key_here`} />
                </div>
                <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4">
                  <div className="text-sm font-medium text-blue-400 mb-1">X-API-Key Header</div>
                  <CodeBlock code={`X-API-Key: omni_live_your_api_key_here`} />
                </div>
                <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4">
                  <div className="text-sm font-medium text-yellow-400 mb-1">Query Parameter (for testing only)</div>
                  <CodeBlock code={`GET /api/v1/market/quote?symbol=AAPL&api_key=omni_live_your_api_key_here`} />
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <p className="text-amber-400 text-sm">
                  <strong>⚠️ Security Note:</strong> Never expose your API key in client-side code or public repositories.
                  Use environment variables and server-side proxies.
                </p>
              </div>
            </section>

            {/* Rate Limits */}
            <section id="rate-limits">
              <h2 className="text-2xl font-bold mb-4 text-gray-200">Rate Limits</h2>
              <p className="text-gray-400 mb-4">
                Rate limits are enforced per API key. When exceeded, you&apos;ll receive a <code className="text-red-400">429 Too Many Requests</code> response.
                Check the response headers for your current usage:
              </p>
              <CodeBlock code={`X-RateLimit-Limit: 10          # Max requests per minute
X-RateLimit-Remaining: 7      # Requests remaining in current window
X-RateLimit-Reset: 2026-02-18T12:01:00Z  # When the window resets
Retry-After: 45                # Seconds to wait (only on 429)`} />
            </section>

            {/* Errors */}
            <section id="errors">
              <h2 className="text-2xl font-bold mb-4 text-gray-200">Error Handling</h2>
              <p className="text-gray-400 mb-4">
                All errors follow a consistent format:
              </p>
              <CodeBlock code={`{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. You can make 10 requests per minute."
  },
  "meta": {
    "request_id": "req_m1abc123_xyz",
    "timestamp": "2026-02-18T12:00:00Z",
    "version": "1.0.0"
  }
}`} language="json" />

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-white/10">
                      <th className="pb-2 text-gray-500">Status</th>
                      <th className="pb-2 text-gray-500">Code</th>
                      <th className="pb-2 text-gray-500">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-400">
                    <tr className="border-b border-white/5"><td className="py-2 text-yellow-400">400</td><td className="py-2 font-mono text-xs">MISSING_PARAMETER</td><td className="py-2">Required parameter missing</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 text-red-400">401</td><td className="py-2 font-mono text-xs">MISSING_API_KEY</td><td className="py-2">No API key provided</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 text-red-400">401</td><td className="py-2 font-mono text-xs">INVALID_API_KEY</td><td className="py-2">API key is invalid or expired</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 text-orange-400">403</td><td className="py-2 font-mono text-xs">INSUFFICIENT_SCOPE</td><td className="py-2">Key doesn&apos;t have required scope</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 text-gray-400">404</td><td className="py-2 font-mono text-xs">SYMBOL_NOT_FOUND</td><td className="py-2">Symbol not found in data providers</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 text-red-400">429</td><td className="py-2 font-mono text-xs">RATE_LIMIT_EXCEEDED</td><td className="py-2">Per-minute rate limit exceeded</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 text-red-400">429</td><td className="py-2 font-mono text-xs">MONTHLY_QUOTA_EXCEEDED</td><td className="py-2">Monthly request quota reached</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 text-red-400">500</td><td className="py-2 font-mono text-xs">INTERNAL_ERROR</td><td className="py-2">Server error</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Endpoints */}
            <section id="endpoints">
              <h2 className="text-2xl font-bold mb-4 text-gray-200">API Endpoints</h2>
              <p className="text-gray-400 mb-6">
                Base URL: <code className="text-cyan-400">https://www.omnifolio.app/api/v1</code>
              </p>
              <div className="space-y-3">
                {ENDPOINTS.map((endpoint) => (
                  <EndpointCard key={`${endpoint.method}-${endpoint.path}`} endpoint={endpoint} />
                ))}
              </div>
            </section>

            {/* Pricing */}
            <section id="pricing">
              <h2 className="text-2xl font-bold mb-4 text-gray-200">API Pricing</h2>
              <p className="text-gray-400 mb-6">
                API access is exclusively available on the <strong className="text-violet-400">Enterprise plan ($1,500/month)</strong>.
                The Free plan is app-only with no external API access.
                For full pricing details, see{' '}
                <Link href="/api-pricing" className="text-violet-400 hover:underline">our dedicated API pricing page →</Link>
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tiers.map((tier) => (
                  <div
                    key={tier.tier}
                    className={`border rounded-xl p-5 ${
                      tier.tier === 'enterprise'
                        ? 'border-violet-500/50 bg-violet-500/5'
                        : 'border-gray-700/50 bg-gray-900/30 opacity-70'
                    }`}
                  >
                    {tier.tier === 'enterprise' && (
                      <div className="text-xs text-violet-400 font-medium mb-2">Only API Plan</div>
                    )}
                    {tier.tier === 'free' && (
                      <div className="text-xs text-gray-500 font-medium mb-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-600 inline-block" />
                        App Only — No API Access
                      </div>
                    )}
                    <h3 className="text-lg font-bold text-gray-200">{tier.name}</h3>
                    <div className="mt-1 mb-3">
                      <span className="text-2xl font-bold text-white">
                        {tier.price_monthly_usd === 0 ? 'Free' : `$${tier.price_monthly_usd.toLocaleString()}`}
                      </span>
                      {tier.price_monthly_usd > 0 && <span className="text-gray-500 text-sm">/month</span>}
                    </div>
                    <p className="text-xs text-gray-500 mb-4">{tier.description}</p>
                    <ul className="space-y-1.5">
                      {tier.features.map((feature) => (
                        <li key={feature} className={`text-xs flex items-start gap-1.5 ${tier.tier === 'free' ? 'text-gray-600' : 'text-gray-400'}`}>
                          <span className={`mt-0.5 ${tier.tier === 'free' ? 'text-gray-700' : 'text-emerald-400'}`}>
                            {tier.tier === 'free' ? '✕' : '✓'}
                          </span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* SDKs */}
            <section id="sdks">
              <h2 className="text-2xl font-bold mb-4 text-gray-200">SDKs & Code Examples</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">JavaScript / TypeScript</h3>
                  <CodeBlock code={`const API_KEY = process.env.OMNIFOLIO_API_KEY;
const BASE_URL = 'https://www.omnifolio.app/api/v1';

async function getStockQuote(symbol) {
  const response = await fetch(
    \`\${BASE_URL}/market/quote?symbol=\${symbol}\`,
    { headers: { 'Authorization': \`Bearer \${API_KEY}\` } }
  );
  const { data } = await response.json();
  return data;
}

// Usage
const apple = await getStockQuote('AAPL');
console.log(\`Apple: $\${apple.price} (\${apple.change_percent > 0 ? '+' : ''}\${apple.change_percent.toFixed(2)}%)\`);`} language="javascript" />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">Python</h3>
                  <CodeBlock code={`import requests
import os

API_KEY = os.environ["OMNIFOLIO_API_KEY"]
BASE_URL = "https://www.omnifolio.app/api/v1"

def get_stock_quote(symbol: str) -> dict:
    response = requests.get(
        f"{BASE_URL}/market/quote",
        params={"symbol": symbol},
        headers={"Authorization": f"Bearer {API_KEY}"}
    )
    return response.json()["data"]

# Usage
apple = get_stock_quote("AAPL")
print(f"Apple: \${apple['price']} ({apple['change_percent']:+.2f}%)")`} language="python" />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">Go</h3>
                  <CodeBlock code={`package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "os"
)

func getQuote(symbol string) (map[string]interface{}, error) {
    req, _ := http.NewRequest("GET",
        fmt.Sprintf("https://www.omnifolio.app/api/v1/market/quote?symbol=%s", symbol), nil)
    req.Header.Set("Authorization", "Bearer "+os.Getenv("OMNIFOLIO_API_KEY"))

    resp, err := http.DefaultClient.Do(req)
    if err != nil { return nil, err }
    defer resp.Body.Close()

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    return result["data"].(map[string]interface{}), nil
}`} language="go" />
                </div>
              </div>
            </section>

            {/* Footer */}
            <div className="border-t border-white/10 pt-8 pb-16 text-center">
              <p className="text-gray-500 text-sm">
                Need help? Contact us at{' '}
                <a href="mailto:api@omnifolio.app" className="text-violet-400 hover:underline">api@omnifolio.app</a>
              </p>
              <p className="text-gray-600 text-xs mt-2">
                © {new Date().getFullYear()} OmniFolio. All rights reserved.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

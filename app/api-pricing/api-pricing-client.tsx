'use client';

/**
 * OmniFolio API Pricing — Client Component
 *
 * Premium financial-data API at $1,500 / month.
 * Covers every service the Omnifolio proprietary API exposes.
 *
 * Copyright OmniFolio. All rights reserved.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { OmnifolioLogo } from '@/components/ui/omnifolio-logo';
import { ArrowLeft, Check, Zap, Shield, Globe, BarChart3, LineChart, DollarSign, TrendingUp, Database, Clock, Users, Code2, Headphones, Lock, Building2, FileText, UserCheck, Landmark, Award, Briefcase } from 'lucide-react';

// ===================== DATA =====================

const API_SERVICES = [
  {
    icon: Landmark,
    title: 'Senate Lobbying Disclosures',
    description: 'Aggregated US Senate LDA filings enriched with proprietary OLI (OmniFolio Lobbying Influence) scores. Track lobbying spend, targeted agencies, and issue categories by ticker.',
    endpoint: '/v1/lobbying',
    badge: 'OLI Score',
  },
  {
    icon: Building2,
    title: 'Federal Spending & Contracts',
    description: 'Government contract awards sourced from USAspending.gov with proprietary OGI (OmniFolio Government Influence) scores. Fiscal-year breakdowns, obligation trends, and agency detail.',
    endpoint: '/v1/spending',
    badge: 'OGI Score',
  },
  {
    icon: UserCheck,
    title: 'Insider Transactions & Sentiment',
    description: 'SEC EDGAR Form 4 insider buy/sell data scored with proprietary OIC (OmniFolio Insider Confidence) metrics. Monthly aggregations, individual transaction detail, and trend direction.',
    endpoint: '/v1/insider',
    badge: 'OIC Score',
  },
  {
    icon: TrendingUp,
    title: 'Earnings Surprises',
    description: 'Actual EPS & revenue from SEC EDGAR XBRL filings paired with consensus estimates. Proprietary OES (OmniFolio Earnings Surprise) scores, beat/miss streaks, and quarter-on-quarter analysis.',
    endpoint: '/v1/earnings-surprises',
    badge: 'OES Score',
  },
  {
    icon: FileText,
    title: 'SEC EDGAR Filings',
    description: 'Full access to 10-K, 10-Q, 8-K, proxy, and XBRL financials from SEC EDGAR. Search by ticker, CIK, or filing type. Always current via background sync.',
    endpoint: '/v1/sec/filings',
    badge: null,
  },
  {
    icon: Database,
    title: 'Company Profiles (SEC EDGAR)',
    description: 'Comprehensive company data from SEC EDGAR: CIK, SIC codes, exchange info, addresses, fiscal year-end, and a full filings index. No paid vendor required.',
    endpoint: '/v1/company',
    badge: null,
  },
  {
    icon: Clock,
    title: 'Economic Calendar',
    description: 'High-impact macroeconomic events with importance ratings, actual vs forecast values, and country filtering. Perfect for algorithmic event-driven strategies.',
    endpoint: '/v1/economic/calendar',
    badge: null,
  },
  {
    icon: Award,
    title: 'IPO Calendar',
    description: 'Upcoming and recent IPOs sourced from SEC EDGAR S-1 and S-11 filings. Price ranges, shares offered, exchange, and filing links — refreshed continuously.',
    endpoint: '/v1/economic/ipo-calendar',
    badge: null,
  },
];

const ENTERPRISE_FEATURES = [
  '600 requests / minute',
  '500,000 requests / day',
  '10,000,000 requests / month',
  'All API scopes unlocked (lobbying, spending, insider, earnings, SEC, company, economic, analytics, portfolio)',
  'Up to 100 API keys',
  'Webhook notifications for IPO filings, earnings events & economic releases',
  '99.9% uptime SLA guarantee',
  'Custom rate-limit configuration',
  'Dedicated account manager',
  'Priority support with < 1 hour response time',
  'Custom integrations & onboarding',
  'Proprietary scoring models: OLI, OGI, OIC, OES',
  'IP whitelisting & advanced security',
  'Detailed usage analytics dashboard',
];

const COMPARISON = [
  { feature: 'Price', free: 'Free (App only)', enterprise: '$1,500/mo' },
  { feature: 'API Access', free: false, enterprise: true },
  { feature: 'Requests / minute', free: 'None', enterprise: '600' },
  { feature: 'Requests / day', free: 'None', enterprise: '500,000' },
  { feature: 'Monthly quota', free: 'None', enterprise: '10M' },
  { feature: 'API keys', free: '0', enterprise: '100' },
  { feature: 'Company profiles (SEC EDGAR)', free: false, enterprise: true },
  { feature: 'Market sentiment analytics', free: false, enterprise: true },
  { feature: 'Economic calendar', free: false, enterprise: true },
  { feature: 'IPO calendar', free: false, enterprise: true },
  { feature: 'Financial news', free: false, enterprise: true },
  { feature: 'SEC filings (10-K, 10-Q, 8-K)', free: false, enterprise: true },
  { feature: 'Insider transactions + OIC scores', free: false, enterprise: true },
  { feature: 'Earnings surprises + OES scores', free: false, enterprise: true },
  { feature: 'Senate lobbying + OLI scores', free: false, enterprise: true },
  { feature: 'Federal spending + OGI scores', free: false, enterprise: true },
  { feature: 'Portfolio API (read/write)', free: false, enterprise: true },
  { feature: 'Webhook notifications', free: false, enterprise: true },
  { feature: 'Custom rate limits', free: false, enterprise: true },
  { feature: 'SLA guarantee (99.9%)', free: false, enterprise: true },
  { feature: 'Dedicated account manager', free: false, enterprise: true },
  { feature: 'Custom integrations', free: false, enterprise: true },
  { feature: 'IP whitelisting & advanced security', free: false, enterprise: true },
];

const FAQ = [
  {
    q: 'What makes the OmniFolio API proprietary?',
    a: 'Every data endpoint is built on public government and regulatory sources — US Senate LDA, USAspending.gov, SEC EDGAR — that we aggregate, normalize, and enrich with our own scoring models: OLI (lobbying influence), OGI (government spending influence), OIC (insider confidence), and OES (earnings surprise). You cannot get these computed scores from any other single API.',
  },
  {
    q: 'Are the data sources legal for commercial use?',
    a: 'Yes. All primary sources are fully public: SEC EDGAR (no rate limit restrictions for reasonable use), US Senate LDA public database, and USAspending.gov federal open data. We operate within all published terms of use and comply with SEC EDGAR\'s 10 requests/second limit.',
  },
  {
    q: 'How is billing handled?',
    a: 'The $1,500/month plan is billed monthly via Stripe. Annual billing ($15,000/year — save $3,000) is available upon request. Enterprise invoicing with NET-30 terms is available for qualifying organizations.',
  },
  {
    q: 'Can I try the API before committing?',
    a: 'Yes. Contact us at api@omnifolio.app and we\'ll arrange a short trial period or a technical demo so you can validate the endpoints against your use case before signing up.',
  },
  {
    q: 'What does the 99.9% SLA cover?',
    a: 'We guarantee 99.9% uptime for the API gateway and our first-party data processing layer. Since all data is served from our Supabase-backed cache — not directly from upstream — most requests are unaffected even if source sites experience downtime.',
  },
  {
    q: 'Do you offer custom enterprise contracts?',
    a: 'Yes. For organizations needing higher quotas, on-premise deployment, dedicated infrastructure, or custom data feeds, please contact us at api@omnifolio.app.',
  },
  {
    q: 'Is there a refund policy?',
    a: 'We offer a 14-day money-back guarantee on the first billing cycle. If the API doesn\'t meet your requirements, we\'ll issue a full refund — no questions asked.',
  },
];

// ===================== SUB COMPONENTS =====================

function ServiceCard({ service }: { service: typeof API_SERVICES[number] }) {
  const Icon = service.icon;
  return (
    <div className="group relative bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:border-violet-500/40 hover:bg-violet-500/[0.04] transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className="shrink-0 p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-white/10 group-hover:border-violet-500/30 transition-colors">
          <Icon className="w-5 h-5 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-base font-semibold text-gray-100">{service.title}</h3>
            {service.badge && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-full">
                {service.badge}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">{service.description}</p>
          <code className="inline-block mt-2 text-xs text-cyan-400/80 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
            {service.endpoint}
          </code>
        </div>
      </div>
    </div>
  );
}

function FAQItem({ item }: { item: typeof FAQ[number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.03] transition-colors"
      >
        <span className="text-sm font-medium text-gray-200 pr-4">{item.q}</span>
        <svg
          className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 -mt-1 text-sm text-gray-400 leading-relaxed">
          {item.a}
        </div>
      )}
    </div>
  );
}

function CellValue({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="text-sm text-gray-300 font-medium">{value}</span>;
  }
  if (value) {
    return <Check className="w-4 h-4 text-cyan-400 mx-auto" />;
  }
  return <span className="text-gray-700 mx-auto block w-4 text-center">—</span>;
}

// ===================== MAIN COMPONENT =====================

export function ApiPricingClient() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#06060b] text-white selection:bg-violet-500/30 overflow-x-hidden">
      <BackgroundBeams />

      {/* ───── Header ───── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#06060b]/60 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <OmnifolioLogo size="sm" />
            </Link>
            <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-400">
              <Link href="/api-docs" className="hover:text-white transition-colors">Docs</Link>
              <Link href="/api-pricing" className="text-white font-medium">Pricing</Link>
              <Link href="/pricing" className="hover:text-white transition-colors">App Plans</Link>
            </nav>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                <span className="text-sm">Back</span>
              </button>
              <Link
                href="/settings"
                className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-500 transition-colors"
              >
                Get API Key
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ───── Hero ───── */}
      <section className="relative z-10 pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-violet-500/30 bg-violet-500/10 text-xs text-violet-300 font-medium">
          <Zap className="w-3.5 h-3.5" />
          Proprietary Financial Data API
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08]">
          <span className="block">One API.</span>
          <span className="block bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Zero third parties.
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Senate lobbying, federal contracts, insider transactions, earnings surprises, SEC filings &amp; more —
          all scored with OmniFolio&apos;s proprietary models and served through a single REST API.
        </p>

        {/* Price Hero Card */}
        <div className="mt-12 mx-auto max-w-md">
          <div className="relative bg-gradient-to-b from-violet-500/[0.08] to-transparent border border-violet-500/30 rounded-3xl p-8 shadow-2xl shadow-violet-500/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-violet-600 text-white text-xs font-bold rounded-full uppercase tracking-widest">
              Enterprise API
            </div>
            <div className="mt-3">
              <span className="text-5xl sm:text-6xl font-extrabold text-white">$1,500</span>
              <span className="text-lg text-gray-400 ml-1">/month</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              or $15,000/year (save $3,000)
            </p>
            <ul className="mt-6 space-y-2 text-left">
              {[
                '600 req/min · 500K/day · 10M/month',
                'All API scopes — every endpoint unlocked',
                '99.9% uptime SLA guarantee',
                'Dedicated support & custom integrations',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="mailto:api@omnifolio.app?subject=OmniFolio%20Enterprise%20API%20—%20$1,500%20Plan"
              className="mt-8 w-full inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl hover:from-violet-500 hover:to-cyan-500 transition-all shadow-lg shadow-violet-500/25"
            >
              Contact Sales
            </Link>
            <p className="text-xs text-gray-600 mt-3">14-day money-back guarantee · No long-term contract required</p>
          </div>
        </div>

        {/* Lower-tier CTA */}
        <p className="mt-8 text-sm text-gray-500">
          API access is exclusively available on the Enterprise plan at $1,500/month.
          The Free plan is an app-only experience — no external API access.
        </p>
      </section>

      {/* ───── Services Grid ───── */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            What&apos;s Included
          </h2>
          <p className="mt-3 text-gray-400 max-w-2xl mx-auto">
            Every endpoint, every asset class — accessible with a single API key.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {API_SERVICES.map((s) => (
            <ServiceCard key={s.endpoint} service={s} />
          ))}
        </div>
      </section>

      {/* ───── Full Feature List ───── */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Enterprise Plan — Everything Included
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          {ENTERPRISE_FEATURES.map((f) => (
            <div key={f} className="flex items-start gap-3 py-2">
              <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span className="text-sm text-gray-300">{f}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ───── Tier Comparison Table ───── */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">API Access Comparison</h2>
          <p className="mt-3 text-gray-400">API access is exclusively available on the Enterprise plan.</p>
        </div>

        <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04]">
                  <th className="px-5 py-4 text-left font-semibold text-gray-400 w-[260px]">Feature</th>
                  <th className="px-5 py-4 text-center font-semibold text-gray-400">Free (App only)</th>
                  <th className="px-5 py-4 text-center font-semibold text-white bg-violet-500/10 border-x border-violet-500/20">
                    Enterprise
                    <span className="block text-[10px] text-violet-400 font-medium mt-0.5">$1,500/mo</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.feature} className={`border-b border-white/5 ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                    <td className="px-5 py-3 text-gray-400 font-medium">{row.feature}</td>
                    <td className="px-5 py-3 text-center"><CellValue value={row.free} /></td>
                    <td className="px-5 py-3 text-center bg-violet-500/[0.05] border-x border-violet-500/10">
                      <CellValue value={row.enterprise} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ───── Trust / Stats ───── */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Globe, label: 'Proprietary Endpoints', value: '8+' },
            { icon: Database, label: 'Free Public Sources', value: '100%' },
            { icon: Clock, label: 'Avg Latency', value: '<120ms' },
            { icon: Shield, label: 'Uptime SLA', value: '99.9%' },
          ].map((stat) => (
            <div key={stat.label} className="text-center bg-white/[0.03] border border-white/10 rounded-xl p-5">
              <stat.icon className="w-5 h-5 text-violet-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ───── Code Sample ───── */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Integrate in Minutes</h2>
          <p className="mt-3 text-gray-400">Just one header. Clean JSON responses. Every language.</p>
        </div>

        <div className="bg-[#0d1117] border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] border-b border-white/10">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <span className="text-xs text-gray-500 ml-2 font-mono">example.ts</span>
          </div>
          <pre className="p-6 text-sm text-gray-300 overflow-x-auto leading-relaxed">
            <code>{`const API_KEY = process.env.OMNIFOLIO_API_KEY;

// Fetch senate lobbying data + OLI score for Lockheed Martin
const res = await fetch(
  "https://www.omnifolio.app/api/v1/lobbying?symbol=LMT&years=3",
  { headers: { Authorization: \`Bearer \${API_KEY}\` } }
);

const { data } = await res.json();
console.log(\`\${data.company_name} — OLI Score: \${data.oli_score}/100 (\${data.oli_trend})\`);
console.log(\`Total lobbying spend (3yr): $\${(data.total_amount_usd / 1e6).toFixed(1)}M\`);
// → Lockheed Martin Corporation — OLI Score: 87/100 (stable)
// → Total lobbying spend (3yr): $54.2M`}</code>
          </pre>
        </div>
      </section>

      {/* ───── FAQ ───── */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {FAQ.map((item) => (
            <FAQItem key={item.q} item={item} />
          ))}
        </div>
      </section>

      {/* ───── Final CTA ───── */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Ready to power your platform?
        </h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">
          API access is exclusively available on the <strong className="text-gray-200">Enterprise plan at $1,500/month</strong>.
          Contact our sales team to get started with full unrestricted access to every endpoint.
          The Free plan is an app-only experience — no external API access.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="mailto:api@omnifolio.app?subject=OmniFolio%20Enterprise%20API%20—%20$1,500%20Plan"
            className="inline-flex items-center justify-center px-8 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl hover:from-violet-500 hover:to-cyan-500 transition-all shadow-lg shadow-violet-500/25"
          >
            Contact Sales — $1,500/mo
          </Link>
          <Link
            href="/api-docs"
            className="inline-flex items-center justify-center px-8 py-3.5 text-sm font-semibold text-gray-300 border border-white/20 rounded-xl hover:bg-white/5 transition-colors"
          >
            View API Docs
          </Link>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="relative z-10 border-t border-white/10 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} OmniFolio. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/api-docs" className="hover:text-gray-300 transition-colors">API Docs</Link>
            <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy</Link>
            <a href="mailto:api@omnifolio.app" className="hover:text-gray-300 transition-colors">api@omnifolio.app</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

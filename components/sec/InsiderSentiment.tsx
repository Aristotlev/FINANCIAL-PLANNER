"use client";

/**
 * OmniFolio Proprietary Insider Sentiment Component
 *
 * Displays the OmniFolio Insider Confidence (OIC) score derived from
 * SEC EDGAR Form 4 filings. No third-party APIs -- 100% proprietary.
 *
 * Copyright OmniFolio. All rights reserved.
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  AlertCircle,
  Shield,
  Users,
  Activity,
  Clock,
  RefreshCw,
  Database,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Crown,
  Briefcase,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { tickerDomains } from "@/lib/ticker-domains";

// ====================================================================
// TYPES
// ====================================================================

interface InsiderSentimentMonth {
  symbol: string;
  year: number;
  month: number;
  oicScore: number;
  sentimentLabel: string;
  totalBuys: number;
  totalSells: number;
  totalBuyShares: number;
  totalSellShares: number;
  totalBuyValue: number;
  totalSellValue: number;
  netShares: number;
  netValue: number;
  officerBuys: number;
  officerSells: number;
  directorBuys: number;
  directorSells: number;
  tenPctOwnerBuys: number;
  tenPctOwnerSells: number;
  uniqueBuyers: number;
  uniqueSellers: number;
  clusterBuyFlag: boolean;
  clusterSellFlag: boolean;
  filingCount: number;
  latestFilingDate: string | null;
}

interface InsiderSentimentTransaction {
  symbol: string;
  accessionNumber: string;
  filingDate: string;
  ownerName: string;
  isOfficer: boolean;
  isDirector: boolean;
  isTenPctOwner: boolean;
  officerTitle: string | null;
  transactionDate: string;
  transactionCode: string;
  securityTitle: string;
  shares: number;
  pricePerShare: number | null;
  totalValue: number;
  sharesOwnedAfter: number;
  isAcquisition: boolean;
  transactionType: "buy" | "sell" | "other";
}

interface InsiderSentimentResponse {
  success: boolean;
  symbol: string;
  companyName: string | null;
  cik: string | null;
  currentScore: number;
  currentLabel: string;
  trend: "improving" | "declining" | "stable";
  months: InsiderSentimentMonth[];
  transactions: InsiderSentimentTransaction[];
  meta: {
    source: "cache" | "fresh";
    cachedAt: string | null;
    expiresAt: string | null;
    ttlSeconds: number;
    algorithm: string;
    dataSource: string;
  };
  error?: string;
}

interface InsiderSentimentProps {
  ticker: string;
}

// ====================================================================
// HELPERS
// ====================================================================

const formatCurrency = (value: number) => {
  if (!value) return "$0";
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

const formatShares = (value: number) => {
  if (!value) return "0";
  const abs = Math.abs(value);
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString();
};

const getScoreColor = (score: number) => {
  if (score >= 40) return { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", fill: "#34d399" };
  if (score >= 15) return { text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", fill: "#60a5fa" };
  if (score > -15) return { text: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/20", fill: "#9ca3af" };
  if (score > -40) return { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", fill: "#fb923c" };
  return { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", fill: "#f87171" };
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case "improving": return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    case "declining": return <TrendingDown className="w-4 h-4 text-red-400" />;
    default: return <Minus className="w-4 h-4 text-gray-400" />;
  }
};

const getTransactionCodeLabel = (code: string): string => {
  const labels: Record<string, string> = {
    P: "Purchase", S: "Sale", A: "Award", D: "Disposition",
    F: "Tax Withholding", M: "Exercise", X: "Exercise", C: "Conversion",
    G: "Gift", L: "Small Acquisition", W: "Inheritance",
  };
  return labels[code] || code;
};

// ====================================================================
// COMPANY LOGO
// ====================================================================

const getTickerColor = (ticker: string): string => {
  const colors = [
    "from-blue-500 to-blue-700", "from-purple-500 to-purple-700",
    "from-green-500 to-green-700", "from-orange-500 to-orange-700",
    "from-pink-500 to-pink-700", "from-cyan-500 to-cyan-700",
    "from-indigo-500 to-indigo-700", "from-teal-500 to-teal-700",
  ];
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

function CompanyLogo({ ticker, className = "h-8 w-8" }: { ticker: string; className?: string }) {
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const upperTicker = ticker.toUpperCase();

  const imageSources = useMemo(() => {
    const sources: string[] = [];
    if (tickerDomains[upperTicker]) {
      sources.push(`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${tickerDomains[upperTicker]}&size=128`);
    }
    sources.push(`https://img.logo.dev/ticker/${upperTicker}?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ`);
    sources.push(`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${ticker.toLowerCase()}.com&size=128`);
    return sources;
  }, [upperTicker, ticker]);

  useEffect(() => { setImageError(false); setFallbackIndex(0); }, [ticker]);

  if (!imageError && imageSources.length > 0) {
    return (
      <img
        src={imageSources[fallbackIndex]}
        alt={`${ticker} logo`}
        className={cn(className, "rounded-xl object-contain bg-white p-1")}
        onError={() => {
          if (fallbackIndex < imageSources.length - 1) setFallbackIndex((p) => p + 1);
          else setImageError(true);
        }}
        loading="lazy"
      />
    );
  }

  return (
    <div className={cn(className, `rounded-xl bg-gradient-to-br ${getTickerColor(ticker)} flex items-center justify-center font-bold text-white text-xs`)}>
      {ticker.slice(0, 2)}
    </div>
  );
}

// ====================================================================
// OIC GAUGE
// ====================================================================

function OICGauge({ score, label }: { score: number; label: string }) {
  const colors = getScoreColor(score);
  const normalizedScore = ((score + 100) / 200) * 100;
  const rotation = -90 + (normalizedScore / 100) * 180;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-28 mb-2">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#262626" strokeWidth="12" strokeLinecap="round" />
          <path d="M 20 100 A 80 80 0 0 1 50 38" fill="none" stroke="#ef4444" strokeWidth="3" strokeOpacity="0.3" />
          <path d="M 50 38 A 80 80 0 0 1 80 22" fill="none" stroke="#fb923c" strokeWidth="3" strokeOpacity="0.3" />
          <path d="M 80 22 A 80 80 0 0 1 120 22" fill="none" stroke="#9ca3af" strokeWidth="3" strokeOpacity="0.3" />
          <path d="M 120 22 A 80 80 0 0 1 150 38" fill="none" stroke="#60a5fa" strokeWidth="3" strokeOpacity="0.3" />
          <path d="M 150 38 A 80 80 0 0 1 180 100" fill="none" stroke="#34d399" strokeWidth="3" strokeOpacity="0.3" />
          <g transform={`rotate(${rotation}, 100, 100)`}>
            <line x1="100" y1="100" x2="100" y2="30" stroke={colors.fill} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="100" cy="100" r="5" fill={colors.fill} />
          </g>
          <text x="15" y="108" fill="#6b7280" fontSize="8" textAnchor="start">-100</text>
          <text x="100" y="12" fill="#6b7280" fontSize="8" textAnchor="middle">0</text>
          <text x="185" y="108" fill="#6b7280" fontSize="8" textAnchor="end">+100</text>
        </svg>
      </div>
      <div className={cn("text-3xl font-bold font-mono", colors.text)}>
        {score > 0 ? "+" : ""}{score.toFixed(1)}
      </div>
      <div className={cn("mt-1 px-3 py-1 rounded-full text-xs font-semibold border", colors.bg, colors.border, colors.text)}>
        {label}
      </div>
    </div>
  );
}

// ====================================================================
// MAIN COMPONENT
// ====================================================================

export function InsiderSentiment({ ticker }: InsiderSentimentProps) {
  const [data, setData] = useState<InsiderSentimentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "transactions">("overview");

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!ticker) return;
    if (forceRefresh) { setRefreshing(true); } else { setLoading(true); }
    setError(null);
    try {
      const params = new URLSearchParams({
        symbol: ticker,
        months: "24",
        ...(forceRefresh && { refresh: "true" }),
      });
      const response = await fetch(`/api/insider-sentiment?${params}`);
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") === -1) {
        throw new Error("API returned non-JSON response");
      }
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch insider sentiment");
      }
      setData(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      console.error("[InsiderSentiment]", err);
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ticker]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const chartData = useMemo(() => {
    if (!data?.months) return [];
    return [...data.months]
      .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
      .map((m) => ({
        date: `${m.year}-${String(m.month).padStart(2, "0")}`,
        oicScore: m.oicScore,
        netShares: m.netShares,
        netValue: m.netValue,
        buyValue: m.totalBuyValue,
        sellValue: -m.totalSellValue,
        clusterBuy: m.clusterBuyFlag,
        clusterSell: m.clusterSellFlag,
      }));
  }, [data?.months]);

  const roleBreakdown = useMemo(() => {
    if (!data?.months || data.months.length === 0) return [];
    const t = data.months.reduce((acc, m) => ({
      ob: acc.ob + m.officerBuys, os: acc.os + m.officerSells,
      db: acc.db + m.directorBuys, ds: acc.ds + m.directorSells,
      tb: acc.tb + m.tenPctOwnerBuys, ts: acc.ts + m.tenPctOwnerSells,
    }), { ob: 0, os: 0, db: 0, ds: 0, tb: 0, ts: 0 });
    return [
      { name: "Officers", buys: t.ob, sells: t.os, color: "#3b82f6", icon: Crown },
      { name: "Directors", buys: t.db, sells: t.ds, color: "#8b5cf6", icon: Briefcase },
      { name: "10%+ Owners", buys: t.tb, sells: t.ts, color: "#f59e0b", icon: UserCheck },
    ];
  }, [data?.months]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <CompanyLogo ticker={ticker} className="h-12 w-12 mb-4" />
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-400">Computing insider sentiment for {ticker}...</p>
        <p className="text-gray-600 text-xs mt-2 flex items-center gap-1">
          <Shield className="w-3 h-3" /> Sourcing from SEC EDGAR Form 4 filings
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <CompanyLogo ticker={ticker} className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-white mb-2">Analysis Failed</h3>
        <p className="text-red-400 text-sm">{error}</p>
        <button onClick={() => fetchData(true)} className="mt-4 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm hover:bg-red-500/20 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.months.length === 0) {
    return (
      <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-8 text-center">
        <CompanyLogo ticker={ticker} className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <Info className="h-8 w-8 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400">No insider sentiment data available for {ticker}.</p>
        <p className="text-gray-600 text-xs mt-2">This company may not have recent Form 4 filings.</p>
      </div>
    );
  }

  const scoreColors = getScoreColor(data.currentScore);
  const latestMonth = data.months[0];

  return (
    <div className="space-y-6">
      {/* Score Summary Card */}
      <div className={cn("rounded-xl border p-6", scoreColors.bg, scoreColors.border)}>
        <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <CompanyLogo ticker={ticker} className="h-10 w-10" />
              <div>
                <div className="text-lg font-bold text-white">{data.companyName || ticker}</div>
                <div className="text-xs text-gray-500 font-mono">{ticker}{data.cik ? ` · CIK ${data.cik}` : ""}</div>
              </div>
            </div>
            <OICGauge score={data.currentScore} label={data.currentLabel} />
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  OmniFolio Insider Confidence (OIC)
                </h3>
                <p className="text-xs text-gray-500 max-w-md">
                  Proprietary score computed from SEC EDGAR Form 4 insider filings. Range: -100 (extreme selling) to +100 (extreme buying).
                </p>
              </div>
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border",
                data.trend === "improving" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                data.trend === "declining" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                "bg-gray-500/10 text-gray-400 border-gray-500/20"
              )}>
                {getTrendIcon(data.trend)}
                {data.trend.charAt(0).toUpperCase() + data.trend.slice(1)}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-black/20 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Net Shares</div>
                <div className={cn("text-lg font-bold font-mono", (latestMonth?.netShares ?? 0) >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {latestMonth ? formatShares(latestMonth.netShares) : "\u2014"}
                </div>
              </div>
              <div className="bg-black/20 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Net Value</div>
                <div className={cn("text-lg font-bold font-mono", (latestMonth?.netValue ?? 0) >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {latestMonth ? formatCurrency(latestMonth.netValue) : "\u2014"}
                </div>
              </div>
              <div className="bg-black/20 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Insiders Active</div>
                <div className="text-lg font-bold text-white">
                  {latestMonth ? latestMonth.uniqueBuyers + latestMonth.uniqueSellers : 0}
                </div>
              </div>
              <div className="bg-black/20 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Filings</div>
                <div className="text-lg font-bold text-white">{latestMonth?.filingCount ?? 0}</div>
              </div>
            </div>

            {(latestMonth?.clusterBuyFlag || latestMonth?.clusterSellFlag) && (
              <div className="flex gap-2 flex-wrap">
                {latestMonth?.clusterBuyFlag && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400">
                    <Zap className="w-3 h-3" /> Cluster Buy: {latestMonth.uniqueBuyers}+ insiders buying together
                  </div>
                )}
                {latestMonth?.clusterSellFlag && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                    <Zap className="w-3 h-3" /> Cluster Sell: {latestMonth.uniqueSellers}+ insiders selling together
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cache Status Bar */}
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3" />
              {data.meta.source === "cache" ? "Cached" : "Fresh"}
            </span>
            {data.meta.cachedAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(data.meta.cachedAt).toLocaleString()}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              {data.meta.dataSource}
            </span>
          </div>
          <button onClick={() => fetchData(true)} disabled={refreshing} className="flex items-center gap-1 text-gray-500 hover:text-gray-300 transition-colors">
            <RefreshCw className={cn("w-3 h-3", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-1">
        {(["overview", "transactions"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={cn(
            "px-4 py-2 text-sm font-medium transition-colors rounded-t-lg capitalize",
            activeTab === tab ? "text-blue-400 border-b-2 border-blue-400 bg-blue-500/5" : "text-gray-500 hover:text-gray-300"
          )}>
            {tab === "overview" ? (
              <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Overview</span>
            ) : (
              <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Transactions</span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* OIC Score History */}
            <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" /> OIC Score History
              </h3>
              <p className="text-xs text-gray-500 mb-6">OmniFolio Insider Confidence Score (monthly)</p>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="oicPos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0.2} />
                      </linearGradient>
                      <linearGradient id="oicNeg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f87171" stopOpacity={1} />
                        <stop offset="100%" stopColor="#f87171" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis dataKey="date" stroke="#525252" fontSize={11} tickFormatter={(v) => v.substring(2)} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#525252" fontSize={11} domain={[-100, 100]} tickLine={false} axisLine={false} dx={-10} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-4 shadow-xl">
                          <p className="text-gray-400 text-xs mb-2">{label}</p>
                          <div className="flex justify-between gap-4 text-sm">
                            <span className="text-gray-300">OIC:</span>
                            <span className={cn("font-mono font-bold", d?.oicScore > 0 ? "text-emerald-400" : d?.oicScore < 0 ? "text-red-400" : "text-gray-400")}>
                              {d?.oicScore?.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      );
                    }} />
                    <ReferenceLine y={0} stroke="#333" />
                    <Bar dataKey="oicScore" name="OIC Score" animationDuration={1500} maxBarSize={50}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.oicScore >= 0 ? "url(#oicPos)" : "url(#oicNeg)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Net Value Chart */}
            <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" /> Net Insider Value
              </h3>
              <p className="text-xs text-gray-500 mb-6">Dollar value of net insider activity (monthly)</p>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="valPos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={1} />
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.2} />
                      </linearGradient>
                      <linearGradient id="valNeg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis dataKey="date" stroke="#525252" fontSize={11} tickFormatter={(v) => v.substring(2)} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#525252" fontSize={11} tickLine={false} axisLine={false} dx={-10}
                      tickFormatter={(v) => Math.abs(v) >= 1e6 ? `$${(v/1e6).toFixed(0)}M` : Math.abs(v) >= 1e3 ? `$${(v/1e3).toFixed(0)}K` : `$${v}`} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-4 shadow-xl">
                          <p className="text-gray-400 text-xs mb-2">{label}</p>
                          <div className="flex justify-between gap-4 text-sm">
                            <span className="text-gray-300">Net:</span>
                            <span className={cn("font-mono font-bold", d?.netValue > 0 ? "text-blue-400" : "text-red-400")}>
                              {formatCurrency(d?.netValue)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4 text-xs mt-1">
                            <span className="text-emerald-400/60">Buys:</span>
                            <span className="text-emerald-400 font-mono">{formatCurrency(d?.buyValue)}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-xs">
                            <span className="text-red-400/60">Sells:</span>
                            <span className="text-red-400 font-mono">{formatCurrency(Math.abs(d?.sellValue || 0))}</span>
                          </div>
                        </div>
                      );
                    }} />
                    <ReferenceLine y={0} stroke="#333" />
                    <Bar dataKey="netValue" name="Net Value" animationDuration={1500} maxBarSize={50}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.netValue >= 0 ? "url(#valPos)" : "url(#valNeg)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Insider Role Breakdown */}
          <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" /> Insider Role Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {roleBreakdown.map((role) => {
                const total = role.buys + role.sells;
                const buyPct = total > 0 ? (role.buys / total) * 100 : 50;
                const Icon = role.icon;
                return (
                  <div key={role.name} className="bg-black/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-4 h-4" style={{ color: role.color }} />
                      <span className="text-sm font-medium text-white">{role.name}</span>
                    </div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-emerald-400">{role.buys} Buys</span>
                      <span className="text-red-400">{role.sells} Sells</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
                      <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${buyPct}%` }} />
                      <div className="bg-red-500 transition-all duration-500" style={{ width: `${100 - buyPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Historical Table */}
          <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" /> Historical Monthly Data
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#141414] text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                  <tr>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3 text-right">OIC Score</th>
                    <th className="px-4 py-3 text-right">Buy/Sell</th>
                    <th className="px-4 py-3 text-right">Net Shares</th>
                    <th className="px-4 py-3 text-right">Net Value</th>
                    <th className="px-4 py-3 text-right">Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {data.months.slice(0, 12).map((m) => {
                    const sc = getScoreColor(m.oicScore);
                    return (
                      <tr key={`${m.year}-${m.month}`} className="hover:bg-[#212121] transition-colors">
                        <td className="px-4 py-3 text-white font-medium text-xs">{m.year}-{String(m.month).padStart(2, "0")}</td>
                        <td className={cn("px-4 py-3 text-right font-mono font-bold text-xs", sc.text)}>
                          {m.oicScore > 0 ? "+" : ""}{m.oicScore.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs">
                          <span className="text-emerald-400">{m.totalBuys}</span>
                          <span className="text-gray-600 mx-1">/</span>
                          <span className="text-red-400">{m.totalSells}</span>
                        </td>
                        <td className={cn("px-4 py-3 text-right font-mono text-xs", m.netShares >= 0 ? "text-emerald-400" : "text-red-400")}>
                          {m.netShares > 0 ? "+" : ""}{formatShares(m.netShares)}
                        </td>
                        <td className={cn("px-4 py-3 text-right font-mono text-xs", m.netValue >= 0 ? "text-emerald-400" : "text-red-400")}>
                          {formatCurrency(m.netValue)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold border", sc.bg, sc.border, sc.text)}>
                            {m.sentimentLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === "transactions" && (
        <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" /> Recent Insider Transactions
            </h3>
            <span className="text-xs text-gray-500">{data.transactions.length} transactions</span>
          </div>

          {data.transactions.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No individual transactions available</p>
              <p className="text-xs mt-1 text-gray-600">Try refreshing to load transaction details</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#141414] text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                  <tr>
                    <th className="px-4 py-3">Insider</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Shares</th>
                    <th className="px-4 py-3 text-right">Value</th>
                    <th className="px-4 py-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {data.transactions.slice(0, 50).map((tx, i) => (
                    <tr key={`${tx.accessionNumber}-${i}`} className="hover:bg-[#212121] transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-white text-xs font-medium truncate max-w-[200px]" title={tx.ownerName}>{tx.ownerName}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {tx.isOfficer && tx.officerTitle ? <span className="text-blue-400">{tx.officerTitle}</span> :
                         tx.isOfficer ? <span className="text-blue-400">Officer</span> :
                         tx.isDirector ? <span className="text-purple-400">Director</span> :
                         tx.isTenPctOwner ? <span className="text-amber-400">10%+ Owner</span> :
                         <span className="text-gray-400">Insider</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border",
                          tx.transactionType === "buy" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          tx.transactionType === "sell" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          "bg-gray-500/10 text-gray-400 border-gray-500/20"
                        )}>
                          {tx.transactionType === "buy" ? <ArrowUpRight className="w-3 h-3" /> :
                           tx.transactionType === "sell" ? <ArrowDownRight className="w-3 h-3" /> : null}
                          {getTransactionCodeLabel(tx.transactionCode)}
                        </span>
                      </td>
                      <td className={cn("px-4 py-3 text-right font-mono text-xs",
                        tx.transactionType === "buy" ? "text-emerald-400" :
                        tx.transactionType === "sell" ? "text-red-400" : "text-gray-400"
                      )}>
                        {tx.transactionType === "buy" ? "+" : tx.transactionType === "sell" ? "-" : ""}
                        {formatShares(tx.shares)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-white font-medium">
                        {tx.totalValue > 0 ? formatCurrency(tx.totalValue) : "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400">
                        {tx.transactionDate ? new Date(tx.transactionDate).toLocaleDateString() : "\u2014"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default InsiderSentiment;

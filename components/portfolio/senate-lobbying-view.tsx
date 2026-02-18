"use client";

/**
 * OmniFolio Proprietary Senate Lobbying View
 *
 * Per-company lobbying disclosure lookup powered by the US Senate LDA database.
 * Same UX pattern as InsiderSentimentView and InsiderTransactionsProprietaryView.
 *
 * Features:
 *   - Search bar with autocomplete (SEC EDGAR company search)
 *   - Popular tickers grid + recent lookups
 *   - OLI (OmniFolio Lobbying Influence) scoring
 *   - Quarterly spend chart
 *   - Issue area breakdown
 *   - Lobbyist detail table
 *   - Government entity reach
 *   - Filing-level detail with document links
 *
 * 100% proprietary — zero paid third-party APIs.
 * Data Source: US Senate LDA Database (public, free, no API key)
 * Copyright OmniFolio. All rights reserved.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Search,
  Loader2,
  Landmark,
  TrendingUp,
  TrendingDown,
  X,
  Clock,
  Sparkles,
  Shield,
  Minus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileText,
  ExternalLink,
  DollarSign,
  Users,
  Globe,
  BarChart3,
  AlertCircle,
  Tag,
  Briefcase,
  Activity,
  Zap,
  Eye,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ComposedChart,
  Line,
} from "recharts";
import { cn } from "@/lib/utils";
import { tickerDomains } from "@/lib/ticker-domains";
import { motion, AnimatePresence } from "framer-motion";

// ── Stable container size hook — replaces ResponsiveContainer to kill flicker ──
function useContainerSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      setSize(prev => (prev.width === Math.round(width) && prev.height === Math.round(height)) ? prev : { width: Math.round(width), height: Math.round(height) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

// ── Debounce hook ────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ── Color helper ─────────────────────────────────────────────────────
const getTickerColor = (ticker: string): string => {
  const colors = [
    "from-amber-500 to-amber-700",
    "from-orange-500 to-orange-700",
    "from-yellow-500 to-yellow-700",
    "from-red-500 to-red-700",
    "from-pink-500 to-pink-700",
    "from-purple-500 to-purple-700",
    "from-blue-500 to-blue-700",
    "from-cyan-500 to-cyan-700",
  ];
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// ── Company Icon ─────────────────────────────────────────────────────
const CompanyIcon = ({
  ticker,
  className = "h-10 w-10",
  showPlaceholder = true,
}: {
  ticker: string;
  className?: string;
  showPlaceholder?: boolean;
}) => {
  const [imageError, setImageError] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const upperTicker = ticker.toUpperCase();

  const imageSources = useMemo(() => {
    const sources: string[] = [];
    if (tickerDomains[upperTicker]) {
      sources.push(
        `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${tickerDomains[upperTicker]}&size=128`
      );
    }
    sources.push(
      `https://img.logo.dev/ticker/${upperTicker}?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ`
    );
    sources.push(
      `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${ticker.toLowerCase()}.com&size=128`
    );
    return sources;
  }, [upperTicker, ticker]);

  useEffect(() => {
    setImageError(false);
    setFallbackIndex(0);
  }, [ticker]);

  const handleImageError = () => {
    if (fallbackIndex < imageSources.length - 1) {
      setFallbackIndex((prev) => prev + 1);
    } else {
      setImageError(true);
    }
  };

  if (!imageError && imageSources.length > 0) {
    return (
      <img
        src={imageSources[fallbackIndex]}
        alt={`${ticker} logo`}
        className={cn(className, "rounded-xl object-contain bg-white p-1")}
        onError={handleImageError}
        loading="lazy"
      />
    );
  }

  if (!showPlaceholder) return null;

  return (
    <div
      className={cn(
        className,
        `rounded-xl bg-gradient-to-br ${getTickerColor(ticker)} flex items-center justify-center font-bold text-white shadow-lg`
      )}
    >
      {ticker.slice(0, 2)}
    </div>
  );
};

// ── Types ────────────────────────────────────────────────────────────

interface CompanySearchResult {
  cik: string;
  ticker: string;
  name: string;
  exchange?: string;
}

interface LobbyingQuarter {
  symbol: string;
  year: number;
  quarter: string;
  oliScore: number;
  influenceLabel: string;
  totalSpend: number;
  filingCount: number;
  uniqueLobbyists: number;
  uniqueIssues: number;
  uniqueGovEntities: number;
  topIssues: { code: string; name: string; count: number }[];
  topRegistrants: { name: string; amount: number }[];
  latestFilingDate: string | null;
}

interface LobbyingActivityItem {
  symbol: string;
  filingUuid: string;
  filingDate: string;
  filingYear: number;
  filingPeriod: string;
  filingType: string;
  clientName: string;
  clientDescription: string | null;
  registrantName: string;
  amount: number | null;
  expenses: number | null;
  income: number | null;
  lobbyistNames: string[];
  issueAreas: string[];
  issueDescriptions: string[];
  governmentEntities: string[];
  specificIssues: string[];
  documentUrl: string | null;
  country: string;
}

interface LobbyingSummary {
  totalSpend: number;
  totalFilings: number;
  totalQuarters: number;
  averagePerQuarter: number;
  uniqueLobbyists: number;
  uniqueIssueAreas: number;
  uniqueGovEntities: number;
  uniqueRegistrants: number;
  topIssueAreas: { code: string; name: string; count: number; totalSpend: number }[];
  topRegistrants: { name: string; filingCount: number; totalSpend: number }[];
  topLobbyists: { name: string; coveredPosition: string | null; filingCount: number }[];
  spendByYear: { year: number; spend: number; filingCount: number }[];
}

interface LobbyingDataResponse {
  success: boolean;
  symbol: string;
  companyName: string | null;
  currentScore: number;
  currentLabel: string;
  trend: string;
  quarters: LobbyingQuarter[];
  activities: LobbyingActivityItem[];
  summary: LobbyingSummary;
  meta: {
    source: string;
    cachedAt: string | null;
    expiresAt: string | null;
    ttlSeconds: number;
    algorithm: string;
    dataSource: string;
  };
}

// ── Popular tickers (lobbying-heavy companies) ───────────────────────
const defaultPopularTickers = [
  { ticker: "AAPL", name: "Apple Inc." },
  { ticker: "MSFT", name: "Microsoft Corp." },
  { ticker: "GOOGL", name: "Alphabet Inc." },
  { ticker: "AMZN", name: "Amazon.com Inc." },
  { ticker: "META", name: "Meta Platforms Inc." },
  { ticker: "LMT", name: "Lockheed Martin Corp." },
  { ticker: "BA", name: "Boeing Company" },
  { ticker: "PFE", name: "Pfizer Inc." },
  { ticker: "JPM", name: "JPMorgan Chase & Co." },
  { ticker: "XOM", name: "Exxon Mobil Corp." },
  { ticker: "RTX", name: "RTX Corporation" },
  { ticker: "CVX", name: "Chevron Corporation" },
];

// ── Helpers ──────────────────────────────────────────────────────────

const formatCurrency = (value: number) => {
  if (!value) return "$0";
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return "text-red-400";
  if (score >= 60) return "text-orange-400";
  if (score >= 40) return "text-amber-400";
  if (score >= 20) return "text-blue-400";
  return "text-gray-400";
};

const getScoreColorHex = (score: number): string => {
  if (score >= 80) return "#f87171";
  if (score >= 60) return "#fb923c";
  if (score >= 40) return "#fbbf24";
  if (score >= 20) return "#60a5fa";
  return "#9ca3af";
};

const getScoreBgGlow = (score: number): string => {
  if (score >= 80) return "shadow-red-500/20";
  if (score >= 60) return "shadow-orange-500/20";
  if (score >= 40) return "shadow-amber-500/20";
  if (score >= 20) return "shadow-blue-500/20";
  return "shadow-gray-500/10";
};

const getSignalInfo = (score: number, trend: string): { signal: string; icon: React.ReactNode; color: string; bgColor: string; borderColor: string; description: string } => {
  if (score >= 80 && trend === "increasing") return { signal: "HEAVY INFLUENCE", icon: <ShieldAlert className="w-3.5 h-3.5" />, color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/30", description: "Aggressive lobbying surge — high regulatory risk" };
  if (score >= 80) return { signal: "HIGH INFLUENCE", icon: <Zap className="w-3.5 h-3.5" />, color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/30", description: "Very high lobbying activity — monitor for policy changes" };
  if (score >= 60) return { signal: "ELEVATED", icon: <Eye className="w-3.5 h-3.5" />, color: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30", description: "Above-average lobbying presence — notable government engagement" };
  if (score >= 40) return { signal: "MODERATE", icon: <Activity className="w-3.5 h-3.5" />, color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30", description: "Moderate lobbying activity — standard for sector" };
  if (score >= 20) return { signal: "LOW", icon: <Minus className="w-3.5 h-3.5" />, color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30", description: "Minimal lobbying engagement" };
  return { signal: "NEGLIGIBLE", icon: <Minus className="w-3.5 h-3.5" />, color: "text-gray-400", bgColor: "bg-gray-500/10", borderColor: "border-gray-500/30", description: "Little to no lobbying activity detected" };
};

const getOLIScoreStyle = (score: number) => {
  if (score >= 80) return { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", fill: "#f87171" };
  if (score >= 60) return { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", fill: "#fb923c" };
  if (score >= 40) return { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", fill: "#fbbf24" };
  if (score >= 20) return { text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", fill: "#60a5fa" };
  return { text: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/20", fill: "#9ca3af" };
};

const getTrendIcon = (trend: string) => {
  if (trend === "increasing") return <TrendingUp className="w-3.5 h-3.5 text-red-400" />;
  if (trend === "decreasing") return <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />;
  return <Minus className="w-3.5 h-3.5 text-gray-400" />;
};

// ── OLI Score Gauge — Insider Sentiment Style ──────────────────────────
const OLIScoreGauge = ({ score, label, trend, quarters }: { score: number; label: string; trend: string; quarters?: LobbyingQuarter[] }) => {
  const styles = getOLIScoreStyle(score);
  // Normalize 0-100 score to angle for gauge (-90 to +90 = 180 degrees)
  const rotation = -90 + (score / 100) * 180;
  
  // Calculate change for sparkline visual/color
  const sparkData = useMemo(() => {
    if (!quarters || quarters.length === 0) return [];
    return quarters
      .filter(q => q.filingCount > 0)
      .sort((a, b) => a.year !== b.year ? a.year - b.year : a.quarter.localeCompare(b.quarter))
      .slice(-6)
      .map(q => q.oliScore);
  }, [quarters]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-28 mb-2">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          {/* Background Track */}
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#262626" strokeWidth="12" strokeLinecap="round" />
          
          {/* Segments - 0-20-40-60-80-100 */}
          {/* 0-20 */}
          <path d="M 20 100 A 80 80 0 0 1 50 38" fill="none" stroke="#9ca3af" strokeWidth="3" strokeOpacity="0.3" />
          {/* 20-40 */}
          <path d="M 50 38 A 80 80 0 0 1 80 22" fill="none" stroke="#60a5fa" strokeWidth="3" strokeOpacity="0.3" />
          {/* 40-60 */}
          <path d="M 80 22 A 80 80 0 0 1 120 22" fill="none" stroke="#fbbf24" strokeWidth="3" strokeOpacity="0.3" />
          {/* 60-80 */}
          <path d="M 120 22 A 80 80 0 0 1 150 38" fill="none" stroke="#fb923c" strokeWidth="3" strokeOpacity="0.3" />
          {/* 80-100 */}
          <path d="M 150 38 A 80 80 0 0 1 180 100" fill="none" stroke="#f87171" strokeWidth="3" strokeOpacity="0.3" />
          
          {/* Needle */}
          <g transform={`rotate(${rotation}, 100, 100)`}>
            <line x1="100" y1="100" x2="100" y2="30" stroke={styles.fill} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="100" cy="100" r="5" fill={styles.fill} />
          </g>

          <text x="15" y="108" fill="#6b7280" fontSize="8" textAnchor="start">0</text>
          <text x="100" y="12" fill="#6b7280" fontSize="8" textAnchor="middle">50</text>
          <text x="185" y="108" fill="#6b7280" fontSize="8" textAnchor="end">100</text>
        </svg>
      </div>
      
      <div className={cn("text-3xl font-bold font-mono", styles.text)}>
        {score.toFixed(0)}
      </div>
      
      <div className={cn("mt-1 px-3 py-1 rounded-full text-xs font-semibold border", styles.bg, styles.border, styles.text)}>
        {label}
      </div>

      {/* Mini Sparkline for Trend */}
      {sparkData.length > 1 && (
        <div className="mt-4 w-32 h-10 opacity-60">
           <AreaChart width={128} height={40} data={sparkData.map((v, i) => ({ v, i }))}>
             <defs>
               <linearGradient id="oliSpark" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="5%" stopColor={styles.fill} stopOpacity={0.3}/>
                 <stop offset="95%" stopColor={styles.fill} stopOpacity={0}/>
               </linearGradient>
             </defs>
             <Area 
               type="monotone" 
               dataKey="v" 
               stroke={styles.fill} 
               strokeWidth={1.5}
               fill="url(#oliSpark)" 
               dot={false}
               isAnimationActive={false}
             />
           </AreaChart>
        </div>
      )}
    </div>
  );
};

// ── Stable tick renderer — defined OUTSIDE component to prevent remount flicker ──
const QuarterlyXTick = ({
  x, y, payload, index,
  yearBoundarySet, quarterlyData,
}: any) => {
  const isYearStart = yearBoundarySet.has(index);
  return (
    <g transform={`translate(${x},${y})`}>
      {isYearStart && (
        <line x1={0} y1={-200} x2={0} y2={0} stroke="#2e2e2e" strokeWidth={1} strokeDasharray="3 3" />
      )}
      <text
        x={0} y={0} dy={13}
        textAnchor="middle"
        fill={isYearStart ? '#777' : '#484848'}
        fontSize={isYearStart ? 11 : 10}
        fontWeight={isYearStart ? 600 : 400}
      >
        {payload.value}
      </text>
      {isYearStart && (
        <text x={0} y={0} dy={25} textAnchor="middle" fill="#3a3a3a" fontSize={9} fontWeight={600}>
          {quarterlyData[index]?.year}
        </text>
      )}
    </g>
  );
};

// ── Quarterly tooltip — defined OUTSIDE to prevent remount on every hover ──
const QuarterlyTooltip = ({ active, payload, spikeThreshold }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-[#0e0e0e] border border-gray-700/70 rounded-xl p-3 shadow-2xl min-w-[164px] pointer-events-none">
      <div className="text-xs font-semibold text-white mb-2">{d?.fullName}</div>
      <div className="space-y-1.5">
        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-gray-400">Spend</span>
          <span className="font-mono font-bold text-amber-400">{formatCurrency(d?.spend || 0)}</span>
        </div>
        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-gray-400">OLI Score</span>
          <span className={cn("font-mono font-bold", getScoreColor(d?.oli || 0))}>{d?.oli?.toFixed(0)}</span>
        </div>
        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-gray-400">Filings</span>
          <span className="font-mono text-gray-300">{d?.filings}</span>
        </div>
        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-gray-400">Lobbyists</span>
          <span className="font-mono text-gray-300">{d?.lobbyists}</span>
        </div>
        {d?.spend > spikeThreshold && (
          <div className="flex items-center gap-1 text-[10px] text-red-400 pt-1 border-t border-gray-800">
            <Zap className="w-3 h-3" />
            <span>Spend spike</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Annual tooltip — defined OUTSIDE ──
const AnnualTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-[#0e0e0e] border border-gray-700/70 rounded-xl p-3 shadow-2xl min-w-[148px] pointer-events-none">
      <div className="text-xs font-semibold text-white mb-2">{d?.name}</div>
      <div className="space-y-1.5">
        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-gray-400">Total Spend</span>
          <span className="font-mono font-bold text-amber-400">{formatCurrency(d?.spend || 0)}</span>
        </div>
        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-gray-400">Filings</span>
          <span className="font-mono text-gray-300">{d?.filings}</span>
        </div>
        {d?.yoy !== null && d?.yoy !== undefined && (
          <div className="flex justify-between gap-6 text-[11px]">
            <span className="text-gray-400">YoY</span>
            <span className={cn("font-mono font-bold", d.yoy > 0 ? "text-red-400" : "text-green-400")}>
              {d.yoy > 0 ? "+" : ""}{d.yoy.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Custom bar shape — reads fill from datum, avoids Cell flicker ────
const SpendBarShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!width || !height || height <= 0) return null;
  const fill = payload?.fillColor || 'url(#spendGradQ)';
  const r = Math.min(4, height / 2);
  return (
    <path
      d={`M${x},${y + r}
          Q${x},${y} ${x + r},${y}
          L${x + width - r},${y}
          Q${x + width},${y} ${x + width},${y + r}
          L${x + width},${y + height}
          L${x},${y + height}Z`}
      fill={fill}
    />
  );
};

// ── Stable prop constants — hoisted to module scope to prevent new references on re-render ──
const GRID_STROKE = "#222";
const CURSOR_STYLE = { fill: 'rgba(255,255,255,0.03)' } as const;
const XAXIS_TICK_QUARTERLY = { fontSize: 10, fill: '#525252' } as const;
const XAXIS_TICK_ANNUAL = { fontSize: 12, fill: '#888', fontWeight: 600 } as const;
const YAXIS_TICK_DEFAULT = { fontSize: 10, fill: '#525252' } as const;
const YAXIS_TICK_OLI = { fontSize: 10, fill: '#22d3ee', fillOpacity: 0.55 } as const;
const OLI_DOMAIN: [number, number] = [0, 100];
const LINE_DOT = { r: 2.5, fill: '#1A1A1A', stroke: '#22d3ee', strokeWidth: 1.5 } as const;
const LINE_ACTIVE_DOT = { r: 4, fill: '#22d3ee', stroke: '#1A1A1A', strokeWidth: 2 } as const;
const ANNUAL_BAR_RADIUS: [number, number, number, number] = [6, 6, 0, 0];
const QUARTERLY_MARGIN = { top: 8, right: 32, left: 8, bottom: 36 };
const ANNUAL_MARGIN = { top: 8, right: 12, left: 8, bottom: 8 };
const spendBarShapeElement = <SpendBarShape />;
const annualTooltipElement = <AnnualTooltip />;

// ── Spending Chart — quarterly bars + OLI line + year separators ─────
const SpendBarChart = ({ quarters, spendByYear }: { quarters: LobbyingQuarter[]; spendByYear: { year: number; spend: number; filingCount: number }[] }) => {
  const [view, setView] = useState<'quarterly' | 'annual'>('quarterly');
  const chartRef = useRef<HTMLDivElement>(null);
  const chartSize = useContainerSize(chartRef);
  // ── Quarterly data ──────────────────────────────────────────────────
  const quarterlyData = useMemo(() => {
    return quarters
      .filter(q => q.filingCount > 0)
      .sort((a, b) => a.year !== b.year ? a.year - b.year : a.quarter.localeCompare(b.quarter))
      .slice(-16)
      .map(q => ({
        name: `${q.quarter} '${String(q.year).slice(2)}`,
        fullName: `${q.quarter} ${q.year}`,
        year: q.year,
        quarter: q.quarter,
        spend: q.totalSpend,
        oli: q.oliScore,
        filings: q.filingCount,
        lobbyists: q.uniqueLobbyists,
      }));
  }, [quarters]);

  // ── Annual data ─────────────────────────────────────────────────────
  const annualData = useMemo(() => {
    return [...spendByYear]
      .sort((a, b) => a.year - b.year)
      .map((y, i, arr) => {
        const prev = i > 0 ? arr[i - 1].spend : null;
        const yoy = prev && prev > 0 ? ((y.spend - prev) / prev) * 100 : null;
        return { name: String(y.year), year: y.year, spend: y.spend, filings: y.filingCount, yoy };
      });
  }, [spendByYear]);

  const avgSpend = quarterlyData.reduce((s, d) => s + d.spend, 0) / (quarterlyData.length || 1);
  const spikeThreshold = avgSpend * 1.5;

  // Bake fill color into quarterly data so we never need <Cell> children
  const quarterlyDataWithFill = useMemo(() => {
    return quarterlyData.map(d => ({
      ...d,
      fillColor: d.spend > spikeThreshold ? 'url(#spendGradSpike)' : 'url(#spendGradQ)',
    }));
  }, [quarterlyData, spikeThreshold]);

  // Year-boundary indices — stable Set, recomputed only when quarterlyData changes
  const yearBoundarySet = useMemo(() => {
    const seen = new Set<number>();
    const result = new Set<number>();
    quarterlyData.forEach((d, i) => {
      if (!seen.has(d.year)) { seen.add(d.year); result.add(i); }
    });
    return result;
  }, [quarterlyData]);

  // Stable tick renderer — passes boundary data via props so the component ref stays the same
  const renderQuarterlyTick = useCallback((props: any) => (
    <QuarterlyXTick {...props} yearBoundarySet={yearBoundarySet} quarterlyData={quarterlyData} />
  ), [yearBoundarySet, quarterlyData]);

  // Stable tooltip renderers — bound spikeThreshold via useCallback
  const renderQuarterlyTooltip = useCallback((props: any) => (
    <QuarterlyTooltip {...props} spikeThreshold={spikeThreshold} />
  ), [spikeThreshold]);

  // YoY badge
  const yoyBadge = useMemo(() => {
    if (view === 'annual' && annualData.length >= 2) {
      const last = annualData[annualData.length - 1];
      const prev = annualData[annualData.length - 2];
      const change = prev.spend > 0 ? ((last.spend - prev.spend) / prev.spend) * 100 : 0;
      return { change };
    }
    return null;
  }, [annualData, view]);

  const chartData = view === 'quarterly' ? quarterlyData : annualData;
  const chartHeight = view === 'quarterly' ? 230 : 210;
  const isEmpty = chartData.length === 0;

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            Lobbying Spend
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">
            {view === 'quarterly' ? 'Quarterly breakdown with OLI influence score' : 'Annual totals with year-over-year change'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {yoyBadge && (
            <div className={cn("flex items-center gap-1 text-[10px] font-mono font-bold", yoyBadge.change > 0 ? "text-red-400" : yoyBadge.change < 0 ? "text-green-400" : "text-gray-400")}>
              {yoyBadge.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {yoyBadge.change > 0 ? "+" : ""}{yoyBadge.change.toFixed(1)}% YoY
            </div>
          )}
          {/* View toggle */}
          <div className="flex gap-0.5 bg-[#111] rounded-lg p-0.5 border border-gray-800">
            <button
              onClick={() => setView('quarterly')}
              className={cn("px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors", view === 'quarterly' ? "bg-amber-600/15 text-amber-400" : "text-gray-500 hover:text-gray-300")}
            >
              Quarterly
            </button>
            <button
              onClick={() => setView('annual')}
              className={cn("px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors", view === 'annual' ? "bg-amber-600/15 text-amber-400" : "text-gray-500 hover:text-gray-300")}
            >
              Annual
            </button>
          </div>
          {/* Legend — quarterly only */}
          {view === 'quarterly' && (
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-amber-500/60" />
                <span>Spend</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-[2px] bg-cyan-400/80 rounded-full" />
                <span>OLI</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div ref={chartRef} className="w-full" style={{ height: chartHeight }}>
        {isEmpty ? (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
            No lobbying data for this time period
          </div>
        ) : chartSize.width > 0 && (
          view === 'quarterly' ? (
            <ComposedChart
              width={chartSize.width}
              height={chartHeight}
              data={quarterlyDataWithFill}
              margin={QUARTERLY_MARGIN}
              barCategoryGap="28%"
            >
              <defs>
                <linearGradient id="spendGradQ" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.15} />
                </linearGradient>
                <linearGradient id="spendGradSpike" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.85} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="name"
                tick={renderQuarterlyTick}
                axisLine={false}
                tickLine={false}
                interval={0}
                height={44}
              />
              <YAxis
                yAxisId="spend"
                tick={YAXIS_TICK_DEFAULT}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCurrency}
                width={58}
              />
              <YAxis
                yAxisId="oli"
                orientation="right"
                domain={OLI_DOMAIN}
                tick={YAXIS_TICK_OLI}
                axisLine={false}
                tickLine={false}
                tickCount={5}
                width={30}
              />
              <RechartsTooltip
                content={renderQuarterlyTooltip}
                cursor={CURSOR_STYLE}
                isAnimationActive={false}
              />
              <Bar
                yAxisId="spend"
                dataKey="spend"
                maxBarSize={32}
                isAnimationActive={false}
                shape={spendBarShapeElement}
              />
              <Line
                yAxisId="oli"
                type="monotone"
                dataKey="oli"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={LINE_DOT}
                activeDot={LINE_ACTIVE_DOT}
                isAnimationActive={false}
              />
            </ComposedChart>
          ) : (
            <BarChart
              width={chartSize.width}
              height={chartHeight}
              data={annualData}
              margin={ANNUAL_MARGIN}
              barCategoryGap="32%"
            >
              <defs>
                <linearGradient id="annualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#d97706" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="name"
                tick={XAXIS_TICK_ANNUAL}
                axisLine={false}
                tickLine={false}
                dy={8}
              />
              <YAxis
                tick={YAXIS_TICK_DEFAULT}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCurrency}
                width={58}
              />
              <RechartsTooltip
                content={annualTooltipElement}
                cursor={CURSOR_STYLE}
                isAnimationActive={false}
              />
              <Bar
                dataKey="spend"
                fill="url(#annualGrad)"
                radius={ANNUAL_BAR_RADIUS}
                maxBarSize={80}
                isAnimationActive={false}
              />
            </BarChart>
          )
        )}
      </div>

      {/* Spike annotation */}
      {!isEmpty && view === 'quarterly' && quarterlyData.some(d => d.spend > spikeThreshold) && (
        <div className="flex items-center gap-2 mt-3 px-3 py-1.5 bg-red-500/5 border border-red-500/10 rounded-lg">
          <Zap className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <span className="text-[10px] text-red-400/80">
            Spike quarters (red) exceed {formatCurrency(Math.round(spikeThreshold))} — 1.5× quarterly avg
          </span>
        </div>
      )}
    </div>
  );
};

// ── Drilldown Modal ──────────────────────────────────────────────────
interface DrilldownModalProps {
  title: string;
  subtitle: string;
  filings: LobbyingActivityItem[];
  accentColor: string; // tailwind text color class
  onClose: () => void;
}

const DrilldownModal = ({ title, subtitle, filings, accentColor, onClose }: DrilldownModalProps) => {
  const totalSpend = filings.reduce((s, f) => s + (f.amount || 0), 0);
  const uniqueLobbyists = new Set(filings.flatMap(f => f.lobbyistNames)).size;
  const uniqueGovEntities = new Set(filings.flatMap(f => f.governmentEntities)).size;

  // Sort by date desc
  const sorted = [...filings].sort((a, b) => b.filingDate.localeCompare(a.filingDate));

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={handleBackdrop}
    >
      <div
        className="w-full max-w-4xl max-h-[85vh] bg-[#0e0e0e] border border-gray-800 rounded-2xl flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <div>
            <h3 className={cn("text-base font-bold flex items-center gap-2", accentColor)}>
              <FileText className="w-4 h-4" />
              {title}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          </div>
          {/* Summary chips */}
          <div className="flex items-center gap-6 mr-8">
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-amber-400">{formatCurrency(totalSpend)}</div>
              <div className="text-[10px] text-gray-600">total spend</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-white">{filings.length}</div>
              <div className="text-[10px] text-gray-600">filings</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-blue-400">{uniqueLobbyists}</div>
              <div className="text-[10px] text-gray-600">lobbyists</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-purple-400">{uniqueGovEntities}</div>
              <div className="text-[10px] text-gray-600">gov entities</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors text-gray-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Table head */}
        <div className="grid grid-cols-12 gap-3 px-6 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-800/60 flex-shrink-0 bg-[#0a0a0a]">
          <div className="col-span-1">Date</div>
          <div className="col-span-2">Period</div>
          <div className="col-span-2">Registrant</div>
          <div className="col-span-3">Issues / Description</div>
          <div className="col-span-2">Lobbyists</div>
          <div className="col-span-1 text-right">Amount</div>
          <div className="col-span-1 text-center">Doc</div>
        </div>

        {/* Scrollable rows */}
        <div className="overflow-y-auto flex-1 custom-scrollbar divide-y divide-gray-800/40">
          {sorted.map((f, i) => (
            <div
              key={`${f.filingUuid}-${i}`}
              className="grid grid-cols-12 gap-3 px-6 py-3 items-start hover:bg-white/[0.02] transition-colors text-xs group"
            >
              {/* Date */}
              <div className="col-span-1">
                <span className="text-gray-500 font-mono text-[10px]">
                  {f.filingDate ? new Date(f.filingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                </span>
              </div>

              {/* Period */}
              <div className="col-span-2">
                <span className="inline-flex flex-col items-start">
                  <span className="text-[10px] font-mono text-gray-300">{f.filingPeriod}</span>
                  <span className="text-[9px] font-mono text-gray-600">{f.filingYear} · {f.filingType}</span>
                </span>
              </div>

              {/* Registrant */}
              <div className="col-span-2">
                <div className="text-[11px] font-medium text-white truncate" title={f.registrantName}>{f.registrantName}</div>
                <div className="text-[10px] text-gray-600 truncate" title={f.clientName}>{f.clientName}</div>
              </div>

              {/* Issues / Description */}
              <div className="col-span-3">
                {f.specificIssues.length > 0 ? (
                  <p className="text-[10px] text-gray-400 line-clamp-3 leading-relaxed" title={f.specificIssues.join(' | ')}>
                    {f.specificIssues[0]}
                  </p>
                ) : f.issueDescriptions.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {f.issueDescriptions.slice(0, 3).map((d, j) => (
                      <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800/60 text-gray-400">{d}</span>
                    ))}
                    {f.issueDescriptions.length > 3 && (
                      <span className="text-[9px] text-gray-600">+{f.issueDescriptions.length - 3}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-700 text-[10px]">—</span>
                )}
                {/* Gov entities */}
                {f.governmentEntities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {f.governmentEntities.slice(0, 2).map((g, j) => (
                      <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/20 text-purple-400/70 border border-purple-800/20">{g}</span>
                    ))}
                    {f.governmentEntities.length > 2 && (
                      <span className="text-[9px] text-gray-600">+{f.governmentEntities.length - 2}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Lobbyists */}
              <div className="col-span-2">
                {f.lobbyistNames.length > 0 ? (
                  <div className="space-y-0.5">
                    {f.lobbyistNames.slice(0, 3).map((name, j) => (
                      <div key={j} className="text-[10px] text-gray-400 truncate" title={name}>{name}</div>
                    ))}
                    {f.lobbyistNames.length > 3 && (
                      <span className="text-[9px] text-gray-600">+{f.lobbyistNames.length - 3} more</span>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-700 text-[10px]">—</span>
                )}
              </div>

              {/* Amount */}
              <div className="col-span-1 text-right">
                {f.amount ? (
                  <span className="font-mono font-semibold text-amber-400 text-[11px]">{formatCurrency(f.amount)}</span>
                ) : (
                  <span className="text-gray-700 text-[10px]">—</span>
                )}
              </div>

              {/* Document link */}
              <div className="col-span-1 flex justify-center">
                {f.documentUrl ? (
                  <a
                    href={f.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors text-[9px] font-semibold"
                    title="Open official filing"
                    onClick={e => e.stopPropagation()}
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    View
                  </a>
                ) : (
                  <span className="text-gray-700 text-[10px]">—</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-800 flex-shrink-0 bg-[#0a0a0a]">
          <span className="text-[10px] text-gray-600 flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            US Senate LDA Database · Public records
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Client-side cache ────────────────────────────────────────────────
// Stores lobbying results in localStorage so switching tabs, re-mounting,
// or re-selecting the same ticker is INSTANT (0 API calls).
// TTL: 20 minutes.  Force refresh bypasses this.
const CLIENT_CACHE_KEY = "omnifolio_lobbying_client_cache";
const CLIENT_CACHE_TTL_MS = 20 * 60 * 1000; // 20 min

interface ClientCacheEntry {
  data: LobbyingDataResponse;
  storedAt: number;
}

function getClientCache(ticker: string, years: number): LobbyingDataResponse | null {
  try {
    const raw = sessionStorage.getItem(`${CLIENT_CACHE_KEY}:${ticker}:${years}`);
    if (!raw) return null;
    const entry: ClientCacheEntry = JSON.parse(raw);
    if (Date.now() - entry.storedAt > CLIENT_CACHE_TTL_MS) {
      sessionStorage.removeItem(`${CLIENT_CACHE_KEY}:${ticker}:${years}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function setClientCache(ticker: string, years: number, data: LobbyingDataResponse): void {
  try {
    const entry: ClientCacheEntry = { data, storedAt: Date.now() };
    sessionStorage.setItem(`${CLIENT_CACHE_KEY}:${ticker}:${years}`, JSON.stringify(entry));
  } catch { /* sessionStorage full or unavailable — ignore */ }
}

// ── Skeleton Loader ──────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-4 animate-pulse">
    <div className="h-2.5 bg-gray-800 rounded w-20 mb-3" />
    <div className="h-5 bg-gray-800 rounded w-24 mb-1" />
    <div className="h-2 bg-gray-800/50 rounded w-16" />
  </div>
);

const SkeletonGauge = () => (
  <div className="lg:col-span-3 bg-[#0A0A0A] rounded-xl border border-gray-800/80 p-5 flex flex-col items-center justify-center animate-pulse">
    <div className="h-2.5 bg-gray-800 rounded w-14 mb-3" />
    <div className="w-32 h-32 rounded-full border-[6px] border-gray-800" />
    <div className="h-5 bg-gray-800 rounded-full w-24 mt-3" />
    <div className="h-2 bg-gray-800/50 rounded w-16 mt-3" />
  </div>
);

const LoadingSkeleton = () => (
  <div className="space-y-6 animate-in fade-in duration-300">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <SkeletonGauge />
      <div className="lg:col-span-9 space-y-4">
        <div className="h-10 bg-gray-800/30 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
    <div className="bg-[#0A0A0A] rounded-xl border border-gray-800/80 p-5 animate-pulse">
      <div className="h-2.5 bg-gray-800 rounded w-28 mb-3" />
      <div className="h-48 bg-gray-800/20 rounded-lg" />
    </div>
  </div>
);

// ── Main Component ───────────────────────────────────────────────────
export function SenateLobbyingView() {
  const [ticker, setTicker] = useState("LMT");
  const [companyName, setCompanyName] = useState("Lockheed Martin Corp.");
  const [searchInput, setSearchInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [data, setData] = useState<LobbyingDataResponse | null>(null);

  // Filters & pagination
  const [yearsFilter, setYearsFilter] = useState<number>(3);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // Autocomplete state
  const [searchResults, setSearchResults] = useState<CompanySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);

  // Recent tickers
  const [recentTickers, setRecentTickers] = useState<{ ticker: string; name: string }[]>([]);

  const debouncedSearch = useDebounce(searchInput, 300);

  // Load recent tickers from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("senate-lobbying-prop-recent");
      if (stored) setRecentTickers(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Save recent ticker
  const addRecentTicker = useCallback((t: string, name: string) => {
    setRecentTickers((prev) => {
      const filtered = prev.filter((item) => item.ticker !== t);
      const updated = [{ ticker: t, name }, ...filtered].slice(0, 8);
      try {
        localStorage.setItem("senate-lobbying-prop-recent", JSON.stringify(updated));
      } catch { /* ignore */ }
      return updated;
    });
  }, []);

  // Search companies when input changes
  useEffect(() => {
    async function searchCompanies() {
      if (!debouncedSearch || debouncedSearch.length < 1) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/sec/search?q=${encodeURIComponent(debouncedSearch)}&limit=8`
        );
        if (response.ok) {
          const result = await response.json();
          setSearchResults(result.results || []);
          setShowDropdown(result.results?.length > 0);
          setHighlightedIndex(-1);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }
    searchCompanies();
  }, [debouncedSearch]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Abort controller ref — cancelled on unmount or when ticker/years change
  const abortRef = useRef<AbortController | null>(null);

  // Fetch lobbying data with client-side cache
  const fetchLobbyingData = useCallback(
    async (tickerToFetch: string, years: number, forceRefresh = false) => {
      // ── 1. Check client-side cache first (instant, 0 API calls) ──
      if (!forceRefresh) {
        const cached = getClientCache(tickerToFetch.toUpperCase(), years);
        if (cached) {
          console.log(`[SenateLobbyingView] ⚡ Client cache hit for ${tickerToFetch}`);
          setData(cached);
          if (cached.companyName) setCompanyName(cached.companyName);
          setIsLoading(false);
          setError(null);
          return;
        }
      }

      // Cancel any in-flight request for a previous ticker/years combo
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          symbol: tickerToFetch,
          years: String(years),
        });
        if (forceRefresh) params.set("refresh", "true");

        const timeout = setTimeout(() => controller.abort(), 55000); // 55s for first-ever lookups (Senate API can be slow)

        const response = await fetch(`/api/lobbying?${params}`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to fetch data (${response.status})`);
        }
        const result: LobbyingDataResponse = await response.json();

        // Guard against stale responses arriving after component unmount
        if (controller.signal.aborted) return;

        setData(result);
        if (result.companyName) {
          setCompanyName(result.companyName);
        }
        // ── Store in client cache ──
        setClientCache(tickerToFetch.toUpperCase(), years, result);
      } catch (err: unknown) {
        // Ignore errors from cancelled requests (ticker changed, component unmounted)
        if (err instanceof DOMException && err.name === "AbortError") {
          if (controller.signal.aborted && abortRef.current !== controller) {
            // This was an intentional cancellation — silently discard
            return;
          }
          setError("The Senate LDA database is slow to respond. This is common for first-time lookups — please try again in a moment.");
        } else {
          let message = err instanceof Error ? err.message : "An error occurred";
          // Provide a friendlier message for generic network failures
          if (message === "Failed to fetch" || message === "Load failed") {
            message = "Unable to reach the lobbying data service. Please check your connection and try again.";
          }
          console.error("[SenateLobbyingView]", err);
          setError(message);
        }
        // Don't clear existing data on error — keep showing stale results
        setData((prev) => prev ?? null);
      } finally {
        if (!controller.signal.aborted || abortRef.current === controller) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  // Fetch on mount and when ticker/years change; cancel stale requests on cleanup
  useEffect(() => {
    fetchLobbyingData(ticker, yearsFilter);
    return () => {
      abortRef.current?.abort();
    };
  }, [ticker, yearsFilter, fetchLobbyingData]);

  // Reset page when ticker changes
  useEffect(() => {
    setCurrentPage(1);
  }, [ticker]);

  const selectCompany = (t: string, name: string) => {
    setSearchInput("");
    setShowDropdown(false);
    setSearchResults([]);
    addRecentTicker(t, name);
    setTicker(t.toUpperCase().trim());
    setCompanyName(name);
    setCurrentPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || searchResults.length === 0) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
          const r = searchResults[highlightedIndex];
          selectCompany(r.ticker, r.name);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        break;
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      selectCompany(searchInput.trim(), searchInput.toUpperCase().trim());
    }
  };

  // Pagination for activities
  const paginatedActivities = useMemo(() => {
    if (!data?.activities) return [];
    return data.activities.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [data?.activities, currentPage]);

  const totalPages = Math.ceil((data?.activities?.length || 0) / itemsPerPage);

  const summary = data?.summary;

  // ── Drilldown modal state ──────────────────────────────────────────
  const [drilldown, setDrilldown] = useState<{
    title: string;
    subtitle: string;
    filings: LobbyingActivityItem[];
    accentColor: string;
  } | null>(null);

  const openIssueDrilldown = useCallback((issueCode: string, issueName: string) => {
    if (!data?.activities) return;
    const filings = data.activities.filter(f => f.issueAreas.includes(issueCode));
    setDrilldown({
      title: issueName,
      subtitle: `${filings.length} filings tagged with issue area "${issueCode}"`,
      filings,
      accentColor: 'text-purple-400',
    });
  }, [data?.activities]);

  const openFirmDrilldown = useCallback((firmName: string) => {
    if (!data?.activities) return;
    const filings = data.activities.filter(f => f.registrantName === firmName);
    setDrilldown({
      title: firmName,
      subtitle: `${filings.length} filings by this lobbying firm`,
      filings,
      accentColor: 'text-blue-400',
    });
  }, [data?.activities]);

  const openLobbyistDrilldown = useCallback((lobbyistName: string) => {
    if (!data?.activities) return;
    const filings = data.activities.filter(f => f.lobbyistNames.includes(lobbyistName));
    setDrilldown({
      title: lobbyistName,
      subtitle: `${filings.length} filings involving this lobbyist`,
      filings,
      accentColor: 'text-green-400',
    });
  }, [data?.activities]);

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="w-6 h-6 text-amber-500" />
            Senate Lobbying
          </h2>
          <div className="flex gap-3 text-sm mt-1 text-gray-400">
            Congressional lobbying disclosure data &amp; influence scoring
            <span className="text-[10px] text-gray-600 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Proprietary &bull; US Senate LDA
            </span>
          </div>
        </div>
      </div>

      {/* ── Search Bar with Autocomplete ──────────────────── */}
      <div ref={searchRef} className="relative z-50">
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-3">
          <form onSubmit={handleSearch} className="flex gap-4 items-center">
            <div className="relative flex-1">
              {isSearching ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              )}
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                placeholder="Search by ticker or company name..."
                className="w-full pl-10 pr-8 py-2 bg-transparent border-none text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-0"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setSearchResults([]);
                    setShowDropdown(false);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-white" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || !searchInput.trim()}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                isLoading || !searchInput.trim()
                  ? "bg-[#1A1A1A] text-gray-500 border border-gray-800 cursor-not-allowed"
                  : "bg-amber-600/10 text-amber-400 border border-amber-600/20 hover:bg-amber-600/20"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading</span>
                </>
              ) : (
                <span>Lookup</span>
              )}
            </button>
          </form>
        </div>

        {/* Autocomplete Dropdown */}
        <AnimatePresence>
          {showDropdown && searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-gray-800 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto"
              style={{ zIndex: 9999 }}
            >
              {searchResults.map((result, index) => (
                <button
                  key={`${result.cik}-${index}`}
                  onClick={() => selectCompany(result.ticker, result.name)}
                  className={cn(
                    "w-full px-4 py-3 flex items-center gap-3 text-left transition-colors",
                    index === highlightedIndex ? "bg-amber-500/20" : "hover:bg-[#212121]"
                  )}
                >
                  <CompanyIcon ticker={result.ticker} className="h-8 w-8" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-white">{result.ticker}</div>
                    <div className="text-xs text-gray-400 truncate">{result.name}</div>
                  </div>
                  {result.exchange && (
                    <span className="text-[10px] text-gray-600 px-1.5 py-0.5 bg-gray-800 rounded">
                      {result.exchange}
                    </span>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Popular Companies Grid ────────────────────────── */}
      <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Top Lobbying Companies
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {defaultPopularTickers.map((item) => (
            <button
              key={item.ticker}
              onClick={() => selectCompany(item.ticker, item.name)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group",
                ticker === item.ticker
                  ? "bg-amber-500/10 border border-amber-500/30 ring-1 ring-amber-500/20"
                  : "bg-[#141414] border border-gray-800/50 hover:border-gray-700 hover:bg-[#1A1A1A]"
              )}
            >
              <CompanyIcon ticker={item.ticker} className="h-7 w-7 flex-shrink-0" />
              <div className="min-w-0">
                <div
                  className={cn(
                    "text-xs font-semibold truncate",
                    ticker === item.ticker ? "text-amber-400" : "text-white group-hover:text-white"
                  )}
                >
                  {item.ticker}
                </div>
                <div className="text-[10px] text-gray-500 truncate">{item.name}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Recent Lookups ────────────────────────────────── */}
      {recentTickers.length > 0 && (
        <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              Recent Lookups
            </h3>
            <span className="text-xs text-gray-500">{recentTickers.length} companies</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentTickers.map((item, index) => (
              <button
                key={`${item.ticker}-${index}`}
                onClick={() => selectCompany(item.ticker, item.name)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 group",
                  ticker === item.ticker
                    ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                    : "bg-[#141414] border border-gray-800/50 hover:border-gray-700 hover:bg-[#1A1A1A] text-gray-300 hover:text-white"
                )}
              >
                <CompanyIcon ticker={item.ticker} className="h-5 w-5" />
                <span className="text-xs font-medium">{item.ticker}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Content Area ─────────────────────────────────── */}
      <div className="flex-1 overflow-auto space-y-6 pr-2 custom-scrollbar">
        {/* Company Header */}
        <div className="flex items-center gap-4 py-2 animate-in fade-in duration-500">
          <CompanyIcon ticker={ticker} className="h-14 w-14" />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              {ticker}
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900/30 text-amber-400 border border-amber-800/50">
                US Senate LDA
              </span>
            </h3>
            <p className="text-sm text-gray-400">{companyName}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <Landmark className="w-3 h-3 text-gray-600" />
              Congressional Lobbying Disclosures
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Years filter */}
            <div className="flex gap-1 bg-[#1A1A1A] rounded-lg p-0.5 border border-gray-800">
              {[1, 2, 3, 5].map((y) => (
                <button
                  key={y}
                  onClick={() => setYearsFilter(y)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                    yearsFilter === y ? "bg-amber-600/15 text-amber-400" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  {y}y
                </button>
              ))}
            </div>
            <button
              onClick={() => fetchLobbyingData(ticker, yearsFilter, true)}
              disabled={isLoading}
              className="p-2.5 rounded-lg bg-[#212121] hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 border border-gray-800 hover:border-gray-700"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Loading state — skeleton instead of spinner */}
        {isLoading && !data && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/10 rounded-lg text-xs text-amber-400/80">
              <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
              <span>
                Fetching lobbying disclosures from the US Senate LDA database...
                First lookups may take up to 30 seconds while data is cached.
              </span>
            </div>
            <LoadingSkeleton />
          </div>
        )}

        {/* Subtle refresh indicator when we have data but are refreshing */}
        {isLoading && data && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/5 border border-amber-500/10 rounded-lg text-[11px] text-amber-400/70">
            <Loader2 className="w-3 h-3 animate-spin" />
            Refreshing from US Senate LDA Database...
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white mb-2">Failed to Load Data</h3>
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => fetchLobbyingData(ticker, yearsFilter, true)}
              className="mt-4 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm hover:bg-red-500/20 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main Content */}
        {data && !error && (
          <>
            {/* OLI Score + Signal Banner + Summary Cards — unified panel */}
            {(() => {
              const sig = getSignalInfo(data.currentScore, data.trend);
              const scoreStyle = getOLIScoreStyle(data.currentScore);
              return (
                <div className="bg-[#0A0A0A] rounded-2xl border border-gray-800/80 overflow-hidden">
                  {/* Top: Signal Banner */}
                  <div className={cn("flex items-center gap-3 px-5 py-2.5 border-b", sig.bgColor, sig.borderColor.replace("border-", "border-b-"))}>
                    <div className={cn("flex items-center gap-2 font-semibold text-xs tracking-wide uppercase", sig.color)}>
                      {sig.icon}
                      {sig.signal}
                    </div>
                    <div className="w-px h-3.5 bg-gray-700/60" />
                    <span className="text-xs text-gray-400 leading-none">{sig.description}</span>
                    <div className="ml-auto flex items-center gap-1.5 text-[10px] text-gray-600">
                      {getTrendIcon(data.trend)}
                      <span className="capitalize">{data.trend}</span>
                    </div>
                  </div>

                  {/* Bottom: OLI Gauge + 4 stat cards side-by-side */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-800/60">
                    {/* OLI Gauge */}
                    <div className="lg:col-span-3 flex flex-col items-center justify-center py-6 px-4 relative overflow-hidden">
                      <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                      <div className="relative z-10 flex flex-col items-center w-full">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-3 font-medium">OLI Score</span>
                        <OLIScoreGauge score={data.currentScore} label={data.currentLabel} trend={data.trend} quarters={data.quarters} />
                      </div>
                    </div>

                    {/* 4 Stat Cards */}
                    <div className="lg:col-span-9 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-800/60">

                      {/* ── Total Spend — year-over-year bar sparkline ── */}
                      <div className="group flex flex-col justify-between p-5 hover:bg-white/[0.015] transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Total Spend</span>
                          <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/10 flex items-center justify-center">
                            <DollarSign className="w-3 h-3 text-amber-400" />
                          </div>
                        </div>
                        {/* Mini bar sparkline — annual spend */}
                        {summary && summary.spendByYear.length > 0 && (() => {
                          const years = [...summary.spendByYear].sort((a, b) => a.year - b.year).slice(-5);
                          const max = Math.max(...years.map(y => y.spend), 1);
                          return (
                            <div className="flex items-end gap-[3px] h-8 mb-2.5">
                              {years.map((y, i) => {
                                const h = Math.max(2, Math.round((y.spend / max) * 28));
                                const isLast = i === years.length - 1;
                                return (
                                  <div key={y.year} className="flex-1 flex flex-col items-center gap-0.5" title={`${y.year}: ${formatCurrency(y.spend)}`}>
                                    <div
                                      className={cn("w-full rounded-sm transition-all", isLast ? "bg-amber-400" : "bg-amber-400/25")}
                                      style={{ height: h }}
                                    />
                                    <span className="text-[7px] text-gray-700 font-mono leading-none">{String(y.year).slice(2)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                        <div>
                          <div className="text-2xl font-bold text-amber-400 font-mono tracking-tight leading-none">
                            {formatCurrency(summary?.totalSpend || 0)}
                          </div>
                          <div className="text-[10px] text-gray-600 mt-1.5 font-mono">
                            {formatCurrency(summary?.averagePerQuarter || 0)} / qtr avg
                          </div>
                        </div>
                      </div>

                      {/* ── Total Filings — quarter activity dot grid ── */}
                      <div className="group flex flex-col justify-between p-5 hover:bg-white/[0.015] transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Filings</span>
                          <div className="w-6 h-6 rounded-lg bg-white/5 border border-gray-700/30 flex items-center justify-center">
                            <FileText className="w-3 h-3 text-gray-400" />
                          </div>
                        </div>
                        {/* Quarter dot grid — each dot = 1 quarter, filled if filings > 0 */}
                        {data.quarters && data.quarters.length > 0 && (() => {
                          const sorted = [...data.quarters].sort((a, b) => a.year !== b.year ? a.year - b.year : a.quarter.localeCompare(b.quarter)).slice(-20);
                          return (
                            <div className="flex flex-wrap gap-[3px] mb-2.5">
                              {sorted.map((q, i) => (
                                <div
                                  key={i}
                                  title={`${q.quarter} ${q.year}: ${q.filingCount} filings`}
                                  className={cn(
                                    "w-2.5 h-2.5 rounded-sm",
                                    q.filingCount > 10 ? "bg-white/70" :
                                    q.filingCount > 4  ? "bg-white/35" :
                                    q.filingCount > 0  ? "bg-white/15" :
                                                         "bg-white/[0.04]"
                                  )}
                                />
                              ))}
                            </div>
                          );
                        })()}
                        <div>
                          <div className="text-2xl font-bold text-white font-mono tracking-tight leading-none">
                            {summary?.totalFilings || 0}
                          </div>
                          <div className="text-[10px] text-gray-600 mt-1.5 font-mono">
                            {summary?.totalQuarters || 0} active quarters
                          </div>
                        </div>
                      </div>

                      {/* ── Lobbyists — firms vs individuals ratio bar ── */}
                      <div className="group flex flex-col justify-between p-5 hover:bg-white/[0.015] transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Lobbyists</span>
                          <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/10 flex items-center justify-center">
                            <Users className="w-3 h-3 text-blue-400" />
                          </div>
                        </div>
                        {/* Ratio bar: firms (blue) vs individuals (cyan) */}
                        {summary && summary.uniqueRegistrants > 0 && summary.uniqueLobbyists > 0 && (() => {
                          const firms = summary.uniqueRegistrants;
                          const people = summary.uniqueLobbyists;
                          const total = firms + people;
                          const firmPct = Math.round((firms / total) * 100);
                          const peoplePct = 100 - firmPct;
                          return (
                            <div className="mb-2.5 space-y-1.5">
                              <div className="flex h-2 rounded-full overflow-hidden gap-px">
                                <div className="bg-blue-500/60 rounded-l-full" style={{ width: `${firmPct}%` }} title={`${firms} firms`} />
                                <div className="bg-cyan-400/40 rounded-r-full flex-1" title={`${people} individuals`} />
                              </div>
                              <div className="flex items-center justify-between text-[9px] font-mono text-gray-600">
                                <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500/60" />{firms} firms</span>
                                <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400/40" />{people} people</span>
                              </div>
                            </div>
                          );
                        })()}
                        <div>
                          <div className="text-2xl font-bold text-blue-400 font-mono tracking-tight leading-none">
                            {summary?.uniqueLobbyists || 0}
                          </div>
                          <div className="text-[10px] text-gray-600 mt-1.5 font-mono">
                            {summary?.uniqueRegistrants || 0} lobbying firms
                          </div>
                        </div>
                      </div>

                      {/* ── Gov Reach — issue area horizontal segment bar ── */}
                      <div className="group flex flex-col justify-between p-5 hover:bg-white/[0.015] transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Gov Reach</span>
                          <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/10 flex items-center justify-center">
                            <Globe className="w-3 h-3 text-purple-400" />
                          </div>
                        </div>
                        {/* Top issue areas as segmented bar */}
                        {summary && summary.topIssueAreas.length > 0 && (() => {
                          const top = summary.topIssueAreas.slice(0, 5);
                          const totalCount = top.reduce((s, i) => s + i.count, 0) || 1;
                          const colors = ["bg-purple-400/70", "bg-purple-400/45", "bg-violet-400/40", "bg-fuchsia-400/35", "bg-gray-500/25"];
                          return (
                            <div className="mb-2.5 space-y-1.5">
                              <div className="flex h-2 rounded-full overflow-hidden gap-px">
                                {top.map((issue, i) => (
                                  <div
                                    key={issue.code}
                                    className={cn("rounded-sm first:rounded-l-full last:rounded-r-full", colors[i])}
                                    style={{ width: `${(issue.count / totalCount) * 100}%` }}
                                    title={`${issue.name}: ${issue.count} filings`}
                                  />
                                ))}
                              </div>
                              <div className="flex items-center gap-1 flex-wrap">
                                {top.slice(0, 3).map((issue, i) => (
                                  <span key={issue.code} className="text-[8px] font-mono text-gray-600 truncate max-w-[56px]" title={issue.name}>
                                    {issue.code}
                                  </span>
                                ))}
                                {top.length > 3 && <span className="text-[8px] font-mono text-gray-700">+{top.length - 3}</span>}
                              </div>
                            </div>
                          );
                        })()}
                        <div>
                          <div className="text-2xl font-bold text-purple-400 font-mono tracking-tight leading-none">
                            {summary?.uniqueGovEntities || 0}
                          </div>
                          <div className="text-[10px] text-gray-600 mt-1.5 font-mono">
                            {summary?.uniqueIssueAreas || 0} issue areas
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Spend Chart — quarterly + annual toggle */}
            {data.quarters && data.quarters.length > 0 && summary && (
              <SpendBarChart quarters={data.quarters} spendByYear={summary.spendByYear} />
            )}

            {/* Top Issue Areas — Enhanced */}
            {summary && summary.topIssueAreas.length > 0 && (
              <div className="bg-[#0A0A0A] rounded-xl border border-gray-800/80 p-5">
                <h4 className="text-xs font-medium text-gray-400 mb-4 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-purple-400" />
                  Top Issue Areas
                  <span className="ml-auto text-[10px] text-gray-600 font-mono">{summary.topIssueAreas.length} tracked</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {summary.topIssueAreas.slice(0, 8).map((issue, idx) => {
                    const maxIssueSpend = Math.max(...summary.topIssueAreas.slice(0, 8).map(i => i.totalSpend), 1);
                    const pct = (issue.totalSpend / maxIssueSpend) * 100;
                    return (
                      <button
                        key={issue.code}
                        onClick={() => openIssueDrilldown(issue.code, issue.name)}
                        className="flex items-center gap-3 px-3 py-2.5 bg-[#111] rounded-lg border border-gray-800/50 hover:border-purple-500/40 hover:bg-purple-500/[0.04] transition-all relative overflow-hidden group text-left w-full cursor-pointer"
                      >
                        {/* Background fill bar */}
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/[0.04] to-transparent transition-all duration-500" style={{ width: `${pct}%` }} />
                        <span className="relative text-[10px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded font-semibold">
                          {issue.code}
                        </span>
                        <div className="relative flex-1 min-w-0">
                          <div className="text-xs text-white truncate font-medium">{issue.name}</div>
                          <div className="text-[10px] text-gray-600 font-mono">
                            {issue.count} filings &bull; {formatCurrency(issue.totalSpend)}
                          </div>
                        </div>
                        {idx === 0 && (
                          <span className="relative text-[8px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">Top</span>
                        )}
                        <ExternalLink className="relative w-3 h-3 text-gray-700 group-hover:text-purple-400 transition-colors flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Lobbying Firms — Enhanced */}
            {summary && summary.topRegistrants.length > 0 && (
              <div className="bg-[#0A0A0A] rounded-xl border border-gray-800/80 p-5">
                <h4 className="text-xs font-medium text-gray-400 mb-4 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                  Lobbying Firms
                  <span className="ml-auto text-[10px] text-gray-600 font-mono">{summary.topRegistrants.length} firms</span>
                </h4>
                <div className="space-y-1.5">
                  {summary.topRegistrants.slice(0, 8).map((reg, idx) => {
                    const maxRegSpend = Math.max(...summary.topRegistrants.slice(0, 8).map(r => r.totalSpend), 1);
                    const pct = (reg.totalSpend / maxRegSpend) * 100;
                    return (
                      <button
                        key={reg.name}
                        onClick={() => openFirmDrilldown(reg.name)}
                        className="flex items-center gap-3 px-3 py-2.5 bg-[#111] rounded-lg border border-gray-800/50 hover:border-blue-500/40 hover:bg-blue-500/[0.03] transition-all relative overflow-hidden group w-full text-left cursor-pointer"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.03] to-transparent" style={{ width: `${pct}%` }} />
                        <div className="relative w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center text-[10px] font-bold text-blue-400">
                          {idx + 1}
                        </div>
                        <div className="relative flex-1 min-w-0">
                          <div className="text-xs text-white truncate font-medium">{reg.name}</div>
                          <div className="text-[10px] text-gray-600 font-mono">{reg.filingCount} filings</div>
                        </div>
                        <div className="relative text-xs font-mono text-amber-400 font-semibold">
                          {formatCurrency(reg.totalSpend)}
                        </div>
                        <ExternalLink className="relative w-3 h-3 text-gray-700 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Lobbyists — Enhanced */}
            {summary && summary.topLobbyists.length > 0 && (
              <div className="bg-[#0A0A0A] rounded-xl border border-gray-800/80 p-5">
                <h4 className="text-xs font-medium text-gray-400 mb-4 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-green-400" />
                  Active Lobbyists
                  <span className="ml-auto text-[10px] text-gray-600 font-mono">{summary.topLobbyists.length} people</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {summary.topLobbyists.slice(0, 10).map((lobbyist, idx) => (
                    <button
                      key={lobbyist.name}
                      onClick={() => openLobbyistDrilldown(lobbyist.name)}
                      className="flex items-center gap-3 px-3 py-2.5 bg-[#111] rounded-lg border border-gray-800/50 hover:border-green-500/40 hover:bg-green-500/[0.03] transition-all group w-full text-left cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center border border-green-500/20 flex-shrink-0">
                        <span className="text-[10px] font-bold text-green-400">{lobbyist.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white truncate font-medium">{lobbyist.name}</div>
                        {lobbyist.coveredPosition && (
                          <div className="text-[10px] text-gray-600 truncate">{lobbyist.coveredPosition}</div>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono font-semibold bg-gray-800/50 px-2 py-0.5 rounded">
                        {lobbyist.filingCount}
                      </span>
                      <ExternalLink className="w-3 h-3 text-gray-700 group-hover:text-green-400 transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filing Detail Table */}
            {data.activities && data.activities.length > 0 && (
              <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 overflow-hidden flex flex-col">
                {/* Table Header */}
                <div className="border-b border-gray-800 px-4 py-2 flex items-center justify-between">
                  <h4 className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Filing Details ({data.activities.length})
                  </h4>
                </div>
                <div className="border-b border-gray-800">
                  <div className="grid grid-cols-12 gap-4 px-6 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <div className="col-span-2">Registrant</div>
                    <div className="col-span-3">Description / Issues</div>
                    <div className="col-span-2">Lobbyists</div>
                    <div className="col-span-1 text-center">Period</div>
                    <div className="col-span-2 text-right">Amount</div>
                    <div className="col-span-2 text-right">Gov Entities</div>
                  </div>
                </div>

                {/* Table Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[500px]">
                  <div className="divide-y divide-gray-800/50">
                    <AnimatePresence mode="popLayout">
                      {paginatedActivities.map((activity, idx) => (
                        <motion.div
                          key={`${activity.filingUuid}-${idx}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: idx * 0.01 }}
                          className="grid grid-cols-12 gap-4 px-6 py-3 items-center hover:bg-[#222] transition-colors text-sm border-l-2 border-l-transparent hover:border-l-amber-500"
                        >
                          {/* Registrant */}
                          <div className="col-span-2">
                            <div className="font-medium text-white text-xs truncate" title={activity.registrantName}>
                              {activity.registrantName}
                            </div>
                            <div className="text-[10px] text-gray-600 truncate mt-0.5">
                              {activity.clientName}
                            </div>
                          </div>

                          {/* Description / Issues */}
                          <div className="col-span-3">
                            {activity.specificIssues.length > 0 ? (
                              <div className="text-xs text-gray-400 line-clamp-2" title={activity.specificIssues.join('; ')}>
                                {activity.specificIssues[0]}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {activity.issueDescriptions.slice(0, 3).map((desc, i) => (
                                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                                    {desc}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Lobbyists */}
                          <div className="col-span-2">
                            <div className="text-xs text-gray-400">
                              {activity.lobbyistNames.length > 0 ? (
                                <div className="truncate" title={activity.lobbyistNames.join(', ')}>
                                  {activity.lobbyistNames.slice(0, 2).join(', ')}
                                  {activity.lobbyistNames.length > 2 && (
                                    <span className="text-gray-600"> +{activity.lobbyistNames.length - 2}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-600">&mdash;</span>
                              )}
                            </div>
                          </div>

                          {/* Period */}
                          <div className="col-span-1 text-center">
                            <div className="inline-flex flex-col items-center text-[10px] font-mono bg-[#111] px-2 py-1 rounded border border-gray-800/50">
                              <span className="text-gray-300">{activity.filingPeriod}</span>
                              <span className="text-gray-500">{activity.filingYear}</span>
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="col-span-2 text-right">
                            {activity.amount ? (
                              <div className="text-amber-400 font-mono font-medium text-xs">
                                {formatCurrency(activity.amount)}
                              </div>
                            ) : (
                              <span className="text-gray-600 text-xs">&mdash;</span>
                            )}
                            {activity.documentUrl && (
                              <a
                                href={activity.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-gray-600 hover:text-amber-400 transition-colors mt-0.5"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                Filing
                              </a>
                            )}
                          </div>

                          {/* Government Entities */}
                          <div className="col-span-2 text-right">
                            <div className="text-xs text-gray-400">
                              {activity.governmentEntities.length > 0 ? (
                                <div className="truncate" title={activity.governmentEntities.join(', ')}>
                                  {activity.governmentEntities.slice(0, 2).join(', ')}
                                  {activity.governmentEntities.length > 2 && (
                                    <span className="text-gray-600"> +{activity.governmentEntities.length - 2}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-600">&mdash;</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Pagination Footer */}
                {data.activities.length > 0 && (
                  <div className="border-t border-gray-800 bg-[#1A1A1A] p-2 flex justify-between items-center">
                    <div className="text-xs text-gray-500 pl-4">
                      Showing {Math.min((currentPage - 1) * itemsPerPage + 1, data.activities.length)}&ndash;
                      {Math.min(currentPage * itemsPerPage, data.activities.length)} of {data.activities.length}
                    </div>
                    <div className="flex gap-1 pr-2">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <span className="text-xs text-gray-400">First</span>
                      </button>
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="p-1.5 rounded hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage >= totalPages}
                        className="p-1.5 rounded hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <span className="text-xs text-gray-400">Last</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* No data state */}
            {data.activities.length === 0 && data.summary.totalFilings === 0 && (
              <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-12 text-center">
                <Landmark className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Lobbying Data Found</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  No lobbying disclosure filings were found for {ticker} in the US Senate LDA database
                  for the selected time period. Try a different company or expand the time range.
                </p>
              </div>
            )}

            {/* Source attribution */}
            <div className="flex items-center justify-between text-[10px] text-gray-600 px-1">
              <div className="flex items-center gap-2">
                <Shield className="w-3 h-3" />
                <span>
                  OmniFolio Proprietary &bull; OLI Algorithm v1 &bull; Data: US Senate LDA Database (Public)
                </span>
              </div>
              <div className="flex items-center gap-3">
                {data.meta?.cachedAt && (
                  <span>Updated: {new Date(data.meta.cachedAt).toLocaleString()}</span>
                )}
                <span>{data.meta?.source === 'cache' ? 'Cached' : 'Fresh'}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Drilldown Modal ───────────────────────────────── */}
      {drilldown && (
        <DrilldownModal
          title={drilldown.title}
          subtitle={drilldown.subtitle}
          filings={drilldown.filings}
          accentColor={drilldown.accentColor}
          onClose={() => setDrilldown(null)}
        />
      )}
    </div>
  );
}

export default SenateLobbyingView;
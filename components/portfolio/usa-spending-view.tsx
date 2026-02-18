"use client";

/**
 * OmniFolio Proprietary USA Spending View
 *
 * Per-company federal contract/award lookup powered by USAspending.gov.
 * Same UX pattern as SenateLobbyingView.
 *
 * Features:
 *   - Search bar with autocomplete (SEC EDGAR company search)
 *   - Popular contractors grid + recent lookups
 *   - OGI (OmniFolio Government Influence) scoring
 *   - Annual obligation chart
 *   - Agency breakdown
 *   - Award type breakdown
 *   - State distribution
 *   - Award-level detail table with document links
 *
 * 100% proprietary — zero paid third-party APIs.
 * Data Source: USAspending.gov (public, free, no API key)
 * Copyright OmniFolio. All rights reserved.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Search,
  Loader2,
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
  Building2,
  Globe,
  BarChart3,
  AlertCircle,
  Briefcase,
  MapPin,
  Calendar,
  Plane,
  GraduationCap,
  Factory,
  Activity,
  Eye,
  ShieldAlert,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Users,
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
    "from-blue-500 to-blue-700",
    "from-cyan-500 to-cyan-700",
    "from-indigo-500 to-indigo-700",
    "from-emerald-500 to-emerald-700",
    "from-teal-500 to-teal-700",
    "from-purple-500 to-purple-700",
    "from-sky-500 to-sky-700",
    "from-violet-500 to-violet-700",
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

interface SpendingFiscalYear {
  symbol: string;
  year: number;
  ogiScore: number;
  influenceLabel: string;
  totalObligated: number;
  awardCount: number;
  uniqueAgencies: number;
  uniqueSectors: number;
  topAgencies: { name: string; amount: number; count: number }[];
  topSectors: { code: string; name: string; amount: number }[];
  latestActionDate: string | null;
}

interface SpendingActivityItem {
  symbol: string;
  awardId: string;
  actionDate: string;
  fiscalYear: number;
  awardType: string;
  awardDescription: string | null;
  totalObligation: number | null;
  federalActionObligation: number | null;
  totalOutlay: number | null;
  recipientName: string;
  recipientParentName: string | null;
  awardingAgencyName: string;
  awardingSubAgencyName: string | null;
  fundingAgencyName: string | null;
  performanceCity: string | null;
  performanceState: string | null;
  performanceCountry: string;
  performanceStartDate: string | null;
  performanceEndDate: string | null;
  naicsCode: string | null;
  naicsDescription: string | null;
  productServiceCode: string | null;
  permalink: string | null;
}

interface SpendingSummary {
  totalObligated: number;
  totalAwards: number;
  totalFiscalYears: number;
  averagePerYear: number;
  uniqueAgencies: number;
  uniqueSubAgencies: number;
  uniqueSectors: number;
  uniqueStates: number;
  topAgencies: { name: string; awardCount: number; totalObligated: number }[];
  topSubAgencies: { name: string; awardCount: number; totalObligated: number }[];
  topStates: { state: string; awardCount: number; totalObligated: number }[];
  spendByYear: { year: number; obligated: number; awardCount: number }[];
  awardTypeBreakdown: { type: string; count: number; amount: number }[];
}

interface SpendingDataResponse {
  success: boolean;
  symbol: string;
  companyName: string | null;
  currentScore: number;
  currentLabel: string;
  trend: string;
  fiscalYears: SpendingFiscalYear[];
  activities: SpendingActivityItem[];
  summary: SpendingSummary;
  meta: {
    source: string;
    cachedAt: string | null;
    expiresAt: string | null;
    ttlSeconds: number;
    algorithm: string;
    dataSource: string;
  };
}

// ── Popular tickers (top gov contractors) ────────────────────────────
const defaultPopularTickers = [
  { ticker: "LMT", name: "Lockheed Martin Corp." },
  { ticker: "RTX", name: "RTX Corporation" },
  { ticker: "BA", name: "Boeing Company" },
  { ticker: "NOC", name: "Northrop Grumman Corp." },
  { ticker: "GD", name: "General Dynamics Corp." },
  { ticker: "LHX", name: "L3Harris Technologies" },
  { ticker: "LDOS", name: "Leidos Holdings" },
  { ticker: "SAIC", name: "SAIC" },
  { ticker: "BAH", name: "Booz Allen Hamilton" },
  { ticker: "PLTR", name: "Palantir Technologies" },
  { ticker: "MSFT", name: "Microsoft Corp." },
  { ticker: "AMZN", name: "Amazon.com Inc." },
];

// ── Helpers ──────────────────────────────────────────────────────────

const formatCurrency = (value: number) => {
  if (!value) return "$0";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return "text-red-400";
  if (score >= 60) return "text-orange-400";
  if (score >= 40) return "text-cyan-400";
  if (score >= 20) return "text-blue-400";
  return "text-gray-400";
};

const getScoreColorHex = (score: number): string => {
  if (score >= 80) return "#f87171";
  if (score >= 60) return "#fb923c";
  if (score >= 40) return "#22d3ee";
  if (score >= 20) return "#60a5fa";
  return "#9ca3af";
};

const getOGIScoreStyle = (score: number) => {
  if (score >= 80) return { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", fill: "#f87171" };
  if (score >= 60) return { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", fill: "#fb923c" };
  if (score >= 40) return { text: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20", fill: "#22d3ee" };
  if (score >= 20) return { text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", fill: "#60a5fa" };
  return { text: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/20", fill: "#9ca3af" };
};

const getSignalInfo = (score: number, trend: string): { signal: string; icon: React.ReactNode; color: string; bgColor: string; borderColor: string; description: string } => {
  if (score >= 80 && trend === "increasing") return { signal: "HEAVY CONTRACTOR", icon: <ShieldAlert className="w-3.5 h-3.5" />, color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/30", description: "Surging federal contracts — significant government dependency" };
  if (score >= 80) return { signal: "MAJOR CONTRACTOR", icon: <Zap className="w-3.5 h-3.5" />, color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/30", description: "Very high federal contract volume — monitor for budget risk" };
  if (score >= 60) return { signal: "ELEVATED", icon: <Eye className="w-3.5 h-3.5" />, color: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30", description: "Above-average federal contracting — notable government presence" };
  if (score >= 40) return { signal: "MODERATE", icon: <Activity className="w-3.5 h-3.5" />, color: "text-cyan-400", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/30", description: "Moderate federal contract activity — standard for sector" };
  if (score >= 20) return { signal: "LOW", icon: <Minus className="w-3.5 h-3.5" />, color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30", description: "Minimal federal contracting engagement" };
  return { signal: "NEGLIGIBLE", icon: <Minus className="w-3.5 h-3.5" />, color: "text-gray-400", bgColor: "bg-gray-500/10", borderColor: "border-gray-500/30", description: "Little to no federal contract activity detected" };
};

const getTrendIcon = (trend: string) => {
  if (trend === "increasing") return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (trend === "decreasing") return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-gray-400" />;
};

const getAgencyIcon = (agencyName: string) => {
  const lowerName = agencyName?.toLowerCase() || '';
  if (lowerName.includes('defense') || lowerName.includes('army') || lowerName.includes('navy') || lowerName.includes('air force'))
    return <Shield className="w-3.5 h-3.5 text-red-400" />;
  if (lowerName.includes('nasa') || lowerName.includes('aerospace'))
    return <Plane className="w-3.5 h-3.5 text-blue-400" />;
  if (lowerName.includes('education'))
    return <GraduationCap className="w-3.5 h-3.5 text-green-400" />;
  if (lowerName.includes('health') || lowerName.includes('hhs'))
    return <Factory className="w-3.5 h-3.5 text-pink-400" />;
  if (lowerName.includes('energy'))
    return <BarChart3 className="w-3.5 h-3.5 text-amber-400" />;
  return <Building2 className="w-3.5 h-3.5 text-gray-400" />;
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "\u2014";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
};

// ── OGI Score Gauge — needle style matching Senate Lobbying ─────────
const OGIScoreGauge = ({ score, label, trend, fiscalYears }: { score: number; label: string; trend: string; fiscalYears?: SpendingFiscalYear[] }) => {
  const styles = getOGIScoreStyle(score);
  const rotation = -90 + (score / 100) * 180;

  const sparkData = useMemo(() => {
    if (!fiscalYears || fiscalYears.length === 0) return [];
    return fiscalYears
      .filter(fy => fy.awardCount > 0)
      .sort((a, b) => a.year - b.year)
      .slice(-6)
      .map(fy => fy.ogiScore);
  }, [fiscalYears]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-28 mb-2">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          {/* Background Track */}
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#262626" strokeWidth="12" strokeLinecap="round" />

          {/* Segments */}
          <path d="M 20 100 A 80 80 0 0 1 50 38" fill="none" stroke="#9ca3af" strokeWidth="3" strokeOpacity="0.3" />
          <path d="M 50 38 A 80 80 0 0 1 80 22" fill="none" stroke="#60a5fa" strokeWidth="3" strokeOpacity="0.3" />
          <path d="M 80 22 A 80 80 0 0 1 120 22" fill="none" stroke="#22d3ee" strokeWidth="3" strokeOpacity="0.3" />
          <path d="M 120 22 A 80 80 0 0 1 150 38" fill="none" stroke="#fb923c" strokeWidth="3" strokeOpacity="0.3" />
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
              <linearGradient id="ogiSpark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={styles.fill} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={styles.fill} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={styles.fill}
              strokeWidth={1.5}
              fill="url(#ogiSpark)"
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
const FiscalYearXTick = ({
  x, y, payload,
}: any) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0} y={0} dy={13}
        textAnchor="middle"
        fill="#888"
        fontSize={12}
        fontWeight={600}
      >
        {payload.value}
      </text>
    </g>
  );
};

// ── Annual tooltip — defined OUTSIDE ──
const AnnualSpendTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-[#0e0e0e] border border-gray-700/70 rounded-xl p-3 shadow-2xl min-w-[148px] pointer-events-none">
      <div className="text-xs font-semibold text-white mb-2">{d?.name}</div>
      <div className="space-y-1.5">
        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-gray-400">Total Obligated</span>
          <span className="font-mono font-bold text-cyan-400">{formatCurrency(d?.spend || 0)}</span>
        </div>
        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-gray-400">OGI Score</span>
          <span className={cn("font-mono font-bold", getScoreColor(d?.ogi || 0))}>{d?.ogi?.toFixed(0)}</span>
        </div>
        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-gray-400">Awards</span>
          <span className="font-mono text-gray-300">{d?.awards}</span>
        </div>
        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-gray-400">Agencies</span>
          <span className="font-mono text-gray-300">{d?.agencies}</span>
        </div>
        {d?.yoy !== null && d?.yoy !== undefined && (
          <div className="flex justify-between gap-6 text-[11px]">
            <span className="text-gray-400">YoY</span>
            <span className={cn("font-mono font-bold", d.yoy > 0 ? "text-emerald-400" : "text-red-400")}>
              {d.yoy > 0 ? "+" : ""}{d.yoy.toFixed(1)}%
            </span>
          </div>
        )}
        {d?.isSpikeYear && (
          <div className="flex items-center gap-1 text-[10px] text-orange-400 pt-1 border-t border-gray-800">
            <Zap className="w-3 h-3" />
            <span>Obligation spike</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Custom bar shape ──────────────────────────────────────────────────
const SpendBarShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!width || !height || height <= 0) return null;
  const fill = payload?.fillColor || 'url(#spendGradFY)';
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
const YAXIS_TICK_DEFAULT = { fontSize: 10, fill: '#525252' } as const;
const YAXIS_TICK_OGI = { fontSize: 10, fill: '#22d3ee', fillOpacity: 0.55 } as const;
const OGI_DOMAIN: [number, number] = [0, 100];
const LINE_DOT = { r: 2.5, fill: '#1A1A1A', stroke: '#22d3ee', strokeWidth: 1.5 } as const;
const LINE_ACTIVE_DOT = { r: 4, fill: '#22d3ee', stroke: '#1A1A1A', strokeWidth: 2 } as const;
const CHART_MARGIN = { top: 8, right: 32, left: 8, bottom: 8 };
const fiscalYearXTickElement = <FiscalYearXTick />;
const spendBarShapeElement = <SpendBarShape />;
const annualSpendTooltipElement = <AnnualSpendTooltip />;

// ── Annual Spend Bar Chart — recharts ComposedChart with OGI line ─────
const AnnualSpendChart = ({ fiscalYears }: { fiscalYears: SpendingFiscalYear[] }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartSize = useContainerSize(chartRef);

  const activeYears = useMemo(() =>
    fiscalYears
      .filter(fy => fy.awardCount > 0)
      .sort((a, b) => a.year - b.year),
    [fiscalYears]
  );

  const chartData = useMemo(() => {
    return activeYears.map((fy, i, arr) => {
      const prev = i > 0 ? arr[i - 1].totalObligated : null;
      const yoy = prev && prev > 0 ? ((fy.totalObligated - prev) / prev) * 100 : null;
      return {
        name: `FY${String(fy.year).slice(-2)}`,
        year: fy.year,
        spend: fy.totalObligated,
        ogi: fy.ogiScore,
        awards: fy.awardCount,
        agencies: fy.uniqueAgencies,
        yoy,
      };
    });
  }, [activeYears]);

  const spikeThreshold = useMemo(() => {
    const avg = chartData.reduce((s, d) => s + d.spend, 0) / (chartData.length || 1);
    return avg * 1.5;
  }, [chartData]);

  const chartDataWithFill = useMemo(() => chartData.map(d => ({
    ...d,
    isSpikeYear: d.spend > spikeThreshold,
    fillColor: d.spend > spikeThreshold ? 'url(#spendGradSpikeFY)' : 'url(#spendGradFY)',
  })), [chartData, spikeThreshold]);

  const yoyBadge = useMemo(() => {
    if (chartData.length >= 2) {
      const last = chartData[chartData.length - 1];
      const prev = chartData[chartData.length - 2];
      const change = prev.spend > 0 ? ((last.spend - prev.spend) / prev.spend) * 100 : 0;
      return { change };
    }
    return null;
  }, [chartData]);

  if (activeYears.length === 0) return null;

  const chartHeight = 240;

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Federal Obligations
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">Annual federal contract obligations with OGI influence score</p>
        </div>
        <div className="flex items-center gap-3">
          {yoyBadge && (
            <div className={cn("flex items-center gap-1 text-[10px] font-mono font-bold", yoyBadge.change > 0 ? "text-emerald-400" : yoyBadge.change < 0 ? "text-red-400" : "text-gray-400")}>
              {yoyBadge.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {yoyBadge.change > 0 ? "+" : ""}{yoyBadge.change.toFixed(1)}% YoY
            </div>
          )}
          {/* Legend */}
          <div className="flex items-center gap-3 text-[10px] text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-cyan-500/60" />
              <span>Obligated</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-[2px] bg-cyan-400/80 rounded-full" />
              <span>OGI</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div ref={chartRef} className="w-full" style={{ height: chartHeight }}>
        {chartSize.width > 0 && (
          <ComposedChart
            width={chartSize.width}
            height={chartHeight}
            data={chartDataWithFill}
            margin={CHART_MARGIN}
            barCategoryGap="32%"
          >
            <defs>
              <linearGradient id="spendGradFY" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.15} />
              </linearGradient>
              <linearGradient id="spendGradSpikeFY" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.85} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="name"
              tick={fiscalYearXTickElement}
              axisLine={false}
              tickLine={false}
              interval={0}
              height={28}
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
              yAxisId="ogi"
              orientation="right"
              domain={OGI_DOMAIN}
              tick={YAXIS_TICK_OGI}
              axisLine={false}
              tickLine={false}
              tickCount={5}
              width={30}
            />
            <RechartsTooltip
              content={annualSpendTooltipElement}
              cursor={CURSOR_STYLE}
              isAnimationActive={false}
            />
            <Bar
              yAxisId="spend"
              dataKey="spend"
              maxBarSize={80}
              isAnimationActive={false}
              shape={spendBarShapeElement}
            />
            <Line
              yAxisId="ogi"
              type="monotone"
              dataKey="ogi"
              stroke="#22d3ee"
              strokeWidth={2}
              dot={LINE_DOT}
              activeDot={LINE_ACTIVE_DOT}
              isAnimationActive={false}
            />
          </ComposedChart>
        )}
      </div>

      {/* Spike annotation */}
      {chartDataWithFill.some(d => d.isSpikeYear) && (
        <div className="flex items-center gap-2 mt-3 px-3 py-1.5 bg-orange-500/5 border border-orange-500/10 rounded-lg">
          <Zap className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
          <span className="text-[10px] text-orange-400/80">
            Spike years (orange) exceed {formatCurrency(Math.round(spikeThreshold))} — 1.5× annual avg
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
  awards: SpendingActivityItem[];
  accentColor: string;
  onClose: () => void;
}

const DrilldownModal = ({ title, subtitle, awards, accentColor, onClose }: DrilldownModalProps) => {
  const totalObligation = awards.reduce((s, a) => s + (a.totalObligation || 0), 0);
  const uniqueRecipients = new Set(awards.map(a => a.recipientName)).size;
  const uniqueStates = new Set(awards.map(a => a.performanceState).filter(Boolean)).size;

  const sorted = [...awards].sort((a, b) => (b.totalObligation || 0) - (a.totalObligation || 0));

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

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
              <div className="text-lg font-bold font-mono text-cyan-400">{formatCurrency(totalObligation)}</div>
              <div className="text-[10px] text-gray-600">obligated</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-white">{awards.length}</div>
              <div className="text-[10px] text-gray-600">awards</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-blue-400">{uniqueRecipients}</div>
              <div className="text-[10px] text-gray-600">recipients</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-purple-400">{uniqueStates}</div>
              <div className="text-[10px] text-gray-600">states</div>
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
          <div className="col-span-1">FY</div>
          <div className="col-span-3">Recipient</div>
          <div className="col-span-3">Description</div>
          <div className="col-span-2">Performance</div>
          <div className="col-span-1 text-right">Obligation</div>
          <div className="col-span-1 text-center">Link</div>
        </div>

        {/* Scrollable rows */}
        <div className="overflow-y-auto flex-1 custom-scrollbar divide-y divide-gray-800/40">
          {sorted.map((a, i) => (
            <div
              key={`${a.awardId}-${i}`}
              className="grid grid-cols-12 gap-3 px-6 py-3 items-start hover:bg-white/[0.02] transition-colors text-xs group"
            >
              {/* Date */}
              <div className="col-span-1">
                <span className="text-gray-500 font-mono text-[10px]">
                  {a.actionDate ? new Date(a.actionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                </span>
              </div>
              {/* FY */}
              <div className="col-span-1">
                <span className="text-[10px] font-mono text-gray-300">FY{a.fiscalYear}</span>
              </div>
              {/* Recipient */}
              <div className="col-span-3">
                <div className="text-[11px] font-medium text-white truncate" title={a.recipientName}>{a.recipientName}</div>
                {a.recipientParentName && a.recipientParentName !== a.recipientName && (
                  <div className="text-[10px] text-gray-600 truncate" title={a.recipientParentName}>{a.recipientParentName}</div>
                )}
              </div>
              {/* Description */}
              <div className="col-span-3">
                <p className="text-[10px] text-gray-400 line-clamp-3 leading-relaxed" title={a.awardDescription || ''}>
                  {a.awardDescription || '—'}
                </p>
                <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-gray-800/60 text-gray-500 mt-0.5 capitalize">
                  {a.awardType}
                </span>
              </div>
              {/* Performance */}
              <div className="col-span-2">
                {a.performanceState && (
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <MapPin className="w-2.5 h-2.5 text-gray-600" />
                    {a.performanceState}
                    {a.performanceCity && <span className="text-gray-600">, {a.performanceCity}</span>}
                  </div>
                )}
                {a.performanceStartDate && a.performanceEndDate && (
                  <div className="text-[9px] text-gray-600 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-2.5 h-2.5" />
                    {formatDate(a.performanceStartDate)} – {formatDate(a.performanceEndDate)}
                  </div>
                )}
              </div>
              {/* Obligation */}
              <div className="col-span-1 text-right">
                {a.totalObligation ? (
                  <span className="font-mono font-semibold text-cyan-400 text-[11px]">{formatCurrency(a.totalObligation)}</span>
                ) : (
                  <span className="text-gray-700 text-[10px]">—</span>
                )}
              </div>
              {/* Permalink */}
              <div className="col-span-1 flex justify-center">
                {a.permalink ? (
                  <a
                    href={a.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-colors text-[9px] font-semibold"
                    title="Open award on USAspending.gov"
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
            USAspending.gov · Public federal records
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
const CLIENT_CACHE_KEY = "omnifolio_usa_spending_prop_cache";
const CLIENT_CACHE_TTL_MS = 20 * 60 * 1000; // 20 min

interface ClientCacheEntry {
  data: SpendingDataResponse;
  storedAt: number;
}

function getClientCache(ticker: string, years: number): SpendingDataResponse | null {
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

function setClientCache(ticker: string, years: number, data: SpendingDataResponse): void {
  try {
    const entry: ClientCacheEntry = { data, storedAt: Date.now() };
    sessionStorage.setItem(`${CLIENT_CACHE_KEY}:${ticker}:${years}`, JSON.stringify(entry));
  } catch { /* sessionStorage full or unavailable */ }
}

// ── Skeleton Loader ──────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4 animate-pulse">
    <div className="h-2.5 bg-gray-800 rounded w-20 mb-3" />
    <div className="h-5 bg-gray-800 rounded w-24 mb-1" />
    <div className="h-2 bg-gray-800/50 rounded w-16" />
  </div>
);

const SkeletonGauge = () => (
  <div className="md:col-span-1 bg-[#0D0D0D] rounded-xl border border-gray-800 p-4 flex flex-col items-center justify-center animate-pulse">
    <div className="h-2.5 bg-gray-800 rounded w-14 mb-3" />
    <div className="w-24 h-24 rounded-full border-4 border-gray-800" />
    <div className="h-2 bg-gray-800/50 rounded w-16 mt-3" />
  </div>
);

const LoadingSkeleton = () => (
  <div className="space-y-6 animate-in fade-in duration-300">
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <SkeletonGauge />
      <div className="md:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
    <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4 animate-pulse">
      <div className="h-2.5 bg-gray-800 rounded w-28 mb-3" />
      <div className="flex items-end gap-2 h-28">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-1 bg-gray-800 rounded-t" style={{ height: `${20 + Math.random() * 60}%` }} />
        ))}
      </div>
    </div>
  </div>
);

// ── Main Component ───────────────────────────────────────────────────
export function USASpendingView() {
  const [ticker, setTicker] = useState("LMT");
  const [companyName, setCompanyName] = useState("Lockheed Martin Corp.");
  const [searchInput, setSearchInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [data, setData] = useState<SpendingDataResponse | null>(null);

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
      const stored = localStorage.getItem("usa-spending-prop-recent");
      if (stored) setRecentTickers(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Save recent ticker
  const addRecentTicker = useCallback((t: string, name: string) => {
    setRecentTickers((prev) => {
      const filtered = prev.filter((item) => item.ticker !== t);
      const updated = [{ ticker: t, name }, ...filtered].slice(0, 8);
      try {
        localStorage.setItem("usa-spending-prop-recent", JSON.stringify(updated));
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

  // Fetch spending data with client-side cache
  const fetchSpendingData = useCallback(
    async (tickerToFetch: string, years: number, forceRefresh = false) => {
      if (!forceRefresh) {
        const cached = getClientCache(tickerToFetch.toUpperCase(), years);
        if (cached) {
          console.log(`[USASpendingView] Client cache hit for ${tickerToFetch}`);
          setData(cached);
          if (cached.companyName) setCompanyName(cached.companyName);
          setIsLoading(false);
          setError(null);
          return;
        }
      }

      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          symbol: tickerToFetch,
          years: String(years),
        });
        if (forceRefresh) params.set("refresh", "true");

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 55000);

        const response = await fetch(`/api/usa-spending?${params}`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to fetch data (${response.status})`);
        }
        const result: SpendingDataResponse = await response.json();
        setData(result);
        if (result.companyName) setCompanyName(result.companyName);
        setClientCache(tickerToFetch.toUpperCase(), years, result);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setError("USAspending.gov is slow to respond. First-time lookups may take a moment \u2014 please try again.");
        } else {
          const message = err instanceof Error ? err.message : "An error occurred";
          console.error("[USASpendingView]", err);
          setError(message);
        }
        setData((prev) => prev ?? null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Fetch on mount and when ticker/years change
  useEffect(() => {
    fetchSpendingData(ticker, yearsFilter);
  }, [ticker, yearsFilter, fetchSpendingData]);

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
    awards: SpendingActivityItem[];
    accentColor: string;
  } | null>(null);

  const openAgencyDrilldown = useCallback((agencyName: string) => {
    if (!data?.activities) return;
    const awards = data.activities.filter(a => a.awardingAgencyName === agencyName);
    setDrilldown({
      title: agencyName,
      subtitle: `${awards.length} awards from this agency`,
      awards,
      accentColor: 'text-blue-400',
    });
  }, [data?.activities]);

  const openSubAgencyDrilldown = useCallback((subAgencyName: string) => {
    if (!data?.activities) return;
    const awards = data.activities.filter(a => a.awardingSubAgencyName === subAgencyName);
    setDrilldown({
      title: subAgencyName,
      subtitle: `${awards.length} awards from this sub-agency`,
      awards,
      accentColor: 'text-cyan-400',
    });
  }, [data?.activities]);

  const openAwardTypeDrilldown = useCallback((awardType: string) => {
    if (!data?.activities) return;
    const awards = data.activities.filter(a => a.awardType === awardType);
    setDrilldown({
      title: awardType,
      subtitle: `${awards.length} awards of this type`,
      awards,
      accentColor: 'text-emerald-400',
    });
  }, [data?.activities]);

  const openStateDrilldown = useCallback((state: string) => {
    if (!data?.activities) return;
    const awards = data.activities.filter(a => a.performanceState === state);
    setDrilldown({
      title: `Performance: ${state}`,
      subtitle: `${awards.length} awards performed in ${state}`,
      awards,
      accentColor: 'text-purple-400',
    });
  }, [data?.activities]);

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-cyan-500" />
            USA Government Spending
          </h2>
          <div className="flex gap-3 text-sm mt-1 text-gray-400">
            Federal contract &amp; award data with influence scoring
            <span className="text-[10px] text-gray-600 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Proprietary &bull; USAspending.gov
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar with Autocomplete */}
      <div ref={searchRef} className="relative z-50">
        <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-3">
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
                placeholder="Search by ticker or contractor name..."
                className="w-full pl-10 pr-8 py-2 bg-transparent border-none text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-0"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => { setSearchInput(""); setSearchResults([]); setShowDropdown(false); }}
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
                  : "bg-cyan-600/10 text-cyan-400 border border-cyan-600/20 hover:bg-cyan-600/20"
              )}
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Loading</span></>
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
                    index === highlightedIndex ? "bg-cyan-500/20" : "hover:bg-[#212121]"
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

      {/* Popular Contractors Grid */}
      <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Top Government Contractors
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
                  ? "bg-cyan-500/10 border border-cyan-500/30 ring-1 ring-cyan-500/20"
                  : "bg-[#141414] border border-gray-800/50 hover:border-gray-700 hover:bg-[#1A1A1A]"
              )}
            >
              <CompanyIcon ticker={item.ticker} className="h-7 w-7 flex-shrink-0" />
              <div className="min-w-0">
                <div className={cn("text-xs font-semibold truncate", ticker === item.ticker ? "text-cyan-400" : "text-white group-hover:text-white")}>
                  {item.ticker}
                </div>
                <div className="text-[10px] text-gray-500 truncate">{item.name}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Lookups */}
      {recentTickers.length > 0 && (
        <div className="bg-[#0D0D0D] rounded-xl border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              Recent Lookups
            </h3>
            <span className="text-[10px] text-gray-600">{recentTickers.length} contractors</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentTickers.map((item, index) => (
              <button
                key={`${item.ticker}-${index}`}
                onClick={() => selectCompany(item.ticker, item.name)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 group",
                  ticker === item.ticker
                    ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400"
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

      {/* Content Area */}
      <div className="flex-1 overflow-auto space-y-6 pr-2 custom-scrollbar">
        {/* Company Header */}
        <div className="flex items-center gap-4 py-2 animate-in fade-in duration-500">
          <CompanyIcon ticker={ticker} className="h-14 w-14" />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              {ticker}
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-900/30 text-cyan-400 border border-cyan-800/50">
                USAspending.gov
              </span>
            </h3>
            <p className="text-sm text-gray-400">{companyName}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3 text-gray-600" />
              Federal Contracts &amp; Awards
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
                    yearsFilter === y ? "bg-cyan-600/15 text-cyan-400" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  {y}y
                </button>
              ))}
            </div>
            <button
              onClick={() => fetchSpendingData(ticker, yearsFilter, true)}
              disabled={isLoading}
              className="p-2.5 rounded-lg bg-[#212121] hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 border border-gray-800 hover:border-gray-700"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && !data && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/5 border border-cyan-500/10 rounded-lg text-xs text-cyan-400/80">
              <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
              <span>
                Fetching federal contract data from USAspending.gov...
                First lookups may take up to 30 seconds while data is cached.
              </span>
            </div>
            <LoadingSkeleton />
          </div>
        )}

        {isLoading && data && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/5 border border-cyan-500/10 rounded-lg text-[11px] text-cyan-400/70">
            <Loader2 className="w-3 h-3 animate-spin" />
            Refreshing from USAspending.gov...
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white mb-2">Failed to Load Data</h3>
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => fetchSpendingData(ticker, yearsFilter, true)}
              className="mt-4 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm hover:bg-red-500/20 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main Content */}
        {data && !error && (
          <>
            {/* OGI Score + Signal Banner + Summary Cards — unified panel */}
            {(() => {
              const sig = getSignalInfo(data.currentScore, data.trend);
              const scoreStyle = getOGIScoreStyle(data.currentScore);
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

                  {/* Bottom: OGI Gauge + 4 stat cards side-by-side */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-800/60">
                    {/* OGI Gauge */}
                    <div className="lg:col-span-3 flex flex-col items-center justify-center py-6 px-4 relative overflow-hidden">
                      <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                      <div className="relative z-10 flex flex-col items-center w-full">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-3 font-medium">OGI Score</span>
                        <OGIScoreGauge score={data.currentScore} label={data.currentLabel} trend={data.trend} fiscalYears={data.fiscalYears} />
                      </div>
                    </div>

                    {/* 4 Stat Cards */}
                    <div className="lg:col-span-9 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-800/60">

                      {/* ── Total Obligated — year-over-year bar sparkline ── */}
                      <div className="group flex flex-col justify-between p-5 hover:bg-white/[0.015] transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Total Obligated</span>
                          <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/10 flex items-center justify-center">
                            <DollarSign className="w-3 h-3 text-cyan-400" />
                          </div>
                        </div>
                        {/* Mini bar sparkline — annual obligations */}
                        {summary && summary.spendByYear.length > 0 && (() => {
                          const years = [...summary.spendByYear].sort((a, b) => a.year - b.year).slice(-5);
                          const max = Math.max(...years.map(y => Math.abs(y.obligated)), 1);
                          return (
                            <div className="flex items-end gap-[3px] h-8 mb-2.5">
                              {years.map((y, i) => {
                                const h = Math.max(2, Math.round((Math.abs(y.obligated) / max) * 28));
                                const isLast = i === years.length - 1;
                                return (
                                  <div key={y.year} className="flex-1 flex flex-col items-center gap-0.5" title={`FY${y.year}: ${formatCurrency(y.obligated)}`}>
                                    <div
                                      className={cn("w-full rounded-sm transition-all", isLast ? "bg-cyan-400" : "bg-cyan-400/25")}
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
                          <div className="text-2xl font-bold text-cyan-400 font-mono tracking-tight leading-none">
                            {formatCurrency(summary?.totalObligated || 0)}
                          </div>
                          <div className="text-[10px] text-gray-600 mt-1.5 font-mono">
                            {formatCurrency(summary?.averagePerYear || 0)} / yr avg
                          </div>
                        </div>
                      </div>

                      {/* ── Total Awards — fiscal year activity dot grid ── */}
                      <div className="group flex flex-col justify-between p-5 hover:bg-white/[0.015] transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Awards</span>
                          <div className="w-6 h-6 rounded-lg bg-white/5 border border-gray-700/30 flex items-center justify-center">
                            <FileText className="w-3 h-3 text-gray-400" />
                          </div>
                        </div>
                        {/* FY dot grid */}
                        {data.fiscalYears && data.fiscalYears.length > 0 && (() => {
                          const sorted = [...data.fiscalYears].sort((a, b) => a.year - b.year).slice(-20);
                          return (
                            <div className="flex flex-wrap gap-[3px] mb-2.5">
                              {sorted.map((fy, i) => (
                                <div
                                  key={i}
                                  title={`FY${fy.year}: ${fy.awardCount} awards`}
                                  className={cn(
                                    "w-2.5 h-2.5 rounded-sm",
                                    fy.awardCount > 100 ? "bg-white/70" :
                                    fy.awardCount > 30  ? "bg-white/35" :
                                    fy.awardCount > 0   ? "bg-white/15" :
                                                          "bg-white/[0.04]"
                                  )}
                                />
                              ))}
                            </div>
                          );
                        })()}
                        <div>
                          <div className="text-2xl font-bold text-white font-mono tracking-tight leading-none">
                            {summary?.totalAwards || 0}
                          </div>
                          <div className="text-[10px] text-gray-600 mt-1.5 font-mono">
                            {summary?.totalFiscalYears || 0} fiscal years
                          </div>
                        </div>
                      </div>

                      {/* ── Agencies — agency vs sub-agency ratio bar ── */}
                      <div className="group flex flex-col justify-between p-5 hover:bg-white/[0.015] transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Agencies</span>
                          <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/10 flex items-center justify-center">
                            <Building2 className="w-3 h-3 text-blue-400" />
                          </div>
                        </div>
                        {summary && summary.uniqueAgencies > 0 && summary.uniqueSubAgencies > 0 && (() => {
                          const agencies = summary.uniqueAgencies;
                          const subAgencies = summary.uniqueSubAgencies;
                          const total = agencies + subAgencies;
                          const agencyPct = Math.round((agencies / total) * 100);
                          return (
                            <div className="mb-2.5 space-y-1.5">
                              <div className="flex h-2 rounded-full overflow-hidden gap-px">
                                <div className="bg-blue-500/60 rounded-l-full" style={{ width: `${agencyPct}%` }} title={`${agencies} agencies`} />
                                <div className="bg-sky-400/40 rounded-r-full flex-1" title={`${subAgencies} sub-agencies`} />
                              </div>
                              <div className="flex items-center justify-between text-[9px] font-mono text-gray-600">
                                <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500/60" />{agencies} agencies</span>
                                <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-400/40" />{subAgencies} sub</span>
                              </div>
                            </div>
                          );
                        })()}
                        <div>
                          <div className="text-2xl font-bold text-blue-400 font-mono tracking-tight leading-none">
                            {summary?.uniqueAgencies || 0}
                          </div>
                          <div className="text-[10px] text-gray-600 mt-1.5 font-mono">
                            {summary?.uniqueSubAgencies || 0} sub-agencies
                          </div>
                        </div>
                      </div>

                      {/* ── States — award type segmented bar ── */}
                      <div className="group flex flex-col justify-between p-5 hover:bg-white/[0.015] transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Reach</span>
                          <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/10 flex items-center justify-center">
                            <Globe className="w-3 h-3 text-purple-400" />
                          </div>
                        </div>
                        {summary && summary.awardTypeBreakdown.length > 0 && (() => {
                          const top = summary.awardTypeBreakdown.slice(0, 5);
                          const totalCount = top.reduce((s, t) => s + t.count, 0) || 1;
                          const colors = ["bg-purple-400/70", "bg-purple-400/45", "bg-violet-400/40", "bg-fuchsia-400/35", "bg-gray-500/25"];
                          return (
                            <div className="mb-2.5 space-y-1.5">
                              <div className="flex h-2 rounded-full overflow-hidden gap-px">
                                {top.map((t, i) => (
                                  <div
                                    key={t.type}
                                    className={cn("rounded-sm first:rounded-l-full last:rounded-r-full", colors[i])}
                                    style={{ width: `${(t.count / totalCount) * 100}%` }}
                                    title={`${t.type}: ${t.count} awards`}
                                  />
                                ))}
                              </div>
                              <div className="flex items-center gap-1 flex-wrap">
                                {top.slice(0, 3).map((t) => (
                                  <span key={t.type} className="text-[8px] font-mono text-gray-600 truncate max-w-[56px] capitalize" title={t.type}>
                                    {t.type}
                                  </span>
                                ))}
                                {top.length > 3 && <span className="text-[8px] font-mono text-gray-700">+{top.length - 3}</span>}
                              </div>
                            </div>
                          );
                        })()}
                        <div>
                          <div className="text-2xl font-bold text-purple-400 font-mono tracking-tight leading-none">
                            {summary?.uniqueStates || 0}
                          </div>
                          <div className="text-[10px] text-gray-600 mt-1.5 font-mono">
                            {summary?.uniqueSectors || 0} NAICS sectors
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Annual Spend Chart */}
            {data.fiscalYears && data.fiscalYears.length > 0 && (
              <AnnualSpendChart fiscalYears={data.fiscalYears} />
            )}

            {/* Year-by-Year Spend */}
            {summary && summary.spendByYear.length > 0 && (
              <div className="bg-[#0A0A0A] rounded-xl border border-gray-800/80 p-5">
                <h4 className="text-xs font-medium text-gray-400 mb-3">Fiscal Year Breakdown</h4>
                <div className="space-y-2">
                  {summary.spendByYear.map((yearData) => {
                    const maxYearSpend = Math.max(...summary.spendByYear.map(y => Math.abs(y.obligated)), 1);
                    const pct = (Math.abs(yearData.obligated) / maxYearSpend) * 100;
                    return (
                      <div key={yearData.year} className="flex items-center gap-3">
                        <span className="text-xs font-mono text-gray-400 w-12">FY{yearData.year}</span>
                        <div className="flex-1 bg-gray-800/50 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-cyan-400 w-20 text-right">
                          {formatCurrency(yearData.obligated)}
                        </span>
                        <span className="text-[10px] text-gray-600 w-16 text-right">
                          {yearData.awardCount} awards
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Agencies — Enhanced with drilldown */}
            {summary && summary.topAgencies.length > 0 && (
              <div className="bg-[#0A0A0A] rounded-xl border border-gray-800/80 p-5">
                <h4 className="text-xs font-medium text-gray-400 mb-4 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  Top Awarding Agencies
                  <span className="ml-auto text-[10px] text-gray-600 font-mono">{summary.topAgencies.length} tracked</span>
                </h4>
                <div className="space-y-1.5">
                  {summary.topAgencies.slice(0, 8).map((agency, idx) => {
                    const maxAgencyAmt = Math.max(...summary.topAgencies.slice(0, 8).map(a => a.totalObligated), 1);
                    const pct = (agency.totalObligated / maxAgencyAmt) * 100;
                    return (
                      <button
                        key={agency.name}
                        onClick={() => openAgencyDrilldown(agency.name)}
                        className="flex items-center gap-3 px-3 py-2.5 bg-[#111] rounded-lg border border-gray-800/50 hover:border-blue-500/40 hover:bg-blue-500/[0.03] transition-all relative overflow-hidden group w-full text-left cursor-pointer"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.03] to-transparent" style={{ width: `${pct}%` }} />
                        <div className="relative w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                          {getAgencyIcon(agency.name)}
                        </div>
                        <div className="relative flex-1 min-w-0">
                          <div className="text-xs text-white truncate font-medium" title={agency.name}>{agency.name}</div>
                          <div className="text-[10px] text-gray-600 font-mono">{agency.awardCount} awards</div>
                        </div>
                        <div className="relative text-xs font-mono text-cyan-400 font-semibold">
                          {formatCurrency(agency.totalObligated)}
                        </div>
                        <ExternalLink className="relative w-3 h-3 text-gray-700 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Award Type Breakdown — Enhanced with drilldown */}
            {summary && summary.awardTypeBreakdown.length > 0 && (
              <div className="bg-[#0A0A0A] rounded-xl border border-gray-800/80 p-5">
                <h4 className="text-xs font-medium text-gray-400 mb-4 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                  Award Type Breakdown
                  <span className="ml-auto text-[10px] text-gray-600 font-mono">{summary.awardTypeBreakdown.length} types</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {summary.awardTypeBreakdown.map((type, idx) => {
                    const maxTypeAmt = Math.max(...summary.awardTypeBreakdown.map(t => t.amount), 1);
                    const pct = (type.amount / maxTypeAmt) * 100;
                    return (
                      <button
                        key={type.type}
                        onClick={() => openAwardTypeDrilldown(type.type)}
                        className="flex items-center gap-3 px-3 py-2.5 bg-[#111] rounded-lg border border-gray-800/50 hover:border-emerald-500/40 hover:bg-emerald-500/[0.04] transition-all relative overflow-hidden group text-left w-full cursor-pointer"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/[0.04] to-transparent transition-all duration-500" style={{ width: `${pct}%` }} />
                        <span className="relative text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-semibold capitalize">
                          {type.type}
                        </span>
                        <div className="relative flex-1 min-w-0">
                          <div className="text-xs text-white font-medium">{type.count} awards</div>
                        </div>
                        {idx === 0 && (
                          <span className="relative text-[8px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">Top</span>
                        )}
                        <span className="relative text-xs font-mono text-cyan-400 font-semibold">
                          {formatCurrency(type.amount)}
                        </span>
                        <ExternalLink className="relative w-3 h-3 text-gray-700 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Performance States — Enhanced with drilldown */}
            {summary && summary.topStates.length > 0 && (
              <div className="bg-[#0A0A0A] rounded-xl border border-gray-800/80 p-5">
                <h4 className="text-xs font-medium text-gray-400 mb-4 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-purple-400" />
                  Contract Performance by State
                  <span className="ml-auto text-[10px] text-gray-600 font-mono">{summary.topStates.length} states</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {summary.topStates.slice(0, 10).map((state, idx) => {
                    const maxStateAmt = Math.max(...summary.topStates.slice(0, 10).map(s => s.totalObligated), 1);
                    const pct = (state.totalObligated / maxStateAmt) * 100;
                    return (
                      <button
                        key={state.state}
                        onClick={() => openStateDrilldown(state.state)}
                        className="flex items-center gap-3 px-3 py-2.5 bg-[#111] rounded-lg border border-gray-800/50 hover:border-purple-500/40 hover:bg-purple-500/[0.03] transition-all relative overflow-hidden group w-full text-left cursor-pointer"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/[0.03] to-transparent" style={{ width: `${pct}%` }} />
                        <div className="relative w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center">
                          <Globe className="w-3 h-3 text-purple-400" />
                        </div>
                        <div className="relative flex-1 min-w-0">
                          <div className="text-xs text-white font-medium">{state.state}</div>
                          <div className="text-[10px] text-gray-600 font-mono">{state.awardCount} awards</div>
                        </div>
                        <span className="relative text-xs font-mono text-cyan-400 font-semibold">
                          {formatCurrency(state.totalObligated)}
                        </span>
                        <ExternalLink className="relative w-3 h-3 text-gray-700 group-hover:text-purple-400 transition-colors flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Award Detail Table */}
            {data.activities && data.activities.length > 0 && (
              <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 overflow-hidden flex flex-col">
                <div className="border-b border-gray-800 px-4 py-2 flex items-center justify-between">
                  <h4 className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Award Details ({data.activities.length})
                  </h4>
                </div>
                <div className="border-b border-gray-800">
                  <div className="grid grid-cols-12 gap-4 px-6 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <div className="col-span-2">Recipient</div>
                    <div className="col-span-3">Description</div>
                    <div className="col-span-2">Awarding Agency</div>
                    <div className="col-span-1 text-center">FY</div>
                    <div className="col-span-2 text-right">Obligation</div>
                    <div className="col-span-2 text-right">Performance</div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[500px]">
                  <div className="divide-y divide-gray-800/50">
                    <AnimatePresence mode="popLayout">
                      {paginatedActivities.map((activity, idx) => (
                        <motion.div
                          key={`${activity.awardId}-${idx}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: idx * 0.01 }}
                          className="grid grid-cols-12 gap-4 px-6 py-3 items-center hover:bg-[#222] transition-colors text-sm border-l-2 border-l-transparent hover:border-l-cyan-500"
                        >
                          {/* Recipient */}
                          <div className="col-span-2">
                            <div className="font-medium text-white text-xs truncate" title={activity.recipientName}>
                              {activity.recipientName}
                            </div>
                            <div className="text-[10px] text-gray-600 truncate mt-0.5">
                              {activity.awardType}
                            </div>
                          </div>

                          {/* Description */}
                          <div className="col-span-3">
                            <div className="text-xs text-gray-400 line-clamp-2" title={activity.awardDescription || ''}>
                              {activity.awardDescription || '\u2014'}
                            </div>
                          </div>

                          {/* Agency */}
                          <div className="col-span-2">
                            <div className="flex items-center gap-1.5">
                              {getAgencyIcon(activity.awardingAgencyName)}
                              <div className="text-xs text-gray-300 truncate" title={activity.awardingAgencyName}>
                                {activity.awardingAgencyName || '\u2014'}
                              </div>
                            </div>
                            {activity.awardingSubAgencyName && (
                              <div className="text-[10px] text-gray-600 truncate mt-0.5" title={activity.awardingSubAgencyName}>
                                {activity.awardingSubAgencyName}
                              </div>
                            )}
                          </div>

                          {/* FY */}
                          <div className="col-span-1 text-center">
                            <div className="inline-flex flex-col items-center text-[10px] font-mono bg-[#111] px-2 py-1 rounded border border-gray-800/50">
                              <span className="text-gray-300">FY{activity.fiscalYear}</span>
                            </div>
                          </div>

                          {/* Obligation */}
                          <div className="col-span-2 text-right">
                            {activity.totalObligation ? (
                              <div className="text-cyan-400 font-mono font-medium text-xs">
                                {formatCurrency(activity.totalObligation)}
                              </div>
                            ) : (
                              <span className="text-gray-600 text-xs">{'\u2014'}</span>
                            )}
                            {activity.permalink && (
                              <a
                                href={activity.permalink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-gray-600 hover:text-cyan-400 transition-colors mt-0.5"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                Award
                              </a>
                            )}
                          </div>

                          {/* Performance */}
                          <div className="col-span-2 text-right">
                            <div className="text-xs text-gray-400">
                              {activity.performanceState ? (
                                <div className="flex items-center justify-end gap-1">
                                  <MapPin className="w-2.5 h-2.5 text-gray-500" />
                                  <span>{activity.performanceState}</span>
                                </div>
                              ) : (
                                <span className="text-gray-600">{'\u2014'}</span>
                              )}
                            </div>
                            {activity.performanceStartDate && activity.performanceEndDate && (
                              <div className="text-[10px] text-gray-600 flex items-center justify-end gap-1 mt-0.5">
                                <Calendar className="w-2.5 h-2.5" />
                                {formatDate(activity.performanceStartDate)} {'\u2013'} {formatDate(activity.performanceEndDate)}
                              </div>
                            )}
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
                      Showing {Math.min((currentPage - 1) * itemsPerPage + 1, data.activities.length)}{'\u2013'}{Math.min(currentPage * itemsPerPage, data.activities.length)} of {data.activities.length}
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
            {data.activities.length === 0 && data.summary.totalAwards === 0 && (
              <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-12 text-center">
                <DollarSign className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Federal Contract Data Found</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  No federal contract awards were found for {ticker} on USAspending.gov
                  for the selected time period. Try a different contractor or expand the time range.
                </p>
              </div>
            )}

            {/* Source attribution */}
            <div className="flex items-center justify-between text-[10px] text-gray-600 px-1">
              <div className="flex items-center gap-2">
                <Shield className="w-3 h-3" />
                <span>
                  OmniFolio Proprietary &bull; OGI Algorithm v1 &bull; Data: USAspending.gov (Public)
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
          awards={drilldown.awards}
          accentColor={drilldown.accentColor}
          onClose={() => setDrilldown(null)}
        />
      )}
    </div>
  );
}

export default USASpendingView;

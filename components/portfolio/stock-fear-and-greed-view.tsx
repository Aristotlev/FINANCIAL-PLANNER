"use client";

import { useEffect, useState } from "react";
import { InfoIcon } from "lucide-react";

interface StockFearGreedComponents {
  price_momentum: number;
  vix_level: number;
  market_breadth: number;
  volume_surge: number;
  rsi_signal: number;
  safe_haven: number;
}

interface StockFearAndGreedData {
  value: number;
  value_classification: string;
  timestamp: string;
  time_until_update?: string;
  components?: StockFearGreedComponents;
}

const SIGNALS: { key: keyof StockFearGreedComponents; label: string; description: string }[] = [
  {
    key: "price_momentum",
    label: "Price Momentum",
    description: "SPY 30-day trend vs 90-day baseline",
  },
  {
    key: "vix_level",
    label: "Volatility (VIX)",
    description: "CBOE VIX fear gauge — inverted",
  },
  {
    key: "market_breadth",
    label: "Market Breadth",
    description: "% of S&P sector ETFs outperforming SPY",
  },
  {
    key: "volume_surge",
    label: "Volume Surge",
    description: "SPY daily volume vs 20-day average",
  },
  {
    key: "rsi_signal",
    label: "RSI Signal",
    description: "14-period Wilder RSI on SPY daily closes (inverted)",
  },
  {
    key: "safe_haven",
    label: "Safe Haven Demand",
    description: "TLT (20Y Treasuries) vs SPY relative flow",
  },
];

export function StockFearAndGreedView() {
  const [data, setData] = useState<StockFearAndGreedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/market-data/stock-fear-and-greed");
      if (!response.ok) throw new Error(`Failed to fetch data: ${response.status}`);
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      if (result.data) {
        setData({
          value:                Math.round(result.data.value),
          value_classification: result.data.value_classification,
          timestamp:            result.data.timestamp,
          time_until_update:    result.data.time_until_update,
          components:           result.data.components,
        });
      } else {
        throw new Error("Invalid data format received");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load Stock Fear & Greed Index");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getScoreColor = (score: number) => {
    if (score < 20) return "text-red-500";
    if (score < 40) return "text-orange-500";
    if (score < 60) return "text-yellow-400";
    if (score < 80) return "text-green-400";
    return "text-green-500";
  };

  const getScoreColorHex = (score: number) => {
    if (score < 20) return "#ef4444";
    if (score < 40) return "#f97316";
    if (score < 60) return "#facc15";
    if (score < 80) return "#4ade80";
    return "#22c55e";
  };

  const getSignalColor = (score: number) => {
    if (score < 20) return "bg-red-500/20 text-red-400 border-red-500/30";
    if (score < 40) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    if (score < 60) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    if (score < 80) return "bg-green-500/20 text-green-400 border-green-500/30";
    return "bg-green-600/20 text-green-300 border-green-600/30";
  };

  const getDescription = (score: number) => {
    if (score < 20) return "Extreme Fear — equity investors are highly risk-averse. Historically a long-term buying opportunity.";
    if (score < 40) return "Fear — the market is skewed bearish. Watch for oversold conditions across indices.";
    if (score < 60) return "Neutral — no clear directional conviction. Awaiting a catalyst.";
    if (score < 80) return "Greed — equity appetite is elevated. Watch for sector rotation and stretched valuations.";
    return "Extreme Greed — the US equity market is overheating. Elevated correction risk near-term.";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-3xl bg-[#0D0D0D] border border-white/10 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-sm font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const score = data.value;
  const classification = data.value_classification;
  const angle = (score / 100) * 180;
  const color = getScoreColorHex(score);

  return (
    <div className="space-y-6">

      {/* Index label */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">S&amp;P 500 Fear &amp; Greed Index</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Proprietary composite of 6 US equity market signals
          </p>
        </div>
        <span className="ml-auto text-[10px] font-semibold tracking-widest uppercase text-blue-400/70 border border-blue-400/20 rounded-full px-2 py-0.5 whitespace-nowrap">
          OmniFolio Engine
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Gauge Card ───────────────────────────────────────── */}
        <div className="rounded-3xl bg-[#0D0D0D] border border-white/10 p-8 flex flex-col items-center justify-center min-h-[400px]">

          {/* Gauge */}
          <div className="relative w-64 h-32 mt-8 mb-12">
            <svg
              className="absolute top-0 left-0 w-64 h-32 overflow-visible"
              viewBox="0 0 200 100"
            >
              {/* Track */}
              <path
                d="M 10 100 A 90 90 0 0 1 190 100"
                fill="none"
                stroke="#1f1f1f"
                strokeWidth="15"
                strokeLinecap="round"
              />
              {/* Zone tint segments */}
              <path d="M 10 100 A 90 90 0 0 1 56.7 28.4" fill="none" stroke="#ef4444" strokeWidth="6" strokeLinecap="butt" opacity="0.25" />
              <path d="M 56.7 28.4 A 90 90 0 0 1 100 10"  fill="none" stroke="#f97316" strokeWidth="6" strokeLinecap="butt" opacity="0.25" />
              <path d="M 100 10 A 90 90 0 0 1 143.3 28.4" fill="none" stroke="#facc15" strokeWidth="6" strokeLinecap="butt" opacity="0.25" />
              <path d="M 143.3 28.4 A 90 90 0 0 1 190 100" fill="none" stroke="#22c55e" strokeWidth="6" strokeLinecap="butt" opacity="0.25" />
              {/* Active arc */}
              <path
                d="M 10 100 A 90 90 0 0 1 190 100"
                fill="none"
                stroke={color}
                strokeWidth="15"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 283} 283`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            {/* Needle */}
            <div
              className="absolute bottom-0 left-1/2 w-0.5 h-[86px] origin-bottom transition-transform duration-1000 ease-out -ml-px"
              style={{ transform: `rotate(${angle - 90}deg)` }}
            >
              <div className="w-full h-full bg-white/80 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
              </div>
            </div>

            {/* Score label */}
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <span className={`text-6xl font-bold transition-colors duration-500 ${getScoreColor(score)}`}>
                {Math.round(score)}
              </span>
              <span className={`text-base font-semibold mt-1 ${getScoreColor(score)}`}>
                {classification}
              </span>
            </div>
          </div>

          <div className="mt-8 text-center max-w-sm">
            <p className="text-gray-400 text-sm leading-relaxed">{getDescription(score)}</p>
          </div>

          {/* Ticker context */}
          <div className="mt-6 flex items-center gap-4 text-xs text-gray-600">
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">SPY</span>
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">^VIX</span>
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">TLT</span>
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">XL* Sectors</span>
          </div>
        </div>

        {/* ── Right column ─────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Signal Breakdown */}
          {data.components && (
            <div className="rounded-3xl bg-[#0D0D0D] border border-white/10 p-6">
              <h3 className="text-sm font-semibold text-white/80 mb-4 uppercase tracking-wider">
                Signal Breakdown
              </h3>
              <div className="space-y-3">
                {SIGNALS.map(({ key, label, description }) => {
                  const val = data.components![key];
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className="text-xs font-medium text-white/90">{label}</span>
                          <span className="ml-2 text-[10px] text-gray-500">{description}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getSignalColor(val)}`}>
                          {val}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${val}%`, backgroundColor: getScoreColorHex(val) }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Methodology */}
          <div className="rounded-3xl bg-[#0D0D0D] border border-white/10 p-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-white/80 uppercase tracking-wider">
              <InfoIcon size={14} className="text-blue-400" />
              Methodology
            </h3>
            <div className="space-y-3 text-xs text-gray-400 leading-relaxed">
              <p>
                The OmniFolio S&amp;P 500 Fear &amp; Greed Index is a proprietary composite
                built from six independently computed US equity market signals, each scored
                0–100 and averaged with equal weight.
              </p>
              <ul className="space-y-1 pl-3 border-l border-white/5">
                <li><span className="text-white/60">Price Momentum</span> — SPY 30-day trend vs 90-day baseline</li>
                <li><span className="text-white/60">Volatility (VIX)</span> — CBOE ^VIX level, inverted scale</li>
                <li><span className="text-white/60">Market Breadth</span> — 11 sector ETFs vs SPY 24 h performance</li>
                <li><span className="text-white/60">Volume Surge</span> — SPY daily volume vs 20-day average</li>
                <li><span className="text-white/60">RSI Signal</span> — 14-period Wilder RSI on SPY, inverted</li>
                <li><span className="text-white/60">Safe Haven Demand</span> — TLT vs SPY relative daily flow</li>
              </ul>
              <div className="pt-3 border-t border-white/5 text-[10px] text-gray-600 space-y-0.5">
                <p>Last computed: {new Date(data.timestamp).toLocaleString()}</p>
                {data.time_until_update && (
                  <p>Refreshes in ~{Math.round(parseInt(data.time_until_update) / 60)} minutes</p>
                )}
                <p className="mt-2 text-blue-400/50">Powered by OmniFolio Stock Engine v1</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

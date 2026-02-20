"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, Target, BarChart3,
  Lightbulb, AlertTriangle, CheckCircle2, Zap, ArrowUpRight,
  ArrowDownRight, Edit3, Trash2, Plus, RefreshCw, MapPin,
  Calculator, Receipt, PieChart, Clock, Shield, Globe, Layers
} from "lucide-react";
import { SupabaseDataService } from "@/lib/supabase/supabase-data-service";
import { TaxProfile } from "@/lib/types/tax-profile";
import {
  calculateUSTaxes,
  getUSSmartSuggestions,
  compareStates,
  USTaxProfile,
  USTaxCalculationResult
} from "@/lib/us-tax-wizard-system";
import {
  USState,
  getNoIncomeTaxStates,
  US_STATE_TAX_DATA
} from "@/lib/us-state-tax-data";

// ── Global tax result (non-US profiles) ──────────────────────────────────────
interface GlobalTaxResult {
  grossIncome: number;
  totalTax: number;
  effectiveRate: number;
  netIncome: number;
  breakdown: { label: string; value: number; rate: number; color: string }[];
}

function calcGlobalSimple(profile: TaxProfile): GlobalTaxResult | null {
  const gross = (profile.salaryIncome ?? 0) + (profile.businessIncome ?? 0)
    + ((profile.capitalGains?.shortTerm ?? 0) + (profile.capitalGains?.longTerm ?? 0))
    + (profile.dividends ?? 0) + (profile.rentalIncome ?? 0);
  if (gross === 0) return null;

  const residencyMatch = profile.notes?.match(/Residency:\s*([^|]+)/);
  const companyMatch   = profile.notes?.match(/Company:\s*([^|]+)/);
  const isCrossBorder  = profile.notes?.includes("Cross-Border") ?? false;
  const residency  = residencyMatch?.[1]?.trim() ?? profile.country ?? "Unknown";
  const companyCtry = companyMatch?.[1]?.trim() ?? residency;

  // Parse stored effective rate if available (most reliable)
  const rateMatch = profile.notes?.match(/Effective Rate:\s*([\d.]+)%/);
  const storedRate = rateMatch ? parseFloat(rateMatch[1]) : null;

  const ZERO_TAX = ["UAE", "Saudi Arabia", "Qatar", "Bahrain", "Kuwait", "Cayman Islands"];
  const isZeroPersonal = ZERO_TAX.includes(residency);

  let totalTax = 0;
  let breakdown: { label: string; value: number; rate: number; color: string }[] = [];

  if (storedRate !== null) {
    totalTax = (storedRate / 100) * gross;
    breakdown = totalTax > 0
      ? [{ label: "Income Tax", value: totalTax, rate: storedRate, color: "#ef4444" }]
      : [{ label: "No Income Tax", value: 0, rate: 0, color: "#22c55e" }];
  } else if (isZeroPersonal) {
    totalTax = 0;
    breakdown = [{ label: "Personal Income Tax", value: 0, rate: 0, color: "#22c55e" }];
  } else {
    // Rough estimate from stored data only — avoids pulling in the full engine
    const deductions = profile.deductibleExpenses ?? 0;
    const taxable = Math.max(0, gross - deductions);
    // Use a conservative flat approximation until a proper rate is stored
    totalTax = taxable * 0.15;
    breakdown = [{ label: "Estimated Income Tax", value: totalTax, rate: (totalTax / gross) * 100, color: "#ef4444" }];
  }

  return {
    grossIncome: gross,
    totalTax,
    effectiveRate: gross > 0 ? (totalTax / gross) * 100 : 0,
    netIncome: gross - totalTax,
    breakdown,
  };
}

function isUSProfile(profile: TaxProfile): boolean {
  if (profile.country === "USA") return true;
  const residencyMatch = profile.notes?.match(/Residency:\s*([^|]+)/);
  const residency = residencyMatch?.[1]?.trim();
  return residency === "USA" || residency === "United States";
}

// ────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtFull(n: number) {
  return `$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

// Parse a saved TaxProfile back to USTaxProfile for recalculation
function toUSTaxProfile(p: TaxProfile): USTaxProfile {
  // Try to parse state from notes
  const stateMatch = p.notes?.match(/State:\s*([^|]+)/);
  const filingMatch = p.notes?.match(/Filing:\s*([^|]+)/);
  const state = (stateMatch?.[1]?.trim() as USState) ?? "California";
  const filing = (filingMatch?.[1]?.trim() as USTaxProfile["filingStatus"]) ?? "single";

  return {
    state,
    filingStatus: filing,
    employmentStatus:
      p.businessIncome > 0 && p.salaryIncome === 0 ? "self-employed" : "employed",
    w2Income: p.salaryIncome,
    selfEmploymentIncome: p.businessIncome,
    capitalGains: p.capitalGains.shortTerm + p.capitalGains.longTerm,
    dividends: p.dividends,
    rentalIncome: p.rentalIncome,
    otherIncome: 0,
    businessExpenses: p.deductibleExpenses,
    standardDeduction: true,
    retirementContributions: 0,
  };
}

// ────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────

function BigStat({
  label, value, sub, color = "white", icon: Icon, accent,
}: {
  label: string; value: string; sub?: string; color?: string;
  icon?: React.ComponentType<{ className?: string }>; accent?: string;
}) {
  return (
    <div className={`bg-[#111] rounded-2xl p-5 border border-white/5 relative overflow-hidden`}>
      {accent && (
        <div className={`absolute inset-0 opacity-5 ${accent} pointer-events-none`} />
      )}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] text-gray-500 uppercase tracking-widest font-bold mb-2">{label}</div>
          <div className={`text-3xl font-black font-mono ${color}`}>{value}</div>
          {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
        </div>
        {Icon && (
          <div className="p-2.5 bg-white/5 rounded-xl">
            <Icon className="w-5 h-5 text-gray-500" />
          </div>
        )}
      </div>
    </div>
  );
}

function TaxBreakdownBar({
  federal, state, seTax, gross,
}: {
  federal: number; state: number; seTax: number; gross: number;
}) {
  if (gross === 0) return null;
  const net = gross - federal - state - seTax;
  const segments = [
    { label: "Federal", value: federal, color: "bg-red-500", text: "text-red-400" },
    { label: "State", value: state, color: "bg-orange-500", text: "text-orange-400" },
    ...(seTax > 0 ? [{ label: "SE Tax", value: seTax, color: "bg-yellow-500", text: "text-yellow-400" }] : []),
    { label: "Net", value: net, color: "bg-emerald-500", text: "text-emerald-400" },
  ];

  return (
    <div>
      <div className="flex h-4 rounded-xl overflow-hidden gap-px">
        {segments.map((s) => (
          <div
            key={s.label}
            className={`${s.color} transition-all duration-700`}
            style={{ width: `${Math.max((s.value / gross) * 100, 0.5)}%` }}
            title={`${s.label}: ${fmtFull(s.value)}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-4 mt-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
            <span className={`text-xs ${s.text} font-medium`}>{s.label}</span>
            <span className="text-xs text-gray-500 font-mono">{fmtFull(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FederalBracketViz({
  taxableIncome, filingStatus,
}: {
  taxableIncome: number; filingStatus: USTaxProfile["filingStatus"];
}) {
  const married = filingStatus === "married-joint";
  const brackets = married
    ? [
        { min: 0, max: 23200, rate: 10, color: "#22c55e" },
        { min: 23200, max: 94300, rate: 12, color: "#84cc16" },
        { min: 94300, max: 201050, rate: 22, color: "#eab308" },
        { min: 201050, max: 383900, rate: 24, color: "#f97316" },
        { min: 383900, max: 487450, rate: 32, color: "#ef4444" },
        { min: 487450, max: 731200, rate: 35, color: "#dc2626" },
        { min: 731200, max: Infinity, rate: 37, color: "#991b1b" },
      ]
    : [
        { min: 0, max: 11600, rate: 10, color: "#22c55e" },
        { min: 11600, max: 47150, rate: 12, color: "#84cc16" },
        { min: 47150, max: 100525, rate: 22, color: "#eab308" },
        { min: 100525, max: 191950, rate: 24, color: "#f97316" },
        { min: 191950, max: 243725, rate: 32, color: "#ef4444" },
        { min: 243725, max: 609350, rate: 35, color: "#dc2626" },
        { min: 609350, max: Infinity, rate: 37, color: "#991b1b" },
      ];

  const scale = Math.max(taxableIncome * 1.2, 120000);
  let marginal = 0;
  for (const b of brackets) if (taxableIncome > b.min) marginal = b.rate;

  return (
    <div className="bg-[#111] rounded-2xl p-5 border border-white/5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Federal Tax Brackets</div>
        <div className="text-sm font-bold" style={{ color: marginal > 30 ? "#ef4444" : marginal > 20 ? "#f97316" : "#22c55e" }}>
          {marginal}% marginal rate
        </div>
      </div>

      <div className="space-y-2">
        {brackets.map((b) => {
          const bracketEnd = b.max === Infinity ? scale : Math.min(b.max, scale);
          const width = ((bracketEnd - b.min) / scale) * 100;
          const filled = taxableIncome >= bracketEnd ? 100 : taxableIncome > b.min ? ((taxableIncome - b.min) / (bracketEnd - b.min)) * 100 : 0;
          const active = filled > 0;

          return (
            <div key={b.rate} className="flex items-center gap-3">
              <div className="w-8 text-[11px] font-bold text-right" style={{ color: active ? b.color : "#374151" }}>
                {b.rate}%
              </div>
              <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${filled}%`,
                    backgroundColor: b.color,
                    opacity: active ? 1 : 0.15,
                  }}
                />
              </div>
              <div className="w-20 text-[10px] text-gray-600 text-right font-mono">
                {b.min === 0 ? "$0" : fmt(b.min)} {b.max !== Infinity ? `– ${fmt(b.max)}` : "+"}
              </div>
            </div>
          );
        })}
      </div>

      {taxableIncome > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-sm">
          <span className="text-gray-400">Taxable income</span>
          <span className="font-mono font-bold text-cyan-400">{fmtFull(taxableIncome)}</span>
        </div>
      )}
    </div>
  );
}

function MonthlyProjection({ annual, label, color }: { annual: number; label: string; color: string }) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthly = annual / 12;
  // Slight variation for visual interest
  const data = months.map((m, i) => ({ month: m, value: monthly * (0.97 + Math.sin(i) * 0.05) }));
  const max = Math.max(...data.map((d) => d.value));

  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">{label}</div>
      <div className="flex items-end gap-1 h-16">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className="w-full rounded-t-sm transition-all duration-700"
              style={{
                height: `${(d.value / max) * 100}%`,
                backgroundColor: color,
                opacity: i === new Date().getMonth() ? 1 : 0.35,
              }}
            />
            <div className="text-[8px] text-gray-700">{d.month.slice(0, 1)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StateComparisonTable({
  currentState,
  grossIncome,
  filingStatus,
}: {
  currentState: USState;
  grossIncome: number;
  filingStatus: USTaxProfile["filingStatus"];
}) {
  const noTax = getNoIncomeTaxStates();
  const altStates: USState[] = ["Florida", "Texas", "Nevada", "Washington", "Tennessee", "Wyoming"]
    .filter((s) => s !== currentState) as USState[];

  const comps = useMemo(() => {
    if (grossIncome === 0) return [];
    return compareStates([currentState, ...altStates.slice(0, 3)], grossIncome, filingStatus);
  }, [currentState, grossIncome, filingStatus, altStates]);

  if (comps.length === 0) return null;

  const currentTax = comps.find((c: { state: USState; stateTax: number }) => c.state === currentState)?.stateTax ?? 0;

  return (
    <div className="bg-[#111] rounded-2xl p-5 border border-white/5">
      <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
        <MapPin className="w-3.5 h-3.5" /> State Tax Comparison
      </div>
      <div className="space-y-2.5">
        {comps.map((c: { state: USState; stateTax: number; effectiveRate: number }) => {
          const isCurrent = c.state === currentState;
          const saving = currentTax - c.stateTax;
          const maxTax = Math.max(...comps.map((x: { stateTax: number }) => x.stateTax), 1);
          const barPct = (c.stateTax / maxTax) * 100;

          return (
            <div key={c.state} className={`p-3 rounded-xl border transition-all ${isCurrent ? "border-cyan-500/30 bg-cyan-500/5" : "border-white/5"}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${isCurrent ? "text-cyan-400" : "text-white"}`}>
                    {c.state} {isCurrent && <span className="text-[10px] text-cyan-500 ml-1">● current</span>}
                  </span>
                  {noTax.includes(c.state) && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 rounded font-bold">NO TAX</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono font-bold text-white">{c.stateTax === 0 ? "FREE" : fmtFull(c.stateTax)}</span>
                  {!isCurrent && saving > 0 && (
                    <div className="text-[10px] text-emerald-400 font-bold">Save {fmtFull(saving)}/yr</div>
                  )}
                </div>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${c.stateTax === 0 ? "bg-emerald-500" : isCurrent ? "bg-cyan-500" : "bg-gray-600"}`}
                  style={{ width: `${Math.max(barPct, c.stateTax === 0 ? 1 : 1)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Profile card
function ProfileCard({
  profile,
  calc,
  globalCalc,
  isActive,
  onEdit,
  onDelete,
  onSetActive,
}: {
  profile: TaxProfile;
  calc: USTaxCalculationResult | null;
  globalCalc: GlobalTaxResult | null;
  isActive: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetActive: () => void;
}) {
  const stateMatch = profile.notes?.match(/State:\s*([^|]+)/);
  const residencyMatch = profile.notes?.match(/Residency:\s*([^|]+)/);
  const companyMatch   = profile.notes?.match(/Company:\s*([^|]+)/);
  const profileIsUS = isUSProfile(profile);
  const location = profileIsUS
    ? (stateMatch?.[1]?.trim() ?? "USA")
    : (residencyMatch?.[1]?.trim() ?? profile.country ?? "—");
  const isCB = profile.notes?.includes("Cross-Border") ?? false;

  // Unified display values
  const grossVal  = calc?.breakdown.grossIncome ?? globalCalc?.grossIncome ?? 0;
  const taxVal    = calc?.totalTaxLiability ?? globalCalc?.totalTax ?? 0;
  const rateVal   = calc?.totalEffectiveRate ?? globalCalc?.effectiveRate ?? 0;
  const hasData   = grossVal > 0;

  return (
    <div
      className={`relative p-5 rounded-2xl border transition-all ${
        isActive ? "border-cyan-500/40 bg-cyan-500/5" : "border-white/5 bg-[#111] hover:bg-[#161616]"
      }`}
    >
      {isActive && (
        <div className="absolute top-3 right-3 text-[10px] px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full font-bold uppercase tracking-wider">
          Active
        </div>
      )}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="font-bold text-white text-base">{profile.name}</div>
          <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
            {profileIsUS ? <MapPin className="w-3 h-3" /> : isCB ? <Layers className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
            {isCB && companyMatch ? `${location} · ${companyMatch[1].trim()}` : location}
          </div>
        </div>
      </div>

      {hasData ? (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <div className="text-[10px] text-gray-600 uppercase tracking-wider">Gross</div>
              <div className="text-sm font-mono font-bold text-white">{fmt(grossVal)}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-gray-600 uppercase tracking-wider">Tax</div>
              <div className="text-sm font-mono font-bold text-red-400">{fmt(taxVal)}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-gray-600 uppercase tracking-wider">Rate</div>
              <div className="text-sm font-mono font-bold text-orange-400">{fmtPct(rateVal)}</div>
            </div>
          </div>
          {/* Mini bar */}
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden flex mb-4">
            {profileIsUS && calc ? (
              <>
                <div className="bg-red-500" style={{ width: `${(calc.federalIncomeTax / grossVal) * 100}%` }} />
                <div className="bg-orange-500" style={{ width: `${(calc.stateIncomeTax / grossVal) * 100}%` }} />
              </>
            ) : globalCalc ? (
              globalCalc.breakdown.filter(b => b.value > 0).map((b, i) => (
                <div key={i} style={{ width: `${(b.value / grossVal) * 100}%`, backgroundColor: b.color }} />
              ))
            ) : null}
            <div className="bg-emerald-500 flex-1" />
          </div>
        </>
      ) : (
        <div className="text-xs text-gray-600 mb-4">No income data — edit to add figures</div>
      )}

      <div className="flex items-center gap-2">
        {!isActive && (
          <button
            onClick={onSetActive}
            className="flex-1 py-2 rounded-lg border border-cyan-500/30 text-cyan-400 text-xs font-semibold hover:bg-cyan-500/10 transition-colors"
          >
            Set Active
          </button>
        )}
        <button
          onClick={onEdit}
          className="flex-1 py-2 rounded-lg border border-white/10 text-gray-400 text-xs font-semibold hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5"
        >
          <Edit3 className="w-3 h-3" /> Edit
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg border border-red-500/10 text-red-500/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────

interface TaxDashboardProps {
  onAddProfile: () => void;
  onEditProfile: (profile: TaxProfile) => void;
}

export function TaxDashboard({ onAddProfile, onEditProfile }: TaxDashboardProps) {
  const [profiles, setProfiles] = useState<TaxProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await SupabaseDataService.getTaxProfiles([]);
      setProfiles(data);
      const active = data.find((p: TaxProfile) => p.isActive);
      if (active) setActiveProfileId(active.id);
      else if (data.length > 0) setActiveProfileId(data[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
    const handler = () => loadProfiles();
    window.addEventListener("taxDataChanged", handler);
    window.addEventListener("financialDataChanged", handler);
    return () => {
      window.removeEventListener("taxDataChanged", handler);
      window.removeEventListener("financialDataChanged", handler);
    };
  }, [loadProfiles]);

  // Compute US calculations only for US profiles
  const calculations = useMemo(() => {
    const map: Record<string, USTaxCalculationResult | null> = {};
    for (const p of profiles) {
      if (!isUSProfile(p)) { map[p.id] = null; continue; }
      try {
        const up = toUSTaxProfile(p);
        const calc = calculateUSTaxes(up);
        map[p.id] = calc;
      } catch {
        map[p.id] = null;
      }
    }
    return map;
  }, [profiles]);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null;
  const activeIsUS = activeProfile ? isUSProfile(activeProfile) : false;
  const activeCalc = (activeProfile && activeIsUS) ? calculations[activeProfile.id] : null;
  const activeGlobalCalc = (activeProfile && !activeIsUS) ? calcGlobalSimple(activeProfile) : null;
  const activeUSTaxProfile = (activeProfile && activeIsUS) ? toUSTaxProfile(activeProfile) : null;

  // Derive display values that work for both US and global profiles
  const activeTotalTax = activeCalc?.totalTaxLiability ?? activeGlobalCalc?.totalTax ?? 0;
  const activeNetIncome = activeCalc?.netIncome ?? activeGlobalCalc?.netIncome ?? 0;
  const activeEffectiveRate = activeCalc?.totalEffectiveRate ?? activeGlobalCalc?.effectiveRate ?? 0;
  const activeGrossIncome = activeCalc?.breakdown.grossIncome ?? activeGlobalCalc?.grossIncome ?? 0;

  // Residency / country label for non-US
  const activeResidency = (() => {
    if (!activeProfile) return "—";
    const m = activeProfile.notes?.match(/Residency:\s*([^|]+)/);
    return m?.[1]?.trim() ?? activeProfile.country ?? "—";
  })();
  const activeCompany = (() => {
    if (!activeProfile) return null;
    const m = activeProfile.notes?.match(/Company:\s*([^|]+)/);
    return m?.[1]?.trim() ?? null;
  })();
  const isCrossBorder = activeProfile?.notes?.includes("Cross-Border") ?? false;

  const suggestions = useMemo(() => {
    if (!activeCalc || !activeUSTaxProfile || !activeIsUS) return [];
    return getUSSmartSuggestions(activeUSTaxProfile, activeCalc);
  }, [activeCalc, activeUSTaxProfile, activeIsUS]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this profile?")) return;
    try {
      await SupabaseDataService.deleteTaxProfile(id);
      await loadProfiles();
      window.dispatchEvent(new Event("taxDataChanged"));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetActive = async (id: string) => {
    setActiveProfileId(id);
    // Update all profiles — set one as active
    try {
      for (const p of profiles) {
        await SupabaseDataService.saveTaxProfile({ ...p, isActive: p.id === id });
      }
      window.dispatchEvent(new Event("taxDataChanged"));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-600">
        <RefreshCw className="w-5 h-5 animate-spin mr-3" /> Loading tax data…
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <div className="p-6 bg-[#111] rounded-3xl border border-white/5">
          <Receipt className="w-12 h-12 text-gray-600" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-white mb-2">No Tax Profiles Yet</h3>
          <p className="text-gray-500 text-sm max-w-xs">
            Create your first tax profile to get live federal + state calculations, projections, and optimization tips.
          </p>
        </div>
        <button
          onClick={onAddProfile}
          className="flex items-center gap-2 px-6 py-3 bg-[#0D0D0D] border border-white/20 text-white rounded-xl font-bold text-sm transition-all hover:bg-white/10"
        >
          <Plus className="w-4 h-4" /> Create Tax Profile
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Header row ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Tax Overview</h2>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
            {activeIsUS ? (
              <><Shield className="w-3.5 h-3.5" /> USA · Federal + State · Real-time calculations</>
            ) : isCrossBorder ? (
              <><Layers className="w-3.5 h-3.5" /> {activeResidency} residency · {activeCompany} company · Cross-border structure</>
            ) : (
              <><Globe className="w-3.5 h-3.5" /> {activeResidency} · Global tax calculations</>
            )}
          </p>
        </div>
        <button
          onClick={onAddProfile}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0D0D0D] border border-white/20 text-white rounded-xl text-sm font-bold transition-all hover:bg-white/10"
        >
          <Plus className="w-4 h-4" /> New Profile
        </button>
      </div>

      {/* ── Active profile stats ── */}
      {activeGrossIncome > 0 && (
        <>
          {/* Top stat cards — shared between US and global */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <BigStat
              label="Total Tax Liability"
              value={fmtFull(activeTotalTax)}
              sub={`${fmtPct(activeEffectiveRate)} effective rate`}
              color="text-red-400"
              icon={Receipt}
              accent="bg-red-500"
            />
            <BigStat
              label="Net Income"
              value={fmtFull(activeNetIncome)}
              sub={`${fmtPct(100 - activeEffectiveRate)} of gross`}
              color="text-emerald-400"
              icon={DollarSign}
              accent="bg-emerald-500"
            />
            {activeIsUS && activeCalc ? (
              <>
                <BigStat
                  label="Federal Tax"
                  value={fmtFull(activeCalc.federalIncomeTax)}
                  sub={`${fmtPct(activeCalc.federalEffectiveRate)} eff · ${activeCalc.federalMarginalRate}% marginal`}
                  color="text-orange-400"
                  icon={Shield}
                  accent="bg-orange-500"
                />
                <BigStat
                  label="State Tax"
                  value={fmtFull(activeCalc.stateIncomeTax)}
                  sub={`${activeUSTaxProfile?.state ?? "—"} · ${fmtPct(activeCalc.stateEffectiveRate)} effective`}
                  color="text-yellow-400"
                  icon={MapPin}
                  accent="bg-yellow-500"
                />
              </>
            ) : (
              <>
                <BigStat
                  label="Gross Income"
                  value={fmtFull(activeGrossIncome)}
                  sub="Annual gross"
                  color="text-cyan-400"
                  icon={TrendingUp}
                  accent="bg-cyan-500"
                />
                <BigStat
                  label={isCrossBorder ? "Structure" : "Residency"}
                  value={isCrossBorder ? `${activeResidency} + ${activeCompany}` : activeResidency}
                  sub={isCrossBorder ? "Cross-border" : "Tax jurisdiction"}
                  color="text-purple-400"
                  icon={isCrossBorder ? Layers : Globe}
                  accent="bg-purple-500"
                />
              </>
            )}
          </div>

          {/* ── US-only: income breakdown bar ── */}
          {activeIsUS && activeCalc && (
            <div className="bg-[#111] rounded-2xl p-6 border border-white/5">
              <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">
                Income Allocation — {fmtFull(activeCalc.breakdown.grossIncome)} gross
              </div>
              <TaxBreakdownBar
                federal={activeCalc.federalIncomeTax}
                state={activeCalc.stateIncomeTax}
                seTax={activeCalc.selfEmploymentTax}
                gross={activeCalc.breakdown.grossIncome}
              />
            </div>
          )}

          {/* ── Global: tax breakdown bar ── */}
          {!activeIsUS && activeGlobalCalc && (
            <div className="bg-[#111] rounded-2xl p-6 border border-white/5">
              <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">
                Income Allocation — {fmtFull(activeGlobalCalc.grossIncome)} gross
              </div>
              <div className="flex h-4 rounded-full overflow-hidden gap-0.5 mb-3">
                {activeGlobalCalc.breakdown.filter(b => b.value > 0).map((b, i) => (
                  <div key={i} className="transition-all duration-700 rounded-sm" style={{ width: `${(b.value / activeGlobalCalc.grossIncome) * 100}%`, backgroundColor: b.color }} />
                ))}
                <div className="bg-emerald-500 flex-1 rounded-sm" />
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                {activeGlobalCalc.breakdown.filter(b => b.value > 0).map((b, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-xs" style={{ color: b.color }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                    {b.label} · {fmtPct(b.rate)}
                  </span>
                ))}
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  Net Income · {fmtPct(100 - activeGlobalCalc.effectiveRate)}
                </span>
              </div>
            </div>
          )}

          {/* ── Monthly + analytics row ── */}
          <div className={`grid grid-cols-1 ${activeIsUS ? "lg:grid-cols-3" : "lg:grid-cols-2"} gap-6`}>
            {/* Monthly projections — shared */}
            <div className="bg-[#111] rounded-2xl p-5 border border-white/5 space-y-5">
              <div className="text-xs text-gray-500 uppercase tracking-widest font-bold flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Monthly Projections
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Gross/mo", value: fmt(activeGrossIncome / 12), color: "text-white" },
                  { label: "Tax/mo",   value: fmt(activeTotalTax / 12),    color: "text-red-400" },
                  { label: "Net/mo",   value: fmt(activeNetIncome / 12),   color: "text-emerald-400" },
                  { label: "Tax/day",  value: fmt(activeTotalTax / 365),   color: "text-orange-400" },
                ].map((item) => (
                  <div key={item.label} className="bg-black/30 rounded-xl p-3 text-center">
                    <div className={`text-xl font-black font-mono ${item.color}`}>{item.value}</div>
                    <div className="text-[10px] text-gray-600 mt-0.5">{item.label}</div>
                  </div>
                ))}
              </div>
              <MonthlyProjection annual={activeTotalTax} label="Monthly Tax Projection" color="#ef4444" />
            </div>

            {/* US-only: federal bracket viz */}
            {activeIsUS && activeCalc && (
              <FederalBracketViz
                taxableIncome={activeCalc.breakdown.taxableIncome}
                filingStatus={activeUSTaxProfile?.filingStatus ?? "single"}
              />
            )}

            {/* Detailed breakdown — shared */}
            <div className="bg-[#111] rounded-2xl p-5 border border-white/5">
              <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5" /> Full Breakdown
              </div>
              <div className="space-y-2">
                {activeIsUS && activeCalc ? (
                  <>
                    {[
                      { label: "Gross Income",   value: activeCalc.breakdown.grossIncome,        color: "text-white",      prefix: "" },
                      { label: "AGI",             value: activeCalc.breakdown.adjustedGrossIncome, color: "text-cyan-300",   prefix: "" },
                      { label: "Deductions",      value: -activeCalc.breakdown.deductions,         color: "text-emerald-400", prefix: "−" },
                      { label: "Taxable Income",  value: activeCalc.breakdown.taxableIncome,       color: "text-cyan-400",   prefix: "" },
                      { label: "Federal Tax",     value: -activeCalc.federalIncomeTax,             color: "text-red-400",    prefix: "−" },
                      { label: `${activeUSTaxProfile?.state ?? "State"} Tax`, value: -activeCalc.stateIncomeTax, color: "text-orange-400", prefix: "−" },
                      ...(activeCalc.selfEmploymentTax > 0 ? [{ label: "SE Tax", value: -activeCalc.selfEmploymentTax, color: "text-yellow-400", prefix: "−" }] : []),
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                        <span className="text-xs text-gray-400">{row.label}</span>
                        <span className={`text-xs font-mono font-bold ${row.color}`}>{row.prefix}{fmtFull(Math.abs(row.value))}</span>
                      </div>
                    ))}
                  </>
                ) : activeGlobalCalc ? (
                  <>
                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <span className="text-xs text-gray-400">Gross Income</span>
                      <span className="text-xs font-mono font-bold text-white">{fmtFull(activeGlobalCalc.grossIncome)}</span>
                    </div>
                    {activeGlobalCalc.breakdown.filter(b => b.value > 0).map((b, i) => (
                      <div key={i} className="flex justify-between items-center py-1.5 border-b border-white/5">
                        <span className="text-xs text-gray-400">{b.label}</span>
                        <span className="text-xs font-mono font-bold" style={{ color: b.color }}>−{fmtFull(b.value)}</span>
                      </div>
                    ))}
                  </>
                ) : null}
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-bold text-white">Net Income</span>
                  <span className="text-base font-black font-mono text-emerald-400">{fmtFull(activeNetIncome)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── US-only: state comparison ── */}
          {activeIsUS && activeUSTaxProfile && activeCalc && (
            <StateComparisonTable
              currentState={activeUSTaxProfile.state}
              grossIncome={activeCalc.breakdown.grossIncome}
              filingStatus={activeUSTaxProfile.filingStatus}
            />
          )}

          {/* ── US-only: optimization tips ── */}
          {activeIsUS && suggestions.length > 0 && (
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/5 rounded-2xl p-6 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-bold text-purple-300 uppercase tracking-wider">
                  Smart Tax Optimization
                </span>
                <span className="ml-auto text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full font-bold">
                  {suggestions.length} tips
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggestions.map((s: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-black/20 rounded-xl">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0 mt-2" />
                    <p className="text-sm text-purple-200/80">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Global-only: cross-border structure note ── */}
          {!activeIsUS && isCrossBorder && (
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/5 rounded-2xl p-6 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-bold text-purple-300 uppercase tracking-wider">Cross-Border Structure Active</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/20 rounded-xl p-4">
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Personal Residency</div>
                  <div className="font-bold text-white">{activeResidency}</div>
                  <div className="text-xs text-emerald-400 mt-0.5">Personal income tax jurisdiction</div>
                </div>
                <div className="bg-black/20 rounded-xl p-4">
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Company Registered In</div>
                  <div className="font-bold text-white">{activeCompany}</div>
                  <div className="text-xs text-cyan-400 mt-0.5">Corporate tax jurisdiction</div>
                </div>
              </div>
              <p className="text-xs text-purple-200/50 mt-3">⚠️ Always consult a qualified tax attorney for cross-border structures. Substance requirements, CFC rules, and tax treaties may apply.</p>
            </div>
          )}
        </>
      )}

      {/* ── All profiles ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">
            All Profiles ({profiles.length})
          </div>
          {profiles.length > 1 && (
            <p className="text-xs text-gray-600">Click "Set Active" to switch the dashboard profile</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((p) => (
            <ProfileCard
              key={p.id}
              profile={p}
              calc={isUSProfile(p) ? calculations[p.id] : null}
              globalCalc={isUSProfile(p) ? null : calcGlobalSimple(p)}
              isActive={p.id === activeProfileId}
              onEdit={() => onEditProfile(p)}
              onDelete={() => handleDelete(p.id)}
              onSetActive={() => handleSetActive(p.id)}
            />
          ))}
          <button
            onClick={onAddProfile}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-dashed border-white/10 text-gray-600 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all group"
          >
            <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Add Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}

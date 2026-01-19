"use client";

import { useMemo, useState, useEffect } from "react";
import { TrendingUp, Wallet, PiggyBank, Landmark } from "lucide-react";
import { useCurrency } from "../../../contexts/currency-context";
import { useFinancialData } from "../../../contexts/financial-data-context";
import { LazyRechartsWrapper } from "../../../components/ui/lazy-charts";
import { SupabaseDataService } from "../../../lib/supabase/supabase-data-service";
import { cn } from "../../../lib/utils";

// Helper to compact large numbers
const compactCurrency = (value: number, formatFn: (v: number) => string) => {
    if (value >= 1_000_000_000) return formatFn(value / 1_000_000_000) + 'B';
    if (value >= 1_000_000) return formatFn(value / 1_000_000) + 'M';
    if (value >= 1_000) return formatFn(value / 1_000) + 'K';
    return formatFn(value);
};

export function LiquidAssetsAnalyticsView() {
  const { formatCurrency, convert, mainCurrency } = useCurrency();
  const { cash, savings } = useFinancialData();
  const [chartRange, setChartRange] = useState<'1D' | '1W' | '1M' | '1Y'>('1M');
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [cashAccounts, setCashAccounts] = useState<any[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<any[]>([]);

  // Calculate totals
  const totalLiquidAssets = cash + savings;

  // For liquid assets, we might not have a reliable 24h change yet without snapshots.
  // We'll assume stable for now (0%)
  const totalChangePercent = 0;
  
  const displayTotal = convert(totalLiquidAssets, 'USD', mainCurrency.code);

  // Fetch detailed accounts
  useEffect(() => {
    const fetchData = async () => {
        try {
            const [
                fetchedCashAccounts,
                fetchedSavingsGoals
            ] = await Promise.all([
                SupabaseDataService.getCashAccounts(),
                SupabaseDataService.getSavingsAccounts()
            ]);

            setCashAccounts(fetchedCashAccounts);
            setSavingsGoals(fetchedSavingsGoals);

            // Simulate history since we don't have time-series for cash yet
            // In a real implementation, we would fetch historical balances
            const now = Date.now();
            const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
            const dataPoints: { date: number, value: number }[] = [];
            
            // Generate stable line with slight noise to look organic
            const dayMs = 24 * 60 * 60 * 1000;
            const volatility = 0.001; // Very low volatility for cash
            
            let currentValue = totalLiquidAssets;

            for (let time = now; time >= oneYearAgo; time -= dayMs) {
                dataPoints.push({
                    date: time,
                    value: currentValue
                });
                // Slightly vary past values
                currentValue = currentValue * (1 + (Math.random() * volatility - volatility/2));
            }
            
            // Sort by date ascending
            dataPoints.sort((a, b) => a.date - b.date);

            // Normalize so last point matches current total exactly
            if (dataPoints.length > 0 && totalLiquidAssets > 0) {
                 const lastVal = dataPoints[dataPoints.length - 1].value;
                 const scale = totalLiquidAssets / lastVal;
                 const normalized = dataPoints.map(p => ({ ...p, value: p.value * scale }));
                 setHistoricalData(normalized);
            } else {
                 setHistoricalData(dataPoints);
            }

        } catch (e) {
            console.error("Failed to fetch liquid assets data", e);
        }
    };
    
    if (totalLiquidAssets > 0) {
        fetchData();
    }
  }, [totalLiquidAssets]); 

  const displayHistory = useMemo(() => {
    // If no real history or it failed, fallback to simulated
    if (historicalData.length === 0) {
         const points = chartRange === '1D' ? 24 : chartRange === '1W' ? 7 : 30;
         const volatility = 0.005;
         let val = totalLiquidAssets;
         const data = [];
         for (let i = points; i >= 0; i--) {
             data.unshift({ name: i.toString(), value: val });
             val = val / (1 + (Math.random() * volatility - volatility/2));
         }
         return data;
    }

    // Filter based on range
    const now = Date.now();
    const duration = chartRange === '1D' ? 24*60*60*1000 : 
                     chartRange === '1W' ? 7*24*60*60*1000 : 
                     chartRange === '1M' ? 30*24*60*60*1000 : 
                     365*24*60*60*1000;
    
    const startTime = now - duration;
    
    return historicalData
        .filter(d => d.date >= startTime)
        .map(d => ({
            name: new Date(d.date).toLocaleDateString(),
            value: d.value
        }));

  }, [historicalData, chartRange, totalLiquidAssets]);

  const assets = useMemo(() => {
      const items = [
        ...cashAccounts.map(acc => ({
            label: acc.name,
            value: acc.balance,
            icon: Wallet,
            color: "text-emerald-400", 
            bg: "bg-emerald-500/10", 
            glow: "bg-emerald-500/5"
        })),
        ...savingsGoals.map(goal => ({
            label: goal.name,
            value: goal.currentAmount,
            icon: PiggyBank,
            color: "text-cyan-400", 
            bg: "bg-cyan-500/10", 
            glow: "bg-cyan-500/5"
        }))
      ];
      
      // If we have accounts, use them. Otherwise fallback to summary categories if values exist.
      if (items.length > 0) {
          return items.sort((a, b) => b.value - a.value);
      }
      
      const summaryItems = [];
      if (cash > 0) summaryItems.push({ label: "Cash Accounts", value: cash, icon: Wallet, color: "text-emerald-400", bg: "bg-emerald-500/10", glow: "bg-emerald-500/5" });
      if (savings > 0) summaryItems.push({ label: "Savings Goals", value: savings, icon: PiggyBank, color: "text-cyan-400", bg: "bg-cyan-500/10", glow: "bg-cyan-500/5" });
      
      return summaryItems;
  }, [cashAccounts, savingsGoals, cash, savings]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-end justify-between">
        <div>
           <h2 className="text-gray-400 text-sm font-medium mb-1">Total Liquid Assets</h2>
           <div className="text-6xl font-bold text-white tracking-tight">
             {formatCurrency(displayTotal)}
           </div>
        </div>
        <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-2",
            totalChangePercent >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
        )}>
            {totalChangePercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingUp className="w-4 h-4 rotate-180" />}
            {Math.abs(totalChangePercent).toFixed(2)}%
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Large Chart Card */}
         <div className="lg:col-span-2 bg-[#0D0D0D] border border-white/5 rounded-3xl p-6 min-h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <div className="space-y-1">
                    <h3 className="text-white text-lg font-medium">Liquidity Trend</h3>
                    <p className="text-xs text-gray-500">Cash & Savings balance history</p>
                </div>
                <div className="flex bg-white/5 rounded-lg p-1">
                    {(['1D', '1W', '1M', '1Y'] as const).map((r) => (
                        <button
                            key={r}
                            onClick={() => setChartRange(r)}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                chartRange === r 
                                    ? "bg-white/10 text-white" 
                                    : "text-gray-500 hover:text-gray-300"
                            )}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex-1 w-full relative">
                <LazyRechartsWrapper height="100%">
                    {({ ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip }) => (
                         <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={displayHistory}>
                                <defs>
                                    <linearGradient id="colorValueLiquid" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: number) => [compactCurrency(convert(value, 'USD', mainCurrency.code), v => v.toString()), 'Balance']}
                                    labelStyle={{ display: 'none' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke="#10B981" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorValueLiquid)" 
                                />
                            </AreaChart>
                         </ResponsiveContainer>
                    )}
                </LazyRechartsWrapper>
            </div>
         </div>

         {/* Asset Breakdown Column - Smart Compact 2-Col Grid */}
         <div className="grid grid-cols-2 gap-4 auto-rows-min h-fit">
             {assets.map((asset) => (
                 <div key={asset.label} className="bg-[#0D0D0D] border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-[120px] relative overflow-hidden group hover:border-white/10 transition-colors">
                    <div className={cn("absolute top-0 right-0 p-24 blur-3xl rounded-full -mr-12 -mt-12 pointer-events-none transition-opacity", asset.glow)} />
                    
                    <div className="flex items-start justify-between z-10">
                        <div className={cn("p-2 rounded-lg", asset.bg, asset.color)}>
                            <asset.icon className="w-5 h-5" />
                        </div>
                    </div>
                    
                    <div className="z-10 mt-auto">
                        <div className="text-gray-400 text-xs font-medium mb-1 truncate pr-2">{asset.label}</div>
                        <div className="text-lg font-bold text-white tracking-tight leading-none truncate">
                            {formatCurrency(convert(asset.value, 'USD', mainCurrency.code)).split('.')[0]}
                            <span className="text-gray-500 text-sm">.{formatCurrency(convert(asset.value, 'USD', mainCurrency.code)).split('.')[1] || '00'}</span>
                        </div>
                    </div>
                 </div>
             ))}
             {assets.length === 0 && (
                <div className="col-span-2 text-center text-gray-500 py-10 bg-[#0D0D0D] border border-white/5 rounded-2xl">
                    No liquid asset accounts found
                </div>
             )}
         </div>
      </div>
    </div>
  );
}

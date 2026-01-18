"use client";

import { useMemo, useState, useEffect } from "react";
import { ArrowUpRight, TrendingUp, Building2, Coins, LineChart, Wallet, Gem, Landmark } from "lucide-react";
import { useCurrency } from "../../contexts/currency-context";
import { usePortfolioValues } from "../../hooks/use-portfolio";
import { useFinancialData } from "../../contexts/financial-data-context";
import { LazyRechartsWrapper } from "../../components/ui/lazy-charts";
import { SupabaseDataService } from "../../lib/supabase/supabase-data-service";
import { cn } from "../../lib/utils";

// Helper to compact large numbers
const compactCurrency = (value: number, formatFn: (v: number) => string) => {
    if (value >= 1_000_000_000) return formatFn(value / 1_000_000_000) + 'B';
    if (value >= 1_000_000) return formatFn(value / 1_000_000) + 'M';
    if (value >= 1_000) return formatFn(value / 1_000) + 'K';
    return formatFn(value);
};

export function NetworthOverview() {
  const { formatCurrency, convert, mainCurrency } = useCurrency();
  const { crypto, stocks } = usePortfolioValues();
  const { cash, savings, valuableItems, realEstate, tradingAccount } = useFinancialData();
  const [chartRange, setChartRange] = useState<'1D' | '1W' | '1M' | '1Y'>('1M');
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  // Calculate totals
  const liquidAssets = cash + savings;
  const portfolioTotal = crypto.value + stocks.value + realEstate + valuableItems + liquidAssets + tradingAccount;

  // Calculate change
  const totalChange24h = crypto.change24h + stocks.change24h;
  const totalChangePercent = portfolioTotal > 0 ? (totalChange24h / (portfolioTotal - totalChange24h)) * 100 : 0;
  
  const displayTotal = convert(portfolioTotal, 'USD', mainCurrency.code);

  // Fetch true history (transactions + manual adds)
  useEffect(() => {
    const fetchHistory = async () => {
        try {
            const [
                cryptoTxs, 
                stockTxs, 
                properties, 
                valuables,
                cashAccounts // Using cash accounts to estimate liquidity history if possible
            ] = await Promise.all([
                SupabaseDataService.getCryptoTransactions(100), // Get specific limit or all
                SupabaseDataService.getStockTransactions(100),
                SupabaseDataService.getRealEstate(),
                SupabaseDataService.getValuableItems(),
                SupabaseDataService.getCashAccounts()
            ]);

            // Combine all events into a single timeline
            // Event = { date: timestamp, valueChange: number, type: string }
            const events: { date: number, value: number, type: string }[] = [];
            const now = Date.now();

            // 1. Crypto Transactions
            cryptoTxs.forEach(tx => {
                const date = new Date(tx.date).getTime();
                if (!isNaN(date)) {
                    events.push({ date, value: tx.totalValue || (tx.amount * tx.pricePerUnit), type: 'crypto' });
                }
            });

            // 2. Stock Transactions
            stockTxs.forEach(tx => {
                const date = new Date(tx.date).getTime();
                if (!isNaN(date)) {
                    events.push({ date, value: tx.totalValue || (tx.shares * tx.pricePerShare), type: 'stock' });
                }
            });

            // 3. Real Estate (Purchase Date)
            properties.forEach(p => {
                const date = p.purchaseDate ? new Date(p.purchaseDate).getTime() : now; 
                // If no date, assume added now or user needs to set it. 
                // Better UX: if no date, maybe default to created_at or just today.
                // We'll filter out future dates or invalid dates.
                
                // For simplified "Net Worth History", we add the FULL current value at purchase date
                // Ideally we would track appreciation, but linear interpolation is complex without multiple data points.
                // We will add the purchase price at purchase date, and maybe interpolate to current value?
                // For simplicity: Add Current Value at Add Date (step function)
                if (!isNaN(date)) {
                   events.push({ date, value: p.currentValue || 0, type: 'real_estate' });
                }
            });

            // 4. Valuables
            valuables.forEach(v => {
                const date = v.purchaseDate ? new Date(v.purchaseDate).getTime() : now;
                if (!isNaN(date)) {
                    events.push({ date, value: v.currentValue || 0, type: 'valuable' });
                }
            });

            // 5. Liquid Assets (Cash) - Treat current total as a baseline. 
            // Since we don't have transaction history for cash, we can assume it was accumulated linearly or is a constant baseline.
            // Or simpler: Add it as a baseline from the beginning of time (or 1 year ago).
            const cashTotal = cashAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
            
            // Sort events by date
            events.sort((a, b) => a.date - b.date);

            // Generate daily data points from 1 year ago to now
            const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
            const dataPoints: { date: number, value: number }[] = [];
            
            // Set start value (Liquid Assets as baseline + any events BEFORE oneYearAgo)
            let runningTotal = cashTotal; 
            
            // Add value of events that happened before the window
            events.filter(e => e.date < oneYearAgo).forEach(e => {
                runningTotal += e.value;
            });

            // Iterate day by day
            const dayMs = 24 * 60 * 60 * 1000;
            for (let time = oneYearAgo; time <= now; time += dayMs) {
                // Add events for this day (simplified)
                const dayEvents = events.filter(e => e.date >= time && e.date < time + dayMs);
                dayEvents.forEach(e => {
                    runningTotal += e.value;
                });
                
                // Add market fluctuation for crypto/stocks if we wanted to be super fancy,
                // but for now, just piece-wise constant additions + current value snapshot is fine.
                // Wait, runningTotal might exceed current total if we just sum up purchase prices.
                // We should probably normalize the end value to match the `portfolioTotal` we have now.
                
                dataPoints.push({
                    date: time,
                    value: runningTotal
                });
            }

            // Normalize: Scale the curve so the last point equals current `portfolioTotal`
            const lastVal = dataPoints[dataPoints.length - 1]?.value || 1;
            const scaleFactor = portfolioTotal / (lastVal || 1);
            
            const normalizedData = dataPoints.map(p => ({
                date: p.date, 
                value: p.value * scaleFactor 
            }));

            setHistoricalData(normalizedData);

        } catch (e) {
            console.error("Failed to fetch history for chart", e);
        }
    };
    
    fetchHistory();
  }, [portfolioTotal, cash]); // Re-run when total changes

  const displayHistory = useMemo(() => {
    // If no real history or it failed, fallback to simulated
    if (historicalData.length === 0) {
         const points = chartRange === '1D' ? 24 : chartRange === '1W' ? 7 : 30;
         const volatility = 0.02;
         let val = portfolioTotal;
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
    
    // Convert timestamps to readable names or just keep efficient
    return historicalData
        .filter(d => d.date >= startTime)
        .map(d => ({
            name: new Date(d.date).toLocaleDateString(),
            value: d.value
        }));

  }, [historicalData, chartRange, portfolioTotal]);

  const assets = [
    { label: "Real Estate", value: realEstate, icon: Building2, color: "text-blue-400", bg: "bg-blue-500/10", glow: "bg-blue-500/5" },
    { label: "Crypto", value: crypto.value, icon: Coins, color: "text-purple-400", bg: "bg-purple-500/10", glow: "bg-purple-500/5" },
    { label: "Stocks", value: stocks.value, icon: LineChart, color: "text-emerald-400", bg: "bg-emerald-500/10", glow: "bg-emerald-500/5" },
    { label: "Liquid Assets", value: liquidAssets, icon: Wallet, color: "text-cyan-400", bg: "bg-cyan-500/10", glow: "bg-cyan-500/5" },
    { label: "Trading", value: tradingAccount, icon: ArrowUpRight, color: "text-orange-400", bg: "bg-orange-500/10", glow: "bg-orange-500/5" },
    { label: "Valuables", value: valuableItems, icon: Gem, color: "text-pink-400", bg: "bg-pink-500/10", glow: "bg-pink-500/5" }
  ].filter(a => a.value > 0); // Only show assets with value

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-end justify-between">
        <div>
           <h2 className="text-gray-400 text-sm font-medium mb-1">Total Net Worth</h2>
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
                    <h3 className="text-white text-lg font-medium">Portfolio Performance</h3>
                    <p className="text-xs text-gray-500">History based on transaction dates</p>
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
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: number) => [compactCurrency(convert(value, 'USD', mainCurrency.code), v => v.toString()), 'Net Worth']}
                                    labelStyle={{ display: 'none' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke="#06b6d4" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorValue)" 
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
                        <div className="text-gray-400 text-xs font-medium mb-1">{asset.label}</div>
                        <div className="text-lg font-bold text-white tracking-tight leading-none truncate">
                            {formatCurrency(convert(asset.value, 'USD', mainCurrency.code)).split('.')[0]}
                            <span className="text-gray-500 text-sm">.{formatCurrency(convert(asset.value, 'USD', mainCurrency.code)).split('.')[1] || '00'}</span>
                        </div>
                    </div>
                 </div>
             ))}
             
         </div>
      </div>
    </div>
  );
}

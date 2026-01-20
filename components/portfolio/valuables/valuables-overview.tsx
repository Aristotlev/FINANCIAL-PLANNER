"use client";

import { useMemo, useState, useEffect } from "react";
import { TrendingUp, Gem, Watch, Palette, Smartphone, Trophy, Car, Camera, Package } from "lucide-react";
import { useCurrency } from "../../../contexts/currency-context";
import { useFinancialData } from "../../../contexts/financial-data-context";
import { LazyRechartsWrapper } from "../../../components/ui/lazy-charts";
import { SupabaseDataService } from "../../../lib/supabase/supabase-data-service";
import { cn } from "../../../lib/utils";
import { ValuableItem } from "../modals/add-valuable-item-modal";

// Helper to compact large numbers
const compactCurrency = (value: number, formatFn: (v: number) => string) => {
    if (value >= 1_000_000_000) return formatFn(value / 1_000_000_000) + 'B';
    if (value >= 1_000_000) return formatFn(value / 1_000_000) + 'M';
    if (value >= 1_000) return formatFn(value / 1_000) + 'K';
    return formatFn(value);
};

// Helper for dynamic icon based on category
const getItemIcon = (category: string) => {
    switch (category?.toLowerCase()) {
        case 'jewelry & watches': return Watch;
        case 'art & collectibles': return Palette;
        case 'electronics': return Smartphone;
        case 'collectibles': return Trophy;
        case 'automotive': return Car;
        case 'photography': return Camera;
        default: return Package;
    }
};

export function ValuablesOverview() {
  const { formatCurrency, convert, mainCurrency } = useCurrency();
  const { valuableItems } = useFinancialData();
  const [chartRange, setChartRange] = useState<'1D' | '1W' | '1M' | '1Y'>('1M');
  const [items, setItems] = useState<ValuableItem[]>([]);
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  // Calculate total (using context provided value which updates automatically)
  const displayTotal = convert(valuableItems, 'USD', mainCurrency.code);

  const calculateChange = () => {
    // Determine overall portfolio change based on items' purchase price vs current value
    // This gives an "All Time" change rather than a monthly change, which is often more relevant for valuables
    if (items.length === 0) return 0;
    
    let totalCurrent = 0;
    let totalPurchase = 0;
    
    items.forEach(item => {
        totalCurrent += item.currentValue || 0;
        totalPurchase += item.purchasePrice || 0;
    });
    
    if (totalPurchase === 0) return 0;
    return ((totalCurrent - totalPurchase) / totalPurchase) * 100;
  };
  
  const totalChangePercent = calculateChange();

  // Fetch items and construct history
  useEffect(() => {
    const fetchData = async () => {
        try {
            const fetchedItems = await SupabaseDataService.getValuableItems([]);
            setItems(fetchedItems as ValuableItem[]);

            // Construct synthetic history based on purchase dates
            const now = Date.now();
            const events: { date: number, value: number, purchase: number }[] = [];

            fetchedItems.forEach((item: ValuableItem) => {
                const date = item.purchaseDate ? new Date(item.purchaseDate).getTime() : now;
                events.push({ 
                    date, 
                    value: item.currentValue || 0,
                    purchase: item.purchasePrice || 0
                });
            });

            // Sort events
            events.sort((a, b) => a.date - b.date);

            // Generate daily data points from 1 year ago to now
            const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
            const dataPoints: { date: number, value: number }[] = [];
            
            let runningTotal = 0;
            
            // Initial state (accumulate everything before oneYearAgo)
            const validEvents = events.filter(e => e.date <= now);
            const eventsBeforeWindow = validEvents.filter(e => e.date < oneYearAgo);
            
            // Improve: Interpolate value growth from purchase date to now?
            // For simplicity: Item value jumps from 0 to 'purchasePrice' at purchase date, 
            // and then we could linearly interpolate to 'currentValue' at 'now'.
            
            // Let's implement linear interpolation for better chart visuals
            const calculateItemValueAtDate = (item: any, targetDate: number) => {
                const purchaseDate = item.purchaseDate ? new Date(item.purchaseDate).getTime() : now;
                if (targetDate < purchaseDate) return 0;
                
                const purchasePrice = item.purchasePrice || 0;
                const currentValue = item.currentValue || 0;
                
                // If purchased in future relative to targetDate (should be handled by < check above but safe guard)
                if (purchaseDate > now) return 0; 
                
                // If purchased just now or purchase is after now (impossible if logic correct), just return purchase 
                if (purchaseDate === now) return currentValue;

                // Linear interpolation
                const totalDuration = now - purchaseDate;
                const elapsed = targetDate - purchaseDate;
                const progress = Math.min(1, Math.max(0, elapsed / totalDuration));
                
                return purchasePrice + ((currentValue - purchasePrice) * progress);
            };

            const dayMs = 24 * 60 * 60 * 1000;
            for (let time = oneYearAgo; time <= now; time += dayMs) {
                let dailyTotal = 0;
                
                fetchedItems.forEach((item: any) => {
                     dailyTotal += calculateItemValueAtDate(item, time);
                });
                
                dataPoints.push({
                    date: time,
                    value: dailyTotal
                });
            }
            
            setHistoricalData(dataPoints);

        } catch (e) {
            console.error("Failed to fetch valuable items", e);
        }
    };
    
    fetchData();
  }, [valuableItems]);

  const displayHistory = useMemo(() => {
    // If no real history or it failed, fallback to flat line of current total
    if (historicalData.length === 0) {
         return Array.from({ length: 30 }).map((_, i) => ({
             name: i.toString(),
             value: valuableItems
         }));
    }

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

  }, [historicalData, chartRange, valuableItems]);

  // Sort items by value descending
  const sortedItems = [...items].sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-end justify-between">
        <div>
           <h2 className="text-gray-400 text-sm font-medium mb-1">Total Asset Value</h2>
           <div className="text-6xl font-bold text-white tracking-tight">
             {formatCurrency(displayTotal)}
             {/* <span className="text-2xl text-gray-500 font-normal ml-2">est.</span> */}
           </div>
        </div>
        <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-2",
            // For valuables, Increase is Good (Green)
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
                    <h3 className="text-white text-lg font-medium">Value Performance</h3>
                    <p className="text-xs text-gray-500">Asset value history</p>
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
                    {({ ResponsiveContainer, AreaChart, Area, Tooltip }: any) => (
                         <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={displayHistory}>
                                <defs>
                                    <linearGradient id="colorValuables" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: number) => [compactCurrency(convert(value, 'USD', mainCurrency.code), v => v.toString()), 'Value']}
                                    labelStyle={{ display: 'none' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke="#8b5cf6" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorValuables)" 
                                />
                            </AreaChart>
                         </ResponsiveContainer>
                    )}
                </LazyRechartsWrapper>
            </div>
         </div>

         {/* Asset Breakdown Column: Valuable Items */}
         <div className="flex flex-col gap-4 h-[400px] overflow-y-auto pr-2 scrollbar-hide">
             {sortedItems.length === 0 ? (
                 <div className="flex items-center justify-center h-full text-gray-500 bg-[#0D0D0D] border border-white/5 rounded-2xl">
                     No items added
                 </div>
             ) : (
                sortedItems.map((item) => {
                    const Icon = getItemIcon(item.category);
                    return (
                        <div key={item.id} className="bg-[#0D0D0D] border border-white/5 rounded-2xl p-4 flex flex-col justify-between min-h-[120px] relative overflow-hidden group hover:border-white/10 transition-colors shrink-0">
                            {/* Glow effect */}
                            <div className="absolute top-0 right-0 p-24 blur-3xl rounded-full -mr-12 -mt-12 pointer-events-none opacity-20 transition-opacity" style={{ backgroundColor: item.color || '#8b5cf6' }} />
                            
                            <div className="flex items-start justify-between z-10">
                                <div className="p-2 rounded-lg bg-neutral-800/50">
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-xs text-gray-500 font-medium px-2 py-1 bg-white/5 rounded-full">
                                    {item.category}
                                </div>
                            </div>
                            
                            <div className="z-10 mt-auto">
                                <div className="text-gray-400 text-xs font-medium mb-1">{item.name}</div>
                                <div className="text-lg font-bold text-white tracking-tight leading-none truncate">
                                    {formatCurrency(convert(item.currentValue || 0, 'USD', mainCurrency.code)).split('.')[0]}
                                    <span className="text-gray-500 text-sm">.{formatCurrency(convert(item.currentValue || 0, 'USD', mainCurrency.code)).split('.')[1] || '00'}</span>
                                </div>
                            </div>
                        </div>
                    );
                })
             )}
         </div>
      </div>
    </div>
  );
}

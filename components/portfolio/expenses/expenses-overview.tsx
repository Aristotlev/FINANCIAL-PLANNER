"use client";

import { useMemo, useState, useEffect } from "react";
import { TrendingUp, CreditCard, ShoppingCart, Home, Car, Zap, Coffee, Phone, Plane } from "lucide-react";
import { useCurrency } from "../../../contexts/currency-context";
import { useFinancialData } from "../../../contexts/financial-data-context";
import { LazyRechartsWrapper } from "../../../components/ui/lazy-charts";
import { SupabaseDataService } from "../../../lib/supabase/supabase-data-service";
import { cn } from "../../../lib/utils";
import { ExpenseCategory } from "../modals/add-expense-category-modal";

// Extended interface to include optional fields from DB
interface ExpenseCategoryExtended extends ExpenseCategory {
    frequency?: string;
    created_at?: string;
}

// Helper to compact large numbers
const compactCurrency = (value: number, formatFn: (v: number) => string) => {
    if (value >= 1_000_000_000) return formatFn(value / 1_000_000_000) + 'B';
    if (value >= 1_000_000) return formatFn(value / 1_000_000) + 'M';
    if (value >= 1_000) return formatFn(value / 1_000) + 'K';
    return formatFn(value);
};

// Helper for dynamic icon
const getCategoryIcon = (iconName: string) => {
    switch (iconName?.toLowerCase()) {
        case 'home': return Home;
        case 'transport': return Car;
        case 'utilities': return Zap;
        case 'food': return Coffee;
        case 'shopping': return ShoppingCart;
        case 'communication': return Phone;
        case 'travel': return Plane;
        default: return CreditCard;
    }
};

export function ExpensesOverview() {
  const { formatCurrency, convert, mainCurrency } = useCurrency();
  const { expenses } = useFinancialData();
  const [chartRange, setChartRange] = useState<'1D' | '1W' | '1M' | '1Y'>('1M');
  const [categories, setCategories] = useState<ExpenseCategoryExtended[]>([]);
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  // Calculate total (using context provided value which updates automatically)
  // Or recalculate from categories if we want immediate feedback on deletion from this view
  const displayTotal = convert(expenses, 'USD', mainCurrency.code);

  const calculateChange = () => {
    // We don't have a direct "last month" value, so we can't calculate change precisely 
    // without more history data. For now, defaulting to 0 or simulating.
    return 0; // Placeholder
  };
  
  const totalChangePercent = calculateChange();

  // Fetch categories and construct history
  useEffect(() => {
    const fetchData = async () => {
        try {
            const cats = await SupabaseDataService.getExpenseCategories();
            setCategories(cats as ExpenseCategoryExtended[]);

            // Construct history based on created_at dates if available
            // If created_at is missing (legacy), assume they existed for the whole period or default to now
            const now = Date.now();
            const events: { date: number, value: number }[] = [];

            cats.forEach((cat: any) => {
                const date = cat.created_at ? new Date(cat.created_at).getTime() : now;
                events.push({ date, value: cat.amount });
            });

            // Sort events
            events.sort((a, b) => a.date - b.date);

            // Generate daily data points from 1 year ago to now
            const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
            const dataPoints: { date: number, value: number }[] = [];
            
            let runningTotal = 0;
            
            // Initial state (accumulate everything before oneYearAgo if any)
            // If most don't have created_at, they will appear at 'now', making previous history 0.
            // Improve: if created_at is strictly invalid/missing, assume it was there from start (baseline).
            const validEvents = events.filter(e => e.date <= now);
            const eventsBeforeWindow = validEvents.filter(e => e.date < oneYearAgo);
            
             // If no dates, treat all as baseline
            if (events.every((e: any) => !e.created_at || new Date(e.created_at).getTime() === now)) {
                 runningTotal = expenses; // All current expenses
            } else {
                 eventsBeforeWindow.forEach(e => runningTotal += e.value);
            }

            const dayMs = 24 * 60 * 60 * 1000;
            for (let time = oneYearAgo; time <= now; time += dayMs) {
                // Add events for this day
                const dayEvents = validEvents.filter(e => e.date >= time && e.date < time + dayMs);
                dayEvents.forEach(e => {
                    // Only add if we didn't treat everything as baseline
                     if (!events.every((ev: any) => !ev.created_at || new Date(ev.created_at).getTime() === now)) {
                        runningTotal += e.value;
                     }
                });
                
                dataPoints.push({
                    date: time,
                    value: runningTotal
                });
            }
            
            setHistoricalData(dataPoints);

        } catch (e) {
            console.error("Failed to fetch expense categories", e);
        }
    };
    
    fetchData();
  }, [expenses]);

  const displayHistory = useMemo(() => {
    // If no real history or it failed, fallback to flat line of current total
    if (historicalData.length === 0) {
         return Array.from({ length: 30 }).map((_, i) => ({
             name: i.toString(),
             value: expenses
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

  }, [historicalData, chartRange, expenses]);

  // Sort categories by amount descending
  const sortedCategories = [...categories].sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-end justify-between">
        <div>
           <h2 className="text-gray-400 text-sm font-medium mb-1">Total Monthly Expenses</h2>
           <div className="text-6xl font-bold text-white tracking-tight">
             {formatCurrency(displayTotal)}
             <span className="text-2xl text-gray-500 font-normal ml-2">/mo</span>
           </div>
        </div>
        <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-2",
            // For expenses, increase (positive change) is typically "bad" (red), decrease is "good" (green)
            // But if we just show direction...
            // Let's stick to standard: Green = Up, Red = Down for numbers, 
            // OR Green = Good. Let's keep consistency with Networth (Up is Green usually for Value, but for Expenses?)
            // Usually Expenses Up = Red. 
            totalChangePercent <= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
        )}>
           {/* Placeholder direction */}
            {totalChangePercent > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingUp className="w-4 h-4 rotate-180" />}
            {Math.abs(totalChangePercent).toFixed(2)}%
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Large Chart Card */}
         <div className="lg:col-span-2 bg-[#0D0D0D] border border-white/5 rounded-3xl p-6 min-h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <div className="space-y-1">
                    <h3 className="text-white text-lg font-medium">Expense Analysis</h3>
                    <p className="text-xs text-gray-500">Monthly spending history</p>
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
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: number) => [compactCurrency(convert(value, 'USD', mainCurrency.code), v => v.toString()), 'Expenses']}
                                    labelStyle={{ display: 'none' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke="#ef4444" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorExpense)" 
                                />
                            </AreaChart>
                         </ResponsiveContainer>
                    )}
                </LazyRechartsWrapper>
            </div>
         </div>

         {/* Asset Breakdown Column equivalent: Expense Categories */}
         {/* We use a scrollable container if there are many items, or limit to top N */}
         <div className="flex flex-col gap-4 h-[400px] overflow-y-auto pr-2 scrollbar-hide">
             {sortedCategories.length === 0 ? (
                 <div className="flex items-center justify-center h-full text-gray-500 bg-[#0D0D0D] border border-white/5 rounded-2xl">
                     No expenses added
                 </div>
             ) : (
                sortedCategories.map((category) => {
                    const Icon = getCategoryIcon(category.icon || '');
                    return (
                        <div key={category.id} className="bg-[#0D0D0D] border border-white/5 rounded-2xl p-4 flex flex-col justify-between min-h-[120px] relative overflow-hidden group hover:border-white/10 transition-colors shrink-0">
                            {/* Glow effect with custom color if available */}
                            <div className="absolute top-0 right-0 p-24 blur-3xl rounded-full -mr-12 -mt-12 pointer-events-none opacity-20 transition-opacity" style={{ backgroundColor: category.color || '#ef4444' }} />
                            
                            <div className="flex items-start justify-between z-10">
                                <div className="p-2 rounded-lg bg-neutral-800/50">
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-xs text-gray-500 font-medium px-2 py-1 bg-white/5 rounded-full">
                                    {category.frequency || 'Monthly'}
                                </div>
                            </div>
                            
                            <div className="z-10 mt-auto">
                                <div className="text-gray-400 text-xs font-medium mb-1">{category.name}</div>
                                <div className="text-lg font-bold text-white tracking-tight leading-none truncate">
                                    {formatCurrency(convert(category.amount, 'USD', mainCurrency.code)).split('.')[0]}
                                    <span className="text-gray-500 text-sm">.{formatCurrency(convert(category.amount, 'USD', mainCurrency.code)).split('.')[1] || '00'}</span>
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

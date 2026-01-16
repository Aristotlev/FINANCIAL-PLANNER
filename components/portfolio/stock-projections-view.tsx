"use client";

import { useEffect, useState } from "react";
import { usePortfolioContext, StockHolding } from "../../contexts/portfolio-context";
import { useAssetPrices } from "../../hooks/use-price";
import { SupabaseDataService } from "../../lib/supabase/supabase-data-service";
import { cn } from "../../lib/utils";
import { Target, Bell, AlertTriangle, DollarSign, Save, Clock } from "lucide-react";
import { useBetterAuth } from "../../contexts/better-auth-context";

interface ExtendedStockHolding extends StockHolding {
    targetPrice?: number;
    alertEnabled?: boolean;
}

export function StockProjectionsView() {
    const { stockHoldings, setStockHoldings } = usePortfolioContext();
    const { user } = useBetterAuth();
    const symbols = stockHoldings.map(h => h.symbol);
    const { prices } = useAssetPrices(symbols);
    
    // Local state to manage edits before saving
    const [holdings, setHoldings] = useState<ExtendedStockHolding[]>([]);
    const [saving, setSaving] = useState<string | null>(null); // ID of holding being saved
    const [settingAlarm, setSettingAlarm] = useState<string | null>(null); // ID of holding setting alarm

    useEffect(() => {
        // Initialize local state from context
        const initializedHoldings = stockHoldings.map(h => ({
             ...h,
             targetPrice: (h as any).targetPrice || h.entryPoint * 1.5, // Default target 50% up if not set
             alertEnabled: (h as any).alertEnabled || false
        }));
        setHoldings(initializedHoldings);
    }, [stockHoldings]);

    const handleTargetPriceChange = (id: string, value: string) => {
        const numValue = parseFloat(value);
        setHoldings(prev => prev.map(h => 
            h.id === id ? { ...h, targetPrice: isNaN(numValue) ? 0 : numValue } : h
        ));
    };

    const handleSaveProjection = async (holding: ExtendedStockHolding) => {
        setSaving(holding.id);
        try {
            const updatedHolding = {
                ...holding,
                // Pass these through assuming DB or local type extensions support it
                targetPrice: holding.targetPrice,
                alertEnabled: holding.alertEnabled
            };
            
            // Update context (optimistic)
            setStockHoldings(stockHoldings.map(h => h.id === holding.id ? updatedHolding : h));
            
            // Persist
            await SupabaseDataService.saveStockHolding(updatedHolding);

            // If alert is enabled, we should register it with the backend alert system
            if (holding.alertEnabled) {
                await registerSystemAlarm(holding);
            }

        } catch (error) {
            console.error("Failed to save projection", error);
        } finally {
            setSaving(null);
        }
    };

    const registerSystemAlarm = async (holding: ExtendedStockHolding) => {
        setSettingAlarm(holding.id);
        try {
            const currentPrice = prices[holding.symbol]?.price || holding.value / holding.shares;
            const res = await fetch('/api/alerts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: holding.symbol,
                    targetPrice: holding.targetPrice,
                    condition: (holding.targetPrice || 0) > currentPrice ? 'above' : 'below',
                    userEmail: user?.email,
                    type: 'stock'
                })
            });
            
            if (!res.ok) {
                throw new Error("Failed to register alarm");
            }
        } catch (e) {
            console.error("Alarm registration failed", e);
        } finally {
            setSettingAlarm(null);
        }
    };

    const toggleAlert = (id: string) => {
        setHoldings(prev => {
            const next = prev.map(h => {
                if (h.id === id) {
                    return { ...h, alertEnabled: !h.alertEnabled };
                }
                return h;
            });
            // Automatically save when toggling
            const changed = next.find(h => h.id === id);
            if (changed) {
                setTimeout(() => handleSaveProjection(changed), 0);
            }
            return next;
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Target className="h-6 w-6 text-purple-400" />
                    Stock Exit Strategy & Projections
                </h2>
                <p className="text-gray-400">Plan your exit points and set system alarms for your stock positions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {holdings.map((holding) => {
                    const currentPrice = prices[holding.symbol]?.price || (holding.value / holding.shares);
                    const entryPrice = holding.entryPoint;
                    const targetPrice = holding.targetPrice || 0;
                    
                    // Calculations
                    const percentGainToTarget = entryPrice > 0 ? ((targetPrice - entryPrice) / entryPrice) * 100 : 0;
                    const projectedValue = holding.shares * targetPrice;
                    const projectedProfit = projectedValue - (holding.shares * entryPrice);
                    const currentProgress = targetPrice > entryPrice 
                        ? Math.min(100, Math.max(0, ((currentPrice - entryPrice) / (targetPrice - entryPrice)) * 100))
                        : 0;

                    return (
                        <div key={holding.id} className="group bg-[#0D0D0D] border border-gray-800 rounded-3xl p-6 relative overflow-hidden transition-all hover:border-gray-700 hover:shadow-lg hover:shadow-purple-900/10">
                            {/* Card Header with Icon */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-gray-900/50 border border-gray-800 flex items-center justify-center p-2 group-hover:border-gray-700 transition-colors">
                                        <span className="text-sm font-bold text-purple-400">{holding.symbol.substring(0, 2)}</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">{holding.name}</h3>
                                        <div className="text-xs text-gray-400 font-mono">{holding.shares} shares</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 mb-0.5">Current</div>
                                    <div className="font-mono text-white text-sm">${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                </div>
                            </div>

                            {/* Target Input Section */}
                            <div className="mb-6">
                                <label className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-2 block">Exit Target Price</label>
                                <div className="relative group/input">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within/input:text-purple-400 transition-colors" />
                                    <input 
                                        type="number" 
                                        value={targetPrice} 
                                        onChange={(e) => handleTargetPriceChange(holding.id, e.target.value)}
                                        className="w-full bg-[#151515] border border-gray-800 rounded-xl py-3 pl-9 pr-3 text-white font-mono text-lg focus:outline-none focus:border-purple-500/50 focus:bg-[#1a1a1a] transition-all placeholder-gray-700"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            {/* Mini Stats Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="bg-[#151515] rounded-xl p-3 border border-gray-800/50 group-hover:border-gray-700 transition-colors">
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Gain</span>
                                    <div className={cn("text-base font-bold flex items-center gap-1", percentGainToTarget >= 0 ? "text-green-400" : "text-red-400")}>
                                        {percentGainToTarget.toFixed(0)}%
                                    </div>
                                </div>
                                <div className="bg-[#151515] rounded-xl p-3 border border-gray-800/50 group-hover:border-gray-700 transition-colors">
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Profit</span>
                                    <div className="text-base font-bold text-green-400">
                                        +${projectedProfit.toLocaleString(undefined, { maximumFractionDigits: 0, notation: "compact" })}
                                    </div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-6 relative pt-2">
                                <div className="absolute top-0 right-0 text-[10px] text-gray-500 flex items-center gap-1">
                                    <span className={cn("font-medium", currentProgress >= 100 ? "text-purple-400" : "text-gray-400")}>{currentProgress.toFixed(0)}%</span>
                                    to target
                                </div>
                                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-purple-600 to-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-all duration-500"
                                        style={{ width: `${currentProgress}%` }}
                                    />
                                </div>
                            </div>

                            {/* Compact Actions */}
                            <div className="flex items-center gap-2 mb-2">
                                <button 
                                    onClick={() => toggleAlert(holding.id)}
                                    disabled={settingAlarm === holding.id}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all border",
                                        holding.alertEnabled 
                                            ? "bg-purple-950/30 text-purple-400 border-purple-500/30 hover:bg-purple-900/20" 
                                            : "bg-gray-800/50 text-gray-400 border-transparent hover:bg-gray-800 hover:text-white"
                                    )}
                                >
                                    {settingAlarm === holding.id ? (
                                        <Clock className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Bell className={cn("h-3.5 w-3.5", holding.alertEnabled && "fill-current")} />
                                    )}
                                    {holding.alertEnabled ? "Active" : "Alarm"}
                                </button>
                                
                                <button 
                                    onClick={() => handleSaveProjection(holding)}
                                    disabled={saving === holding.id}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white text-black hover:bg-gray-200 rounded-xl text-xs font-bold transition-colors shadow-lg disabled:opacity-50 border border-transparent"
                                >
                                    {saving === holding.id ? (
                                        <div className="h-3.5 w-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    ) : (
                                        <Save className="h-3.5 w-3.5" />
                                    )}
                                    Save
                                </button>
                            </div>

                            {/* Subtle Pro-tip */}
                            {holding.alertEnabled && (
                                <div className="absolute top-4 right-4 group">
                                    <div className="h-1.5 w-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse" />
                                </div>
                            )}

                            {/* Brand Bottom Stripe */}
                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    );
                })}
                
                {holdings.length === 0 && (
                    <div className="col-span-full text-center py-20 text-gray-600 bg-[#0D0D0D] rounded-3xl border border-gray-800 border-dashed">
                        <Target className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="text-sm">No stock holdings found for projections.</p>
                    </div>
                )}
            </div>

            <div className="mt-8 pt-8 border-t border-gray-800 flex justify-center">
                <p className="text-xs text-gray-600 flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3" />
                    Projections are estimates based on your set targets. Market conditions may vary.
                </p>
            </div>
        </div>
    );
}

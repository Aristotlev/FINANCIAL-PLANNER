"use client";

import { useEffect, useState } from "react";
import { usePortfolioContext } from "../../../contexts/portfolio-context";
import { useCurrency } from "../../../contexts/currency-context";
import { Bot, RefreshCw, AlertTriangle, ShieldCheck, TrendingUp, Brain, PieChart } from "lucide-react";
import { SupabaseDataService } from "../../../lib/supabase/supabase-data-service";
import { cn } from "../../../lib/utils";

export function NetworthAIAnalyticsView() {
  const { cryptoHoldings, stockHoldings, portfolioValues } = usePortfolioContext();
  const { formatCurrency } = useCurrency();
  
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for other assets
  const [realEstate, setRealEstate] = useState<any[]>([]);
  const [cashAccounts, setCashAccounts] = useState<any[]>([]);
  const [valuables, setValuables] = useState<any[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const loadOtherAssets = async () => {
        try {
            const [re, ca, va] = await Promise.all([
                SupabaseDataService.getRealEstate(),
                SupabaseDataService.getCashAccounts(),
                SupabaseDataService.getValuableItems()
            ]);
            setRealEstate(re);
            setCashAccounts(ca);
            setValuables(va);
            setDataLoaded(true);
        } catch (e) {
            console.error("Failed to load networth assets", e);
            setDataLoaded(true); // Proceed anyway with partial data
        }
    };
    loadOtherAssets();
  }, []);

  const generateAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      // Calculate totals
      const cryptoTotal = portfolioValues.crypto.value;
      const stockTotal = portfolioValues.stocks.value;
      const realEstateTotal = realEstate.reduce((acc, item) => acc + (item.currentValue || 0), 0);
      const cashTotal = cashAccounts.reduce((acc, item) => acc + (item.balance || 0), 0);
      const valuablesTotal = valuables.reduce((acc, item) => acc + (item.currentValue || 0), 0);
      
      const totalNetWorth = cryptoTotal + stockTotal + realEstateTotal + cashTotal + valuablesTotal;

      if (totalNetWorth === 0) {
        setAnalysis("Your net worth is currently $0. Add assets to your portfolio (Crypto, Stocks, Real Estate, Cash, or Valuables) to get AI insights.");
        setLoading(false);
        return;
      }

      // Construct summary for AI
      const assetsSummary = `
      - Crypto: $${cryptoTotal.toFixed(2)} (${((cryptoTotal/totalNetWorth)*100).toFixed(1)}%)
      - Stocks: $${stockTotal.toFixed(2)} (${((stockTotal/totalNetWorth)*100).toFixed(1)}%)
      - Real Estate: $${realEstateTotal.toFixed(2)} (${((realEstateTotal/totalNetWorth)*100).toFixed(1)}%)
      - Cash/Liquid: $${cashTotal.toFixed(2)} (${((cashTotal/totalNetWorth)*100).toFixed(1)}%)
      - Valuables: $${valuablesTotal.toFixed(2)} (${((valuablesTotal/totalNetWorth)*100).toFixed(1)}%)
      `;

      const prompt = `
        I am a high net worth individual with the following asset allocation:
        
        Total Net Worth: $${totalNetWorth.toFixed(2)}
        
        Breakdown:
        ${assetsSummary}

        Please act as an expert wealth manager and financial planner. Provide a comprehensive analysis of my total net worth composition including:
        1. Asset Allocation Rating (1-10) based on standard wealth management principles
        2. Liquidity Analysis (Are there enough liquid assets vs illiquid?)
        3. Risk Profile Assessment based on the mix
        4. Diversification Check (Am I too heavy in one category?)
        5. Strategic Optimization Suggestions for long term growth and stability
        
        Format the response with clear headings and bullet points. Keep it professional, objective, and concise. Do not include financial advice disclaimers as this is a simulation.
      `;

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setAnalysis(data.text);
    } catch (err: any) {
      const errorMessage = err.message || "Unknown error occurred";
      setError(errorMessage);
      console.error("AI Analysis Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Generate analysis on mount if data is loaded and not already present
    if (dataLoaded && !analysis && !loading) {
      generateAnalysis();
    }
  }, [dataLoaded]); // Depend on dataLoaded

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-400" />
            Net Worth AI Analysis
          </h2>
          <p className="text-gray-400 text-sm">Holistic wealth management insights across all asset classes</p>
        </div>
        
        <button
          onClick={generateAnalysis}
          disabled={loading || !dataLoaded}
          className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-gray-800 rounded-lg text-sm font-medium transition-colors border border-gray-800 text-gray-300 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          {loading ? "Analyzing..." : "Refresh Analysis"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
             <div className="p-2 bg-blue-500/10 rounded-lg">
                <PieChart className="h-5 w-5 text-blue-500" />
             </div>
             <h3 className="font-medium text-gray-200">Asset Classes</h3>
          </div>
          <p className="text-3xl font-bold text-white">5</p>
          <p className="text-sm text-gray-500 mt-1">Categories tracked</p>
        </div>

        <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
             <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
             </div>
             <h3 className="font-medium text-gray-200">Primary Asset</h3>
          </div>
          <p className="text-3xl font-bold text-white">
             {dataLoaded ? (() => {
                 const totals = [
                     { name: 'Crypto', value: portfolioValues.crypto.value },
                     { name: 'Stocks', value: portfolioValues.stocks.value },
                     { name: 'Real Estate', value: realEstate.reduce((a, b) => a + (b.currentValue || 0), 0) },
                     { name: 'Cash', value: cashAccounts.reduce((a, b) => a + (b.balance || 0), 0) },
                     { name: 'Valuables', value: valuables.reduce((a, b) => a + (b.currentValue || 0), 0) }
                 ];
                 const max = totals.reduce((prev, current) => (prev.value > current.value) ? prev : current);
                 return max.value > 0 ? max.name : "None";
             })() : "..."}
          </p>
          <p className="text-sm text-gray-500 mt-1">Largest allocation</p>
        </div>

        <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
             <div className="p-2 bg-purple-500/10 rounded-lg">
                <Bot className="h-5 w-5 text-purple-500" />
             </div>
             <h3 className="font-medium text-gray-200">AI Status</h3>
          </div>
          <p className="text-3xl font-bold text-white">{loading ? "Processing" : "Active"}</p>
          <p className="text-sm text-gray-500 mt-1">Full wealth scan</p>
        </div>
      </div>

      <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-8 relative overflow-hidden min-h-[400px]">
        {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0D0D0D] z-10">
                <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Bot className="h-6 w-6 text-purple-500" />
                    </div>
                </div>
                <h3 className="mt-4 text-lg font-medium text-white">Analyzing Wealth Structure...</h3>
                <p className="text-gray-500">Processing allocation and liquidity metrics</p>
            </div>
        ) : error ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Analysis Failed</h3>
                <p className="text-gray-500 max-w-md">{error}</p>
                <button 
                    onClick={generateAnalysis}
                    className="mt-6 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                >
                    Try Again
                </button>
            </div>
        ) : (
            <div className="prose prose-invert max-w-none">
                {analysis ? (
                    <div className="whitespace-pre-line leading-relaxed text-gray-300">
                        {analysis.split('**').map((part, i) => 
                            i % 2 === 1 ? <strong key={i} className="text-purple-400">{part}</strong> : part
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        No net worth data available for analysis.
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}

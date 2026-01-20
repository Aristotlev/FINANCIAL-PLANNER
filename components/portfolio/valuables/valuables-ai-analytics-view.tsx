"use client";

import { useEffect, useState } from "react";
import { useCurrency } from "../../../contexts/currency-context";
import { Bot, RefreshCw, AlertTriangle, Gem, TrendingUp, Brain, Layers } from "lucide-react";
import { SupabaseDataService } from "../../../lib/supabase/supabase-data-service";
import { cn } from "../../../lib/utils";

export function ValuablesAIAnalyticsView() {
  const { formatCurrency } = useCurrency();
  
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [valuables, setValuables] = useState<any[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const loadValuables = async () => {
        try {
            const items = await SupabaseDataService.getValuableItems([]);
            setValuables(items);
            setDataLoaded(true);
        } catch (e) {
            console.error("Failed to load valuable items", e);
            setDataLoaded(true);
        }
    };
    loadValuables();
  }, []);

  const generateAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const valuablesTotal = valuables.reduce((acc, item) => acc + (item.currentValue || 0), 0);

      if (valuablesTotal === 0 && valuables.length === 0) {
        setAnalysis("You have no valuable items tracked. Add items (Jewelry, Art, Collectibles, etc.) to get AI insights on your tangible asset portfolio.");
        setLoading(false);
        return;
      }

      // Categorize and summarize
      const categories: Record<string, number> = {};
      valuables.forEach(item => {
        const cat = item.category || 'Other';
        categories[cat] = (categories[cat] || 0) + (item.currentValue || 0);
      });

      let categorySummary = "";
      Object.entries(categories).forEach(([cat, val]) => {
          categorySummary += `- ${cat}: $${val.toFixed(2)} (${((val/valuablesTotal)*100).toFixed(1)}%)\n`;
      });
      
      const topItems = valuables
        .sort((a, b) => b.currentValue - a.currentValue)
        .slice(0, 5)
        .map(item => `- ${item.name}: $${item.currentValue.toFixed(2)}`)
        .join('\n');

      const prompt = `
        I am a collector and investor with the following valuable items portfolio:
        
        Total Value: $${valuablesTotal.toFixed(2)}
        
        Category Breakdown:
        ${categorySummary}
        
        Top 5 Highest Value Items:
        ${topItems}

        Please act as an expert appraiser and alternative asset investment advisor. Provide a comprehensive analysis of my valuable items collection including:
        1. Portfolio Composition Rating (1-10) based on collectibility and investment grade
        2. Market Liquidity Assessment (How easy is it to sell these types of items?)
        3. Appreciation Potential Analysis for the major categories held
        4. Concentration Risk (Am I too heavy in one type of collectible?)
        5. Strategic Recommendations for future acquisitions or divestments
        
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
    // Only auto-generate if we have some data to avoid "No items" unnecessary calls if empty
    if (dataLoaded && !analysis && !loading && valuables.length > 0) {
      generateAnalysis();
    } else if (dataLoaded && valuables.length === 0 && !analysis) {
        setAnalysis("No valuable items found. Please add items to your portfolio to generate an analysis.");
    }
  }, [dataLoaded]); 

  const getPrimaryCategory = () => {
      if (valuables.length === 0) return "None";
      const categories: Record<string, number> = {};
      valuables.forEach(item => {
        const cat = item.category || 'Other';
        categories[cat] = (categories[cat] || 0) + (item.currentValue || 0);
      });
      let maxCat = "";
      let maxVal = 0;
      Object.entries(categories).forEach(([cat, val]) => {
          if (val > maxVal) {
              maxVal = val;
              maxCat = cat;
          }
      });
      return maxCat;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-400" />
            Valuables AI Analysis
          </h2>
          <p className="text-gray-400 text-sm">Appraisal and investment insights for your collection</p>
        </div>
        
        <button
          onClick={generateAnalysis}
          disabled={loading || !dataLoaded || valuables.length === 0}
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
                <Layers className="h-5 w-5 text-blue-500" />
             </div>
             <h3 className="font-medium text-gray-200">Total Items</h3>
          </div>
          <p className="text-3xl font-bold text-white">{valuables.length}</p>
          <p className="text-sm text-gray-500 mt-1">Tracked assets</p>
        </div>

        <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
             <div className="p-2 bg-green-500/10 rounded-lg">
                <Gem className="h-5 w-5 text-green-500" />
             </div>
             <h3 className="font-medium text-gray-200">Top Category</h3>
          </div>
          <p className="text-3xl font-bold text-white truncate pr-2">
             {dataLoaded ? getPrimaryCategory() : "..."}
          </p>
          <p className="text-sm text-gray-500 mt-1">Highest value allocation</p>
        </div>

        <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
             <div className="p-2 bg-purple-500/10 rounded-lg">
                <Bot className="h-5 w-5 text-purple-500" />
             </div>
             <h3 className="font-medium text-gray-200">AI Status</h3>
          </div>
          <p className="text-3xl font-bold text-white">{loading ? "Appraising" : "Active"}</p>
          <p className="text-sm text-gray-500 mt-1">Market analysis</p>
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
                <h3 className="mt-4 text-lg font-medium text-white">Analyzing Collection...</h3>
                <p className="text-gray-500">Evaluating market trends and liquidity</p>
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
                        No valuable items data available for analysis.
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}

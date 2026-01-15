"use client";

import { useEffect, useState } from "react";
import { usePortfolioContext } from "../../contexts/portfolio-context";
import { useCurrency } from "../../contexts/currency-context";
import { Bot, RefreshCw, AlertTriangle, ShieldCheck, TrendingUp, Brain } from "lucide-react";
import { cn } from "../../lib/utils";

export function StockAIAnalyticsView() {
  const { stockHoldings } = usePortfolioContext();
  const { formatCurrency } = useCurrency();
  
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAnalysis = async () => {
    if (stockHoldings.length === 0) {
      setAnalysis("You don't have any stock holdings to analyze yet. Add some positions to get AI insights.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Construct prompt from holdings
      const holdingsSummary = stockHoldings.map(h => 
        `- ${h.name} (${h.symbol}): ${h.shares} shares, value ${h.value}, entry ${h.entryPoint}`
      ).join('\n');

      const totalValue = stockHoldings.reduce((sum, h) => sum + (typeof h.value === 'string' ? parseFloat(h.value) : h.value), 0);

      const prompt = `
        I am a stock market investor with the following portfolio:
        
        ${holdingsSummary}
        
        Total Portfolio Value: $${totalValue}

        Please act as an expert financial stock analyst. Provide a comprehensive analysis of my portfolio including:
        1. Portfolio Allocation & Sector Diversification Rating (1-10)
        2. Risk Assessment (Low/Medium/High) and why
        3. Strengths of this composition (e.g. Dividend yield, Growth potential, Stability)
        4. Weaknesses or potential exposure risks (e.g. Sector concentration, High beta)
        5. Strategic suggestions for optimization
        
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
    // Generate analysis on mount if not already present
    if (!analysis && !loading) {
      generateAnalysis();
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-400" />
            Stock Portfolio Intelligence
          </h2>
          <p className="text-gray-400 text-sm">Deep learning analysis of your equity assets</p>
        </div>
        
        <button
          onClick={generateAnalysis}
          disabled={loading}
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
                <ShieldCheck className="h-5 w-5 text-blue-500" />
             </div>
             <h3 className="font-medium text-gray-200">Asset Count</h3>
          </div>
          <p className="text-3xl font-bold text-white">{stockHoldings.length}</p>
          <p className="text-sm text-gray-500 mt-1">Unique positions tracked</p>
        </div>

        <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
             <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
             </div>
             <h3 className="font-medium text-gray-200">Top Performer</h3>
          </div>
          <p className="text-3xl font-bold text-white">
            {stockHoldings.length > 0 ? 
                stockHoldings.reduce((prev, current) => (prev.value > current.value) ? prev : current).name 
                : "—"
            }
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
          <p className="text-3xl font-bold text-white">{loading ? "Processing" : "Active"}</p>
          <p className="text-sm text-gray-500 mt-1">Real-time portfolio monitoring</p>
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
                <h3 className="mt-4 text-lg font-medium text-white">Analyzing Portfolio...</h3>
                <p className="text-gray-500">Processing market data and risk metrics</p>
            </div>
        ) : error ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Analysis Failed</h3>
                <p className="text-gray-500 max-w-md">{error}</p>
                <div className="mt-4 text-xs text-gray-600">
                    <p>Possible reasons: Missing API key, Rate limiting, or Network issues.</p>
                </div>
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
                        No analysis data available.
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}

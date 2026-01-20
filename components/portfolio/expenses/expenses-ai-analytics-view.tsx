"use client";

import { useEffect, useState } from "react";
import { Bot, RefreshCw, AlertTriangle, TrendingUp, Brain, PieChart, CreditCard } from "lucide-react";
import { SupabaseDataService } from "../../../lib/supabase/supabase-data-service";
import { cn } from "../../../lib/utils";
import { useCurrency } from "../../../contexts/currency-context";

export function ExpensesAIAnalyticsView() {
  const { formatCurrency } = useCurrency();
  
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<any[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const loadData = async () => {
        try {
            const data = await SupabaseDataService.getExpenseCategories();
            setCategories(data);
            setDataLoaded(true);
        } catch (e) {
            console.error("Failed to load expense categories", e);
            setDataLoaded(true);
        }
    };
    loadData();
  }, []);

  const generateAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      // Calculate totals
      const totalExpenses = categories.reduce((acc, cat) => acc + (cat.amount || 0), 0);
      const totalBudget = categories.reduce((acc, cat) => acc + (cat.budget || 0), 0);
      
      if (totalExpenses === 0) {
        setAnalysis("You currently have $0 in recorded monthly expenses. Add expense categories (e.g., Housing, Food, Transport) to get AI insights on your spending habits.");
        setLoading(false);
        return;
      }

      // Construct summary for AI
      // Sort categories impacting the budget most
      const sortedCats = [...categories].sort((a, b) => b.amount - a.amount);
      const topCats = sortedCats.slice(0, 8); // Top 8 is enough for context
      
      const categoriesSummary = topCats.map(cat => 
        `- ${cat.name}: $${cat.amount.toFixed(2)} / ${cat.budget > 0 ? '$' + cat.budget.toFixed(2) : 'No Budget'} (${((cat.amount/totalExpenses)*100).toFixed(1)}% of total)`
      ).join('\n');

      const prompt = `
        I am tracking my monthly expenses and have the following spending profile:
        
        Total Monthly Expenses: $${totalExpenses.toFixed(2)}
        Total Budgeted Amount: $${totalBudget.toFixed(2)}
        
        Category Breakdown (Top Spending):
        ${categoriesSummary}

        Please act as an expert financial advisor and budget planner. Provide a smart analysis of my spending habits including:
        1. Spending Health Score (1-10) based on categories and diversification
        2. Budget Adherence Check (if budgets are set) or recommendations to set them
        3. High Impact Areas (Where is most money going? Is it efficient?)
        4. Savings Potential (Where can I likely cut costs based on common benchmarks?)
        5. Optimization Strategy for better cash flow management
        
        Format the response with clear headings and bullet points. Keep it professional, constructive, and concise. Do not include standard disclaimers.
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
  }, [dataLoaded]); 

  // Derived metrics
  const totalExpenses = categories.reduce((acc, item) => acc + (item.amount || 0), 0);
  const highestCategory = categories.length > 0 
    ? categories.reduce((prev, current) => (prev.amount > current.amount) ? prev : current)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="h-6 w-6 text-emerald-400" />
            Expenses AI Analysis
          </h2>
          <p className="text-gray-400 text-sm">Smart insights into your monthly spending habits and budget</p>
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
             <h3 className="font-medium text-gray-200">Categories</h3>
          </div>
          <p className="text-3xl font-bold text-white">{categories.length}</p>
          <p className="text-sm text-gray-500 mt-1">Active spending buckets</p>
        </div>

        <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
             <div className="p-2 bg-red-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-red-500" />
             </div>
             <h3 className="font-medium text-gray-200">Top Spender</h3>
          </div>
          <p className="text-3xl font-bold text-white truncate" title={highestCategory?.name}>
             {highestCategory ? highestCategory.name : "None"}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {highestCategory ? formatCurrency(highestCategory.amount) : "$0.00"}
          </p>
        </div>

        <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
             <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Bot className="h-5 w-5 text-emerald-500" />
             </div>
             <h3 className="font-medium text-gray-200">AI Status</h3>
          </div>
          <p className="text-3xl font-bold text-white">{loading ? "Processing" : "Active"}</p>
          <p className="text-sm text-gray-500 mt-1">Full budget scan</p>
        </div>
      </div>

      <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-8 relative overflow-hidden min-h-[400px]">
        {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0D0D0D] z-10">
                <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Bot className="h-6 w-6 text-emerald-500" />
                    </div>
                </div>
                <h3 className="mt-4 text-lg font-medium text-white">Analyzing Spending...</h3>
                <p className="text-gray-500">Processing categories and budget efficiency</p>
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
                            i % 2 === 1 ? <strong key={i} className="text-emerald-400">{part}</strong> : part
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        No expense data available for analysis.
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}

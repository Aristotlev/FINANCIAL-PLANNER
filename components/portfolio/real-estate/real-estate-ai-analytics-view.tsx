"use client";

import { useEffect, useState } from "react";
import { useCurrency } from "../../../contexts/currency-context";
import { Bot, RefreshCw, AlertTriangle, TrendingUp, Brain, Building, Home, MapPin } from "lucide-react";
import { SupabaseDataService } from "../../../lib/supabase/supabase-data-service";
import { cn } from "../../../lib/utils";
import { RealEstateProperty } from "../modals/add-property-modal";

export function RealEstateAIAnalyticsView() {
  const { formatCurrency, convert, mainCurrency } = useCurrency();
  
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [properties, setProperties] = useState<RealEstateProperty[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const loadProperties = async () => {
        try {
            const props = await SupabaseDataService.getRealEstate();
            // Cast to RealEstateProperty[] if needed, or rely on any since structure matches
            setProperties(props as unknown as RealEstateProperty[]);
            setDataLoaded(true);
        } catch (e) {
            console.error("Failed to load real estate properties", e);
            setDataLoaded(true); 
        }
    };
    loadProperties();
  }, []);

  const generateAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      if (properties.length === 0) {
        setAnalysis("You currently have no real estate properties listed. Add properties to your portfolio to get AI insights on your real estate holdings.");
        setLoading(false);
        return;
      }

      const totalValue = properties.reduce((acc, p) => acc + (p.currentValue || 0), 0);
      const totalCost = properties.reduce((acc, p) => acc + (p.purchasePrice || 0), 0);
      const totalEquity = properties.reduce((acc, p) => acc + ((p.currentValue || 0) - (p.loanAmount || 0)), 0);
      
      const propertiesList = properties.map(p => 
        `- ${p.propertyType} at ${p.address?.split(',')[0] || 'Unknown Address'}:
            Current Value: $${p.currentValue?.toLocaleString()}
            Purchase Price: $${p.purchasePrice?.toLocaleString()}
            Loan Balance: $${p.loanAmount?.toLocaleString()}
            Equity: $${((p.currentValue || 0) - (p.loanAmount || 0)).toLocaleString()}
            Rental Income: $${p.rentalIncome?.toLocaleString() || 0}/mo`
      ).join('\n');

      const prompt = `
        I am a real estate investor with the following portfolio:
        
        Total Portfolio Value: $${totalValue.toLocaleString()}
        Total Equity: $${totalEquity.toLocaleString()}
        Properties Count: ${properties.length}
        
        Property Details:
        ${propertiesList}

        Please act as an expert real estate analyst. Provide a comprehensive analysis of my real estate portfolio including:
        1. Portfolio Health Rating (1-10) based on equity and potential
        2. Leverage Analysis (Loan to Value check)
        3. Cash Flow Potential (based on rental income if present)
        4. Diversification Check (Property types and locations implied)
        5. Strategic Recommendations for portfolio growth or optimization
        
        Format the response with clear headings and bullet points. Keep it professional, objective, and concise. Do not include financial advice disclaimers.
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

  // Calculate top property
  const topProperty = properties.length > 0
    ? properties.reduce((prev, current) => (prev.currentValue > current.currentValue) ? prev : current)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-400" />
            Real Estate AI Analysis
          </h2>
          <p className="text-gray-400 text-sm">Expert insights on your property portfolio performance</p>
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
                <Building className="h-5 w-5 text-blue-500" />
             </div>
             <h3 className="font-medium text-gray-200">Portfolio Size</h3>
          </div>
          <p className="text-3xl font-bold text-white">{properties.length}</p>
          <p className="text-sm text-gray-500 mt-1">Properties owned</p>
        </div>

        <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
             <div className="p-2 bg-green-500/10 rounded-lg">
                <Home className="h-5 w-5 text-green-500" />
             </div>
             <h3 className="font-medium text-gray-200">Top Property</h3>
          </div>
          <div className="truncate w-full">
            <p className="text-3xl font-bold text-white truncate">
                {topProperty ? formatCurrency(convert(topProperty.currentValue, 'USD', mainCurrency.code)) : "$0"}
            </p>
            <p className="text-sm text-gray-500 mt-1 truncate">
                {topProperty ? (topProperty.address?.split(',')[0] || "Unknown") : "No properties"}
            </p>
          </div>
        </div>

        <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
             <div className="p-2 bg-purple-500/10 rounded-lg">
                <Bot className="h-5 w-5 text-purple-500" />
             </div>
             <h3 className="font-medium text-gray-200">AI Status</h3>
          </div>
          <p className="text-3xl font-bold text-white">{loading ? "Processing" : "Active"}</p>
          <p className="text-sm text-gray-500 mt-1">Property scan complete</p>
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
                <h3 className="mt-4 text-lg font-medium text-white">Analyzing Real Estate...</h3>
                <p className="text-gray-500">Evaluating equity, cash flow, and market potential</p>
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
                        No real estate data available for analysis.
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}

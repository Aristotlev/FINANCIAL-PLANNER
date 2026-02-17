"use client";

import { useEffect, useState } from "react";
import { InfoIcon, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface FearAndGreedData {
  value: number;
  value_classification: string;
  timestamp: string;
  time_until_update?: string;
}

export function FearAndGreedView() {
  const [data, setData] = useState<FearAndGreedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/market-data/fear-and-greed');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // CMC data structure: { data: { value, value_classification, ... } }
      if (result.data) {
        setData({
             value: Math.round(result.data.value),
             value_classification: result.data.value_classification,
             timestamp: result.data.timestamp,
             time_until_update: result.data.time_until_update
        });
      } else {
          // Fallback if data structure is unexpected
          throw new Error("Invalid data format received");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load Fear & Greed Index");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getScoreColor = (score: number) => {
    if (score < 25) return "text-red-500"; // Extreme Fear
    if (score < 50) return "text-orange-500"; // Fear
    if (score < 55) return "text-yellow-500"; // Neutral
    if (score < 75) return "text-green-500"; // Greed
    return "text-green-600"; // Extreme Greed
  };

  const getScoreColorHex = (score: number) => {
    if (score < 25) return "#ef4444"; // Extreme Fear
    if (score < 50) return "#f97316"; // Fear
    if (score < 55) return "#eab308"; // Neutral
    if (score < 75) return "#22c55e"; // Greed
    return "#16a34a"; // Extreme Greed
  };

  const getDescription = (score: number) => {
    if (score < 25) return "Extreme Fear indicates investors are too worried. That could be a buying opportunity.";
    if (score < 50) return "Fear indicates investors are worried. The market might be undervalued.";
    if (score < 55) return "Neutral indicates the market is undecided.";
    if (score < 75) return "Greed indicates investors are getting greedy. The market might be due for a correction.";
    return "Extreme Greed indicates investors are ver greedy. The market is likely due for a correction.";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-3xl bg-[#0D0D0D] border border-white/10 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-sm font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const score = data.value;
  const classification = data.value_classification;
  const angle = (score / 100) * 180; // 0 to 180 degrees
  const color = getScoreColorHex(score);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Main Index Card */}
        <div className="rounded-3xl bg-[#0D0D0D] border border-white/10 p-8 flex flex-col items-center justify-center min-h-[400px]">
           <div className="w-full flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Fear & Greed Index</h2>
           </div>
           
           <div className="relative w-64 h-32 mt-8 mb-12">
              {/* Semi-circle Gauge Background */}
              <div className="w-full h-full overflow-hidden relative">
                 <div className="w-64 h-64 rounded-full border-[15px] border-white/10 absolute top-0 left-0 box-border"></div>
              </div>
              
              {/* Colored Gauge Segment (approximated for now with CSS or SVG) */}
              <svg className="absolute top-0 left-0 w-64 h-32 overflow-visible" viewBox="0 0 200 100">
                  <path 
                    d="M 10 100 A 90 90 0 0 1 190 100" 
                    fill="none" 
                    stroke="#333" 
                    strokeWidth="15" 
                    strokeLinecap="round"
                  />
                  {/* Dynamic stroke dasharray to represent value */}
                   <path 
                    d="M 10 100 A 90 90 0 0 1 190 100" 
                    fill="none" 
                    stroke={color} 
                    strokeWidth="15" 
                    strokeLinecap="round"
                    strokeDasharray={`${(score / 100) * 283} 283`} // 283 is approx length of semi-circle arc with r=90
                    className="transition-all duration-1000 ease-out"
                  />
              </svg>

              {/* Indicator Needle - slightly clearer representation */}
              <div 
                className="absolute bottom-0 left-1/2 w-1 h-[90px] origin-bottom transition-transform duration-1000 ease-out -ml-0.5"
                style={{ transform: `rotate(${angle - 90}deg)` }}
              >
                  <div className="w-full h-full bg-white relative">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                  </div>
              </div>
              
              {/* Center value */}
              <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center">
                 <span className={`text-6xl font-bold transition-colors duration-500 ${getScoreColor(score)}`}>
                    {Math.round(score)}
                 </span>
                 <span className={`text-lg font-medium mt-2 ${getScoreColor(score)}`}>
                    {classification}
                 </span>
              </div>
           </div>
           
           <div className="mt-8 text-center max-w-md">
              <p className="text-gray-400 text-sm leading-relaxed">
                  {getDescription(score)}
              </p>
           </div>
        </div>

        {/* Info & History Card */}
        <div className="space-y-6">
           <div className="rounded-3xl bg-[#0D0D0D] border border-white/10 p-8 h-full">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                 <InfoIcon size={20} className="text-blue-400" />
                 About the Index
              </h3>
              
              <div className="space-y-6 text-sm text-gray-400">
                  <p>
                    The crypto market behavior is very emotional. People tend to get greedy when the market is rising which results in FOMO (Fear of missing out). Also, people often sell their coins in irrational reaction of seeing red numbers.
                  </p>
                  
                  <div className="space-y-2">
                      <p>The index analyzes the current sentiment of the Bitcoin market and crunches the numbers into a simple meter from 0 to 100.</p>
                      <ul className="list-disc pl-5 space-y-1 mt-2">
                          <li><span className="text-white font-medium">0</span> means "Extreme Fear"</li>
                          <li><span className="text-white font-medium">100</span> means "Extreme Greed"</li>
                      </ul>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                      <p className="text-xs text-gray-500">
                          Last Updated: {new Date(data.timestamp).toLocaleString()}
                          {data.time_until_update && <span className="block mt-1">Next Update In: {Math.round(parseInt(data.time_until_update)/60)} minutes</span>}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                          Source: Alternative.me
                      </p>
                  </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import { Loader2, TrendingUp, TrendingDown, Info, AlertCircle, Search, Target } from 'lucide-react';
import { FinnhubEarnings } from '../../lib/api/finnhub-api';
import { tickerDomains } from '@/lib/ticker-domains';

// Generate a consistent color based on ticker
const getTickerColor = (ticker: string): string => {
  const colors = [
    'from-purple-500 to-purple-700',
    'from-blue-500 to-blue-700',
    'from-cyan-500 to-cyan-700',
    'from-green-500 to-green-700',
    'from-yellow-500 to-yellow-700',
    'from-orange-500 to-orange-700',
    'from-pink-500 to-pink-700',
    'from-indigo-500 to-indigo-700',
  ];
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Company Icon Component - Same approach as SEC EDGAR page
const CompanyIcon = ({ ticker, className = "h-10 w-10", showPlaceholder = true }: { ticker: string, className?: string, showPlaceholder?: boolean }) => {
  const [imageError, setImageError] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const upperTicker = ticker.toUpperCase();
  
  // Build list of image sources to try
  const imageSources = useMemo(() => {
    const sources: string[] = [];
    
    // 1. Known domain from our mapping
    if (tickerDomains[upperTicker]) {
      sources.push(`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${tickerDomains[upperTicker]}&size=128`);
    }
    
    // 2. Try logo.dev API (free tier, good coverage)
    sources.push(`https://img.logo.dev/ticker/${upperTicker}?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ`);
    
    // 3. Try common domain patterns
    sources.push(`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${ticker.toLowerCase()}.com&size=128`);
    
    return sources;
  }, [upperTicker, ticker]);
  
  useEffect(() => {
    setImageError(false);
    setFallbackIndex(0);
  }, [ticker]);
  
  const handleImageError = () => {
    if (fallbackIndex < imageSources.length - 1) {
      setFallbackIndex(prev => prev + 1);
    } else {
      setImageError(true);
    }
  };
  
  if (!imageError && imageSources.length > 0) {
    return (
      <img 
        src={imageSources[fallbackIndex]}
        alt={`${ticker} logo`} 
        className={`${className} rounded-lg object-contain bg-white p-1`}
        onError={handleImageError}
        loading="lazy"
      />
    );
  }

  if (!showPlaceholder) return null;

  return (
    <div className={`${className} rounded-lg bg-gradient-to-br ${getTickerColor(ticker)} flex items-center justify-center font-bold text-white shadow-lg`}>
      {ticker.slice(0, 2)}
    </div>
  );
};

interface EarningsSurprisesViewProps {
  initialTicker?: string;
}

export function EarningsSurprisesView({ initialTicker = 'AAPL' }: EarningsSurprisesViewProps) {
  const [ticker, setTicker] = useState(initialTicker);
  const [searchInput, setSearchInput] = useState('');
  const [data, setData] = useState<FinnhubEarnings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!ticker) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch up to 8 quarters to be safe, but API might limit to 4 on free tier
        const response = await fetch(`/api/finnhub/earnings?symbol=${ticker}&limit=8`);
        
        // Check content type before parsing
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") === -1) {
           const text = await response.text();
           console.error("API returned non-JSON response:", text.substring(0, 100)); // Log first 100 chars
           throw new Error("API unavailable or returned invalid format");
        }

        if (!response.ok) {
          throw new Error('Failed to fetch earnings surprise data');
        }
        
        const result: FinnhubEarnings[] = await response.json();
        
        // Sort by date (oldest to newest) for the chart
        // Since the API returns period strings ("2023-03-31"), we can sort string-wise or by date
        const sortedData = (result || []).sort((a, b) => {
          return new Date(a.period).getTime() - new Date(b.period).getTime();
        });
        
        setData(sortedData);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [ticker]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setTicker(searchInput.toUpperCase().trim());
      setSearchInput('');
    }
  };

  // Prepare chart data
  const chartData = data.map(item => ({
    period: item.period,
    actual: item.actual,
    estimate: item.estimate,
    surprise: item.surprise,
    surprisePercent: item.surprisePercent,
    label: `Q${item.quarter} ${item.year}`
  }));

  // Calculate average surprise
  const avgSurprise = data.length > 0 
    ? data.reduce((acc, curr) => acc + curr.surprisePercent, 0) / data.length 
    : 0;

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
          <Target className="w-6 h-6 text-blue-400" />
          Earnings Surprises
        </h2>
      </div>

       {/* Search Bar */}
      <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-3">
        <form onSubmit={handleSearch} className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by ticker (e.g., TSLA, AAPL, MSFT)..."
              className="w-full pl-10 pr-4 py-2 bg-transparent border-none text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-0"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !searchInput.trim()}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
              loading || !searchInput.trim()
                ? "bg-[#1A1A1A] text-gray-500 border border-gray-800 cursor-not-allowed"
                : "bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600/20"
            )}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>Analyze</span>
          </button>
        </form>
      </div>

      <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-6 min-h-[400px]">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="flex items-center gap-3">
             <CompanyIcon ticker={ticker} className="h-10 w-10" />
             <div>
                <h3 className="text-lg font-semibold text-white">Earnings History for {ticker}</h3>
                <p className="text-sm text-gray-400">Actual vs Estimated EPS</p>
             </div>
           </div>
           
           {!loading && !error && data.length > 0 && (
             <div className="flex items-center gap-4 bg-[#212121] px-4 py-2 rounded-lg border border-gray-700">
                <div className="text-right">
                    <p className="text-xs text-gray-400">Avg Surprise</p>
                    <p className={`font-mono font-bold ${avgSurprise >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                        {avgSurprise > 0 ? '+' : ''}{avgSurprise.toFixed(2)}%
                    </p>
                </div>
                <div className="h-8 w-px bg-gray-700"></div>
                <div className="text-right">
                    <p className="text-xs text-gray-400">Last Reported</p>
                    <p className="font-mono font-bold text-white">
                        {data[data.length - 1].period}
                    </p>
                </div>
             </div>
           )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-400">Loading earnings data...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white mb-2">Failed to load data</h3>
            <p className="text-red-400">{error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
             <Info className="h-8 w-8 mx-auto mb-3 opacity-50" />
             <p>No earnings history available for {ticker}.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Chart */}
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="estimateGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#334155" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#334155" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  
                  <XAxis 
                    dataKey="period" 
                    stroke="#525252" 
                    fontSize={12} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => {
                        const date = new Date(val);
                        return `${date.getFullYear()}-${date.getMonth() + 1}`;
                    }}
                    dy={10}
                  />
                  
                  <YAxis 
                    stroke="#525252" 
                    fontSize={12} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                    dx={-10}
                  />
                  
                  <Tooltip
                    cursor={{ fill: '#3b82f6', opacity: 0.1 }}
                    content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                        return (
                            <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-4 shadow-xl backdrop-blur-md">
                                <p className="text-gray-400 text-xs mb-2">{label} (EPS)</p>
                                {payload.map((entry: any, index: number) => (
                                    <div key={index} className="flex items-center gap-3 mb-1 min-w-[120px]">
                                        <div 
                                            className="w-2 h-2 rounded-full" 
                                            style={{ backgroundColor: entry.color || entry.fill }}
                                        />
                                        <span className="text-gray-300 text-sm flex-1">{entry.name}:</span>
                                        <span className="text-white font-mono font-bold text-sm">
                                            ${Number(entry.value).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        );
                        }
                        return null;
                    }}
                  />
                  
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }} 
                    iconType="circle"
                  />
                  
                  <Bar 
                    dataKey="estimate" 
                    name="EPS Estimate" 
                    fill="url(#estimateGradient)" 
                    radius={[4, 4, 0, 0]} 
                    animationDuration={1500}
                    maxBarSize={60}
                  />
                  
                  <Bar 
                    dataKey="actual" 
                    name="EPS Actual" 
                    radius={[4, 4, 0, 0]}
                    animationDuration={1500}
                    maxBarSize={60}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.actual >= entry.estimate ? 'url(#positiveGradient)' : 'url(#negativeGradient)'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#111] text-gray-400 font-medium">
                  <tr>
                    <th className="px-6 py-3">Period</th>
                    <th className="px-6 py-3 text-right">Estimate</th>
                    <th className="px-6 py-3 text-right">Actual</th>
                    <th className="px-6 py-3 text-right">Surprise</th>
                    <th className="px-6 py-3 text-right">% Surprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {[...data].reverse().map((item, i) => (
                    <tr key={i} className="hover:bg-[#212121] transition-colors">
                      <td className="px-6 py-4 text-white font-medium">
                         <div className="flex flex-col">
                            <span>Q{item.quarter} {item.year}</span>
                            <span className="text-xs text-gray-500">{item.period}</span>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-300">
                        {item.estimate?.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-white">
                        {item.actual?.toFixed(2)}
                      </td>
                      <td className={`px-6 py-4 text-right font-mono ${item.surprise > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                        {item.surprise > 0 ? '+' : ''}{item.surprise.toFixed(4)}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <span className={`px-2 py-1 rounded text-xs border ${
                              item.surprisePercent > 0 
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                              {item.surprisePercent > 0 ? '+' : ''}{item.surprisePercent.toFixed(2)}%
                          </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

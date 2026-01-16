"use client";

import { useEffect, useState, useMemo } from 'react';
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
       <div className="flex items-center justifying-between">
        <h2 className="text-2xl font-bold text-white">Earnings Surprises</h2>
      </div>

       {/* Search Bar */}
      <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by ticker (e.g., TSLA, AAPL, MSFT)..."
              className="w-full bg-[#0D0D0D] border border-gray-800 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block pl-10 p-2.5"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-800 transition-colors"
          >
            Analyze
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
                    <p className={`font-mono font-bold ${avgSurprise >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis 
                    dataKey="period" 
                    stroke="#666" 
                    fontSize={12} 
                    tickFormatter={(val) => {
                        const date = new Date(val);
                        return `${date.getFullYear()}-${date.getMonth() + 1}`;
                    }}
                  />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ fill: '#333', opacity: 0.2 }}
                  />
                  <Legend />
                  <Bar dataKey="estimate" name="EPS Estimate" fill="#64748b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="EPS Actual" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.actual >= entry.estimate ? '#4ade80' : '#f87171'} />
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
                      <td className={`px-6 py-4 text-right font-mono ${item.surprise > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {item.surprise > 0 ? '+' : ''}{item.surprise.toFixed(4)}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <span className={`px-2 py-1 rounded text-xs border ${
                              item.surprisePercent > 0 
                                  ? 'bg-green-500/10 text-green-400 border-green-500/20' 
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

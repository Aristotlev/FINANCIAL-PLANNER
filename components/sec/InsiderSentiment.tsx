"use client";

import { useEffect, useState } from 'react';
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
  ComposedChart,
  Line,
  Cell
} from 'recharts';
import { Loader2, TrendingUp, TrendingDown, Info, AlertCircle } from 'lucide-react';
import { FinnhubInsiderSentimentResponse, FinnhubInsiderSentiment } from '../../lib/api/finnhub-api';

interface InsiderSentimentProps {
  ticker: string;
}

export function InsiderSentiment({ ticker }: InsiderSentimentProps) {
  const [data, setData] = useState<FinnhubInsiderSentiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!ticker) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/finnhub/insider-sentiment?symbol=${ticker}`);
        
        // Check content type before parsing
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") === -1) {
           const text = await response.text();
           console.error("API returned non-JSON response:", text.substring(0, 100));
           throw new Error("API unavailable or returned invalid format");
        }

        if (!response.ok) {
          throw new Error('Failed to fetch insider sentiment data');
        }
        
        const result: FinnhubInsiderSentimentResponse = await response.json();
        
        // Sort by date (oldest to newest) for the chart
        const sortedData = (result.data || []).sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return a.month - b.month;
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-400">Analyzing insider sentiment for {ticker}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-white mb-2">Analysis Failed</h3>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-8 text-center">
        <Info className="h-8 w-8 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400">No insider sentiment data available for {ticker}.</p>
      </div>
    );
  }

  // Calculate generic stats
  const lastMonth = data[data.length - 1];
  const mspr = lastMonth?.mspr || 0;
  const sentiment = mspr > 20 ? 'Very Positive' : mspr > 0 ? 'Positive' : mspr < -20 ? 'Very Negative' : mspr < 0 ? 'Negative' : 'Neutral';
  const sentimentColor = mspr > 0 ? 'text-blue-400' : mspr < 0 ? 'text-red-400' : 'text-gray-400';
  const sentimentBg = mspr > 0 ? 'bg-blue-400/10 border-blue-400/20' : mspr < 0 ? 'bg-red-400/10 border-red-400/20' : 'bg-gray-400/10 border-gray-400/20';

  // Format data for chart
  const chartData = data.map(item => ({
    date: `${item.year}-${String(item.month).padStart(2, '0')}`,
    mspr: item.mspr,
    change: item.change,
    msprLabel: item.mspr.toFixed(2)
  }));

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className={`rounded-xl border p-6 ${sentimentBg}`}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-1">Current Insider Sentiment</h3>
            <div className={`text-2xl font-bold flex items-center gap-2 ${sentimentColor}`}>
              {mspr > 0 ? <TrendingUp className="h-6 w-6" /> : mspr < 0 ? <TrendingDown className="h-6 w-6" /> : <Info className="h-6 w-6" />}
              {sentiment}
            </div>
            <p className="text-sm text-gray-400 mt-2 max-w-xl">
              Based on Monthly Share Purchase Ratio (MSPR) of <span className="text-white font-mono">{mspr.toFixed(2)}</span>.
              <br />
              MSPR ranges from -100 (Most Negative) to 100 (Most Positive).
              This metric can signal potential price changes in the coming 30-90 days.
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-sm text-gray-400">Latest Activity</div>
            <div className="text-lg font-semibold text-white">{lastMonth.year}-{String(lastMonth.month).padStart(2, '0')}</div>
            <div className={`font-mono text-sm ${lastMonth.change > 0 ? 'text-blue-400' : 'text-red-400'}`}>
              Net Change: {lastMonth.change > 0 ? '+' : ''}{lastMonth.change.toLocaleString()} shares
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MSPR Chart */}
        <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Monthly Share Purchase Ratio (MSPR)</h3>
          <div className="h-[300px] w-full">
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
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis 
                    dataKey="date" 
                    stroke="#525252" 
                    fontSize={12} 
                    tickFormatter={(val) => val.substring(2)} 
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                />
                <YAxis 
                    stroke="#525252" 
                    fontSize={12} 
                    domain={[-100, 100]} 
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                />
                <Tooltip 
                  cursor={{ fill: '#3b82f6', opacity: 0.1 }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                    return (
                        <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-4 shadow-xl backdrop-blur-md">
                            <p className="text-gray-400 text-xs mb-2">{label} (Sentiment)</p>
                            {payload.map((entry: any, index: number) => (
                                <div key={index} className="flex items-center gap-3 mb-1 min-w-[120px]">
                                    <div 
                                        className="w-2 h-2 rounded-full" 
                                        style={{ backgroundColor: entry.value > 0 ? '#3b82f6' : '#ef4444' }}
                                    />
                                    <span className="text-gray-300 text-sm flex-1">{entry.name}:</span>
                                    <span className={`font-mono font-bold text-sm ${entry.value > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                        {Number(entry.value).toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="#333" />
                <Bar dataKey="mspr" name="MSPR Score" animationDuration={1500} maxBarSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.mspr > 0 ? 'url(#positiveGradient)' : 'url(#negativeGradient)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Net Change Chart */}
        <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Net Insider Transactions (Shares)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                 <defs>
                   <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.2}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis 
                    dataKey="date" 
                    stroke="#525252" 
                    fontSize={12} 
                    tickFormatter={(val) => val.substring(2)}
                    tickLine={false}
                    axisLine={false} 
                    dy={10}
                />
                <YAxis 
                    stroke="#525252" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dx={-10} 
                    tickFormatter={(value) => value >= 1000000 ? `${(value/1000000).toFixed(0)}M` : value >= 1000 ? `${(value/1000).toFixed(0)}K` : value}
                />
                <Tooltip 
                  cursor={{ fill: '#3b82f6', opacity: 0.1 }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                    return (
                        <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-4 shadow-xl backdrop-blur-md">
                            <p className="text-gray-400 text-xs mb-2">{label} (Net Volume)</p>
                            {payload.map((entry: any, index: number) => (
                                <div key={index} className="flex items-center gap-3 mb-1 min-w-[120px]">
                                    <div 
                                        className="w-2 h-2 rounded-full" 
                                        style={{ backgroundColor: entry.value > 0 ? '#3b82f6' : '#ef4444' }}
                                    />
                                    <span className="text-gray-300 text-sm flex-1">{entry.name}:</span>
                                    <span className={`font-mono font-bold text-sm ${entry.value > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                        {Number(entry.value).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="#333" />
                <Bar dataKey="change" name="Net Share Change" animationDuration={1500} maxBarSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.change > 0 ? 'url(#blueGradient)' : 'url(#redGradient)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="font-semibold text-white">Historical Data</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#141414] text-xs uppercase tracking-wider text-gray-400 font-medium">
              <tr>
                <th className="px-6 py-3">Period</th>
                <th className="px-6 py-3 text-right">MSPR Score</th>
                <th className="px-6 py-3 text-right">Net Change (Shares)</th>
                <th className="px-6 py-3 text-right">Sentiment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {[...data].reverse().map((item, i) => (
                <tr key={i} className="hover:bg-[#212121] transition-colors">
                  <td className="px-6 py-4 text-white font-medium">
                    {item.year}-{String(item.month).padStart(2, '0')}
                  </td>
                  <td className={`px-6 py-4 text-right font-mono ${item.mspr > 0 ? 'text-blue-400' : item.mspr < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {item.mspr.toFixed(2)}
                  </td>
                  <td className={`px-6 py-4 text-right font-mono ${item.change > 0 ? 'text-blue-400' : item.change < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {item.change > 0 ? '+' : ''}{item.change.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-2 py-1 rounded text-xs border ${
                      item.mspr > 20 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      item.mspr > 0 ? 'bg-blue-500/5 text-blue-300 border-blue-500/10' :
                      item.mspr < -20 ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      item.mspr < 0 ? 'bg-red-500/5 text-red-300 border-red-500/10' :
                      'bg-gray-500/10 text-gray-400 border-gray-500/20'
                    }`}>
                      {item.mspr > 20 ? 'Strong Buy Signal' : 
                       item.mspr > 0 ? 'Buy Signal' : 
                       item.mspr < -20 ? 'Strong Sell Signal' : 
                       item.mspr < 0 ? 'Sell Signal' : 'Neutral'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

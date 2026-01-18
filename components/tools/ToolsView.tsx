'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TradingViewChart, ChartType } from '@/components/tools/TradingViewChart';
import { cn } from '@/lib/utils';
import { AreaChart, CandlestickChart, BarChart, LineChart } from 'lucide-react';
import { Search01Icon, TradeUpIcon, Loading01Icon, ArrowDown01Icon, AlertCircleIcon } from 'hugeicons-react';
import { usePortfolioContext } from '@/contexts/portfolio-context';
import { CryptoIcon } from '@/components/ui/crypto-icon';
import {
  AppleIconTV,
  MicrosoftIconTV,
  AmazonIconTV,
  GoogleIconTV,
  TeslaIconTV,
  NvidiaIconTV,
  MetaIconTV,
  ETFIcon,
  ChartIcon
} from '@/lib/tradingview-icons';

// Stock Icon Component - TradingView style
function StockIcon({ symbol, className = "w-5 h-5" }: { symbol: string; className?: string }) {
  switch (symbol) {
    case 'AAPL':
      return <AppleIconTV className={className} />;
    case 'MSFT':
      return <MicrosoftIconTV className={className} />;
    case 'AMZN':
      return <AmazonIconTV className={className} />;
    case 'GOOGL':
    case 'GOOG':
      return <GoogleIconTV className={className} />;
    case 'TSLA':
      return <TeslaIconTV className={className} />;
    case 'NVDA':
      return <NvidiaIconTV className={className} />;
    case 'META':
      return <MetaIconTV className={className} />;
    default:
      return <ETFIcon symbol={symbol} className={className} color="#3b82f6" />;
  }
}

type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';
type AssetType = 'stock' | 'crypto';

interface AssetItem {
    symbol: string;
    name: string;
    type: AssetType;
    iconUrl?: string;
}

interface ChartData {
    time: number;
    value?: number;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
}

export function ToolsView() {
    const { cryptoHoldings, stockHoldings } = usePortfolioContext();
    const [chartType, setChartType] = useState<ChartType>('Area');
    const [timeRange, setTimeRange] = useState<TimeRange>('1M');
    const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Combine all holdings for the asset selector
    const allAssets = useMemo<AssetItem[]>(() => {
        const crypto = cryptoHoldings.map(h => ({ symbol: h.symbol, name: h.name, type: 'crypto' as AssetType, iconUrl: h.iconUrl }));
        const stocks = stockHoldings.map(h => ({ symbol: h.symbol, name: h.name, type: 'stock' as AssetType, iconUrl: undefined }));
        return [...stocks, ...crypto];
    }, [cryptoHoldings, stockHoldings]);

    // Filter assets based on search
    const filteredAssets = useMemo(() => {
        if (!searchQuery) return allAssets;
        const q = searchQuery.toLowerCase();
        return allAssets.filter(a => 
            a.symbol.toLowerCase().includes(q) || 
            a.name.toLowerCase().includes(q)
        );
    }, [allAssets, searchQuery]);

    // Set default asset on mount
    useEffect(() => {
        if (!selectedAsset && allAssets.length > 0) {
            setSelectedAsset(allAssets[0]);
        }
    }, [allAssets, selectedAsset]);

    // Fetch chart data when asset or time range changes
    useEffect(() => {
        if (!selectedAsset) return;

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            setChartData([]);

            try {
                const response = await fetch(
                    `/api/chart-data?symbol=${selectedAsset.symbol}&type=${selectedAsset.type}&range=${timeRange}`
                );

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `Failed to fetch chart data (${response.status})`);
                }

                const result = await response.json();

                if (!result.data || result.data.length === 0) {
                    throw new Error(`No chart data available for ${selectedAsset.symbol}`);
                }

                setChartData(result.data);
            } catch (err: any) {
                console.error('Chart data fetch error:', err);
                setError(err.message || 'Failed to load chart data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [selectedAsset, timeRange]);

    const chartTypes: { type: ChartType; label: string; icon: React.ElementType }[] = [
        { type: 'Area', label: 'Area', icon: AreaChart },
        { type: 'Candlestick', label: 'Candles', icon: CandlestickChart },
        { type: 'Line', label: 'Line', icon: LineChart },
        { type: 'Bar', label: 'OHLC', icon: BarChart },
    ];

    const timeRanges: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

    // Format data based on chart type
    const formattedData = useMemo(() => {
        if (chartType === 'Area' || chartType === 'Line') {
            return chartData.map(d => ({ time: d.time, value: d.value || d.close }));
        }
        return chartData;
    }, [chartData, chartType]);

    // Calculate price change from chart data (for the period)
    const priceInfo = useMemo(() => {
        if (chartData.length < 2) return null;
        const firstPrice = chartData[0]?.close || chartData[0]?.value || 0;
        const currentPrice = chartData[chartData.length - 1]?.close || chartData[chartData.length - 1]?.value || 0;
        const change = currentPrice - firstPrice;
        const changePercent = firstPrice > 0 ? (change / firstPrice) * 100 : 0;
        return { 
            lastPrice: currentPrice, 
            change, 
            changePercent,
        };
    }, [chartData]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header with Asset Selector */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold mb-1">Live Charts</h2>
                    <p className="text-gray-400 text-sm">Analyze your portfolio assets with real-time market data</p>
                </div>
            </div>

            {/* Chart Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Chart Type Selector */}
                <div className="flex space-x-1 bg-[#1A1A1A] p-1 rounded-lg border border-gray-800">
                    {chartTypes.map((ct) => (
                        <button
                            key={ct.type}
                            onClick={() => setChartType(ct.type)}
                            className={cn(
                                "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                                chartType === ct.type
                                    ? "bg-[#2A2A2A] text-white shadow-sm"
                                    : "text-gray-400 hover:text-white hover:bg-[#2A2A2A]/50"
                            )}
                        >
                            <ct.icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{ct.label}</span>
                        </button>
                    ))}
                </div>


                {/* Time Range Selector and Asset Selector */}
                <div className="flex items-center gap-4">
                    {/* Asset Selector Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-3 px-4 py-2 bg-[#1A1A1A] border border-gray-800 rounded-xl hover:bg-[#222] transition-colors min-w-[240px]"
                        >
                            {selectedAsset ? (
                                <>
                                    <div className="w-6 h-6 flex items-center justify-center">
                                        {selectedAsset.type === 'crypto' ? (
                                            <CryptoIcon symbol={selectedAsset.symbol} iconUrl={selectedAsset.iconUrl} className="w-6 h-6" />
                                        ) : (
                                            <StockIcon symbol={selectedAsset.symbol} className="w-6 h-6" />
                                        )}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-semibold text-white text-sm">{selectedAsset.symbol}</p>
                                        <p className="text-[10px] text-gray-400">{selectedAsset.name}</p>
                                    </div>
                                </>
                            ) : (
                                <span className="text-gray-400 text-sm">Select asset</span>
                            )}
                            <ArrowDown01Icon className={cn("w-4 h-4 text-gray-400 transition-transform", isDropdownOpen && "rotate-180")} />
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[280px]">
                                {/* Search */}
                                <div className="p-3 border-b border-gray-800">
                                    <div className="relative">
                                        <Search01Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="text"
                                            placeholder="Search assets..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-[#0D0D0D] border border-gray-800 rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Asset List */}
                                <div className="max-h-[300px] overflow-y-auto">
                                    {filteredAssets.length === 0 ? (
                                        <div className="p-4 text-center text-gray-500 text-sm">
                                            No assets found. Add holdings to your portfolio first.
                                        </div>
                                    ) : (
                                        <>
                                            {/* Stocks Section */}
                                            {filteredAssets.filter(a => a.type === 'stock').length > 0 && (
                                                <div>
                                                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-[#0D0D0D]">STOCKS</div>
                                                    {filteredAssets.filter(a => a.type === 'stock').map(asset => (
                                                        <button
                                                            key={asset.symbol}
                                                            onClick={() => {
                                                                setSelectedAsset(asset);
                                                                setIsDropdownOpen(false);
                                                                setSearchQuery('');
                                                            }}
                                                            className={cn(
                                                                "w-full flex items-center gap-3 px-4 py-3 hover:bg-[#222] transition-colors",
                                                                selectedAsset?.symbol === asset.symbol && "bg-[#222]"
                                                            )}
                                                        >
                                                            <div className="w-8 h-8 flex items-center justify-center">
                                                                <StockIcon symbol={asset.symbol} className="w-8 h-8" />
                                                            </div>
                                                            <div className="flex-1 text-left">
                                                                <p className="font-medium text-white">{asset.symbol}</p>
                                                                <p className="text-xs text-gray-400">{asset.name}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Crypto Section */}
                                            {filteredAssets.filter(a => a.type === 'crypto').length > 0 && (
                                                <div>
                                                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-[#0D0D0D]">CRYPTO</div>
                                                    {filteredAssets.filter(a => a.type === 'crypto').map(asset => (
                                                        <button
                                                            key={asset.symbol}
                                                            onClick={() => {
                                                                setSelectedAsset(asset);
                                                                setIsDropdownOpen(false);
                                                                setSearchQuery('');
                                                            }}
                                                            className={cn(
                                                                "w-full flex items-center gap-3 px-4 py-3 hover:bg-[#222] transition-colors",
                                                                selectedAsset?.symbol === asset.symbol && "bg-[#222]"
                                                            )}
                                                        >
                                                            <div className="w-8 h-8 flex items-center justify-center">
                                                                <CryptoIcon symbol={asset.symbol} iconUrl={asset.iconUrl || undefined} className="w-8 h-8" />
                                                            </div>
                                                            <div className="flex-1 text-left">
                                                                <p className="font-medium text-white">{asset.symbol}</p>
                                                                <p className="text-xs text-gray-400">{asset.name}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Time Range Selector */}
                    <div className="flex space-x-1 bg-[#1A1A1A] p-1 rounded-lg border border-gray-800">
                        {timeRanges.map((tr) => (
                            <button
                                key={tr}
                                onClick={() => setTimeRange(tr)}
                                className={cn(
                                    "px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                                    timeRange === tr
                                        ? "bg-[#2A2A2A] text-white shadow-sm"
                                        : "text-gray-400 hover:text-white hover:bg-[#2A2A2A]/50"
                                )}
                            >
                                {tr}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chart Container */}
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6 shadow-sm min-h-[500px]">
                {!selectedAsset ? (
                    <div className="h-[400px] flex flex-col items-center justify-center text-gray-500">
                        <TradeUpIcon className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium">No Asset Selected</p>
                        <p className="text-sm">Select an asset from the dropdown to view its chart</p>
                    </div>
                ) : isLoading ? (
                    <div className="h-[400px] flex flex-col items-center justify-center text-gray-500">
                        <Loading01Icon className="w-8 h-8 animate-spin mb-4" />
                        <p>Loading real-time data for {selectedAsset.symbol}...</p>
                    </div>
                ) : error ? (
                    <div className="h-[400px] flex flex-col items-center justify-center text-gray-400">
                        <AlertCircleIcon className="w-12 h-12 mb-4 text-yellow-500" />
                        <p className="text-lg font-medium text-white mb-2">Unable to Load Chart</p>
                        <p className="text-sm text-center max-w-md">{error}</p>
                        <button
                            onClick={() => setTimeRange(timeRange)} // Trigger refetch
                            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="h-[400px] flex flex-col items-center justify-center text-gray-500">
                        <AlertCircleIcon className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium">No Data Available</p>
                        <p className="text-sm">Chart data is not available for {selectedAsset.symbol}</p>
                    </div>
                ) : (
                    <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 flex items-center justify-center">
                                    {selectedAsset.type === 'crypto' ? (
                                        <CryptoIcon symbol={selectedAsset.symbol} iconUrl={selectedAsset.iconUrl} className="w-10 h-10" />
                                    ) : (
                                        <StockIcon symbol={selectedAsset.symbol} className="w-10 h-10" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">{selectedAsset.symbol}</h3>
                                    <p className="text-sm text-gray-400">{selectedAsset.name}</p>
                                </div>
                            </div>
                            {priceInfo && (
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-white">
                                        ${priceInfo.lastPrice.toLocaleString(undefined, { 
                                            minimumFractionDigits: 2, 
                                            maximumFractionDigits: priceInfo.lastPrice < 1 ? 6 : 2 
                                        })}
                                    </p>
                                    <p className={cn(
                                        "text-sm font-medium",
                                        priceInfo.changePercent >= 0 ? "text-green-500" : "text-red-500"
                                    )}>
                                        {priceInfo.changePercent >= 0 ? '+' : ''}{priceInfo.changePercent.toFixed(2)}% ({timeRange})
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 w-full relative">
                            <TradingViewChart 
                                data={formattedData} 
                                chartType={chartType} 
                                className="h-[400px]"
                                colors={{
                                    lineColor: selectedAsset.type === 'crypto' ? '#f97316' : '#3b82f6',
                                    areaTopColor: selectedAsset.type === 'crypto' ? '#f97316' : '#3b82f6',
                                    areaBottomColor: selectedAsset.type === 'crypto' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Sector } from 'recharts';
import { Wallet } from 'lucide-react';
import { getWalletById } from '@/lib/crypto-wallets-database';
import { formatNumber } from '@/lib/utils';
import { useCurrencyConversion } from '@/hooks/use-currency-conversion';

interface WalletDistributionData {
  walletType: string;
  walletName?: string;
  value: number;
  holdings: Array<{
    symbol: string;
    name: string;
    amount: number;
    value: number;
  }>;
}

interface PortfolioWalletPieChartProps {
  holdings: Array<{
    id: string;
    symbol: string;
    name: string;
    amount: number;
    value?: number;
    walletType?: string;
    walletName?: string;
  }>;
  prices: Record<string, { price: number; change?: number }>;
}

export function PortfolioWalletPieChart({ holdings, prices }: PortfolioWalletPieChartProps) {
  const { convertFromMain, mainCurrency, formatMain } = useCurrencyConversion();

  // Group holdings by wallet
  const walletDistribution = holdings.reduce<Record<string, WalletDistributionData>>((acc, holding) => {
    const walletType = holding.walletType || 'other';
    const walletKey = holding.walletName 
      ? `${walletType}-${holding.walletName}` 
      : walletType;

    // Use prices if available, otherwise fall back to pre-calculated value
    const currentPrice = prices[holding.symbol]?.price;
    const holdingValue = currentPrice !== undefined 
      ? holding.amount * currentPrice 
      : (holding.value || 0);

    if (!acc[walletKey]) {
      acc[walletKey] = {
        walletType,
        walletName: holding.walletName,
        value: 0,
        holdings: []
      };
    }

    acc[walletKey].value += holdingValue;
    acc[walletKey].holdings.push({
      symbol: holding.symbol,
      name: holding.name,
      amount: holding.amount,
      value: holdingValue
    });

    return acc;
  }, {});

  // Convert to array and sort by value
  const walletData = Object.values(walletDistribution)
    .sort((a, b) => b.value - a.value)
    .map(wallet => {
      const walletInfo = getWalletById(wallet.walletType);
      return {
        ...wallet,
        displayName: wallet.walletName || walletInfo?.name || 'Other Wallet',
        color: walletInfo?.color || '#6B7280',
        type: walletInfo?.type || 'defi'
      };
    });

  const totalValue = walletData.reduce((sum, wallet) => sum + wallet.value, 0);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;
    const percentage = totalValue > 0 ? (data.value / totalValue) * 100 : 0;
    const convertedValue = data.value;

    return (
      <div 
        className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xl border-2 border-orange-200 dark:border-orange-700 max-w-xs"
        style={{ boxShadow: '0 10px 40px rgba(249, 115, 22, 0.3), 0 4px 20px rgba(0,0,0,0.15)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div 
            className="w-4 h-4 rounded shadow-md" 
            style={{ backgroundColor: data.color }}
          />
          <div className="font-bold text-gray-900 dark:text-white">
            {data.displayName}
          </div>
        </div>
        
        <div className="space-y-2 mb-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Value:</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatMain(convertedValue)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Portfolio %:</span>
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
              {percentage.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Type:</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              data.type === 'defi' 
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
            }`}>
              {data.type === 'defi' ? '🔐 DeFi' : '🏦 CeFi'}
            </span>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Holdings ({data.holdings.length}):
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {data.holdings.map((holding: any, idx: number) => {
              const holdingPercent = data.value > 0 ? (holding.value / data.value) * 100 : 0;
              return (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 dark:text-gray-400">
                    {holding.symbol} ({formatNumber(holding.amount)})
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-500">
                      {holdingPercent.toFixed(0)}%
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatMain(holding.value)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (walletData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No wallet data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Portfolio by Wallet
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {walletData.length} {walletData.length === 1 ? 'wallet' : 'wallets'}
        </div>
      </div>

      <div className="h-[300px] w-full [&_.recharts-pie-sector]:!opacity-100 [&_.recharts-pie]:!opacity-100 [&_.recharts-sector]:!opacity-100">
        <ResponsiveContainer width="100%" height="100%" debounce={200}>
          <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <Pie
              data={walletData}
              dataKey="value"
              nameKey="displayName"
              cx="50%"
              cy="50%"
              outerRadius={90}
              innerRadius={0}
              fill="#8884d8"
              paddingAngle={2}
              isAnimationActive={false}
              animationDuration={0}
              animationBegin={0}
              animationEasing="linear"
              activeShape={false as any}
              label={(entry: any) => {
                const percentage = totalValue > 0 ? (entry.value / totalValue) * 100 : 0;
                return percentage > 5 ? `${entry.displayName} (${percentage.toFixed(0)}%)` : '';
              }}
              labelLine={{ stroke: 'currentColor', strokeWidth: 1 }}
            >
              {walletData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  stroke="#fff"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <RechartsTooltip 
              content={<CustomTooltip />}
              trigger="hover"
              wrapperStyle={{ 
                zIndex: 9999,
                pointerEvents: 'none',
                visibility: 'visible'
              }}
              cursor={false}
              isAnimationActive={false}
              animationDuration={0}
              allowEscapeViewBox={{ x: true, y: true }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
        {walletData.map((wallet, index) => {
          const percentage = totalValue > 0 ? (wallet.value / totalValue) * 100 : 0;
          
          return (
            <div 
              key={index}
              className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: wallet.color }}
                />
                <span className="text-sm text-gray-900 dark:text-white truncate">
                  {wallet.displayName}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                  wallet.type === 'defi' 
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                }`}>
                  {wallet.type === 'defi' ? 'DeFi' : 'CeFi'}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {percentage.toFixed(1)}%
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatMain(wallet.value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet } from 'lucide-react';
import { getWalletById } from '@/lib/crypto-wallets-database';
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

export function PortfolioWalletPieChartV2({ holdings, prices }: PortfolioWalletPieChartProps) {
  const { formatMain } = useCurrencyConversion();
  
  const walletDistribution = holdings.reduce<Record<string, WalletDistributionData>>((acc, holding) => {
    const walletType = holding.walletType || 'other';
    const walletKey = holding.walletName ? walletType + '-' + holding.walletName : walletType;
    const currentPrice = prices[holding.symbol]?.price;
    const holdingValue = currentPrice !== undefined ? holding.amount * currentPrice : (holding.value || 0);

    if (!acc[walletKey]) {
      acc[walletKey] = { walletType, walletName: holding.walletName, value: 0, holdings: [] };
    }
    acc[walletKey].value += holdingValue;
    acc[walletKey].holdings.push({ symbol: holding.symbol, name: holding.name, amount: holding.amount, value: holdingValue });
    return acc;
  }, {});

  const walletData = Object.values(walletDistribution)
    .sort((a, b) => b.value - a.value)
    .map(wallet => {
      const walletInfo = getWalletById(wallet.walletType);
      return {
        ...wallet,
        displayName: wallet.walletName || walletInfo?.name || 'Other Wallet',
        color: walletInfo?.color || '#F59E0B',
        type: walletInfo?.type || 'defi'
      };
    });

  const totalValue = walletData.reduce((sum, wallet) => sum + wallet.value, 0);
  const displayWalletData = walletData.filter(wallet => wallet.value > 0.01);

  if (displayWalletData.length === 0 || totalValue === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No wallet data available</p>
          <p className="text-sm mt-1">Add holdings with wallet info to see distribution</p>
        </div>
      </div>
    );
  }

  interface TooltipProps {
    active?: boolean;
    payload?: Array<{ payload: typeof displayWalletData[0] }>;
  }

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = totalValue > 0 ? (data.value / totalValue) * 100 : 0;
      return (
        <div 
          className="bg-white dark:bg-gray-800 px-4 py-3 rounded-xl shadow-2xl border-2 border-orange-200 dark:border-orange-700"
          style={{ boxShadow: '0 10px 40px rgba(249, 115, 22, 0.3), 0 4px 20px rgba(0,0,0,0.15)' }}
        >
          <p className="text-sm font-bold text-gray-900 dark:text-white">{data.displayName}</p>
          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
            {data.type === 'defi' ? '🔐 DeFi Wallet' : '🏦 CeFi Exchange'}
          </p>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1">
            {percentage.toFixed(1)}% • {formatMain(data.value)}
          </p>
          {data.holdings && data.holdings.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {data.holdings.length} asset{data.holdings.length > 1 ? 's' : ''}: {data.holdings.map((h) => h.symbol).join(', ')}
              </p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Portfolio by Wallet
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {displayWalletData.length} {displayWalletData.length === 1 ? 'wallet' : 'wallets'}
        </div>
      </div>

      <div className="relative rounded-lg [&_.recharts-pie-sector]:!opacity-100 [&_.recharts-pie]:!opacity-100 [&_.recharts-sector]:!opacity-100" style={{ height: '300px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%" debounce={200}>
          <PieChart>
            <Pie 
              data={displayWalletData} 
              dataKey="value" 
              nameKey="displayName" 
              cx="50%" 
              cy="50%"
              outerRadius={100} 
              innerRadius={0} 
              paddingAngle={0}
              strokeWidth={displayWalletData.length > 1 ? 2 : 0} 
              stroke="#ffffff" 
              isAnimationActive={false}
              animationDuration={0}
              animationBegin={0}
              animationEasing="linear"
              startAngle={90}
              endAngle={-270}
              activeShape={false as any}
            >
              {displayWalletData.map((entry, index) => (
                <Cell 
                  key={'cell-' + index} 
                  fill={entry.color}
                  stroke={displayWalletData.length > 1 ? "#ffffff" : "none"}
                  strokeWidth={displayWalletData.length > 1 ? 2 : 0}
                />
              ))}
            </Pie>
            <Tooltip 
              isAnimationActive={false}
              animationDuration={0}
              trigger="hover"
              wrapperStyle={{ zIndex: 50, pointerEvents: 'none', visibility: 'visible' }}
              allowEscapeViewBox={{ x: true, y: true }} 
              content={<CustomTooltip />} 
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {displayWalletData.map((wallet, index) => {
          const percentage = totalValue > 0 ? (wallet.value / totalValue) * 100 : 0;
          return (
            <div 
              key={index} 
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0 shadow-md" 
                  style={{ backgroundColor: wallet.color }} 
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {wallet.displayName}
                </span>
                <span 
                  className={'text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ' + (wallet.type === 'defi' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300')}
                >
                  {wallet.type === 'defi' ? 'DeFi' : 'CeFi'}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                  {percentage.toFixed(1)}%
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
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

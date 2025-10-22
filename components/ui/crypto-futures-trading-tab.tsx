"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Coins,
  Plus,
  Edit3,
  Trash2,
  Calculator,
  Target,
  Shield,
  AlertTriangle,
  Zap,
  X,
  Activity
} from "lucide-react";
import { calculateCryptoPosition, formatCurrency, type MarginType } from "../../lib/trading-calculator";
import { priceService } from "../../lib/price-service";

interface CryptoFuturesPosition {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage: number;
  marginType: MarginType;
  margin: number;
  liquidationPrice: number;
  profitLoss: number;
  profitLossPercent: number;
  timestamp: Date;
  notes?: string;
  fundingRate?: number;
}

interface CryptoFuturesTradingTabProps {
  accountBalance: number;
  onAccountBalanceChange?: (balance: number) => void;
  onPositionsChange?: (positions: any[]) => void;
}

export function CryptoFuturesTradingTab({
  accountBalance,
  onAccountBalanceChange,
  onPositionsChange
}: CryptoFuturesTradingTabProps) {
  const [positions, setPositions] = useState<CryptoFuturesPosition[]>([]);
  const [showAddPosition, setShowAddPosition] = useState(false);

  // Add Position Form State
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [riskPercentage, setRiskPercentage] = useState(2);
  const [tradeSizeInput, setTradeSizeInput] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [takeProfitPrice, setTakeProfitPrice] = useState('');
  const [leverage, setLeverage] = useState(10);
  const [marginType, setMarginType] = useState<MarginType>('isolated');
  const [maintenanceMarginRate, setMaintenanceMarginRate] = useState(0.4);
  const [notes, setNotes] = useState('');
  const [useManualTradeSize, setUseManualTradeSize] = useState(false);

  // Live market data
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  const [calculatedPosition, setCalculatedPosition] = useState<any>(null);

  const cryptoSymbols = [
    'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT',
    'ADA/USDT', 'AVAX/USDT', 'DOT/USDT', 'MATIC/USDT', 'LINK/USDT',
    'UNI/USDT', 'ATOM/USDT', 'LTC/USDT', 'BCH/USDT', 'NEAR/USDT',
    'APT/USDT', 'ARB/USDT', 'OP/USDT', 'SUI/USDT', 'INJ/USDT'
  ];

  // Fetch live price for selected symbol
  useEffect(() => {
    const fetchLivePrice = async () => {
      setPriceLoading(true);
      try {
        // Extract base currency (e.g., BTC from BTC/USDT)
        const baseCurrency = symbol.split('/')[0];
        const price = await priceService.getPrice(baseCurrency);
        if (price) {
          setCurrentPrice(price.price);
        }
      } catch (error) {
        console.error('Error fetching crypto price:', error);
      } finally {
        setPriceLoading(false);
      }
    };

    fetchLivePrice();
    const interval = setInterval(fetchLivePrice, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [symbol]);

  // Update positions with live prices
  useEffect(() => {
    if (positions.length > 0) {
      const updatePositionPrices = async () => {
        const updatedPositions = await Promise.all(
          positions.map(async (position) => {
            try {
              const baseCurrency = position.symbol.split('/')[0];
              const price = await priceService.getPrice(baseCurrency);
              if (price) {
                const priceDiff = price.price - position.entryPrice;
                const profitLoss = position.direction === 'long' 
                  ? priceDiff * position.quantity
                  : -priceDiff * position.quantity;
                const profitLossPercent = (profitLoss / position.margin) * 100;

                return {
                  ...position,
                  currentPrice: price.price,
                  profitLoss,
                  profitLossPercent
                };
              }
              return position;
            } catch (error) {
              return position;
            }
          })
        );
        setPositions(updatedPositions);
        
        // Update parent component with live prices
        if (onPositionsChange) {
          onPositionsChange(updatedPositions);
        }
      };

      updatePositionPrices();
      const interval = setInterval(updatePositionPrices, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [positions.length]);

  const handleCalculatePosition = () => {
    if (!entryPrice || !stopLossPrice) {
      alert('Please enter entry price and stop loss price');
      return;
    }

    if (useManualTradeSize) {
      // Manual trade size calculation
      if (!tradeSizeInput) {
        alert('Please enter trade size');
        return;
      }

      const quantity = parseFloat(tradeSizeInput);
      const notionalValue = quantity * parseFloat(entryPrice);
      const margin = notionalValue / leverage;
      const stopLossDiff = Math.abs(parseFloat(entryPrice) - parseFloat(stopLossPrice));
      const potentialLoss = stopLossDiff * quantity;
      
      let potentialProfit: number | undefined;
      let riskRewardRatio: number | undefined;
      
      if (takeProfitPrice) {
        const takeProfitDiff = Math.abs(parseFloat(takeProfitPrice) - parseFloat(entryPrice));
        potentialProfit = takeProfitDiff * quantity;
        riskRewardRatio = potentialProfit / potentialLoss;
      }

      // Calculate liquidation price
      const maintenanceMarginRateDecimal = maintenanceMarginRate / 100;
      let liquidationPrice: number;
      if (marginType === 'isolated') {
        if (direction === 'long') {
          liquidationPrice = parseFloat(entryPrice) * (1 - (1 / leverage) + maintenanceMarginRateDecimal);
        } else {
          liquidationPrice = parseFloat(entryPrice) * (1 + (1 / leverage) - maintenanceMarginRateDecimal);
        }
      } else {
        if (direction === 'long') {
          liquidationPrice = parseFloat(entryPrice) - (accountBalance / quantity) * (1 - maintenanceMarginRateDecimal);
        } else {
          liquidationPrice = parseFloat(entryPrice) + (accountBalance / quantity) * (1 - maintenanceMarginRateDecimal);
        }
      }

      setCalculatedPosition({
        quantity,
        notionalValue,
        margin,
        leverage,
        marginType,
        liquidationPrice,
        riskAmount: potentialLoss,
        potentialProfit,
        potentialLoss,
        riskRewardRatio,
        maintenanceMargin: notionalValue * maintenanceMarginRateDecimal
      });
    } else {
      // Auto-calculated trade size based on risk
      const calc = calculateCryptoPosition({
        accountBalance,
        riskPercentage,
        entryPrice: parseFloat(entryPrice),
        stopLossPrice: parseFloat(stopLossPrice),
        leverage,
        marginType,
        takeProfitPrice: takeProfitPrice ? parseFloat(takeProfitPrice) : undefined,
        maintenanceMarginRate: maintenanceMarginRate / 100
      });

      setCalculatedPosition(calc);
    }
  };

  const handleAddPosition = () => {
    if (!calculatedPosition || !entryPrice) {
      alert('Please calculate position first');
      return;
    }

    const newPosition: CryptoFuturesPosition = {
      id: Date.now().toString(),
      symbol,
      direction,
      quantity: calculatedPosition.quantity,
      entryPrice: parseFloat(entryPrice),
      currentPrice: parseFloat(entryPrice),
      stopLoss: stopLossPrice ? parseFloat(stopLossPrice) : undefined,
      takeProfit: takeProfitPrice ? parseFloat(takeProfitPrice) : undefined,
      leverage,
      marginType,
      margin: calculatedPosition.margin,
      liquidationPrice: calculatedPosition.liquidationPrice,
      profitLoss: 0,
      profitLossPercent: 0,
      timestamp: new Date(),
      notes,
      fundingRate: 0.01 // Example funding rate
    };

    const updatedPositions = [...positions, newPosition];
    setPositions(updatedPositions);
    
    // Update parent component
    if (onPositionsChange) {
      onPositionsChange(updatedPositions);
    }
    
    // Deduct margin from account
    if (onAccountBalanceChange) {
      onAccountBalanceChange(accountBalance - calculatedPosition.margin);
    }

    // Reset form
    setShowAddPosition(false);
    setEntryPrice('');
    setStopLossPrice('');
    setTakeProfitPrice('');
    setNotes('');
    setCalculatedPosition(null);
  };

  const handleDeletePosition = (id: string) => {
    const position = positions.find(p => p.id === id);
    if (position && onAccountBalanceChange) {
      // Return margin + P/L to account
      onAccountBalanceChange(accountBalance + position.margin + position.profitLoss);
    }
    const updatedPositions = positions.filter(p => p.id !== id);
    setPositions(updatedPositions);
    
    // Update parent component
    if (onPositionsChange) {
      onPositionsChange(updatedPositions);
    }
  };

  const calculateTotalStats = () => {
    const totalMargin = positions.reduce((sum, p) => sum + p.margin, 0);
    const totalPL = positions.reduce((sum, p) => sum + p.profitLoss, 0);
    const totalNotional = positions.reduce((sum, p) => sum + (p.quantity * p.currentPrice), 0);
    const longPositions = positions.filter(p => p.direction === 'long').length;
    const shortPositions = positions.filter(p => p.direction === 'short').length;

    return { totalMargin, totalPL, totalNotional, longPositions, shortPositions };
  };

  const stats = calculateTotalStats();

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">Account Balance</div>
          <div className="text-2xl font-bold text-purple-600">
            {formatCurrency(accountBalance, 'USD')}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">Used Margin</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(stats.totalMargin, 'USD')}
          </div>
          <div className="text-xs text-gray-500">
            {((stats.totalMargin / accountBalance) * 100).toFixed(1)}% utilization
          </div>
        </div>

        <div className={`bg-gradient-to-br p-4 rounded-lg border ${
          stats.totalPL >= 0
            ? 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800'
            : 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total P/L</div>
          <div className={`text-2xl font-bold ${stats.totalPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(stats.totalPL, 'USD')}
          </div>
          <div className="text-xs text-gray-500">
            {((stats.totalPL / accountBalance) * 100).toFixed(2)}% ROI
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Notional</div>
          <div className="text-2xl font-bold text-amber-600">
            {formatCurrency(stats.totalNotional, 'USD')}
          </div>
          <div className="text-xs text-gray-500">
            {stats.longPositions} Long • {stats.shortPositions} Short
          </div>
        </div>
      </div>

      {/* Add Position Button */}
      <button
        onClick={() => setShowAddPosition(!showAddPosition)}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Add Crypto Futures Position
      </button>

      {/* Add Position Form */}
      {showAddPosition && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 border-2 border-purple-500">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Coins className="w-6 h-6 text-purple-600" />
              New Crypto Futures Position
            </h3>
            <button
              onClick={() => setShowAddPosition(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Direction Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Direction
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDirection('long')}
                  className={`py-3 rounded-lg font-semibold transition-all ${
                    direction === 'long'
                      ? 'bg-green-600 text-white shadow-lg shadow-green-500/50'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  Long (Buy)
                </button>
                <button
                  onClick={() => setDirection('short')}
                  className={`py-3 rounded-lg font-semibold transition-all ${
                    direction === 'short'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/50'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <TrendingDown className="w-4 h-4 inline mr-2" />
                  Short (Sell)
                </button>
              </div>
            </div>

            {/* Symbol & Risk */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Symbol
                </label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {cryptoSymbols.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Risk per Trade (%)
                </label>
                <input
                  type="number"
                  value={riskPercentage}
                  onChange={(e) => setRiskPercentage(parseFloat(e.target.value) || 0)}
                  step="0.5"
                  min="0.5"
                  max="10"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Max risk: {formatCurrency(accountBalance * (riskPercentage / 100), 'USD')}
                </div>
              </div>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Entry Price
                </label>
                <input
                  type="number"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  placeholder="43500.00"
                  step="0.01"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                  <Shield className="w-4 h-4 text-red-600" />
                  Stop Loss Price
                </label>
                <input
                  type="number"
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(e.target.value)}
                  placeholder="42000.00"
                  step="0.01"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                  <Target className="w-4 h-4 text-green-600" />
                  Take Profit Price
                </label>
                <input
                  type="number"
                  value={takeProfitPrice}
                  onChange={(e) => setTakeProfitPrice(e.target.value)}
                  placeholder="45000.00"
                  step="0.01"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Leverage & Margin Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Leverage: {leverage}x
                </label>
                <input
                  type="range"
                  min="1"
                  max="125"
                  value={leverage}
                  onChange={(e) => setLeverage(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1x</span>
                  <span>25x</span>
                  <span>50x</span>
                  <span>75x</span>
                  <span>125x</span>
                </div>
                {leverage > 20 && (
                  <div className="flex items-center gap-2 mt-2 text-amber-600 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    High leverage = High liquidation risk
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Margin Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMarginType('isolated')}
                    className={`px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                      marginType === 'isolated'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Isolated
                  </button>
                  <button
                    onClick={() => setMarginType('cross')}
                    className={`px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                      marginType === 'cross'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Cross
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {marginType === 'isolated' 
                    ? 'Only position margin at risk'
                    : 'Full account balance at risk'}
                </div>
              </div>
            </div>

            {/* Maintenance Margin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Maintenance Margin Rate (%)
              </label>
              <input
                type="number"
                value={maintenanceMarginRate}
                onChange={(e) => setMaintenanceMarginRate(parseFloat(e.target.value) || 0.4)}
                step="0.1"
                min="0.1"
                max="5"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Trade Size Calculator Toggle */}
            <div className="bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20 p-4 rounded-lg border-2 border-cyan-200 dark:border-cyan-800">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-cyan-600" />
                  Trade Size Calculator
                </label>
                <button
                  onClick={() => setUseManualTradeSize(!useManualTradeSize)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    useManualTradeSize
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {useManualTradeSize ? 'Manual' : 'Auto'}
                </button>
              </div>

              {useManualTradeSize ? (
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Enter Trade Size (Quantity)
                  </label>
                  <input
                    type="number"
                    value={tradeSizeInput}
                    onChange={(e) => setTradeSizeInput(e.target.value)}
                    placeholder={symbol.includes('BTC') ? '0.5' : '10'}
                    step={symbol.includes('BTC') ? '0.01' : '1'}
                    min="0.01"
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-cyan-300 dark:border-cyan-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white dark:bg-gray-800 p-2 rounded border border-cyan-200 dark:border-cyan-700">
                      <div className="text-gray-500">Quantity</div>
                      <div className="font-semibold">{parseFloat(tradeSizeInput || '0').toFixed(4)} {symbol.split('/')[0]}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded border border-cyan-200 dark:border-cyan-700">
                      <div className="text-gray-500">Notional Value</div>
                      <div className="font-semibold">
                        ${(parseFloat(tradeSizeInput || '0') * parseFloat(entryPrice || '0')).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Trade size will be calculated automatically based on your risk percentage ({riskPercentage}%) and account balance.
                  <div className="mt-2 text-cyan-600 dark:text-cyan-400 font-semibold">
                    Est. Risk: {formatCurrency(accountBalance * (riskPercentage / 100), 'USD')}
                  </div>
                </div>
              )}
            </div>

            {/* Live Market Price */}
            {currentPrice && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className={`w-4 h-4 ${priceLoading ? 'animate-pulse text-amber-500' : 'text-green-600'}`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Live Price: {symbol}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Trade Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Trade setup, analysis notes..."
                rows={2}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleCalculatePosition}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
            >
              <Calculator className="w-5 h-5" />
              Calculate Position Size
            </button>

            {/* Calculation Results */}
            {calculatedPosition && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-5 rounded-xl border-2 border-purple-300 dark:border-purple-700 space-y-4">
                <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  Calculated Position Details
                </h4>

                {/* Trade Size Breakdown */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                  <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-purple-600" />
                    Trade Size & Position Value
                  </h5>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Quantity</div>
                      <div className="text-xl font-bold text-purple-600">{calculatedPosition.quantity.toFixed(6)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{symbol.split('/')[0]}</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Notional Value</div>
                      <div className="text-xl font-bold text-purple-600">${calculatedPosition.notionalValue.toLocaleString()}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Position size in USDT</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Entry Price:</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">${parseFloat(entryPrice).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total Position Value:</span>
                      <span className="text-sm font-bold text-purple-600">${(calculatedPosition.quantity * parseFloat(entryPrice)).toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Quantity</div>
                    <div className="text-lg font-bold text-purple-600">
                      {calculatedPosition.quantity.toFixed(6)}
                    </div>
                    <div className="text-xs text-gray-500">{symbol.split('/')[0]}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Notional Value</div>
                    <div className="text-lg font-bold text-purple-600">
                      {formatCurrency(calculatedPosition.notionalValue, 'USD')}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Margin Required</div>
                    <div className="text-lg font-bold text-purple-600">
                      {formatCurrency(calculatedPosition.margin, 'USD')}
                    </div>
                  </div>
                </div>

                {/* Margin & Leverage Info */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-purple-200 dark:border-purple-700">
                    <div className="text-xs text-gray-600 dark:text-gray-400">Margin Required</div>
                    <div className="text-lg font-bold text-purple-600">
                      ${calculatedPosition.margin.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {((calculatedPosition.margin / accountBalance) * 100).toFixed(1)}% of account
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-purple-200 dark:border-purple-700">
                    <div className="text-xs text-gray-600 dark:text-gray-400">Leverage</div>
                    <div className="text-lg font-bold text-purple-600">
                      {leverage}x
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {marginType.toUpperCase()} margin
                    </div>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border-2 border-amber-300 dark:border-amber-700">
                    <div className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Liquidation
                    </div>
                    <div className="text-lg font-bold text-amber-600">
                      ${calculatedPosition.liquidationPrice.toLocaleString()}
                    </div>
                    <div className="text-xs text-amber-600 mt-1">
                      {((Math.abs(parseFloat(entryPrice) - calculatedPosition.liquidationPrice) / parseFloat(entryPrice)) * 100).toFixed(2)}% away
                    </div>
                  </div>
                </div>

                {/* Profit & Loss Calculations */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                  <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    Profit & Loss Projections
                  </h5>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border-2 border-red-300 dark:border-red-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-red-600" />
                        <span className="text-xs font-semibold text-red-700 dark:text-red-300">Maximum Loss</span>
                      </div>
                      <div className="text-2xl font-bold text-red-600 mb-1">
                        -${calculatedPosition.potentialLoss.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Stop Loss: ${parseFloat(stopLossPrice).toLocaleString()}
                      </div>
                      <div className="text-xs font-semibold text-red-600">
                        {((calculatedPosition.potentialLoss / accountBalance) * 100).toFixed(2)}% of account ({riskPercentage.toFixed(1)}% target)
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Loss with {leverage}x leverage
                      </div>
                    </div>

                    {calculatedPosition.potentialProfit && (
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-2 border-green-300 dark:border-green-700">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-semibold text-green-700 dark:text-green-300">Maximum Profit</span>
                        </div>
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          +${calculatedPosition.potentialProfit.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Take Profit: ${parseFloat(takeProfitPrice).toLocaleString()}
                        </div>
                        <div className="text-xs font-semibold text-green-600">
                          {((calculatedPosition.potentialProfit / accountBalance) * 100).toFixed(2)}% of account
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Profit with {leverage}x leverage
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {calculatedPosition.riskRewardRatio && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Risk/Reward Ratio:</span>
                      <span className={`text-lg font-bold ${calculatedPosition.riskRewardRatio >= 2 ? 'text-green-600' : calculatedPosition.riskRewardRatio >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                        1:{calculatedPosition.riskRewardRatio.toFixed(2)} {calculatedPosition.riskRewardRatio >= 2 ? '✅' : calculatedPosition.riskRewardRatio >= 1 ? '⚠️' : '❌'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3 hidden">
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Liquidation Price
                    </div>
                    <div className="text-xl font-bold text-amber-600">
                      {formatCurrency(calculatedPosition.liquidationPrice, 'USD', 2)}
                    </div>
                    <div className="text-xs text-amber-600">
                      {marginType.toUpperCase()} margin
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-xs text-blue-700 dark:text-blue-300">Maintenance Margin</div>
                    <div className="text-xl font-bold text-blue-600">
                      {formatCurrency(calculatedPosition.maintenanceMargin, 'USD')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 hidden">
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="text-xs text-red-700 dark:text-red-300">Risk</div>
                    <div className="text-xl font-bold text-red-600">
                      {formatCurrency(calculatedPosition.potentialLoss, 'USD')}
                    </div>
                  </div>

                  {calculatedPosition.potentialProfit && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-xs text-green-700 dark:text-green-300">Reward</div>
                      <div className="text-xl font-bold text-green-600">
                        {formatCurrency(calculatedPosition.potentialProfit, 'USD')}
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-300">
                        R:R {calculatedPosition.riskRewardRatio?.toFixed(2)}:1
                      </div>
                    </div>
                  )}
                </div>

                {/* Add Position Confirmation */}
                <button
                  onClick={handleAddPosition}
                  className={`w-full mt-4 py-3 rounded-lg font-bold text-white transition-all ${
                    direction === 'long'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Open {direction.toUpperCase()} Position
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Open Positions */}
      {positions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Open Positions ({positions.length})
          </h3>

          <div className="space-y-3">
            {positions.map((position) => (
              <div
                key={position.id}
                className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      position.direction === 'long'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {position.direction === 'long' ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-lg text-gray-900 dark:text-white">
                        {position.symbol}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {position.quantity.toFixed(6)} • {position.leverage}x • {position.marginType.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeletePosition(position.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-3 text-sm mb-3">
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Entry</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      ${position.entryPrice.toFixed(2)}
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Current</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      ${position.currentPrice.toFixed(2)}
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Margin</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(position.margin, 'USD')}
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Liq. Price</div>
                    <div className="font-semibold text-amber-600">
                      ${position.liquidationPrice.toFixed(2)}
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-600 dark:text-gray-400">P/L</div>
                    <div className={`font-semibold ${
                      position.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(position.profitLoss, 'USD')}
                    </div>
                  </div>
                </div>

                {(position.stopLoss || position.takeProfit) && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex gap-4 text-sm">
                    {position.stopLoss && (
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-red-600" />
                        <span className="text-gray-600 dark:text-gray-400">SL:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ${position.stopLoss.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {position.takeProfit && (
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-green-600" />
                        <span className="text-gray-600 dark:text-gray-400">TP:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ${position.takeProfit.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {position.notes && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                    {position.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Positions Message */}
      {positions.length === 0 && !showAddPosition && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-12 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
          <Coins className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Open Crypto Futures Positions
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Click "Add Crypto Futures Position" to start trading
          </p>
        </div>
      )}
    </div>
  );
}

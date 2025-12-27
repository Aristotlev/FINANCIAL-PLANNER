"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Edit3,
  Trash2,
  Calculator,
  Target,
  Shield,
  AlertTriangle,
  Info,
  X,
  Activity
} from "lucide-react";
import { calculateForexPosition, formatCurrency, type AccountCurrency, calculatePipValue } from "../../lib/trading-calculator";
import { useAssetPrice, useAssetPrices } from "../../hooks/use-price";

interface ForexPosition {
  id: string;
  pair: string;
  direction: 'long' | 'short';
  lotSize: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage: number;
  pipValue: number;
  margin: number;
  profitLoss: number;
  profitLossPips: number;
  timestamp: Date;
  notes?: string;
}

interface ForexTradingTabProps {
  accountBalance: number;
  accountCurrency?: AccountCurrency;
  onAccountBalanceChange?: (balance: number) => void;
  onPositionsChange?: (positions: any[]) => void;
}

export function ForexTradingTab({
  accountBalance,
  accountCurrency = 'USD',
  onAccountBalanceChange,
  onPositionsChange
}: ForexTradingTabProps) {
  const [positions, setPositions] = useState<ForexPosition[]>([]);
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [editingPosition, setEditingPosition] = useState<string | null>(null);

  // Add Position Form State
  const [pair, setPair] = useState('EUR/USD');
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [riskPercentage, setRiskPercentage] = useState(1);
  const [lotSizeInput, setLotSizeInput] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLossPips, setStopLossPips] = useState('');
  const [takeProfitPips, setTakeProfitPips] = useState('');
  const [leverage, setLeverage] = useState(30);
  const [notes, setNotes] = useState('');
  const [useManualLotSize, setUseManualLotSize] = useState(false);

  // Live market data
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  // Quick position calculation
  const [calculatedPosition, setCalculatedPosition] = useState<any>(null);

  const forexPairs = [
    // Major Pairs
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD',
    // Cross Pairs
    'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'EUR/CHF', 'GBP/CHF', 'AUD/JPY', 'NZD/JPY',
    // Exotic Pairs
    'USD/SEK', 'USD/NOK', 'USD/TRY', 'USD/MXN', 'EUR/TRY', 'GBP/AUD'
  ];

  // Fetch live price for selected pair using WebSocket hook
  const { price: livePriceData, loading: livePriceLoading } = useAssetPrice(pair);

  useEffect(() => {
    setPriceLoading(livePriceLoading);
    if (livePriceData) {
      setCurrentPrice(livePriceData.price);
    }
  }, [livePriceData, livePriceLoading]);

  // Get live prices for all open positions
  const positionSymbols = positions.map(p => p.pair);
  const { prices: livePrices } = useAssetPrices(positionSymbols);

  // Update positions with live prices
  useEffect(() => {
    if (positions.length > 0 && Object.keys(livePrices).length > 0) {
      const updatedPositions = positions.map((position) => {
        const priceData = livePrices[position.pair];
        
        if (priceData) {
          const currentPrice = priceData.price;
          const priceDiff = currentPrice - position.entryPrice;
          const pipDiff = position.pair.includes('JPY') 
            ? priceDiff / 0.01 
            : priceDiff / 0.0001;
          const profitLossPips = position.direction === 'long' ? pipDiff : -pipDiff;
          const profitLoss = profitLossPips * position.pipValue;

          // Only update if values changed significantly to avoid loops
          if (Math.abs(position.currentPrice - currentPrice) > 0.00001) {
            return {
              ...position,
              currentPrice,
              profitLoss,
              profitLossPips
            };
          }
        }
        return position;
      });

      // Check if any position actually changed
      const hasChanges = updatedPositions.some((p, i) => 
        p.currentPrice !== positions[i].currentPrice
      );

      if (hasChanges) {
        setPositions(updatedPositions);
        
        // Update parent component with live prices
        if (onPositionsChange) {
          onPositionsChange(updatedPositions);
        }
      }
    }
  }, [livePrices, positions.length]); // Removed positions from dependency to avoid infinite loop, but need length to trigger on add/remove

  const handleCalculatePosition = () => {
    if (!stopLossPips || !entryPrice) {
      alert('Please enter stop loss pips and entry price');
      return;
    }

    if (useManualLotSize) {
      // Manual lot size calculation
      if (!lotSizeInput) {
        alert('Please enter lot size');
        return;
      }

      const lotSize = parseFloat(lotSizeInput);
      const pipValue = calculatePipValue(pair, lotSize, accountCurrency);
      const positionSize = lotSize * 100000;
      const margin = positionSize / leverage;
      const potentialLoss = parseFloat(stopLossPips) * pipValue;
      
      let potentialProfit: number | undefined;
      let riskRewardRatio: number | undefined;
      
      if (takeProfitPips) {
        potentialProfit = parseFloat(takeProfitPips) * pipValue;
        riskRewardRatio = potentialProfit / potentialLoss;
      }

      setCalculatedPosition({
        pipValue,
        lotSize,
        standardLots: lotSize,
        margin,
        leverage,
        positionSize,
        riskAmount: potentialLoss,
        stopLossPips: parseFloat(stopLossPips),
        takeProfitPips: takeProfitPips ? parseFloat(takeProfitPips) : undefined,
        potentialProfit,
        potentialLoss,
        riskRewardRatio
      });
    } else {
      // Auto-calculated lot size based on risk
      const calc = calculateForexPosition({
        accountBalance,
        riskPercentage,
        stopLossPips: parseFloat(stopLossPips),
        pair,
        leverage,
        accountCurrency,
        takeProfitPips: takeProfitPips ? parseFloat(takeProfitPips) : undefined
      });

      setCalculatedPosition(calc);
    }
  };

  const handleAddPosition = () => {
    if (!calculatedPosition || !entryPrice) {
      alert('Please calculate position first');
      return;
    }

    const newPosition: ForexPosition = {
      id: crypto.randomUUID(),
      pair,
      direction,
      lotSize: calculatedPosition.lotSize,
      entryPrice: parseFloat(entryPrice),
      currentPrice: parseFloat(entryPrice), // Will be updated with live prices
      stopLoss: direction === 'long' 
        ? parseFloat(entryPrice) - (parseFloat(stopLossPips) * (pair.includes('JPY') ? 0.01 : 0.0001))
        : parseFloat(entryPrice) + (parseFloat(stopLossPips) * (pair.includes('JPY') ? 0.01 : 0.0001)),
      takeProfit: takeProfitPips ? (
        direction === 'long'
          ? parseFloat(entryPrice) + (parseFloat(takeProfitPips) * (pair.includes('JPY') ? 0.01 : 0.0001))
          : parseFloat(entryPrice) - (parseFloat(takeProfitPips) * (pair.includes('JPY') ? 0.01 : 0.0001))
      ) : undefined,
      leverage,
      pipValue: calculatedPosition.pipValue,
      margin: calculatedPosition.margin,
      profitLoss: 0,
      profitLossPips: 0,
      timestamp: new Date(),
      notes
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
    setStopLossPips('');
    setTakeProfitPips('');
    setNotes('');
    setCalculatedPosition(null);
  };

  const handleDeletePosition = (id: string) => {
    const position = positions.find(p => p.id === id);
    if (position && onAccountBalanceChange) {
      // Return margin to account
      onAccountBalanceChange(accountBalance + position.margin);
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
    const totalPLPips = positions.reduce((sum, p) => sum + p.profitLossPips, 0);
    const longPositions = positions.filter(p => p.direction === 'long').length;
    const shortPositions = positions.filter(p => p.direction === 'short').length;

    return { totalMargin, totalPL, totalPLPips, longPositions, shortPositions };
  };

  const stats = calculateTotalStats();

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">Account Balance</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(accountBalance, accountCurrency)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">Used Margin</div>
          <div className="text-2xl font-bold text-purple-600">
            {formatCurrency(stats.totalMargin, accountCurrency)}
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
            {formatCurrency(stats.totalPL, accountCurrency)}
          </div>
          <div className="text-xs text-gray-500">
            {stats.totalPLPips >= 0 ? '+' : ''}{stats.totalPLPips.toFixed(1)} pips
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="text-sm text-gray-600 dark:text-gray-400">Open Positions</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {positions.length}
          </div>
          <div className="text-xs text-gray-500">
            {stats.longPositions} Long • {stats.shortPositions} Short
          </div>
        </div>
      </div>

      {/* Add Position Button */}
      <button
        onClick={() => setShowAddPosition(!showAddPosition)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[#212121] text-white rounded-lg border border-[#212121] transition-all duration-200 active:scale-95 hover:bg-[#333]"
      >
        <Plus className="w-4 h-4" />
        Add Forex Position
      </button>

      {/* Add Position Form */}
      {showAddPosition && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 border-2 border-purple-500">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-6 h-6 text-purple-600" />
              New Forex Position
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

            {/* Currency Pair & Risk */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Currency Pair
                </label>
                <select
                  value={pair}
                  onChange={(e) => setPair(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {forexPairs.map((p) => (
                    <option key={p} value={p}>{p}</option>
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
                  step="0.1"
                  min="0.1"
                  max="5"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Max risk: {formatCurrency(accountBalance * (riskPercentage / 100), accountCurrency)}
                </div>
              </div>
            </div>

            {/* Entry Price & Stop Loss */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Entry Price
                </label>
                <input
                  type="number"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  placeholder="1.0850"
                  step="0.0001"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                  <Shield className="w-4 h-4 text-red-600" />
                  Stop Loss (pips)
                </label>
                <input
                  type="number"
                  value={stopLossPips}
                  onChange={(e) => setStopLossPips(e.target.value)}
                  placeholder="50"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                  <Target className="w-4 h-4 text-green-600" />
                  Take Profit (pips)
                </label>
                <input
                  type="number"
                  value={takeProfitPips}
                  onChange={(e) => setTakeProfitPips(e.target.value)}
                  placeholder="100"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Leverage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Leverage: {leverage}:1
              </label>
              <input
                type="range"
                min="1"
                max="500"
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1:1</span>
                <span>1:50</span>
                <span>1:100</span>
                <span>1:200</span>
                <span>1:500</span>
              </div>
              {leverage > 100 && (
                <div className="flex items-center gap-2 mt-2 text-amber-600 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  High leverage increases risk significantly
                </div>
              )}
            </div>

            {/* Lot Size Calculator Toggle */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  Lot Size Calculator
                </label>
                <button
                  onClick={() => setUseManualLotSize(!useManualLotSize)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    useManualLotSize
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {useManualLotSize ? 'Manual' : 'Auto'}
                </button>
              </div>

              {useManualLotSize ? (
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Enter Lot Size
                  </label>
                  <input
                    type="number"
                    value={lotSizeInput}
                    onChange={(e) => setLotSizeInput(e.target.value)}
                    placeholder="0.10"
                    step="0.01"
                    min="0.01"
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-white dark:bg-gray-800 p-2 rounded border border-blue-200 dark:border-blue-700">
                      <div className="text-gray-500">Micro</div>
                      <div className="font-semibold">{(parseFloat(lotSizeInput || '0') * 1000).toFixed(0)} units</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded border border-blue-200 dark:border-blue-700">
                      <div className="text-gray-500">Mini</div>
                      <div className="font-semibold">{(parseFloat(lotSizeInput || '0') * 10).toFixed(2)} lots</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded border border-blue-200 dark:border-blue-700">
                      <div className="text-gray-500">Standard</div>
                      <div className="font-semibold">{(parseFloat(lotSizeInput || '0') * 100000).toFixed(0)} units</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Lot size will be calculated automatically based on your risk percentage ({riskPercentage}%) and account balance.
                  <div className="mt-2 text-blue-600 dark:text-blue-400 font-semibold">
                    Est. Risk: {formatCurrency(accountBalance * (riskPercentage / 100), accountCurrency)}
                  </div>
                </div>
              )}
            </div>

            {/* Live Market Price */}
            {currentPrice && (
              <div className="bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20 p-3 rounded-lg border border-cyan-200 dark:border-cyan-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className={`w-4 h-4 ${priceLoading ? 'animate-pulse text-amber-500' : 'text-cyan-600'}`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Live Price: {pair}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-cyan-600">
                    {currentPrice.toFixed(pair.includes('JPY') ? 3 : 5)}
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
                placeholder="Trade rationale, strategy notes..."
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
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-5 rounded-xl border-2 border-purple-300 dark:border-purple-700 space-y-4">
                <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-purple-600" />
                  Calculated Position Details
                </h4>
                
                {/* Lot Size Calculator Breakdown */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                  <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    Lot Size Breakdown
                  </h5>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Standard Lots</div>
                      <div className="text-xl font-bold text-blue-600">{calculatedPosition.standardLots.toFixed(2)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">100,000 units</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Mini Lots</div>
                      <div className="text-xl font-bold text-blue-600">{(calculatedPosition.standardLots * 10).toFixed(2)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">10,000 units</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Micro Lots</div>
                      <div className="text-xl font-bold text-blue-600">{(calculatedPosition.standardLots * 100).toFixed(2)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">1,000 units</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Recommended Trade Size:</span>
                    <span className="text-lg font-bold text-purple-600">{calculatedPosition.lotSize.toFixed(2)} lots</span>
                  </div>
                </div>

                {/* Trading Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-purple-200 dark:border-purple-700">
                    <div className="text-xs text-gray-600 dark:text-gray-400">Position Size</div>
                    <div className="text-lg font-bold text-purple-600">
                      {calculatedPosition.positionSize.toLocaleString()} units
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-purple-200 dark:border-purple-700">
                    <div className="text-xs text-gray-600 dark:text-gray-400">Pip Value</div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(calculatedPosition.pipValue, accountCurrency)}/pip
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-purple-200 dark:border-purple-700">
                    <div className="text-xs text-gray-600 dark:text-gray-400">Margin Required</div>
                    <div className="text-lg font-bold text-purple-600">
                      {formatCurrency(calculatedPosition.margin, accountCurrency)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {((calculatedPosition.margin / accountBalance) * 100).toFixed(1)}% of account
                    </div>
                  </div>
                </div>

                {/* Profit & Loss Calculations */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                  <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    Profit & Loss Analysis
                  </h5>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border-2 border-red-300 dark:border-red-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-red-600" />
                        <span className="text-xs font-semibold text-red-700 dark:text-red-300">Maximum Loss</span>
                      </div>
                      <div className="text-2xl font-bold text-red-600 mb-1">
                        -{formatCurrency(calculatedPosition.potentialLoss, accountCurrency)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Stop Loss: {calculatedPosition.stopLossPips} pips
                      </div>
                      <div className="text-xs font-semibold text-red-600">
                        {((calculatedPosition.potentialLoss / accountBalance) * 100).toFixed(2)}% of account ({riskPercentage.toFixed(1)}% target)
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Loss per pip: ${(calculatedPosition.potentialLoss / calculatedPosition.stopLossPips).toFixed(2)}
                      </div>
                    </div>

                    {calculatedPosition.potentialProfit && (
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-2 border-green-300 dark:border-green-700">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-semibold text-green-700 dark:text-green-300">Maximum Profit</span>
                        </div>
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          +{formatCurrency(calculatedPosition.potentialProfit, accountCurrency)}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Take Profit: {calculatedPosition.takeProfitPips} pips
                        </div>
                        <div className="text-xs font-semibold text-green-600">
                          {((calculatedPosition.potentialProfit / accountBalance) * 100).toFixed(2)}% of account
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Profit per pip: ${(calculatedPosition.potentialProfit / calculatedPosition.takeProfitPips).toFixed(2)}
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

                <div className="grid grid-cols-2 gap-3 hidden">
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="text-xs text-red-700 dark:text-red-300">Risk</div>
                    <div className="text-xl font-bold text-red-600">
                      {formatCurrency(calculatedPosition.potentialLoss, accountCurrency)}
                    </div>
                  </div>

                  {calculatedPosition.potentialProfit && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-xs text-green-700 dark:text-green-300">Reward</div>
                      <div className="text-xl font-bold text-green-600">
                        {formatCurrency(calculatedPosition.potentialProfit, accountCurrency)}
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
                  Add {direction.toUpperCase()} Position
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
                        {position.pair}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {position.lotSize.toFixed(2)} lots • {position.leverage}:1 leverage
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingPosition(position.id)}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <Edit3 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDeletePosition(position.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Entry</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {position.entryPrice.toFixed(5)}
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Current</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {position.currentPrice.toFixed(5)}
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Margin</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(position.margin, accountCurrency)}
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-600 dark:text-gray-400">P/L</div>
                    <div className={`font-semibold ${
                      position.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(position.profitLoss, accountCurrency)}
                    </div>
                  </div>
                </div>

                {(position.stopLoss || position.takeProfit) && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex gap-4 text-sm">
                    {position.stopLoss && (
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-red-600" />
                        <span className="text-gray-600 dark:text-gray-400">SL:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {position.stopLoss.toFixed(5)}
                        </span>
                      </div>
                    )}
                    {position.takeProfit && (
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-green-600" />
                        <span className="text-gray-600 dark:text-gray-400">TP:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {position.takeProfit.toFixed(5)}
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
          <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Open Forex Positions
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Click "Add Forex Position" to start trading
          </p>
        </div>
      )}
    </div>
  );
}

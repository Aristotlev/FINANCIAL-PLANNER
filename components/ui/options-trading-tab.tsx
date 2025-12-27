"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Edit3,
  Trash2,
  Calculator,
  Target,
  AlertTriangle,
  Info,
  X,
  BarChart3,
  Activity
} from "lucide-react";
import { calculateOptionsPosition, formatCurrency } from "../../lib/trading-calculator";
import { useAssetPrice, useAssetPrices } from "../../hooks/use-price";

interface OptionsPosition {
  id: string;
  symbol: string;
  optionType: 'call' | 'put';
  strikePrice: number;
  expirationDate: string;
  premium: number;
  contracts: number;
  underlyingPrice: number;
  currentPremium: number;
  breakeven: number;
  maxProfit: number;
  maxLoss: number;
  profitLoss: number;
  theta?: number;
  delta?: number;
  iv?: number;
  timestamp: Date;
  notes?: string;
}

interface OptionsTradingTabProps {
  accountBalance: number;
  onAccountBalanceChange?: (balance: number) => void;
  onPositionsChange?: (positions: any[]) => void;
}

export function OptionsTradingTab({
  accountBalance,
  onAccountBalanceChange,
  onPositionsChange
}: OptionsTradingTabProps) {
  const [positions, setPositions] = useState<OptionsPosition[]>([]);
  const [showAddPosition, setShowAddPosition] = useState(false);

  // Add Position Form State
  const [symbol, setSymbol] = useState('AAPL');
  const [optionType, setOptionType] = useState<'call' | 'put'>('call');
  const [underlyingPrice, setUnderlyingPrice] = useState('');
  const [strikePrice, setStrikePrice] = useState('');
  const [premium, setPremium] = useState('');
  const [contracts, setContracts] = useState('1');
  const [expirationDate, setExpirationDate] = useState('');
  const [impliedVolatility, setImpliedVolatility] = useState('');
  const [notes, setNotes] = useState('');

  const [calculatedPosition, setCalculatedPosition] = useState<any>(null);

  // Live market data
  const [currentUnderlyingPrice, setCurrentUnderlyingPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  const popularSymbols = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'SPY', 'QQQ', 'IWM',
    'AMD', 'NFLX', 'DIS', 'BA', 'JPM', 'V', 'WMT', 'PFE', 'INTC', 'CSCO'
  ];

  // Live market data for selected underlying symbol
  const { price: livePriceData, loading: livePriceLoading } = useAssetPrice(symbol);

  useEffect(() => {
    setPriceLoading(livePriceLoading);
    if (livePriceData) {
      setCurrentUnderlyingPrice(livePriceData.price);
      // Auto-fill underlying price if empty
      if (!underlyingPrice) {
        setUnderlyingPrice(livePriceData.price.toFixed(2));
      }
    }
  }, [livePriceData, livePriceLoading, underlyingPrice]);

  // Get live prices for all open positions
  const positionSymbols = positions.map(p => p.symbol);
  const { prices: livePrices } = useAssetPrices(positionSymbols);

  // Update positions with live underlying prices
  useEffect(() => {
    if (positions.length > 0 && Object.keys(livePrices).length > 0) {
      const updatedPositions = positions.map((position) => {
        const priceData = livePrices[position.symbol];
        if (priceData) {
          const newUnderlyingPrice = priceData.price;
          let profitLoss: number;

          if (position.optionType === 'call') {
            // Call option P/L: intrinsic value - premium paid
            const intrinsicValue = Math.max(0, newUnderlyingPrice - position.strikePrice);
            profitLoss = (intrinsicValue - position.premium) * position.contracts * 100;
          } else {
            // Put option P/L: intrinsic value - premium paid
            const intrinsicValue = Math.max(0, position.strikePrice - newUnderlyingPrice);
            profitLoss = (intrinsicValue - position.premium) * position.contracts * 100;
          }

          // Only update if changed significantly
          if (Math.abs(position.underlyingPrice - newUnderlyingPrice) > 0.01) {
            return {
              ...position,
              underlyingPrice: newUnderlyingPrice,
              profitLoss
            };
          }
        }
        return position;
      });

      const hasChanges = updatedPositions.some((p, i) => 
        p.underlyingPrice !== positions[i].underlyingPrice
      );

      if (hasChanges) {
        setPositions(updatedPositions);
        
        // Update parent component with live prices
        if (onPositionsChange) {
          onPositionsChange(updatedPositions);
        }
      }
    }
  }, [livePrices, positions.length]);

  const handleCalculatePosition = () => {
    if (!strikePrice || !premium || !underlyingPrice) {
      alert('Please fill in all required fields');
      return;
    }

    const calc = calculateOptionsPosition({
      optionType,
      strikePrice: parseFloat(strikePrice),
      premium: parseFloat(premium),
      contracts: parseInt(contracts),
      underlyingPrice: parseFloat(underlyingPrice)
    });

    setCalculatedPosition(calc);
  };

  const handleAddPosition = () => {
    if (!calculatedPosition || !expirationDate) {
      alert('Please calculate position and set expiration date');
      return;
    }

    const newPosition: OptionsPosition = {
      id: crypto.randomUUID(),
      symbol,
      optionType,
      strikePrice: parseFloat(strikePrice),
      expirationDate,
      premium: parseFloat(premium),
      contracts: parseInt(contracts),
      underlyingPrice: parseFloat(underlyingPrice),
      currentPremium: parseFloat(premium),
      breakeven: calculatedPosition.breakeven,
      maxProfit: calculatedPosition.maxProfit,
      maxLoss: calculatedPosition.maxLoss,
      profitLoss: 0,
      iv: impliedVolatility ? parseFloat(impliedVolatility) : undefined,
      timestamp: new Date(),
      notes
    };

    const updatedPositions = [...positions, newPosition];
    setPositions(updatedPositions);
    
    // Update parent component
    if (onPositionsChange) {
      onPositionsChange(updatedPositions);
    }
    
    // Deduct premium cost from account
    if (onAccountBalanceChange) {
      onAccountBalanceChange(accountBalance - calculatedPosition.totalCost);
    }

    // Reset form
    setShowAddPosition(false);
    setUnderlyingPrice('');
    setStrikePrice('');
    setPremium('');
    setContracts('1');
    setExpirationDate('');
    setImpliedVolatility('');
    setNotes('');
    setCalculatedPosition(null);
  };

  const handleDeletePosition = (id: string) => {
    const position = positions.find(p => p.id === id);
    if (position && onAccountBalanceChange) {
      // Return premium cost + P/L to account
      const totalCost = position.premium * position.contracts * 100;
      onAccountBalanceChange(accountBalance + totalCost + position.profitLoss);
    }
    const updatedPositions = positions.filter(p => p.id !== id);
    setPositions(updatedPositions);
    
    // Update parent component
    if (onPositionsChange) {
      onPositionsChange(updatedPositions);
    }
  };

  const calculateTotalStats = () => {
    const totalInvested = positions.reduce((sum, p) => sum + (p.premium * p.contracts * 100), 0);
    const totalPL = positions.reduce((sum, p) => sum + p.profitLoss, 0);
    const totalMaxRisk = positions.reduce((sum, p) => sum + p.maxLoss, 0);
    const callPositions = positions.filter(p => p.optionType === 'call').length;
    const putPositions = positions.filter(p => p.optionType === 'put').length;

    return { totalInvested, totalPL, totalMaxRisk, callPositions, putPositions };
  };

  const stats = calculateTotalStats();

  const getDaysToExpiration = (expirationDate: string) => {
    const expDate = new Date(expirationDate);
    const today = new Date();
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">Account Balance</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(accountBalance, 'USD')}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">Capital Deployed</div>
          <div className="text-2xl font-bold text-purple-600">
            {formatCurrency(stats.totalInvested, 'USD')}
          </div>
          <div className="text-xs text-gray-500">
            {((stats.totalInvested / accountBalance) * 100).toFixed(1)}% of account
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
            {stats.totalInvested > 0 ? ((stats.totalPL / stats.totalInvested) * 100).toFixed(1) : 0}% return
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="text-sm text-gray-600 dark:text-gray-400">Open Positions</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {positions.length}
          </div>
          <div className="text-xs text-gray-500">
            {stats.callPositions} Calls • {stats.putPositions} Puts
          </div>
        </div>
      </div>

      {/* Add Position Button */}
      <button
        onClick={() => setShowAddPosition(!showAddPosition)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[#212121] text-white rounded-lg border border-[#212121] transition-all duration-200 active:scale-95 hover:bg-[#333]"
      >
        <Plus className="w-4 h-4" />
        Add Options Position
      </button>

      {/* Add Position Form */}
      {showAddPosition && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 border-2 border-blue-500">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              New Options Position
            </h3>
            <button
              onClick={() => setShowAddPosition(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Option Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Option Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setOptionType('call')}
                  className={`py-3 rounded-lg font-semibold transition-all ${
                    optionType === 'call'
                      ? 'bg-green-600 text-white shadow-lg shadow-green-500/50'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  Call Option (Bullish)
                </button>
                <button
                  onClick={() => setOptionType('put')}
                  className={`py-3 rounded-lg font-semibold transition-all ${
                    optionType === 'put'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/50'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <TrendingDown className="w-4 h-4 inline mr-2" />
                  Put Option (Bearish)
                </button>
              </div>
            </div>

            {/* Symbol & Contracts */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Underlying Symbol
                </label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {popularSymbols.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Number of Contracts
                </label>
                <input
                  type="number"
                  value={contracts}
                  onChange={(e) => setContracts(e.target.value)}
                  min="1"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="text-xs text-gray-500 mt-1">
                  1 contract = 100 shares
                </div>
              </div>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Underlying Price
                </label>
                <input
                  type="number"
                  value={underlyingPrice}
                  onChange={(e) => setUnderlyingPrice(e.target.value)}
                  placeholder="175.50"
                  step="0.01"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {currentUnderlyingPrice && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-green-600 dark:text-green-400">
                    <Activity className={`w-3 h-3 ${priceLoading ? 'animate-pulse' : ''}`} />
                    Live: ${currentUnderlyingPrice.toFixed(2)}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Strike Price
                </label>
                <input
                  type="number"
                  value={strikePrice}
                  onChange={(e) => setStrikePrice(e.target.value)}
                  placeholder="180.00"
                  step="0.50"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Premium (per share)
                </label>
                <input
                  type="number"
                  value={premium}
                  onChange={(e) => setPremium(e.target.value)}
                  placeholder="3.50"
                  step="0.05"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Expiration & IV */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Implied Volatility (%) - Optional
                </label>
                <input
                  type="number"
                  value={impliedVolatility}
                  onChange={(e) => setImpliedVolatility(e.target.value)}
                  placeholder="25.5"
                  step="0.1"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Trade Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Trade thesis, strategy notes..."
                rows={2}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleCalculatePosition}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              <Calculator className="w-5 h-5" />
              Calculate Option Metrics
            </button>

            {/* Calculation Results */}
            {calculatedPosition && (
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Option Analysis</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Total Cost</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(calculatedPosition.totalCost, 'USD')}
                    </div>
                    <div className="text-xs text-gray-500">
                      ${premium} × {contracts} × 100
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Breakeven Price</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {formatCurrency(calculatedPosition.breakeven, 'USD', 2)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="text-xs text-red-700 dark:text-red-300">Max Loss</div>
                    <div className="text-xl font-bold text-red-600">
                      {formatCurrency(calculatedPosition.maxLoss, 'USD')}
                    </div>
                    <div className="text-xs text-red-600">Premium paid</div>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-xs text-green-700 dark:text-green-300">Max Profit</div>
                    <div className="text-xl font-bold text-green-600">
                      {calculatedPosition.maxProfit === Infinity
                        ? '∞ Unlimited'
                        : formatCurrency(calculatedPosition.maxProfit, 'USD')}
                    </div>
                    {optionType === 'call' && (
                      <div className="text-xs text-green-600">If stock rises</div>
                    )}
                    {optionType === 'put' && (
                      <div className="text-xs text-green-600">If stock falls to $0</div>
                    )}
                  </div>
                </div>

                {/* Key Levels */}
                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 mb-3">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Key Price Levels</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Current:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">${underlyingPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Strike:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">${strikePrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Breakeven:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        ${calculatedPosition.breakeven.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        {optionType === 'call' ? 'In the Money if >' : 'In the Money if <'}:
                      </span>
                      <span className="font-semibold text-green-600">${strikePrice}</span>
                    </div>
                  </div>
                </div>

                {/* Warnings */}
                {getDaysToExpiration(expirationDate) < 30 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                      <div className="text-sm text-amber-800 dark:text-amber-200">
                        {getDaysToExpiration(expirationDate)} days to expiration - Time decay (Theta) will accelerate
                      </div>
                    </div>
                  </div>
                )}

                {/* Add Position Confirmation */}
                <button
                  onClick={handleAddPosition}
                  className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
                    optionType === 'call'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Buy {optionType.toUpperCase()} Option
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
            Open Options Positions ({positions.length})
          </h3>

          <div className="space-y-3">
            {positions.map((position) => {
              const daysToExp = getDaysToExpiration(position.expirationDate);
              const isITM = position.optionType === 'call' 
                ? position.underlyingPrice > position.strikePrice
                : position.underlyingPrice < position.strikePrice;

              return (
                <div
                  key={position.id}
                  className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        position.optionType === 'call'
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        {position.optionType === 'call' ? (
                          <TrendingUp className="w-5 h-5 text-green-600" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-lg text-gray-900 dark:text-white">
                          {position.symbol} ${position.strikePrice} {position.optionType.toUpperCase()}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {position.contracts} contracts • Exp: {new Date(position.expirationDate).toLocaleDateString()}
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                            isITM 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {isITM ? 'ITM' : 'OTM'}
                          </span>
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
                      <div className="text-gray-600 dark:text-gray-400">Entry Premium</div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        ${position.premium.toFixed(2)}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-600 dark:text-gray-400">Total Cost</div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(position.premium * position.contracts * 100, 'USD')}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-600 dark:text-gray-400">Breakeven</div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        ${position.breakeven.toFixed(2)}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-600 dark:text-gray-400">Days to Exp</div>
                      <div className={`font-semibold ${
                        daysToExp < 7 ? 'text-red-600' : daysToExp < 30 ? 'text-amber-600' : 'text-gray-900 dark:text-white'
                      }`}>
                        {daysToExp} days
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

                  {position.notes && (
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 italic">
                      {position.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No Positions Message */}
      {positions.length === 0 && !showAddPosition && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-12 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Open Options Positions
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Click "Add Options Position" to start trading options
          </p>
        </div>
      )}
    </div>
  );
}

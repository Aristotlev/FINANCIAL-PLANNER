"use client";

import React, { useState, useEffect } from "react";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Info,
  Target,
  Shield,
  Zap,
  Activity
} from "lucide-react";
import {
  calculateForexPosition,
  calculateCryptoPosition,
  calculateOptionsPosition,
  calculateFuturesPosition,
  calculateRiskMetrics,
  formatCurrency,
  kellyCalculator,
  type MarginType,
  type PositionSide,
  type AccountCurrency
} from "../../lib/trading-calculator";

type TradingType = 'forex' | 'crypto' | 'options' | 'futures';

interface TradingCalculatorPanelProps {
  accountBalance: number;
  accountCurrency?: AccountCurrency;
  onCalculationComplete?: (calculation: any) => void;
}

export function TradingCalculatorPanel({
  accountBalance,
  accountCurrency = 'USD',
  onCalculationComplete
}: TradingCalculatorPanelProps) {
  const [tradingType, setTradingType] = useState<TradingType>('forex');
  const [isCalculating, setIsCalculating] = useState(false);

  // Common fields
  const [riskPercentage, setRiskPercentage] = useState(1);
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [takeProfitPrice, setTakeProfitPrice] = useState('');
  const [leverage, setLeverage] = useState(1);

  // Forex specific
  const [forexPair, setForexPair] = useState('EUR/USD');
  const [stopLossPips, setStopLossPips] = useState('');
  const [takeProfitPips, setTakeProfitPips] = useState('');

  // Crypto specific
  const [marginType, setMarginType] = useState<MarginType>('isolated');
  const [maintenanceMarginRate, setMaintenanceMarginRate] = useState(0.4);

  // Options specific
  const [optionType, setOptionType] = useState<'call' | 'put'>('call');
  const [strikePrice, setStrikePrice] = useState('');
  const [premium, setPremium] = useState('');
  const [contracts, setContracts] = useState('1');

  // Futures specific
  const [contractMultiplier, setContractMultiplier] = useState('50');

  // Calculation results
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [riskMetrics, setRiskMetrics] = useState<any>(null);

  const handleCalculate = () => {
    setIsCalculating(true);
    
    try {
      let result: any = null;

      switch (tradingType) {
        case 'forex':
          result = calculateForexPosition({
            accountBalance,
            riskPercentage,
            stopLossPips: parseFloat(stopLossPips) || 0,
            pair: forexPair,
            leverage,
            accountCurrency,
            takeProfitPips: takeProfitPips ? parseFloat(takeProfitPips) : undefined
          });
          break;

        case 'crypto':
          result = calculateCryptoPosition({
            accountBalance,
            riskPercentage,
            entryPrice: parseFloat(entryPrice) || 0,
            stopLossPrice: parseFloat(stopLossPrice) || 0,
            leverage,
            marginType,
            takeProfitPrice: takeProfitPrice ? parseFloat(takeProfitPrice) : undefined,
            maintenanceMarginRate: maintenanceMarginRate / 100
          });
          break;

        case 'options':
          result = calculateOptionsPosition({
            optionType,
            strikePrice: parseFloat(strikePrice) || 0,
            premium: parseFloat(premium) || 0,
            contracts: parseInt(contracts) || 1,
            underlyingPrice: parseFloat(entryPrice) || 0
          });
          break;

        case 'futures':
          result = calculateFuturesPosition({
            accountBalance,
            riskPercentage,
            contractPrice: parseFloat(entryPrice) || 0,
            stopLossPrice: parseFloat(stopLossPrice) || 0,
            multiplier: parseFloat(contractMultiplier) || 50,
            leverage,
            takeProfitPrice: takeProfitPrice ? parseFloat(takeProfitPrice) : undefined
          });
          break;
      }

      setCalculationResult(result);

      // Calculate risk metrics
      if (tradingType !== 'options' && entryPrice && stopLossPrice) {
        const risk = calculateRiskMetrics({
          accountBalance,
          riskPercentage,
          entryPrice: parseFloat(entryPrice),
          stopLossPrice: parseFloat(stopLossPrice),
          leverage
        });
        setRiskMetrics(risk);
      }

      if (onCalculationComplete) {
        onCalculationComplete(result);
      }
    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    // Auto-calculate when relevant fields change
    if (tradingType === 'forex' && stopLossPips) {
      handleCalculate();
    } else if ((tradingType === 'crypto' || tradingType === 'futures') && entryPrice && stopLossPrice) {
      handleCalculate();
    } else if (tradingType === 'options' && strikePrice && premium && entryPrice) {
      handleCalculate();
    }
  }, [
    tradingType,
    riskPercentage,
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    leverage,
    forexPair,
    stopLossPips,
    takeProfitPips,
    marginType,
    maintenanceMarginRate,
    optionType,
    strikePrice,
    premium,
    contracts,
    contractMultiplier
  ]);

  return (
    <div className="space-y-6">
      {/* Trading Type Selector */}
      <div className="grid grid-cols-4 gap-3">
        {(['forex', 'crypto', 'options', 'futures'] as TradingType[]).map((type) => (
          <button
            key={type}
            onClick={() => setTradingType(type)}
            className={`px-4 py-3 rounded-lg font-medium text-sm transition-all ${
              tradingType === type
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Account Info */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Account Balance</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(accountBalance, accountCurrency)}
            </div>
          </div>
          <DollarSign className="w-8 h-8 text-purple-600" />
        </div>
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-2 gap-4">
        {/* Risk Percentage */}
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
          <div className="mt-1 text-xs text-gray-500">
            Max risk: {formatCurrency(accountBalance * (riskPercentage / 100), accountCurrency)}
          </div>
        </div>

        {/* Leverage */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Leverage
          </label>
          <select
            value={leverage}
            onChange={(e) => setLeverage(parseInt(e.target.value))}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {[1, 2, 3, 5, 10, 20, 25, 50, 75, 100, 125].map((lev) => (
              <option key={lev} value={lev}>
                {lev}:1
              </option>
            ))}
          </select>
          {leverage > 20 && (
            <div className="mt-1 flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="w-3 h-3" />
              High risk leverage
            </div>
          )}
        </div>

        {/* Forex Specific Fields */}
        {tradingType === 'forex' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency Pair
              </label>
              <select
                value={forexPair}
                onChange={(e) => setForexPair(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option>EUR/USD</option>
                <option>GBP/USD</option>
                <option>USD/JPY</option>
                <option>USD/CHF</option>
                <option>AUD/USD</option>
                <option>USD/CAD</option>
                <option>NZD/USD</option>
                <option>EUR/GBP</option>
                <option>EUR/JPY</option>
                <option>GBP/JPY</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stop Loss (pips)
              </label>
              <input
                type="number"
                value={stopLossPips}
                onChange={(e) => setStopLossPips(e.target.value)}
                placeholder="e.g., 50"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Take Profit (pips) - Optional
              </label>
              <input
                type="number"
                value={takeProfitPips}
                onChange={(e) => setTakeProfitPips(e.target.value)}
                placeholder="e.g., 100"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </>
        )}

        {/* Crypto Specific Fields */}
        {tradingType === 'crypto' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Entry Price
              </label>
              <input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="e.g., 43500"
                step="0.01"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stop Loss Price
              </label>
              <input
                type="number"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(e.target.value)}
                placeholder="e.g., 42000"
                step="0.01"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Take Profit Price - Optional
              </label>
              <input
                type="number"
                value={takeProfitPrice}
                onChange={(e) => setTakeProfitPrice(e.target.value)}
                placeholder="e.g., 45000"
                step="0.01"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Margin Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMarginType('isolated')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm ${
                    marginType === 'isolated'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Isolated
                </button>
                <button
                  onClick={() => setMarginType('cross')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm ${
                    marginType === 'cross'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Cross
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Maintenance Margin (%)
              </label>
              <input
                type="number"
                value={maintenanceMarginRate}
                onChange={(e) => setMaintenanceMarginRate(parseFloat(e.target.value) || 0.4)}
                step="0.1"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </>
        )}

        {/* Options Specific Fields */}
        {tradingType === 'options' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Option Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setOptionType('call')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm ${
                    optionType === 'call'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  Call
                </button>
                <button
                  onClick={() => setOptionType('put')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm ${
                    optionType === 'put'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <TrendingDown className="w-4 h-4 inline mr-1" />
                  Put
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Underlying Price
              </label>
              <input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="e.g., 450"
                step="0.01"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Strike Price
              </label>
              <input
                type="number"
                value={strikePrice}
                onChange={(e) => setStrikePrice(e.target.value)}
                placeholder="e.g., 460"
                step="0.01"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Premium per Contract
              </label>
              <input
                type="number"
                value={premium}
                onChange={(e) => setPremium(e.target.value)}
                placeholder="e.g., 5.50"
                step="0.01"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of Contracts
              </label>
              <input
                type="number"
                value={contracts}
                onChange={(e) => setContracts(e.target.value)}
                placeholder="1"
                min="1"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </>
        )}

        {/* Futures Specific Fields */}
        {tradingType === 'futures' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contract Price
              </label>
              <input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="e.g., 4500"
                step="0.25"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stop Loss Price
              </label>
              <input
                type="number"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(e.target.value)}
                placeholder="e.g., 4450"
                step="0.25"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Take Profit Price - Optional
              </label>
              <input
                type="number"
                value={takeProfitPrice}
                onChange={(e) => setTakeProfitPrice(e.target.value)}
                placeholder="e.g., 4600"
                step="0.25"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contract Multiplier
              </label>
              <select
                value={contractMultiplier}
                onChange={(e) => setContractMultiplier(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="50">ES (S&P 500 E-mini) - $50</option>
                <option value="20">NQ (Nasdaq E-mini) - $20</option>
                <option value="10">YM (Dow E-mini) - $10</option>
                <option value="1000">CL (Crude Oil) - $1000</option>
                <option value="100">GC (Gold) - $100</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Calculate Button */}
      <button
        onClick={handleCalculate}
        disabled={isCalculating}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
      >
        <Calculator className="w-5 h-5" />
        {isCalculating ? 'Calculating...' : 'Calculate Position'}
      </button>

      {/* Results */}
      {calculationResult && (
        <div className="space-y-4">
          {/* Main Results Card */}
          <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-6 rounded-xl text-white shadow-xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Position Calculation
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {tradingType === 'forex' && (
                <>
                  <div>
                    <div className="text-sm opacity-80">Lot Size</div>
                    <div className="text-2xl font-bold">{calculationResult.lotSize.toFixed(2)}</div>
                    <div className="text-xs opacity-70">{calculationResult.standardLots.toFixed(2)} standard lots</div>
                  </div>
                  <div>
                    <div className="text-sm opacity-80">Pip Value</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(calculationResult.pipValue, accountCurrency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm opacity-80">Position Size</div>
                    <div className="text-2xl font-bold">
                      {calculationResult.positionSize.toLocaleString()}
                    </div>
                    <div className="text-xs opacity-70">units</div>
                  </div>
                  <div>
                    <div className="text-sm opacity-80">Required Margin</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(calculationResult.margin, accountCurrency)}
                    </div>
                  </div>
                </>
              )}

              {tradingType === 'crypto' && (
                <>
                  <div>
                    <div className="text-sm opacity-80">Quantity</div>
                    <div className="text-2xl font-bold">{calculationResult.quantity.toFixed(6)}</div>
                  </div>
                  <div>
                    <div className="text-sm opacity-80">Notional Value</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(calculationResult.notionalValue, accountCurrency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm opacity-80">Required Margin</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(calculationResult.margin, accountCurrency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm opacity-80">Liquidation Price</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(calculationResult.liquidationPrice, accountCurrency, 2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm opacity-80">Margin Type</div>
                    <div className="text-2xl font-bold capitalize">{calculationResult.marginType}</div>
                  </div>
                  <div>
                    <div className="text-sm opacity-80">Maintenance Margin</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(calculationResult.maintenanceMargin, accountCurrency)}
                    </div>
                  </div>
                </>
              )}

              {tradingType === 'options' && (
                <>
                  <div>
                    <div className="text-sm opacity-80">Total Cost</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(calculationResult.totalCost, accountCurrency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm opacity-80">Breakeven</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(calculationResult.breakeven, accountCurrency, 2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm opacity-80">Max Loss</div>
                    <div className="text-2xl font-bold text-red-300">
                      {formatCurrency(calculationResult.maxLoss, accountCurrency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm opacity-80">Max Profit</div>
                    <div className="text-2xl font-bold text-green-300">
                      {calculationResult.maxProfit === Infinity
                        ? '∞'
                        : formatCurrency(calculationResult.maxProfit, accountCurrency)}
                    </div>
                  </div>
                </>
              )}

              {tradingType === 'futures' && (
                <>
                  <div>
                    <div className="text-sm opacity-80">Contracts</div>
                    <div className="text-2xl font-bold">{calculationResult.contracts}</div>
                  </div>
                  <div>
                    <div className="text-sm opacity-80">Total Notional</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(calculationResult.totalNotional, accountCurrency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm opacity-80">Required Margin</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(calculationResult.margin, accountCurrency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm opacity-80">Tick Value</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(calculationResult.tickValue, accountCurrency)}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Risk/Reward Card */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border-2 border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-red-600" />
                <h4 className="font-semibold text-red-900 dark:text-red-100">Risk</h4>
              </div>
              <div className="text-3xl font-bold text-red-600">
                {formatCurrency(calculationResult.potentialLoss || calculationResult.maxLoss, accountCurrency)}
              </div>
              <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                {((calculationResult.potentialLoss || calculationResult.maxLoss) / accountBalance * 100).toFixed(2)}% of account
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-2 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold text-green-900 dark:text-green-100">Reward</h4>
              </div>
              {calculationResult.potentialProfit !== undefined ? (
                <>
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(calculationResult.potentialProfit, accountCurrency)}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                    R:R {calculationResult.riskRewardRatio?.toFixed(2)}:1
                  </div>
                </>
              ) : (
                <div className="text-lg text-gray-600 dark:text-gray-400">Set take profit to calculate</div>
              )}
            </div>
          </div>

          {/* Risk Metrics */}
          {riskMetrics && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                Risk Management Metrics
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Max Risk Amount</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(riskMetrics.maxRiskAmount, accountCurrency)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Margin Utilization</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {riskMetrics.marginUtilization.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Recommended Leverage</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {riskMetrics.recommendedLeverage}:1
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Warning Messages */}
          {calculationResult.riskRewardRatio && calculationResult.riskRewardRatio < 1.5 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-900 dark:text-amber-100">Low Risk:Reward Ratio</div>
                  <div className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Your risk:reward ratio is {calculationResult.riskRewardRatio.toFixed(2)}:1. 
                    Consider targeting at least 2:1 for better trading probabilities.
                  </div>
                </div>
              </div>
            </div>
          )}

          {riskMetrics && riskMetrics.marginUtilization > 50 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-red-900 dark:text-red-100">High Margin Usage</div>
                  <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                    You're using {riskMetrics.marginUtilization.toFixed(1)}% of your account as margin. 
                    This increases liquidation risk. Consider reducing position size or leverage.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

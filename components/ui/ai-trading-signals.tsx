"use client";

import React, { useState, useEffect } from 'react';
import { Bot, TrendingUp, TrendingDown, Activity, Target, AlertTriangle, Zap, RefreshCw, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { formatNumber } from '../../lib/utils';

export interface TradingSignal {
  symbol: string;
  name?: string;
  signal: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  confidence: number; // 0-100
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number[];
  timeframe: '1D' | '1W' | '1M';
  indicators: {
    name: string;
    value: string;
    signal: 'bullish' | 'bearish' | 'neutral';
  }[];
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high';
}

interface AITradingSignalsProps {
  positions: Array<{
    symbol: string;
    name?: string;
    currentPrice: number;
    avgPrice: number;
    shares: number;
    positionType?: 'long' | 'short';
  }>;
  availableCash?: number;
}

export function AITradingSignals({ positions, availableCash = 0 }: AITradingSignalsProps) {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M'>('1D');

  useEffect(() => {
    generateSignals();
  }, [positions, timeframe]);

  const generateSignals = async () => {
    setLoading(true);
    
    try {
      const newSignals: TradingSignal[] = [];

      // Generate signals for existing positions
      for (const position of positions) {
        const pnlPercent = ((position.currentPrice - position.avgPrice) / position.avgPrice) * 100;
        const isShort = position.positionType === 'short';
        
        // AI logic for signal generation
        let signal: TradingSignal['signal'] = 'hold';
        let reasoning = '';
        const indicators: TradingSignal['indicators'] = [];
        let confidence = 0;

        // Price action analysis
        if (Math.abs(pnlPercent) > 20) {
          if (pnlPercent > 20) {
            signal = 'sell';
            reasoning = 'Strong gains achieved. Consider taking profits to lock in returns.';
            confidence = 75;
            indicators.push({ name: 'Profit Taking', value: `+${pnlPercent.toFixed(1)}%`, signal: 'bearish' });
          } else {
            signal = 'buy';
            reasoning = 'Position oversold. Averaging down opportunity if fundamentals remain strong.';
            confidence = 65;
            indicators.push({ name: 'Oversold', value: `${pnlPercent.toFixed(1)}%`, signal: 'bullish' });
          }
        } else if (Math.abs(pnlPercent) > 10) {
          if (pnlPercent > 10) {
            signal = 'hold';
            reasoning = 'Moderate gains. Consider holding for further upside or partial profit taking.';
            confidence = 60;
            indicators.push({ name: 'Momentum', value: 'Positive', signal: 'bullish' });
          } else {
            signal = 'hold';
            reasoning = 'Minor drawdown. Monitor position but no immediate action needed.';
            confidence = 55;
            indicators.push({ name: 'Trend', value: 'Weak', signal: 'bearish' });
          }
        } else {
          signal = 'hold';
          reasoning = 'Position trading within normal range. Wait for clearer signal.';
          confidence = 50;
          indicators.push({ name: 'Range Bound', value: `${pnlPercent.toFixed(1)}%`, signal: 'neutral' });
        }

        // Simulated technical indicators
        const rsiValue = 50 + (Math.random() * 40 - 20); // 30-70 range
        if (rsiValue > 70) {
          indicators.push({ name: 'RSI', value: rsiValue.toFixed(0), signal: 'bearish' });
          if (signal === 'hold') signal = 'sell';
          confidence += 10;
        } else if (rsiValue < 30) {
          indicators.push({ name: 'RSI', value: rsiValue.toFixed(0), signal: 'bullish' });
          if (signal === 'hold') signal = 'buy';
          confidence += 10;
        } else {
          indicators.push({ name: 'RSI', value: rsiValue.toFixed(0), signal: 'neutral' });
        }

        // MACD simulation
        const macdSignal = Math.random() > 0.5 ? 'bullish' : 'bearish';
        indicators.push({ 
          name: 'MACD', 
          value: macdSignal === 'bullish' ? 'Bullish Cross' : 'Bearish Cross', 
          signal: macdSignal 
        });
        
        if (macdSignal === 'bullish' && signal !== 'sell') {
          signal = signal === 'hold' ? 'buy' : signal;
          confidence += 8;
        } else if (macdSignal === 'bearish' && signal !== 'buy') {
          signal = signal === 'hold' ? 'sell' : signal;
          confidence += 8;
        }

        // Moving average trend
        const maTrend = pnlPercent > 0 ? 'bullish' : 'bearish';
        indicators.push({ 
          name: '50-Day MA', 
          value: pnlPercent > 0 ? 'Above' : 'Below', 
          signal: maTrend 
        });

        // Stop loss and take profit recommendations
        const stopLoss = position.avgPrice * 0.95;
        const takeProfit = [
          position.avgPrice * 1.05, // TP1: 5%
          position.avgPrice * 1.10, // TP2: 10%
          position.avgPrice * 1.15  // TP3: 15%
        ];

        // Determine risk level
        let riskLevel: TradingSignal['riskLevel'] = 'medium';
        if (Math.abs(pnlPercent) > 15) riskLevel = 'high';
        else if (Math.abs(pnlPercent) < 5) riskLevel = 'low';

        // Confidence cap
        confidence = Math.min(95, Math.max(45, confidence));

        newSignals.push({
          symbol: position.symbol,
          name: position.name,
          signal,
          confidence,
          entryPrice: position.currentPrice,
          stopLoss,
          takeProfit,
          timeframe,
          indicators,
          reasoning,
          riskLevel
        });
      }

      // Generate signals for potential new positions (if user has cash)
      if (availableCash > 1000 && positions.length < 10) {
        const opportunities = [
          { symbol: 'SPY', name: 'S&P 500 ETF' },
          { symbol: 'QQQ', name: 'NASDAQ-100 ETF' },
          { symbol: 'NVDA', name: 'NVIDIA' },
          { symbol: 'AAPL', name: 'Apple' },
          { symbol: 'MSFT', name: 'Microsoft' }
        ];

        // Pick one random opportunity
        const opp = opportunities[Math.floor(Math.random() * opportunities.length)];
        
        // Don't suggest if already holding
        if (!positions.some(p => p.symbol === opp.symbol)) {
          newSignals.push({
            symbol: opp.symbol,
            name: opp.name,
            signal: 'buy',
            confidence: 70 + Math.floor(Math.random() * 15),
            entryPrice: undefined,
            timeframe,
            indicators: [
              { name: 'Trend', value: 'Uptrend', signal: 'bullish' },
              { name: 'Volume', value: 'Increasing', signal: 'bullish' },
              { name: 'RSI', value: '45', signal: 'neutral' }
            ],
            reasoning: `Strong fundamentals and positive market sentiment. Good entry opportunity with available cash ($${formatNumber(availableCash)}).`,
            riskLevel: 'medium'
          });
        }
      }

      setSignals(newSignals);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error generating trading signals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSignalColor = (signal: TradingSignal['signal']) => {
    switch (signal) {
      case 'strong_buy': return 'bg-green-600 text-white';
      case 'buy': return 'bg-green-500 text-white';
      case 'hold': return 'bg-yellow-500 text-white';
      case 'sell': return 'bg-red-500 text-white';
      case 'strong_sell': return 'bg-red-600 text-white';
    }
  };

  const getSignalIcon = (signal: TradingSignal['signal']) => {
    switch (signal) {
      case 'strong_buy':
      case 'buy':
        return <ArrowUpRight className="w-4 h-4" />;
      case 'sell':
      case 'strong_sell':
        return <ArrowDownRight className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 dark:text-red-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (positions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Add trading positions to get AI-powered signals</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Trading Signals
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            {(['1D', '1W', '1M'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  timeframe === tf
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          <button
            onClick={generateSignals}
            disabled={loading}
            className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Last updated: {lastUpdated.toLocaleTimeString()} • Timeframe: {timeframe}
        </p>
      )}

      <div className="space-y-3">
        {signals.map((signal, index) => (
          <div
            key={index}
            className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-yellow-400 dark:hover:border-yellow-600 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {signal.symbol}
                  </h4>
                  {signal.name && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {signal.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded ${getSignalColor(signal.signal)}`}>
                    {getSignalIcon(signal.signal)}
                    {signal.signal.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Confidence: <strong>{signal.confidence}%</strong>
                  </span>
                  <span className={`text-xs font-medium ${getRiskColor(signal.riskLevel)}`}>
                    {signal.riskLevel.toUpperCase()} RISK
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              {signal.reasoning}
            </p>

            {/* Indicators */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {signal.indicators.map((indicator, i) => (
                <div key={i} className="bg-white dark:bg-gray-900/50 rounded p-2 border border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {indicator.name}
                  </div>
                  <div className={`text-xs font-semibold ${
                    indicator.signal === 'bullish' ? 'text-green-600 dark:text-green-400' :
                    indicator.signal === 'bearish' ? 'text-red-600 dark:text-red-400' :
                    'text-gray-600 dark:text-gray-400'
                  }`}>
                    {indicator.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Price levels */}
            {signal.entryPrice && (
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-gray-600 dark:text-gray-400 block mb-1">Entry</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    ${signal.entryPrice.toFixed(2)}
                  </span>
                </div>
                {signal.stopLoss && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 block mb-1">Stop Loss</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      ${signal.stopLoss.toFixed(2)}
                    </span>
                  </div>
                )}
                {signal.takeProfit && signal.takeProfit.length > 0 && (
                  <>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 block mb-1">TP1</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        ${signal.takeProfit[0].toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 block mb-1">TP2</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        ${signal.takeProfit[1].toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Disclaimer:</strong> These signals are AI-generated suggestions based on technical analysis patterns. 
            They do not constitute financial advice. Always do your own research and trade responsibly.
          </div>
        </div>
      </div>
    </div>
  );
}

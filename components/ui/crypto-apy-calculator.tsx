"use client";

import { useState, useEffect } from 'react';
import { TrendingUp, Percent, DollarSign, Calendar, Info, Zap } from 'lucide-react';
import { useCurrencyConversion } from '@/hooks/use-currency-conversion';

// APY data for major cryptocurrencies
interface APYData {
  symbol: string;
  name: string;
  cefi: {
    binanceStaking?: number;
    binanceFlexible?: number;
    coinbaseStaking?: number;
    krakenStaking?: number;
    bybitStaking?: number;
    bybitFlexible?: number;
  };
  defi: {
    uniswapV3?: number;
    pancakeswap?: number;
  };
}

// Real-world APY rates (these would ideally come from APIs)
const APY_RATES: Record<string, APYData> = {
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    cefi: {
      binanceFlexible: 0.5,
      bybitFlexible: 0.8,
      krakenStaking: 0.25,
    },
    defi: {
      uniswapV3: 2.5,
    }
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    cefi: {
      binanceStaking: 3.2,
      binanceFlexible: 0.8,
      coinbaseStaking: 3.0,
      krakenStaking: 4.0,
      bybitStaking: 2.8,
      bybitFlexible: 1.2,
    },
    defi: {
      uniswapV3: 3.8,
      pancakeswap: 2.5,
    }
  },
  BNB: {
    symbol: 'BNB',
    name: 'BNB',
    cefi: {
      binanceStaking: 5.2,
      binanceFlexible: 1.5,
      bybitStaking: 3.5,
    },
    defi: {
      pancakeswap: 8.5,
    }
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether',
    cefi: {
      binanceFlexible: 4.5,
      bybitFlexible: 5.0,
      krakenStaking: 4.0,
    },
    defi: {
      uniswapV3: 6.2,
      pancakeswap: 5.8,
    }
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    cefi: {
      binanceFlexible: 4.8,
      coinbaseStaking: 5.0,
      bybitFlexible: 5.5,
    },
    defi: {
      uniswapV3: 6.5,
      pancakeswap: 6.0,
    }
  },
  DAI: {
    symbol: 'DAI',
    name: 'Dai',
    cefi: {
      binanceFlexible: 4.2,
      krakenStaking: 3.5,
    },
    defi: {
      uniswapV3: 5.8,
    }
  },
  MATIC: {
    symbol: 'MATIC',
    name: 'Polygon',
    cefi: {
      binanceStaking: 5.8,
      binanceFlexible: 2.0,
      coinbaseStaking: 3.5,
      bybitStaking: 4.5,
    },
    defi: {
      uniswapV3: 7.2,
      pancakeswap: 6.5,
    }
  },
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    cefi: {
      binanceStaking: 6.2,
      binanceFlexible: 1.8,
      coinbaseStaking: 4.5,
      bybitStaking: 5.0,
    },
    defi: {
      uniswapV3: 4.5,
    }
  },
  ADA: {
    symbol: 'ADA',
    name: 'Cardano',
    cefi: {
      binanceStaking: 4.5,
      binanceFlexible: 1.2,
      coinbaseStaking: 3.75,
      krakenStaking: 4.0,
      bybitStaking: 3.8,
    },
    defi: {}
  },
  DOT: {
    symbol: 'DOT',
    name: 'Polkadot',
    cefi: {
      binanceStaking: 10.5,
      krakenStaking: 12.0,
      bybitStaking: 9.5,
    },
    defi: {}
  },
};

const CEFI_PLATFORMS = {
  binanceStaking: { name: 'Binance Staking', type: 'Locked' },
  binanceFlexible: { name: 'Binance Flexible', type: 'Flexible' },
  coinbaseStaking: { name: 'Coinbase Staking', type: 'Locked' },
  krakenStaking: { name: 'Kraken Staking', type: 'Locked' },
  bybitStaking: { name: 'Bybit Staking', type: 'Locked' },
  bybitFlexible: { name: 'Bybit Flexible', type: 'Flexible' },
};

const DEFI_PLATFORMS = {
  uniswapV3: { name: 'Uniswap V3', type: 'Liquidity Pool' },
  pancakeswap: { name: 'PancakeSwap', type: 'Liquidity Pool' },
};

interface CryptoAPYCalculatorProps {
  holdings: Array<{
    symbol: string;
    name: string;
    amount: number;
    value: number;
  }>;
}

export function CryptoAPYCalculator({ holdings }: CryptoAPYCalculatorProps) {
  const { formatMain } = useCurrencyConversion();
  const [selectedCrypto, setSelectedCrypto] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [duration, setDuration] = useState<number>(365); // days
  const [activeCategory, setActiveCategory] = useState<'cefi' | 'defi'>('cefi');

  // Filter holdings to only show supported cryptocurrencies
  const supportedHoldings = holdings.filter(h => APY_RATES[h.symbol.toUpperCase()]);

  useEffect(() => {
    if (supportedHoldings.length > 0 && !selectedCrypto) {
      setSelectedCrypto(supportedHoldings[0].symbol.toUpperCase());
      setAmount(supportedHoldings[0].amount.toString());
    }
  }, [supportedHoldings, selectedCrypto]);

  const selectedAPYData = selectedCrypto ? APY_RATES[selectedCrypto] : null;
  const selectedHolding = holdings.find(h => h.symbol.toUpperCase() === selectedCrypto);
  const inputAmount = parseFloat(amount) || 0;
  const currentValue = selectedHolding ? (inputAmount / selectedHolding.amount) * selectedHolding.value : 0;

  // Calculate earnings for each platform
  const calculateEarnings = (apy: number) => {
    const principal = currentValue;
    const rate = apy / 100;
    const timeInYears = duration / 365;
    const earnings = principal * rate * timeInYears;
    const total = principal + earnings;
    return { earnings, total };
  };

  if (supportedHoldings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
        <Percent className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-lg font-medium">No supported assets</p>
        <p className="text-sm mt-1">Add BTC, ETH, BNB, USDT, USDC, DAI, MATIC, SOL, ADA, or DOT to see APY opportunities</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            APY Calculator
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Calculate potential earnings from staking and liquidity pools
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-6 rounded-lg border border-green-200 dark:border-green-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Select Crypto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Asset
            </label>
            <select
              value={selectedCrypto}
              onChange={(e) => {
                setSelectedCrypto(e.target.value);
                const holding = holdings.find(h => h.symbol.toUpperCase() === e.target.value);
                if (holding) setAmount(holding.amount.toString());
              }}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {supportedHoldings.map((holding, index) => (
                <option key={`${holding.symbol}-${index}`} value={holding.symbol.toUpperCase()}>
                  {holding.symbol.toUpperCase()} - {holding.name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.00000001"
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Available: {selectedHolding?.amount.toFixed(8) || '0'} {selectedCrypto}
            </p>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Duration (days)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 mt-1">
              {[30, 90, 180, 365].map(days => (
                <button
                  key={days}
                  onClick={() => setDuration(days)}
                  className={`px-2 py-1 text-xs rounded ${
                    duration === days
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Current Value Display */}
        <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-700">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Current Value:</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {formatMain(currentValue)}
            </span>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveCategory('cefi')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            activeCategory === 'cefi'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          CeFi (Staking & Flexible)
        </button>
        <button
          onClick={() => setActiveCategory('defi')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            activeCategory === 'defi'
              ? 'border-purple-500 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Zap className="w-4 h-4" />
          DeFi (Liquidity Pools)
        </button>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {activeCategory === 'cefi' && selectedAPYData && (
          <>
            {Object.entries(selectedAPYData.cefi).map(([platform, apy]) => {
              if (!apy) return null;
              const { earnings, total } = calculateEarnings(apy);
              const platformInfo = CEFI_PLATFORMS[platform as keyof typeof CEFI_PLATFORMS];

              return (
                <div
                  key={platform}
                  className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {platformInfo.name}
                      </h4>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                        platformInfo.type === 'Flexible'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      }`}>
                        {platformInfo.type}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {apy.toFixed(2)}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">APY</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Earnings</div>
                      <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                        +{formatMain(earnings)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Total Value</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatMain(total)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Duration</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {duration} days
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {Object.keys(selectedAPYData.cefi).length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No CeFi staking options available for {selectedCrypto}</p>
              </div>
            )}
          </>
        )}

        {activeCategory === 'defi' && selectedAPYData && (
          <>
            {Object.entries(selectedAPYData.defi).map(([platform, apy]) => {
              if (!apy) return null;
              const { earnings, total } = calculateEarnings(apy);
              const platformInfo = DEFI_PLATFORMS[platform as keyof typeof DEFI_PLATFORMS];

              return (
                <div
                  key={platform}
                  className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {platformInfo.name}
                      </h4>
                      <span className="inline-block px-2 py-1 text-xs rounded-full mt-1 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                        {platformInfo.type}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {apy.toFixed(2)}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">APY</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-3 border-t border-purple-200 dark:border-purple-700">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Earnings</div>
                      <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                        +{formatMain(earnings)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Total Value</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatMain(total)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Duration</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {duration} days
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700">
                    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                      <Info className="w-3 h-3" />
                      <span>Requires pairing with another asset in LP</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {Object.keys(selectedAPYData.defi).length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No DeFi liquidity pool options available for {selectedCrypto}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <p className="font-medium mb-1">Important Notes:</p>
            <ul className="space-y-1 text-xs">
              <li>• APY rates are estimates and may vary based on market conditions</li>
              <li>• Locked staking may have minimum lock periods and withdrawal restrictions</li>
              <li>• Flexible earn allows withdrawals anytime but typically offers lower rates</li>
              <li>• DeFi liquidity pools involve impermanent loss risk</li>
              <li>• Always verify current rates on the platform before investing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

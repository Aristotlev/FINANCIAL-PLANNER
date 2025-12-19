"use client";

import { useState, useEffect } from "react";
import { X, ArrowDownLeft, Wallet, PiggyBank, Coins } from "lucide-react";
import { SupabaseDataService } from "../../lib/supabase/supabase-data-service";

interface SellPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetType: 'crypto' | 'stock';
  holding: any;
  currentPrice: number;
  onSell: (amount: number, destination: any) => Promise<void>;
}

export function SellPositionModal({
  isOpen,
  onClose,
  assetType,
  holding,
  currentPrice,
  onSell
}: SellPositionModalProps) {
  const [sellAmount, setSellAmount] = useState<string>("");
  const [destinationType, setDestinationType] = useState<'stablecoin' | 'bank' | 'savings' | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<string>("");
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const maxAmount = holding ? (assetType === 'crypto' ? holding.amount : holding.shares) : 0;
  const saleValue = parseFloat(sellAmount || "0") * currentPrice;

  // Load accounts and savings when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDestinations();
    } else {
      // Reset state when modal closes
      setSellAmount("");
      setDestinationType(null);
      setSelectedDestination("");
    }
  }, [isOpen]);

  const loadDestinations = async () => {
    try {
      const [cash, savings] = await Promise.all([
        SupabaseDataService.getCashAccounts([]),
        SupabaseDataService.getSavingsAccounts([])
      ]);
      setBankAccounts(cash);
      setSavingsGoals(savings);
    } catch (error) {
      console.error('Failed to load destinations:', error);
    }
  };

  const handlePercentage = (percent: number) => {
    const amount = (maxAmount * percent / 100).toFixed(assetType === 'crypto' ? 8 : 0);
    setSellAmount(amount);
  };

  const handleSell = async () => {
    if (!destinationType || !selectedDestination || !sellAmount) return;

    setLoading(true);
    try {
      const destination = {
        type: destinationType,
        id: selectedDestination,
        ...(destinationType === 'stablecoin' && { symbol: selectedDestination })
      };

      await onSell(parseFloat(sellAmount), destination);
      onClose();
    } catch (error) {
      console.error('Sell failed:', error);
      alert('Failed to process sale. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isValid = holding &&
    sellAmount && 
    parseFloat(sellAmount) > 0 && 
    parseFloat(sellAmount) <= maxAmount && 
    destinationType && 
    selectedDestination;

  if (!isOpen || !holding) return null;

  return (
    <div className="fixed inset-0 z-[1000001] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <ArrowDownLeft className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Sell {holding?.name || holding?.symbol || 'Asset'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Current Price: ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Amount Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {assetType === 'crypto' ? 'Amount to Sell' : 'Shares to Sell'}
            </label>
            <div className="relative">
              <input
                type="number"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                placeholder={`Max: ${maxAmount}`}
                step={assetType === 'crypto' ? '0.00000001' : '1'}
                min="0"
                max={maxAmount}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                {holding?.symbol || ''}
              </div>
            </div>
            
            {/* Percentage Shortcuts */}
            <div className="flex gap-2 mt-2">
              {[25, 50, 75, 100].map((percent) => (
                <button
                  key={percent}
                  onClick={() => handlePercentage(percent)}
                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  {percent === 100 ? 'Max' : `${percent}%`}
                </button>
              ))}
            </div>

            {/* Sale Value */}
            {saleValue > 0 && (
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">Sale Value</div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  ${saleValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {parseFloat(sellAmount) < maxAmount && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Remaining: {(maxAmount - parseFloat(sellAmount)).toFixed(assetType === 'crypto' ? 8 : 0)} {holding?.symbol || ''}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Destination Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Where should the proceeds go?
            </label>
            
            {/* Destination Type Tabs */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {assetType === 'crypto' && (
                <button
                  onClick={() => {
                    setDestinationType('stablecoin');
                    setSelectedDestination('');
                  }}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    destinationType === 'stablecoin'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                  }`}
                >
                  <Coins className={`w-5 h-5 mx-auto mb-1 ${
                    destinationType === 'stablecoin' ? 'text-green-600' : 'text-gray-400'
                  }`} />
                  <div className={`text-xs font-semibold ${
                    destinationType === 'stablecoin' ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    Stablecoin
                  </div>
                </button>
              )}
              
              <button
                onClick={() => {
                  setDestinationType('bank');
                  setSelectedDestination('');
                }}
                className={`p-3 rounded-lg border-2 transition-all ${
                  destinationType === 'bank'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                }`}
              >
                <Wallet className={`w-5 h-5 mx-auto mb-1 ${
                  destinationType === 'bank' ? 'text-green-600' : 'text-gray-400'
                }`} />
                <div className={`text-xs font-semibold ${
                  destinationType === 'bank' ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'
                }`}>
                  Bank
                </div>
              </button>
              
              <button
                onClick={() => {
                  setDestinationType('savings');
                  setSelectedDestination('');
                }}
                className={`p-3 rounded-lg border-2 transition-all ${
                  destinationType === 'savings'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                }`}
              >
                <PiggyBank className={`w-5 h-5 mx-auto mb-1 ${
                  destinationType === 'savings' ? 'text-green-600' : 'text-gray-400'
                }`} />
                <div className={`text-xs font-semibold ${
                  destinationType === 'savings' ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'
                }`}>
                  Savings
                </div>
              </button>
            </div>

            {/* Stablecoin Selection */}
            {destinationType === 'stablecoin' && (
              <div className="space-y-2">
                {['USDT', 'USDC', 'DAI', 'BUSD'].map((stable) => (
                  <button
                    key={stable}
                    onClick={() => setSelectedDestination(stable)}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      selectedDestination === stable
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                    }`}
                  >
                    <div className={`font-semibold ${
                      selectedDestination === stable ? 'text-green-600' : 'text-gray-900 dark:text-white'
                    }`}>
                      {stable}
                    </div>
                    <div className="text-xs text-gray-500">1:1 USD conversion</div>
                  </button>
                ))}
              </div>
            )}

            {/* Bank Account Selection */}
            {destinationType === 'bank' && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {bankAccounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => setSelectedDestination(account.id)}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      selectedDestination === account.id
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                    }`}
                  >
                    <div className={`font-semibold ${
                      selectedDestination === account.id ? 'text-green-600' : 'text-gray-900 dark:text-white'
                    }`}>
                      {account.bankName || account.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      Current: ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </button>
                ))}
                {bankAccounts.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    No bank accounts found. Add one first.
                  </div>
                )}
              </div>
            )}

            {/* Savings Goal Selection */}
            {destinationType === 'savings' && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {savingsGoals.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => setSelectedDestination(goal.id)}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      selectedDestination === goal.id
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                    }`}
                  >
                    <div className={`font-semibold ${
                      selectedDestination === goal.id ? 'text-green-600' : 'text-gray-900 dark:text-white'
                    }`}>
                      {goal.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      Progress: ${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()}
                    </div>
                  </button>
                ))}
                {savingsGoals.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    No savings goals found. Add one first.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={handleSell}
            disabled={!isValid || loading}
            className={`w-full py-3 rounded-lg font-semibold transition-all ${
              isValid && !loading
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            {loading ? 'Processing...' : `Sell ${sellAmount || '0'} ${holding?.symbol || ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

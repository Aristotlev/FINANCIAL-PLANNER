"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  X,
  Check,
  Clock,
  AlertCircle,
  DollarSign,
  Target,
  Shield,
  Activity
} from "lucide-react";

type OrderType = 'market' | 'limit' | 'stop' | 'stop-limit' | 'trailing-stop';
type OrderSide = 'buy' | 'sell';
type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'rejected';

interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  limitPrice?: number;
  trailingAmount?: number;
  leverage: number;
  marginType?: 'isolated' | 'cross';
  status: OrderStatus;
  filledQuantity: number;
  avgFillPrice?: number;
  timestamp: Date;
  stopLoss?: number;
  takeProfit?: number;
  notes?: string;
}

interface OrderManagementPanelProps {
  onPlaceOrder?: (order: Partial<Order>) => void;
  activeOrders?: Order[];
  tradingType: 'forex' | 'crypto' | 'options' | 'futures';
}

export function OrderManagementPanel({
  onPlaceOrder,
  activeOrders = [],
  tradingType
}: OrderManagementPanelProps) {
  const [orderSide, setOrderSide] = useState<OrderSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [marginType, setMarginType] = useState<'isolated' | 'cross'>('isolated');
  const [trailingAmount, setTrailingAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handlePlaceOrder = () => {
    if (!symbol || !quantity) {
      alert('Please fill in required fields');
      return;
    }

    const order: Partial<Order> = {
      symbol,
      side: orderSide,
      type: orderType,
      quantity: parseFloat(quantity),
      price: limitPrice ? parseFloat(limitPrice) : undefined,
      stopPrice: stopPrice ? parseFloat(stopPrice) : undefined,
      limitPrice: orderType === 'stop-limit' ? parseFloat(limitPrice) : undefined,
      trailingAmount: trailingAmount ? parseFloat(trailingAmount) : undefined,
      leverage,
      marginType: tradingType === 'crypto' ? marginType : undefined,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      notes,
      timestamp: new Date(),
      status: 'pending'
    };

    if (onPlaceOrder) {
      onPlaceOrder(order);
    }

    // Reset form
    setSymbol('');
    setQuantity('');
    setLimitPrice('');
    setStopPrice('');
    setStopLoss('');
    setTakeProfit('');
    setTrailingAmount('');
    setNotes('');
  };

  const getOrderTypeLabel = () => {
    switch (tradingType) {
      case 'forex':
        return 'Lots';
      case 'crypto':
        return 'Quantity';
      case 'options':
        return 'Contracts';
      case 'futures':
        return 'Contracts';
      default:
        return 'Quantity';
    }
  };

  return (
    <div className="space-y-6">
      {/* Order Entry Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Target className="w-6 h-6 text-purple-600" />
          Place Order
        </h3>

        {/* Buy/Sell Toggle */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setOrderSide('buy')}
            className={`py-4 rounded-lg font-semibold text-lg transition-all ${
              orderSide === 'buy'
                ? 'bg-green-600 text-white shadow-lg shadow-green-500/50'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            <TrendingUp className="w-5 h-5 inline mr-2" />
            Buy / Long
          </button>
          <button
            onClick={() => setOrderSide('sell')}
            className={`py-4 rounded-lg font-semibold text-lg transition-all ${
              orderSide === 'sell'
                ? 'bg-red-600 text-white shadow-lg shadow-red-500/50'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            <TrendingDown className="w-5 h-5 inline mr-2" />
            Sell / Short
          </button>
        </div>

        {/* Order Type Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Order Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['market', 'limit', 'stop'] as OrderType[]).map((type) => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`px-4 py-2 rounded-lg font-medium text-sm capitalize transition-all ${
                  orderType === type
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {(['stop-limit', 'trailing-stop'] as OrderType[]).map((type) => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  orderType === type
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Symbol and Quantity */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Symbol / Pair
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder={tradingType === 'forex' ? 'EUR/USD' : 'BTC'}
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {getOrderTypeLabel()}
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.00"
              step="0.01"
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Price Fields Based on Order Type */}
        {(orderType === 'limit' || orderType === 'stop-limit') && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Limit Price
            </label>
            <input
              type="number"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder="0.00"
              step="0.01"
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        )}

        {(orderType === 'stop' || orderType === 'stop-limit') && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Stop Price
            </label>
            <input
              type="number"
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              placeholder="0.00"
              step="0.01"
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        )}

        {orderType === 'trailing-stop' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Trailing Amount ({tradingType === 'forex' ? 'pips' : '$'})
            </label>
            <input
              type="number"
              value={trailingAmount}
              onChange={(e) => setTrailingAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Leverage (for Forex, Crypto, Futures) */}
        {tradingType !== 'options' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Leverage: {leverage}:1
            </label>
            <input
              type="range"
              min="1"
              max={tradingType === 'forex' ? '500' : tradingType === 'crypto' ? '125' : '50'}
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1:1</span>
              <span>{tradingType === 'forex' ? '1:500' : tradingType === 'crypto' ? '1:125' : '1:50'}</span>
            </div>
          </div>
        )}

        {/* Margin Type (Crypto only) */}
        {tradingType === 'crypto' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Margin Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMarginType('isolated')}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${
                  marginType === 'isolated'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                Isolated
              </button>
              <button
                onClick={() => setMarginType('cross')}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${
                  marginType === 'cross'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                Cross
              </button>
            </div>
          </div>
        )}

        {/* Advanced Options Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-purple-600 hover:text-purple-700 mb-4"
        >
          {showAdvanced ? '▼' : '▶'} Advanced Options
        </button>

        {showAdvanced && (
          <div className="space-y-4 mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            {/* Stop Loss */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-600" />
                Stop Loss
              </label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="0.00"
                step="0.01"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Take Profit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-green-600" />
                Take Profit
              </label>
              <input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="0.00"
                step="0.01"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Order Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Trade rationale, strategy notes..."
                rows={3}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        )}

        {/* Place Order Button */}
        <button
          onClick={handlePlaceOrder}
          className={`w-full py-4 rounded-lg font-bold text-lg transition-all shadow-lg ${
            orderSide === 'buy'
              ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/50'
              : 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/50'
          }`}
        >
          Place {orderSide.toUpperCase()} Order
        </button>
      </div>

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="w-6 h-6 text-purple-600" />
            Active Orders ({activeOrders.length})
          </h3>

          <div className="space-y-3">
            {activeOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      order.side === 'buy' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {order.side === 'buy' ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {order.symbol}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {order.type.toUpperCase()} • {order.quantity} {getOrderTypeLabel()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      order.status === 'filled'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : order.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : order.status === 'cancelled'
                        ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {order.status === 'filled' && <Check className="w-3 h-3 inline mr-1" />}
                      {order.status === 'pending' && <Clock className="w-3 h-3 inline mr-1" />}
                      {order.status === 'cancelled' && <X className="w-3 h-3 inline mr-1" />}
                      {order.status === 'rejected' && <AlertCircle className="w-3 h-3 inline mr-1" />}
                      {order.status.toUpperCase()}
                    </div>
                  </div>
                </div>

                {order.price && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Price: ${order.price.toFixed(2)}
                  </div>
                )}

                {order.leverage > 1 && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Leverage: {order.leverage}:1
                  </div>
                )}

                {order.notes && (
                  <div className="text-sm text-gray-500 dark:text-gray-500 italic mt-2">
                    {order.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

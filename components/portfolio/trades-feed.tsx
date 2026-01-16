"use client";

import { useEffect, useState, useRef } from 'react';
import { Activity, ArrowUp, ArrowDown, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TradeData {
  id: string; // Unique identifier for stable keys
  p: number; // Last price
  s: string; // Symbol
  t: number; // UNIX milliseconds timestamp
  v: number; // Volume
  c?: string[]; // List of trade conditions
}

interface TradeMessage {
  data: Omit<TradeData, 'id'>[]; // Incoming data doesn't have our client-side ID
  type: string;
}

const DEFAULT_SYMBOLS = [
  'AAPL',
  'AMZN', 
  'MSFT',
  'TSLA',
  'BINANCE:BTCUSDT', 
  'BINANCE:ETHUSDT',
  'IC MARKETS:1' // EURUSD
];

export function TradesFeed() {
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || 'd3nbll9r01qo7510cpf0d3nbll9r01qo7510cpfg';
    
    const connectWebSocket = () => {
        // Clear any pending reconnect
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        setConnectionStatus('connecting');
        setErrorMessage(null);
        
        try {
            const ws = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('Finnhub WebSocket Connected');
                setConnectionStatus('connected');
                reconnectAttempts.current = 0;
                
                // Subscribe to default symbols
                DEFAULT_SYMBOLS.forEach(symbol => {
                    ws.send(JSON.stringify({ type: 'subscribe', symbol: symbol }));
                });
            };

            ws.onmessage = (event) => {
                try {
                    const message: TradeMessage = JSON.parse(event.data);
                    if (message.type === 'trade' && message.data) {
                        const newTrades = message.data.map(trade => ({
                            ...trade,
                            id: `${trade.s}-${trade.t}-${Math.random().toString(36).substr(2, 9)}`
                        }));
                        
                        setTrades(prevTrades => {
                            const updatedTrades = [...newTrades, ...prevTrades].slice(0, 20);
                            return updatedTrades;
                        });
                    } else if (message.type === 'ping') {
                        // Finnhub sends ping messages to keep connection alive
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            ws.onerror = () => {
                // WebSocket error events don't contain useful info in browsers
                // The actual error details come through onclose
                setConnectionStatus('error');
            };

            ws.onclose = (event) => {
                console.log('WebSocket closed:', event.code, event.reason);
                setConnectionStatus('disconnected');
                
                // Auto-reconnect with exponential backoff
                if (reconnectAttempts.current < maxReconnectAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
                    setErrorMessage(`Reconnecting in ${delay/1000}s...`);
                    reconnectAttempts.current++;
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connectWebSocket();
                    }, delay);
                } else {
                    setErrorMessage('Connection failed. Click to retry.');
                }
            };
        } catch (err) {
            console.error('Failed to create WebSocket:', err);
            setConnectionStatus('error');
            setErrorMessage('Failed to connect');
        }
    };

    connectWebSocket();

    return () => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close();
        }
    };
  }, []);
  
  const handleRetry = () => {
      reconnectAttempts.current = 0;
      if (wsRef.current) {
          wsRef.current.close();
      }
      // The onclose handler will trigger reconnection
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(price);
  };

  const formatTime = (timestamp: number) => {
     const date = new Date(timestamp);
     return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + date.getMilliseconds().toString().padStart(3, '0');
  };

  const getSymbolType = (symbol: string) => {
      if (symbol.includes('BINANCE')) return 'CRYPTO';
      if (symbol.includes('IC MARKETS')) return 'FOREX';
      return 'STOCK';
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <Activity className="w-5 h-5 text-blue-400" />
                Live Market Trades
            </h2>
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleRetry}
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${connectionStatus === 'connected' ? 'bg-green-500/10 text-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}`}
                >
                    {connectionStatus === 'connected' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? 'Connecting...' : 'Retry'}
                </button>
            </div>
        </div>

        <div className="flex-1 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] overflow-hidden flex flex-col shadow-lg">
             <div className="grid grid-cols-5 p-4 border-b border-[#2A2A2A] text-sm font-medium text-gray-400 bg-[#212121]">
                <div className="col-span-1">Symbol</div>
                <div className="col-span-1 text-right">Price</div>
                <div className="col-span-1 text-right">Volume</div>
                <div className="col-span-1 text-right">Time</div>
                <div className="col-span-1 text-right">Type</div>
            </div>
            
            <div className="overflow-y-auto flex-1 h-[600px] scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                <div className="divide-y divide-[#2A2A2A]">
                    <AnimatePresence mode="popLayout" initial={false}>
                        {trades.map((trade) => (
                            <motion.div
                                key={trade.id}
                                layout
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                                transition={{ duration: 0.2 }}
                                className="grid grid-cols-5 p-4 hover:bg-[#252525] transition-colors text-sm items-center"
                            >
                                <div className="col-span-1 font-semibold text-white">
                                    {trade.s.split(':')[0] === 'BINANCE' ? trade.s.split(':')[1] : trade.s}
                                </div>
                                <div className="col-span-1 text-right font-mono text-cyan-400">
                                    {formatPrice(trade.p)}
                                </div>
                                <div className="col-span-1 text-right text-gray-400 font-mono">
                                    {trade.v > 0 ? trade.v.toFixed(4) : <span className="text-xs text-gray-600 italic">Price Update</span>}
                                </div>
                                <div className="col-span-1 text-right text-gray-500 font-mono text-xs">
                                    {formatTime(trade.t)}
                                </div>
                                <div className="col-span-1 text-right">
                                     <span className="ml-auto text-xs px-2 py-0.5 rounded border border-gray-700 text-gray-400">
                                         {getSymbolType(trade.s)}
                                     </span>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {trades.length === 0 && connectionStatus === 'connected' && (
                         <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                             <Activity className="w-8 h-8 opacity-20 mb-2 animate-pulse" />
                             <p>Waiting for trade data stream...</p>
                         </div>
                    )}
                     {trades.length === 0 && connectionStatus !== 'connected' && (
                         <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                             <WifiOff className="w-8 h-8 opacity-20 mb-2" />
                             <p>{connectionStatus === 'connecting' ? 'Connecting...' : errorMessage || 'Connection closed'}</p>
                             {connectionStatus === 'error' && (
                                 <button onClick={handleRetry} className="mt-2 text-blue-400 hover:text-blue-300 text-sm">
                                     Click to retry
                                 </button>
                             )}
                         </div>
                    )}
                </div>
            </div>
        </div>
        
        <div className="text-xs text-gray-600 mt-2 px-1">
            <p>* FX brokers may not support trade volume streaming. Price updates with volume 0 are displayed.</p>
            <p>* Real-time data provided by Finnhub.</p>
        </div>
    </div>
  );
}

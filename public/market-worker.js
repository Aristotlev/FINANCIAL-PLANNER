/**
 * Market Data Web Worker
 * Handles WebSocket connections and polling for market data off the main thread.
 * Features exponential backoff on API errors to prevent 429 death spirals.
 */

// Cache for price calculations
const priceCache = new Map();
const connections = new Map();
const pollingIntervals = new Map();
const subscribers = new Map(); // symbol -> count
const reconnectAttempts = new Map();
const errorCounts = new Map(); // key -> consecutive error count

const CONFIG = {
  reconnectDelay: 5000,
  maxReconnectAttempts: 5,
  basePollingInterval: 30000,  // 30 seconds base
  maxPollingInterval: 300000,  // 5 minutes max backoff
  maxConsecutiveErrors: 10,    // After this many errors, use max interval
};

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, payload } = e.data;

  switch (type) {
    case 'SUBSCRIBE':
      handleSubscribe(payload);
      break;
    case 'UNSUBSCRIBE':
      handleUnsubscribe(payload);
      break;
    case 'DISCONNECT_ALL':
      disconnectAll();
      break;
  }
};

function handleSubscribe({ symbol, type }) {
  const upperSymbol = symbol.toUpperCase();
  const key = `${type}:${upperSymbol}`;

  // Increment subscriber count
  const currentCount = subscribers.get(key) || 0;
  subscribers.set(key, currentCount + 1);

  // If already connected, just return (maybe send current cached value?)
  if (connections.has(key) || pollingIntervals.has(key)) {
    const cached = priceCache.get(key);
    if (cached) {
      self.postMessage({
        type: 'PRICE_UPDATE',
        payload: cached
      });
    }
    return;
  }

  connect(key, upperSymbol, type);
}

function handleUnsubscribe({ symbol, type }) {
  const upperSymbol = symbol.toUpperCase();
  const key = `${type}:${upperSymbol}`;

  const currentCount = subscribers.get(key) || 0;
  if (currentCount > 0) {
    subscribers.set(key, currentCount - 1);
  }

  // If no more subscribers, disconnect
  if (subscribers.get(key) === 0) {
    disconnect(key);
  }
}

function connect(key, symbol, type) {
  try {
    // Crypto: Binance WebSocket
    if (type === 'crypto') {
      // Special handling for USDT (Base currency)
      if (symbol === 'USDT') {
        const update = {
          symbol: 'USDT',
          price: 1.00,
          change: 0,
          changePercent: 0,
          timestamp: Date.now(),
          volume: 0
        };
        
        // Send immediate update
        processAndNotify(key, symbol, update);
        
        // Set a dummy interval to mark as connected and keep timestamp fresh
        if (!pollingIntervals.has(key)) {
            const interval = setInterval(() => {
                const freshUpdate = {
                  symbol: 'USDT',
                  price: 1.00,
                  change: 0,
                  changePercent: 0,
                  timestamp: Date.now(),
                  volume: 0
                };
                processAndNotify(key, symbol, freshUpdate);
            }, 60000);
            pollingIntervals.set(key, interval);
        }
        return;
      }

      let binanceSymbol = `${symbol.toLowerCase()}usdt`;
      if (symbol === 'USDC') binanceSymbol = 'usdcusdt';

      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSymbol}@trade`);

      ws.onopen = () => {
        // console.log(`✅ Worker: Binance Connected ${key}`);
        reconnectAttempts.set(key, 0);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleBinanceMessage(key, symbol, data);
        } catch (error) {
          console.error(`Worker: Error parsing Binance message for ${key}`, error);
        }
      };

      ws.onerror = (error) => {
        console.warn(`Worker: Binance error for ${key}`, error);
      };

      ws.onclose = () => {
        // console.log(`❌ Worker: Binance Closed ${key}`);
        connections.delete(key);
        handleReconnect(key, symbol, type);
      };

      connections.set(key, ws);
      return;
    }

    // Stocks/Forex: Polling
    // console.log(`⚠️ Worker: Polling for ${symbol}`);
    useFallbackPolling(key, symbol, type, 30000); // Poll every 30s for faster updates

  } catch (error) {
    console.error(`Worker: Connection failed for ${key}`, error);
    useFallbackPolling(key, symbol, type);
  }
}

function handleBinanceMessage(key, symbol, data) {
  if (data.e === 'trade') {
    const price = parseFloat(data.p);
    const update = {
      symbol: symbol,
      price: price,
      change: 0,
      changePercent: 0,
      timestamp: data.E,
      volume: parseFloat(data.q)
    };
    processAndNotify(key, symbol, update);
  }
}

function useFallbackPolling(key, symbol, type, intervalMs = 30000) {
  // Clear existing if any
  if (pollingIntervals.has(key)) {
    clearInterval(pollingIntervals.get(key));
  }

  // Calculate interval with exponential backoff based on error count
  function getPollingInterval() {
    const errors = errorCounts.get(key) || 0;
    if (errors === 0) return intervalMs;
    // Exponential backoff: 30s, 60s, 120s, 240s, capped at 300s
    const backoff = Math.min(
      intervalMs * Math.pow(2, errors),
      CONFIG.maxPollingInterval
    );
    return backoff;
  }

  const poll = async () => {
    try {
      const response = await fetch(`/api/market-data?symbol=${symbol}&type=${type}&live=true`);
      
      if (!response.ok) {
        // Track errors for backoff
        const currentErrors = (errorCounts.get(key) || 0) + 1;
        errorCounts.set(key, currentErrors);
        
        // If we're getting errors, slow down polling
        if (currentErrors >= 2) {
          const newInterval = getPollingInterval();
          // console.log(`Worker: Backing off ${key} to ${newInterval/1000}s (${currentErrors} errors)`);
          clearInterval(pollingIntervals.get(key));
          const interval = setInterval(poll, newInterval);
          pollingIntervals.set(key, interval);
        }
        return;
      }

      const data = await response.json();

      if (data && data.currentPrice) {
        // Reset error count on success
        errorCounts.set(key, 0);
        
        const update = {
          symbol,
          price: data.currentPrice,
          change: data.change24h || 0,
          changePercent: data.changePercent24h || 0,
          timestamp: Date.now(),
        };
        processAndNotify(key, symbol, update);

        // If we were backed off, restore normal interval
        const currentErrors = errorCounts.get(key) || 0;
        if (currentErrors === 0) {
          clearInterval(pollingIntervals.get(key));
          const interval = setInterval(poll, intervalMs);
          pollingIntervals.set(key, interval);
        }
      } else if (data && data.price) {
        // Handle fallback-format responses (price instead of currentPrice)
        errorCounts.set(key, 0);
        const update = {
          symbol,
          price: data.price,
          change: data.change24h || data.change || 0,
          changePercent: data.changePercent24h || data.changePercent || 0,
          timestamp: Date.now(),
        };
        processAndNotify(key, symbol, update);
      }
    } catch (error) {
      const currentErrors = (errorCounts.get(key) || 0) + 1;
      errorCounts.set(key, currentErrors);
      // console.error(`Worker: Polling error for ${key} (attempt ${currentErrors})`);
    }
  };

  // Poll immediately first to get data ASAP
  poll();

  // Then continue polling at the specified interval
  const interval = setInterval(poll, intervalMs);
  pollingIntervals.set(key, interval);
}

function processAndNotify(key, symbol, update) {
  const cached = priceCache.get(key);
  
  // Only calculate change if it's not provided (e.g. from WebSocket trade stream)
  // For API polling, update.change is already the 24h change
  if (cached && update.change === 0 && update.changePercent === 0) {
    // Calculate change based on the REAL cached price (not simulated)
    update.change = update.price - cached.price;
    // Avoid division by zero
    if (cached.price !== 0) {
      update.changePercent = ((update.change / cached.price) * 100);
    }
  }

  // Update cache with REAL data
  priceCache.set(key, update);

  // Notify main thread
  self.postMessage({
    type: 'PRICE_UPDATE',
    payload: update
  });
}

function handleReconnect(key, symbol, type) {
  const attempts = reconnectAttempts.get(key) || 0;
  if (attempts >= CONFIG.maxReconnectAttempts) {
    useFallbackPolling(key, symbol, type);
    return;
  }

  setTimeout(() => {
    reconnectAttempts.set(key, attempts + 1);
    connect(key, symbol, type);
  }, CONFIG.reconnectDelay);
}

function disconnect(key) {
  const ws = connections.get(key);
  if (ws) {
    ws.close();
    connections.delete(key);
  }

  const interval = pollingIntervals.get(key);
  if (interval) {
    clearInterval(interval);
    pollingIntervals.delete(key);
  }
  
  subscribers.delete(key);
  errorCounts.delete(key);
}

function disconnectAll() {
  for (const key of connections.keys()) {
    disconnect(key);
  }
  for (const key of pollingIntervals.keys()) {
    disconnect(key);
  }
  priceCache.clear();
  subscribers.clear();
  reconnectAttempts.clear();
  errorCounts.clear();
}

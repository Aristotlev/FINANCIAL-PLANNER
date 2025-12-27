/**
 * Market Data Web Worker
 * Handles WebSocket connections and polling for market data off the main thread.
 */

// Cache for price calculations
const priceCache = new Map();
const connections = new Map();
const pollingIntervals = new Map();
const subscribers = new Map(); // symbol -> count
const reconnectAttempts = new Map();

const CONFIG = {
  reconnectDelay: 5000,
  maxReconnectAttempts: 5,
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
      if (symbol === 'USDT') return;

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
    useFallbackPolling(key, symbol, type, 5000); // Poll every 5s

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

function useFallbackPolling(key, symbol, type, intervalMs = 2000) {
  // Clear existing if any
  if (pollingIntervals.has(key)) {
    clearInterval(pollingIntervals.get(key));
  }

  const interval = setInterval(async () => {
    try {
      // We need to fetch from the API. 
      // Since we are in a worker, we can use fetch.
      // Note: The relative URL /api/market-data might not work if the worker base URL is different.
      // Usually in Next.js public folder, it should be fine relative to origin.
      
      const response = await fetch(`/api/market-data?symbol=${symbol}&type=${type}&live=true`);
      const data = await response.json();

      if (data && data.currentPrice) {
        const update = {
          symbol,
          price: data.currentPrice,
          change: data.change24h || 0,
          changePercent: data.changePercent24h || 0,
          timestamp: Date.now(),
        };
        processAndNotify(key, symbol, update);
      }
    } catch (error) {
      // console.error(`Worker: Polling error for ${key}`, error);
    }
  }, intervalMs);

  pollingIntervals.set(key, interval);
}

function processAndNotify(key, symbol, update) {
  const cached = priceCache.get(key);
  
  if (cached) {
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
}

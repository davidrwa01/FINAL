/**
 * providers/providerAbstraction.js
 * 
 * Multi-provider data abstraction with fallback, caching, and stale data handling.
 * Routes requests to appropriate provider based on asset class.
 */

const axios = require('axios');
const { getProviderTypeForSymbol } = require('../config/marketCatalog');

// ─── CACHE STORES ───────────────────────────────────────────
const snapshotCache = {}; // { symbol: { price, change, time, isStale } }
const candleCache = {};   // { key: { klines, time, isStale } }

const SNAPSHOT_TTL = 10 * 1000;   // 10 seconds
const CANDLE_TTL = 60 * 1000;     // 60 seconds
const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

// ─── PROVIDER CONFIGS ────────────────────────────────────────

/**
 * Crypto Providers (Binance + fallbacks)
 */
const CRYPTO_PROVIDERS = [
  {
    name: 'BINANCE',
    endpoints: {
      snapshot: (symbol) => `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
      klines: (symbol, interval, limit) => `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      stats: (symbol) => `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
    },
    timeout: 15000,
    fallback: true
  },
  {
    name: 'BINANCE_US',
    endpoints: {
      snapshot: (symbol) => `https://api.binance.us/api/v3/ticker/price?symbol=${symbol}`,
      klines: (symbol, interval, limit) => `https://api.binance.us/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      stats: (symbol) => `https://api.binance.us/api/v3/ticker/24hr?symbol=${symbol}`
    },
    timeout: 15000,
    fallback: true
  },
  {
    name: 'COINGECKO',
    endpoints: {
      snapshot: (symbol) => null, // Not used for full klines
      klines: null // Limited support
    },
    timeout: 5000,
    fallback: false
  }
];

/**
 * Forex/Metals/Indices Providers
 */
const FOREX_METALS_PROVIDERS = [
  {
    name: 'EXCHANGERATE_API',
    endpoints: {
      snapshot: (symbol) => `https://api.exchangerate-api.com/v4/latest/${symbol.slice(0, 3)}`,
      klines: null // Generates synthetic
    },
    timeout: 8000,
    fallback: true
  },
  {
    name: 'FIXER_IO',
    endpoints: {
      snapshot: (symbol) => `https://api.exchangerate.host/latest?base=${symbol.slice(0, 3)}`,
      klines: null
    },
    timeout: 8000,
    fallback: true
  }
];

// ─── FALLBACK PRICES ────────────────────────────────────────
const FALLBACK_PRICES = {
  // Crypto
  'BTCUSDT': { price: 45000, change: 0.5 },
  'ETHUSDT': { price: 2500, change: 0.3 },
  'BNBUSDT': { price: 600, change: 0.2 },
  'SOLUSDT': { price: 180, change: 0.1 },
  'XRPUSDT': { price: 2.50, change: 0.0 },
  'ADAUSDT': { price: 1.20, change: -0.1 },
  'DOGEUSDT': { price: 0.40, change: 0.05 },
  'AVAXUSDT': { price: 150, change: 0.3 },
  'DOTUSDT': { price: 8.50, change: 0.2 },
  'LINKUSDT': { price: 28, change: 0.1 },
  // Forex
  'EURUSD': { price: 1.0850, change: 0.0 },
  'GBPUSD': { price: 1.2650, change: 0.1 },
  'USDJPY': { price: 148.50, change: -0.2 },
  'USDCHF': { price: 0.8850, change: 0.0 },
  'USDCAD': { price: 1.3650, change: 0.0 },
  'AUDUSD': { price: 0.6550, change: 0.05 },
  'NZDUSD': { price: 0.6050, change: 0.0 },
  'EURGBP': { price: 0.8580, change: 0.0 },
  'EURJPY': { price: 161.50, change: -0.1 },
  'GBPJPY': { price: 193.80, change: 0.0 },
  // Metals
  'XAUUSD': { price: 2050, change: 0.2 },
  'XAGUSD': { price: 24, change: 0.1 },
  // Indices
  'US30': { price: 38500, change: 0.3 },
  'NAS100': { price: 16200, change: 0.5 },
  'SPX500': { price: 4850, change: 0.4 },
  'GER40': { price: 17500, change: 0.2 },
  'UK100': { price: 7800, change: 0.1 },
  // Volatility
  'VIX': { price: 18, change: 0.0 }
};

// ─── UTILITY FUNCTIONS ──────────────────────────────────────

/**
 * Check if cached value is still valid
 */
function isCacheValid(timestamp) {
  if (!timestamp) return false;
  const age = Date.now() - timestamp;
  return age < SNAPSHOT_TTL;
}

/**
 * Check if cached value is stale
 */
function isDataStale(timestamp) {
  if (!timestamp) return true;
  const age = Date.now() - timestamp;
  return age > STALE_THRESHOLD;
}

/**
 * Generic API call with timeout + error handling
 */
async function callProvider(url, timeout = 8000) {
  try {
    const response = await axios.get(url, { 
      timeout,
      validateStatus: () => true // Don't throw on any status
    });
    return response;
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Parse Binance ticker response
 */
function parseBinanceSnapshot(symbol, response) {
  if (response.error || !response.data) return null;
  
  const { price } = response.data;
  const lastPrice = parseFloat(price);
  
  if (isNaN(lastPrice)) return null;
  
  return {
    symbol,
    price: lastPrice,
    time: Date.now(),
    source: 'BINANCE',
    isStale: false
  };
}

/**
 * Parse Binance 24hr stats for change %
 */
function parseBinanceStats(response) {
  if (response.error || !response.data) return null;
  
  const change = parseFloat(response.data.priceChangePercent || 0);
  return {
    change: isNaN(change) ? 0 : change,
    high24h: parseFloat(response.data.highPrice || 0),
    low24h: parseFloat(response.data.lowPrice || 0)
  };
}

/**
 * Parse Binance klines response
 */
function parseBinanceKlines(response) {
  if (response.error || !Array.isArray(response.data)) return null;
  
  return response.data.map(candle => ({
    time: parseInt(candle[0], 10),
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
    volume: parseFloat(candle[5])
  }));
}

// ─── EXPORTED FUNCTIONS ─────────────────────────────────────

/**
 * Fetch live snapshot (price + change) with multi-provider fallback
 */
async function getSnapshot(symbol) {
  symbol = symbol.toUpperCase();
  
  // 1. Check cache
  if (snapshotCache[symbol] && isCacheValid(snapshotCache[symbol].time)) {
    return {
      ...snapshotCache[symbol],
      cached: true,
      fresh: true
    };
  }
  
  const providerType = getProviderTypeForSymbol(symbol);
  const providers = providerType === 'CRYPTO' ? CRYPTO_PROVIDERS : FOREX_METALS_PROVIDERS;
  
  // 2. Try each provider
  for (const provider of providers) {
    try {
      let result = null;
      
      if (providerType === 'CRYPTO' && provider.name.startsWith('BINANCE')) {
        // Get price snapshot
        const snapshotUrl = provider.endpoints.snapshot(symbol);
        const snapshotResp = await callProvider(snapshotUrl, provider.timeout);
        result = parseBinanceSnapshot(symbol, snapshotResp);
        
        if (result) {
          // Get 24hr stats for change %
          const statsUrl = provider.endpoints.stats(symbol);
          const statsResp = await callProvider(statsUrl, provider.timeout);
          const stats = parseBinanceStats(statsResp);
          if (stats) {
            result = { ...result, ...stats };
          }
        }
      }
      
      if (result) {
        snapshotCache[symbol] = result;
        return {
          ...result,
          cached: false,
          fresh: true
        };
      }
    } catch (err) {
      console.error(`Provider ${provider.name} failed for ${symbol}:`, err.message);
      if (!provider.fallback) continue;
    }
  }
  
  // 3. Return cached stale data if available
  if (snapshotCache[symbol]) {
    return {
      ...snapshotCache[symbol],
      cached: true,
      fresh: false,
      stale: true
    };
  }
  
  // 4. Return fallback price
  const fallback = FALLBACK_PRICES[symbol];
  if (fallback) {
    return {
      symbol,
      price: fallback.price,
      change: fallback.change,
      time: Date.now(),
      source: 'FALLBACK',
      cached: false,
      fresh: false,
      stale: true
    };
  }
  
  return null;
}

/**
 * Fetch candle series with multi-provider fallback
 */
async function getKlines(symbol, interval, limit = 120) {
  symbol = symbol.toUpperCase();
  const cacheKey = `${symbol}_${interval}_${limit}`;
  
  // 1. Check cache
  if (candleCache[cacheKey] && isCacheValid(candleCache[cacheKey].time)) {
    return {
      klines: candleCache[cacheKey].klines,
      cached: true,
      fresh: true,
      time: candleCache[cacheKey].time
    };
  }
  
  const providerType = getProviderTypeForSymbol(symbol);
  const providers = providerType === 'CRYPTO' ? CRYPTO_PROVIDERS : FOREX_METALS_PROVIDERS;
  
  // 2. Try each provider
  for (const provider of providers) {
    try {
      if (providerType === 'CRYPTO' && provider.name.startsWith('BINANCE')) {
        const url = provider.endpoints.klines(symbol, interval, limit);
        const response = await callProvider(url, provider.timeout);
        const klines = parseBinanceKlines(response);
        
        if (klines && klines.length > 0) {
          candleCache[cacheKey] = { klines, time: Date.now() };
          return {
            klines,
            cached: false,
            fresh: true,
            time: Date.now()
          };
        }
      }
    } catch (err) {
      console.error(`Provider ${provider.name} klines failed for ${symbol}:`, err.message);
      if (!provider.fallback) continue;
    }
  }
  
  // 3. Return cached stale data if available
  if (candleCache[cacheKey]) {
    return {
      klines: candleCache[cacheKey].klines,
      cached: true,
      fresh: false,
      stale: isDataStale(candleCache[cacheKey].time),
      time: candleCache[cacheKey].time
    };
  }
  
  // 4. Generate synthetic fallback candles
  const snapshot = await getSnapshot(symbol);
  if (snapshot) {
    const synthetic = generateSyntheticKlines(snapshot.price, interval, limit);
    return {
      klines: synthetic,
      cached: false,
      fresh: false,
      stale: true,
      synthetic: true,
      time: Date.now()
    };
  }
  
  return null;
}

/**
 * Generate synthetic candles around a price (used as fallback)
 */
function generateSyntheticKlines(basePrice, interval, limit) {
  const timeframeMs = {
    '1m': 60000, '5m': 300000, '15m': 900000, '30m': 1800000,
    '1h': 3600000, '4h': 14400000, '1d': 86400000, '1w': 604800000
  };
  
  const msPerCandle = timeframeMs[interval] || 3600000;
  const now = Date.now();
  const volatility = basePrice * 0.001;
  
  const klines = [];
  let price = basePrice;
  
  for (let i = limit - 1; i >= 0; i--) {
    const time = now - i * msPerCandle;
    const drift = (Math.random() - 0.48) * volatility;
    const open = price;
    price += drift;
    const high = Math.max(open, price) + Math.random() * volatility * 0.5;
    const low = Math.min(open, price) - Math.random() * volatility * 0.5;
    const close = price;
    const volume = Math.floor(Math.random() * 10000 + 1000);
    
    klines.push({ time, open, high, low, close, volume });
  }
  
  return klines;
}

/**
 * Get data quality/freshness status
 */
function getDataStatus(snapshot, klines) {
  let status = 'LIVE';
  let messages = [];
  
  if (snapshot?.stale) {
    status = 'STALE';
    messages.push('Price data is cached');
  }
  
  if (klines?.stale) {
    status = 'STALE';
    messages.push('Candle data is cached');
  }
  
  if (klines?.synthetic) {
    messages.push('Using synthetic candles');
  }
  
  if (snapshot?.source === 'FALLBACK') {
    status = 'FALLBACK';
    messages.push('Using fallback price');
  }
  
  return { status, messages };
}

module.exports = {
  getSnapshot,
  getKlines,
  generateSyntheticKlines,
  getDataStatus,
  SNAPSHOT_TTL,
  CANDLE_TTL,
  STALE_THRESHOLD
};

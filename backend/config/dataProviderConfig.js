/**
 * config/dataProviderConfig.js
 * 
 * Configuration for data providers with fallback strategy
 * Automatically routes to correct provider (Binance, ExchangeRate, etc) based on symbol type
 */

const DATA_PROVIDERS = {
  // ─── CRYPTO PROVIDERS (Primary: Binance) ─────────────────
  CRYPTO: {
    primary: {
      name: 'BINANCE',
      base: 'https://api.binance.com/api/v3',
      endpoints: {
        snapshot: (symbol) => `/ticker/price?symbol=${symbol}`,
        klines: (symbol, interval, limit) => `/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
        stats24h: (symbol) => `/ticker/24hr?symbol=${symbol}`
      },
      timeout: 8000
    },
    fallback: {
      name: 'BINANCE_US',
      base: 'https://api.binance.us/api/v3',
      endpoints: {
        snapshot: (symbol) => `/ticker/price?symbol=${symbol}`,
        klines: (symbol, interval, limit) => `/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
        stats24h: (symbol) => `/ticker/24hr?symbol=${symbol}`
      },
      timeout: 10000
    }
  },

  // ─── FOREX PROVIDERS (Primary: ExchangeRate-API) ────────
  FOREX: {
    primary: {
      name: 'EXCHANGERATE_API',
      base: 'https://api.exchangerate-api.com/v4',
      endpoints: {
        snapshot: (symbol) => {
          const base = symbol.substring(0, 3);
          return `/latest/${base}`;
        }
      },
      timeout: 8000,
      generateSynthetic: true // No klines available, generate synthetic
    },
    fallback: {
      name: 'FIXER_IO',
      base: 'https://api.exchangerate.host',
      endpoints: {
        snapshot: (symbol) => {
          const base = symbol.substring(0, 3);
          return `/latest?base=${base}`;
        }
      },
      timeout: 10000,
      generateSynthetic: true
    }
  },

  // ─── METALS PROVIDERS (Primary: PAXG on Binance) ───────
  METALS: {
    primary: {
      name: 'BINANCE_PAXG', // PAXG is gold-backed token on Binance
      base: 'https://api.binance.com/api/v3',
      symbol: 'PAXGUSDT', // XAUUSD → PAXGUSDT on Binance
      endpoints: {
        snapshot: () => `/ticker/price?symbol=PAXGUSDT`,
        klines: (symbol, interval, limit) => `/klines?symbol=PAXGUSDT&interval=${interval}&limit=${limit}`,
        stats24h: () => `/ticker/24hr?symbol=PAXGUSDT`
      },
      timeout: 8000
    },
    fallback: {
      name: 'SYNTHETIC',
      generateSynthetic: true,
      fallbackPrice: {
        'XAUUSD': 2050,
        'XAGUSD': 24
      }
    }
  },

  // ─── INDICES PROVIDERS ──────────────────────────────────
  INDICES: {
    primary: {
      name: 'SYNTHETIC',
      generateSynthetic: true,
      fallbackPrice: {
        'US30': 38500,
        'NAS100': 16200,
        'SPX500': 4850,
        'GER40': 17500,
        'UK100': 7800
      }
    }
  },

  // ─── VOLATILITY PROVIDERS ───────────────────────────────
  VOLATILITY: {
    primary: {
      name: 'SYNTHETIC',
      generateSynthetic: true,
      fallbackPrice: {
        'VIX': 18
      }
    }
  }
};

// ─── CACHING CONFIGURATION ──────────────────────────────
const CACHE_CONFIG = {
  SNAPSHOT: {
    ttl: 10 * 1000, // 10 seconds
    staleThreshold: 5 * 60 * 1000 // 5 minutes
  },
  KLINES: {
    ttl: 60 * 1000, // 60 seconds
    staleThreshold: 15 * 60 * 1000 // 15 minutes
  }
};

// ─── SYMBOL MAPPINGS ────────────────────────────────────
const SYMBOL_MAPPINGS = {
  'XAUUSD': 'PAXGUSDT', // Gold → PAXG token on Binance
  'XAGUSD': null, // Silver doesn't have direct crypto mapping
  'VIX': null, // VIX not available on Binance
  'US30': null, // Indices not on Binance
  'NAS100': null,
  'SPX500': null
};

// ─── SYMBOL CATEGORIES ──────────────────────────────────
const SYMBOL_CATEGORIES = {
  // Forex
  'EURUSD': 'FOREX', 'GBPUSD': 'FOREX', 'USDJPY': 'FOREX', 'USDCHF': 'FOREX',
  'AUDUSD': 'FOREX', 'NZDUSD': 'FOREX', 'USDCAD': 'FOREX', 'EURGBP': 'FOREX',
  'EURJPY': 'FOREX', 'GBPJPY': 'FOREX',
  // Crypto
  'BTCUSDT': 'CRYPTO', 'ETHUSDT': 'CRYPTO', 'BNBUSDT': 'CRYPTO', 'SOLUSDT': 'CRYPTO',
  'XRPUSDT': 'CRYPTO', 'ADAUSDT': 'CRYPTO', 'DOGEUSDT': 'CRYPTO', 'AVAXUSDT': 'CRYPTO',
  'DOTUSDT': 'CRYPTO', 'LINKUSDT': 'CRYPTO',
  // Metals
  'XAUUSD': 'METALS', 'XAGUSD': 'METALS',
  // Indices
  'US30': 'INDICES', 'NAS100': 'INDICES', 'SPX500': 'INDICES', 'GER40': 'INDICES', 'UK100': 'INDICES',
  // Volatility
  'VIX': 'VOLATILITY'
};

// ─── TIMEFRAME CONVERSION ───────────────────────────────
const TIMEFRAME_CONVERSION = {
  'M1': '1m', 'M5': '5m', 'M15': '15m', 'M30': '30m',
  'H1': '1h', 'H4': '4h', 'D1': '1d', 'W1': '1w'
};

const TIMEFRAME_TO_MS = {
  '1m': 60000, '5m': 300000, '15m': 900000, '30m': 1800000,
  '1h': 3600000, '4h': 14400000, '1d': 86400000, '1w': 604800000
};

// ─── UTILITY FUNCTIONS ──────────────────────────────────

/**
 * Get category for a symbol
 */
function getSymbolCategory(symbol) {
  return SYMBOL_CATEGORIES[symbol] || 'UNKNOWN';
}

/**
 * Get provider config for a symbol
 */
function getProviderConfig(symbol) {
  const category = getSymbolCategory(symbol);
  return DATA_PROVIDERS[category] || DATA_PROVIDERS.FOREX;
}

/**
 * Convert symbol to provider-specific symbol
 */
function convertSymbol(symbol) {
  return SYMBOL_MAPPINGS[symbol] || symbol;
}

/**
 * Convert timeframe to milliseconds
 */
function timeframeToMs(tf) {
  return TIMEFRAME_TO_MS[tf] || TIMEFRAME_TO_MS['1h'];
}

/**
 * Normalize timeframe (H1 → 1h, M5 → 5m)
 */
function normalizeTimeframe(tf) {
  if (typeof tf !== 'string') return '1h';
  const upper = tf.toUpperCase();
  
  // Already normalized
  if (['1M', '5M', '15M', '30M', '1H', '4H', '1D', '1W'].includes(upper)) {
    return upper.toLowerCase();
  }
  
  // Convert from old format
  return upper
    .replace('M1', '1m').replace('M5', '5m').replace('M15', '15m').replace('M30', '30m')
    .replace('H1', '1h').replace('H4', '4h').replace('D1', '1d').replace('W1', '1w')
    .toLowerCase();
}

module.exports = {
  DATA_PROVIDERS,
  CACHE_CONFIG,
  SYMBOL_MAPPINGS,
  SYMBOL_CATEGORIES,
  TIMEFRAME_CONVERSION,
  TIMEFRAME_TO_MS,
  getSymbolCategory,
  getProviderConfig,
  convertSymbol,
  timeframeToMs,
  normalizeTimeframe
};
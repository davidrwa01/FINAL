/**
 * marketCatalog.js
 * 
 * Centralized market instrument catalog with categories, symbols, and metadata.
 * Supports Forex, Crypto, Metals, Indices, and Volatility.
 */

const MARKET_CATALOG = {
  // ─── FOREX (Major + Key Crosses) ─────────────────────────────
  FOREX: {
    category: 'FOREX',
    label: 'Forex Pairs',
    icon: '💱',
    instruments: [
      // Majors
      { symbol: 'EURUSD', name: 'EUR/USD', description: 'Euro vs US Dollar', decimal: 5, pipValue: 0.0001 },
      { symbol: 'GBPUSD', name: 'GBP/USD', description: 'British Pound vs US Dollar', decimal: 5, pipValue: 0.0001 },
      { symbol: 'USDJPY', name: 'USD/JPY', description: 'US Dollar vs Japanese Yen', decimal: 3, pipValue: 0.01 },
      { symbol: 'USDCHF', name: 'USD/CHF', description: 'US Dollar vs Swiss Franc', decimal: 5, pipValue: 0.0001 },
      { symbol: 'USDCAD', name: 'USD/CAD', description: 'US Dollar vs Canadian Dollar', decimal: 5, pipValue: 0.0001 },
      { symbol: 'AUDUSD', name: 'AUD/USD', description: 'Australian Dollar vs US Dollar', decimal: 5, pipValue: 0.0001 },
      { symbol: 'NZDUSD', name: 'NZD/USD', description: 'New Zealand Dollar vs US Dollar', decimal: 5, pipValue: 0.0001 },
      // Crosses
      { symbol: 'EURGBP', name: 'EUR/GBP', description: 'Euro vs British Pound', decimal: 5, pipValue: 0.0001 },
      { symbol: 'EURJPY', name: 'EUR/JPY', description: 'Euro vs Japanese Yen', decimal: 3, pipValue: 0.01 },
      { symbol: 'GBPJPY', name: 'GBP/JPY', description: 'British Pound vs Japanese Yen', decimal: 3, pipValue: 0.01 },
      { symbol: 'AUDJPY', name: 'AUD/JPY', description: 'Australian Dollar vs Japanese Yen', decimal: 3, pipValue: 0.01 },
      { symbol: 'EURCHF', name: 'EUR/CHF', description: 'Euro vs Swiss Franc', decimal: 5, pipValue: 0.0001 },
    ]
  },

  // ─── CRYPTO (Top Liquid USDT Pairs) ──────────────────────────
  CRYPTO: {
    category: 'CRYPTO',
    label: 'Cryptocurrencies',
    icon: '₿',
    instruments: [
      { symbol: 'BTCUSDT', name: 'Bitcoin', description: 'BTC/USDT', decimal: 2, pipValue: 1 },
      { symbol: 'ETHUSDT', name: 'Ethereum', description: 'ETH/USDT', decimal: 2, pipValue: 0.01 },
      { symbol: 'BNBUSDT', name: 'Binance Coin', description: 'BNB/USDT', decimal: 2, pipValue: 0.01 },
      { symbol: 'SOLUSDT', name: 'Solana', description: 'SOL/USDT', decimal: 2, pipValue: 0.01 },
      { symbol: 'XRPUSDT', name: 'Ripple', description: 'XRP/USDT', decimal: 4, pipValue: 0.0001 },
      { symbol: 'ADAUSDT', name: 'Cardano', description: 'ADA/USDT', decimal: 4, pipValue: 0.0001 },
      { symbol: 'DOGEUSDT', name: 'Dogecoin', description: 'DOGE/USDT', decimal: 4, pipValue: 0.0001 },
      { symbol: 'AVAXUSDT', name: 'Avalanche', description: 'AVAX/USDT', decimal: 2, pipValue: 0.01 },
      { symbol: 'DOTUSDT', name: 'Polkadot', description: 'DOT/USDT', decimal: 2, pipValue: 0.01 },
      { symbol: 'LINKUSDT', name: 'Chainlink', description: 'LINK/USDT', decimal: 2, pipValue: 0.01 },
    ]
  },

  // ─── METALS (Gold & Silver) ──────────────────────────────────
  METALS: {
    category: 'METALS',
    label: 'Precious Metals',
    icon: '🥇',
    instruments: [
      { symbol: 'XAUUSD', name: 'Gold', description: 'Gold per Troy Oz', decimal: 2, pipValue: 0.01, alias: 'GoldUSD' },
      { symbol: 'XAGUSD', name: 'Silver', description: 'Silver per Troy Oz', decimal: 3, pipValue: 0.001, alias: 'SilverUSD' },
    ]
  },

  // ─── INDICES (Stock Market Indices) ──────────────────────────
  INDICES: {
    category: 'INDICES',
    label: 'Stock Indices',
    icon: '📈',
    instruments: [
      { symbol: 'US30', name: 'Dow Jones', description: 'US 30 Large Cap', decimal: 1, pipValue: 0.1 },
      { symbol: 'NAS100', name: 'Nasdaq 100', description: 'Tech-Heavy Index', decimal: 1, pipValue: 0.1 },
      { symbol: 'SPX500', name: 'S&P 500', description: 'US 500 Large Cap', decimal: 1, pipValue: 0.1 },
      { symbol: 'GER40', name: 'DAX', description: 'German 40 Index', decimal: 1, pipValue: 0.1 },
      { symbol: 'UK100', name: 'FTSE 100', description: 'British 100 Index', decimal: 1, pipValue: 0.1 },
    ]
  },

  // ─── VOLATILITY (VIX & Equivalents) ──────────────────────────
  VOLATILITY: {
    category: 'VOLATILITY',
    label: 'Volatility',
    icon: '📊',
    instruments: [
      { symbol: 'VIX', name: 'VIX Index', description: 'US Market Volatility', decimal: 2, pipValue: 0.01 },
    ]
  }
};

/**
 * Flatten all instruments with category info
 */
function getAllInstruments() {
  const all = [];
  for (const [key, category] of Object.entries(MARKET_CATALOG)) {
    for (const instrument of category.instruments) {
      all.push({
        ...instrument,
        categoryKey: key,
        categoryLabel: category.label,
        categoryIcon: category.icon
      });
    }
  }
  return all;
}

/**
 * Get instrument by symbol
 */
function getInstrument(symbol) {
  const all = getAllInstruments();
  return all.find(i => i.symbol === symbol.toUpperCase());
}

/**
 * Get all symbols in a category
 */
function getSymbolsByCategory(categoryKey) {
  const category = MARKET_CATALOG[categoryKey];
  if (!category) return [];
  return category.instruments.map(i => i.symbol);
}

/**
 * Determine provider type by category
 */
function getProviderTypeForSymbol(symbol) {
  const instrument = getInstrument(symbol);
  if (!instrument) return null;
  
  switch (instrument.categoryKey) {
    case 'FOREX':
    case 'METALS':
    case 'INDICES':
    case 'VOLATILITY':
      return 'FOREX_METALS'; // Usually same providers
    case 'CRYPTO':
      return 'CRYPTO';
    default:
      return null;
  }
}

module.exports = {
  MARKET_CATALOG,
  getAllInstruments,
  getInstrument,
  getSymbolsByCategory,
  getProviderTypeForSymbol
};

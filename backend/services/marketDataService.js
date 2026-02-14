/**
 * services/marketDataService.js
 * 
 * High-level market data service.
 * Provides normalized market data responses with metadata.
 */

const {
  getSnapshot,
  getKlines,
  getDataStatus
} = require('./providerAbstraction');
const {
  getInstrument,
  getSymbolsByCategory,
  getAllInstruments
} = require('../config/marketCatalog');

/**
 * Get market snapshot for a single symbol
 * Returns: { symbol, price, change, high24h, low24h, dataStatus, updatedAt }
 */
async function getMarketSnapshot(symbol) {
  if (!symbol) return null;
  
  symbol = symbol.toUpperCase();
  const instrument = getInstrument(symbol);
  
  if (!instrument) {
    return {
      error: 'SYMBOL_NOT_FOUND',
      symbol,
      message: `Symbol ${symbol} not found in market catalog`
    };
  }
  
  const snapshot = await getSnapshot(symbol);
  
  if (!snapshot) {
    return {
      error: 'DATA_FETCH_FAILED',
      symbol,
      message: `Failed to fetch data for ${symbol}`
    };
  }
  
  const dataStatus = getDataStatus(snapshot, null);
  
  return {
    success: true,
    symbol,
    name: instrument.name,
    price: snapshot.price,
    change: snapshot.change || 0,
    high24h: snapshot.high24h,
    low24h: snapshot.low24h,
    dataStatus: dataStatus.status,
    dataMessages: dataStatus.messages,
    updatedAt: snapshot.time,
    source: snapshot.source,
    cached: snapshot.cached,
    fresh: snapshot.fresh,
    stale: snapshot.stale
  };
}

/**
 * Get candle series for analysis
 * Returns: { symbol, interval, klines, dataStatus, updatedAt }
 */
async function getMarketCandles(symbol, interval = '1h', limit = 120) {
  if (!symbol || !interval) return null;
  
  symbol = symbol.toUpperCase();
  const instrument = getInstrument(symbol);
  
  if (!instrument) {
    return {
      error: 'SYMBOL_NOT_FOUND',
      symbol,
      message: `Symbol ${symbol} not found in market catalog`
    };
  }
  
  const klines = await getKlines(symbol, interval, Math.min(limit, 500));
  
  if (!klines || !klines.klines || klines.klines.length === 0) {
    return {
      error: 'CANDLES_FETCH_FAILED',
      symbol,
      interval,
      message: `Failed to fetch candles for ${symbol}`
    };
  }
  
  const dataStatus = getDataStatus(null, klines);
  
  return {
    success: true,
    symbol,
    name: instrument.name,
    interval,
    klines: klines.klines,
    count: klines.klines.length,
    dataStatus: dataStatus.status,
    dataMessages: dataStatus.messages,
    updatedAt: klines.time,
    cached: klines.cached,
    fresh: klines.fresh,
    stale: klines.stale,
    synthetic: klines.synthetic
  };
}

/**
 * Get snapshot for a category (multiple symbols)
 */
async function getCategorySnapshot(categoryKey) {
  const symbols = getSymbolsByCategory(categoryKey);
  const snapshots = {};
  
  for (const symbol of symbols) {
    snapshots[symbol] = await getMarketSnapshot(symbol);
  }
  
  return {
    success: true,
    category: categoryKey,
    count: symbols.length,
    snapshots
  };
}

/**
 * Get market data for multiple symbols
 */
async function getMultipleSnapshots(symbols) {
  const results = {};
  
  for (const symbol of symbols) {
    results[symbol] = await getMarketSnapshot(symbol);
  }
  
  return {
    success: true,
    count: symbols.length,
    results
  };
}

/**
 * Get trending/hot pairs (highest % change)
 */
async function getTrendingPairs(limit = 10) {
  const instruments = getAllInstruments();
  const snapshots = [];
  
  for (const instrument of instruments) {
    const snapshot = await getMarketSnapshot(instrument.symbol);
    if (snapshot.success) {
      snapshots.push({
        ...snapshot,
        categoryIcon: instrument.categoryIcon
      });
    }
  }
  
  // Sort by absolute change (highest volatility first)
  snapshots.sort((a, b) => Math.abs(b.change || 0) - Math.abs(a.change || 0));
  
  return {
    success: true,
    trending: snapshots.slice(0, limit)
  };
}

/**
 * Search for instruments by name or symbol
 */
function searchInstruments(query) {
  if (!query || query.length < 1) return [];
  
  const instruments = getAllInstruments();
  const q = query.toUpperCase();
  
  return instruments.filter(i => 
    i.symbol.includes(q) || 
    i.name.toUpperCase().includes(q) ||
    i.description.toUpperCase().includes(q)
  ).slice(0, 20);
}

module.exports = {
  getMarketSnapshot,
  getMarketCandles,
  getCategorySnapshot,
  getMultipleSnapshots,
  getTrendingPairs,
  searchInstruments
};

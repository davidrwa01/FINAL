/**
 * Market Data Service
 * Handles real-time market data fetching from both Binance and ExchangeRate APIs
 */

class MarketDataService {
  constructor() {
    this.cache = {};
    this.lastUpdate = {};
    this.cacheTimeout = 5000; // 5 seconds
  }

  // Normalize symbol key (remove slashes, uppercase)
  normalizeSymbolKey(symbol) {
    if (!symbol) return null;
    return String(symbol).toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  // Pretty display format (add slashes)
  prettySymbol(symbolKey) {
    const s = this.normalizeSymbolKey(symbolKey);
    if (!s) return 'N/A';
    if (s === 'XAUUSD') return 'XAU/USD';
    if (s === 'XAGUUSD') return 'XAG/USD';
    if (s.endsWith('USDT')) return s.replace('USDT', '') + '/USDT';
    if (s.length === 6) return s.slice(0, 3) + '/' + s.slice(3);
    return s;
  }

  // Get crypto snapshot from backend
  async getCryptoSnapshot() {
    try {
      const response = await fetch('/api/market/crypto/snapshot');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch crypto data');
      }

      this.cache.crypto = data.data;
      this.lastUpdate.crypto = Date.now();
      return data.data;
    } catch (error) {
      console.error('Crypto snapshot error:', error);
      return this.cache.crypto || {};
    }
  }

  // Get forex snapshot from backend
  async getForexSnapshot() {
    try {
      const response = await fetch('/api/market/forex/snapshot');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch forex data');
      }

      this.cache.forex = data.data;
      this.lastUpdate.forex = Date.now();
      return data.data;
    } catch (error) {
      console.error('Forex snapshot error:', error);
      return this.cache.forex || {};
    }
  }

  // Get all market data (crypto + forex)
  async getAllMarketData() {
    const [crypto, forex] = await Promise.all([
      this.getCryptoSnapshot(),
      this.getForexSnapshot()
    ]);

    return { crypto, forex };
  }

  // Get market series (OHLCV candles)
  async getMarketSeries(symbol, timeframe = 'H1', limit = 120) {
    try {
      const params = new URLSearchParams({
        symbol: this.normalizeSymbolKey(symbol),
        timeframe,
        limit: Math.min(limit, 1000)
      });

      const response = await fetch(`/api/market/series?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch market series');
      }

      return data.data.candles;
    } catch (error) {
      console.error('Market series error:', error);
      return [];
    }
  }

  // Get batch snapshot for multiple symbols
  async getBatchSnapshot(symbols) {
    try {
      const response = await fetch('/api/market/snapshot/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch batch snapshot');
      }

      return data.data;
    } catch (error) {
      console.error('Batch snapshot error:', error);
      return {};
    }
  }

  // Get current price for a symbol
  async getCurrentPrice(symbol) {
    const normalized = this.normalizeSymbolKey(symbol);

    // Try crypto first
    if (normalized && normalized.endsWith('USDT')) {
      const cryptoData = await this.getCryptoSnapshot();
      if (cryptoData[normalized]) {
        return cryptoData[normalized].price;
      }
    }

    // Try forex
    const forexData = await this.getForexSnapshot();
    if (forexData[normalized]) {
      return forexData[normalized].price;
    }

    return null;
  }

  // Format price for display
  formatPrice(price) {
    if (!price) return 'N/A';
    if (price >= 1000) {
      return price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    if (price >= 1) {
      return price.toFixed(4);
    }
    return price.toFixed(6);
  }
}

export default new MarketDataService();

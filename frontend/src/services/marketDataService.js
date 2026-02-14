/**
 * Market Data Service
 * Handles real-time market data fetching from both Binance and ExchangeRate APIs
 * via the backend proxy routes.
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
    if (s === 'XAGUSD') return 'XAG/USD';
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

  // Normalize timeframe format (H1 → 1h, H4 → 4h, D1 → 1d, M5 → 5m, etc)
  normalizeTimeframe(tf) {
    if (typeof tf !== 'string') return '1h';
    const upperTf = tf.toUpperCase();
    if (['1M', '5M', '15M', '30M', '1H', '4H', '1D', '1W'].includes(upperTf)) return upperTf.toLowerCase();
    return upperTf
      .replace('H1', '1h').replace('H4', '4h').replace('D1', '1d')
      .replace('M30', '30m').replace('M15', '15m').replace('M5', '5m')
      .replace('M1', '1m').replace('W1', '1w');
  }

  /**
   * Get market series (OHLCV candles) from backend.
   * The backend /api/market/series now correctly handles:
   *   - Crypto symbols → Binance
   *   - Forex symbols (EURUSD, GBPUSD, etc) → ExchangeRate API
   *   - Gold (XAUUSD) → PAXG on Binance
   * 
   * Returns array of candle objects: { time, open, high, low, close, volume }
   * Throws on failure so caller can catch and handle.
   */
  async getMarketSeries(symbol, timeframe = 'H1', limit = 120) {
    const normalizedSymbol = this.normalizeSymbolKey(symbol);
    const normalizedTimeframe = this.normalizeTimeframe(timeframe);

    const params = new URLSearchParams({
      symbol: normalizedSymbol,
      timeframe: normalizedTimeframe,
      limit: Math.min(limit, 1000)
    });

    const response = await fetch(`/api/market/series?${params}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      const errMsg = data.message || `Market series request failed with status ${response.status}`;
      console.error(`Market series error for ${normalizedSymbol}:`, errMsg);
      throw new Error(errMsg);
    }

    // Backend returns { success: true, data: { symbol, timeframe, candles: [...], count } }
    const candles = data.data?.candles;
    if (!Array.isArray(candles)) {
      throw new Error('Failed to fetch market series');
    }

    return candles;
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

    // Last resort: fetch series and use last close
    try {
      const candles = await this.getMarketSeries(symbol, 'H1', 1);
      if (candles && candles.length > 0) {
        return candles[candles.length - 1].close;
      }
    } catch (e) {
      // ignore
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
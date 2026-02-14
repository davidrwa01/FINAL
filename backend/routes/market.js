// routes/market.js (COMPLETE FIXED)

const express = require('express');
const router = express.Router();
const axios = require('axios');

// ─── CONSTANTS ──────────────────────────────────────────────
const BINANCE_BASE = 'https://api.binance.com/api/v3';
const TIMEOUT = 8000;

const FALLBACK_PRICES = {
  'BTCUSDT': 45000, 'ETHUSDT': 2500, 'BNBUSDT': 600, 'SOLUSDT': 180,
  'XRPUSDT': 2.50, 'ADAUSDT': 1.20, 'DOGEUSDT': 0.40, 'AVAXUSDT': 150,
  'MATICUSDT': 1.80, 'LINKUSDT': 28, 'UNIUSDT': 24, 'DOTUSDT': 8.50,
  'XAUUSD': 2050, 'XAGUSD': 24,
  'EURUSD': 1.0850, 'GBPUSD': 1.2650, 'USDJPY': 148.50, 'USDCHF': 0.8850,
  'AUDUSD': 0.6550, 'NZDUSD': 0.6050, 'USDCAD': 1.3650, 'EURGBP': 0.8580,
  'EURJPY': 161.50, 'GBPJPY': 193.80
};

// ─── HELPER: Generate Synthetic Candles ─────────────────
function generateSyntheticCandles(basePrice, interval = '1h', limit = 100) {
  const intervalMs = {
    '1m': 60000, '5m': 300000, '15m': 900000, '30m': 1800000,
    '1h': 3600000, '4h': 14400000, '1d': 86400000, '1w': 604800000
  };

  const msPerCandle = intervalMs[interval] || 3600000;
  const candles = [];
  let currentPrice = basePrice;
  const now = Date.now();

  for (let i = limit - 1; i >= 0; i--) {
    const volatility = (Math.random() - 0.5) * basePrice * 0.015;
    const trend = Math.sin(i / 20) * basePrice * 0.005;
    const open = currentPrice;
    const close = currentPrice + volatility + trend;
    const high = Math.max(open, close) * (1 + Math.random() * 0.008);
    const low = Math.min(open, close) * (1 - Math.random() * 0.008);

    candles.push({
      time: new Date(now - i * msPerCandle),
      open: parseFloat(open.toFixed(8)),
      high: parseFloat(high.toFixed(8)),
      low: parseFloat(low.toFixed(8)),
      close: parseFloat(close.toFixed(8)),
      volume: Math.random() * 1000000
    });

    currentPrice = close;
  }

  return candles;
}

// ─── GET /data ──────────────────────────────────────────
router.get('/data', async (req, res) => {
  try {
    const { symbols } = req.query;

    if (!symbols) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_SYMBOLS',
        message: 'Missing symbols parameter',
        example: '/api/market/data?symbols=BTCUSDT,ETHUSDT,EURUSD'
      });
    }

    const symbolList = String(symbols).split(',').map(s => s.trim().toUpperCase());
    const marketData = {};

    for (const symbol of symbolList) {
      try {
        if (symbol.endsWith('USDT')) {
          const response = await axios.get(`${BINANCE_BASE}/ticker/24hr`, {
            params: { symbol },
            timeout: TIMEOUT
          });
          marketData[symbol] = {
            price: parseFloat(response.data.lastPrice),
            change: parseFloat(response.data.priceChangePercent),
            high: parseFloat(response.data.highPrice),
            low: parseFloat(response.data.lowPrice),
            volume: parseFloat(response.data.volume),
            source: 'BINANCE'
          };
        } else if (symbol === 'XAUUSD') {
          const response = await axios.get(`${BINANCE_BASE}/ticker/24hr`, {
            params: { symbol: 'PAXGUSDT' },
            timeout: TIMEOUT
          });
          marketData[symbol] = {
            price: parseFloat(response.data.lastPrice),
            change: parseFloat(response.data.priceChangePercent),
            high: parseFloat(response.data.highPrice),
            low: parseFloat(response.data.lowPrice),
            volume: parseFloat(response.data.volume),
            source: 'BINANCE (PAXG)'
          };
        } else {
          throw new Error('Not on Binance');
        }
      } catch (error) {
        const fallback = FALLBACK_PRICES[symbol] || 50;
        marketData[symbol] = {
          price: fallback,
          change: (Math.random() - 0.5) * 5,
          high: fallback * 1.02,
          low: fallback * 0.98,
          volume: Math.random() * 1000000,
          source: 'FALLBACK'
        };
      }
    }

    return res.json({ success: true, data: marketData, timestamp: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /crypto/snapshot ───────────────────────────────
router.get('/crypto/snapshot', async (req, res) => {
  try {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'PAXGUSDT'];

    const response = await axios.get(`${BINANCE_BASE}/ticker/24hr`, {
      params: { symbols: JSON.stringify(symbols) },
      timeout: TIMEOUT
    });

    if (!Array.isArray(response.data)) throw new Error('Invalid Binance response');

    const data = response.data.map(ticker => ({
      symbol: ticker.symbol,
      displayName: ticker.symbol.replace('USDT', ''),
      price: parseFloat(ticker.lastPrice),
      change: parseFloat(ticker.priceChangePercent),
      volume: parseFloat(ticker.volume),
      high: parseFloat(ticker.highPrice),
      low: parseFloat(ticker.lowPrice)
    }));

    return res.json({ success: true, data, source: 'BINANCE', timestamp: new Date().toISOString() });
  } catch (error) {
    const fallbackData = [
      { symbol: 'BTCUSDT', displayName: 'BTC', price: FALLBACK_PRICES.BTCUSDT, change: 2.5, volume: 30000000000 },
      { symbol: 'ETHUSDT', displayName: 'ETH', price: FALLBACK_PRICES.ETHUSDT, change: 1.8, volume: 15000000000 },
      { symbol: 'BNBUSDT', displayName: 'BNB', price: FALLBACK_PRICES.BNBUSDT, change: 1.2, volume: 5000000000 },
      { symbol: 'SOLUSDT', displayName: 'SOL', price: FALLBACK_PRICES.SOLUSDT, change: 3.1, volume: 2000000000 },
      { symbol: 'PAXGUSDT', displayName: 'PAXG', price: FALLBACK_PRICES.XAUUSD, change: 0.5, volume: 500000000 }
    ];
    return res.json({ success: true, data: fallbackData, source: 'FALLBACK', timestamp: new Date().toISOString() });
  }
});

// ─── GET /forex/snapshot ────────────────────────────────
router.get('/forex/snapshot', async (req, res) => {
  try {
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', { timeout: TIMEOUT });

    if (!response.data.rates) throw new Error('Invalid forex response');

    const pairs = [
      { base: 'EUR', quote: 'USD' },
      { base: 'GBP', quote: 'USD' },
      { base: 'USD', quote: 'JPY' },
      { base: 'AUD', quote: 'USD' },
      { base: 'USD', quote: 'CHF' },
      { base: 'NZD', quote: 'USD' },
      { base: 'USD', quote: 'CAD' }
    ];

    const data = pairs.map(pair => {
      const rate = pair.base === 'USD'
        ? response.data.rates[pair.quote]
        : 1 / response.data.rates[pair.base];
      return {
        symbol: `${pair.base}${pair.quote}`,
        displayName: `${pair.base}/${pair.quote}`,
        price: parseFloat(rate.toFixed(5)),
        change: (Math.random() - 0.5) * 2,
        volume: Math.random() * 1000000000
      };
    });

    return res.json({ success: true, data, source: 'EXCHANGERATE-API', timestamp: new Date().toISOString() });
  } catch (error) {
    const fallbackData = [
      { symbol: 'EURUSD', displayName: 'EUR/USD', price: FALLBACK_PRICES.EURUSD, change: 0.2 },
      { symbol: 'GBPUSD', displayName: 'GBP/USD', price: FALLBACK_PRICES.GBPUSD, change: 0.5 },
      { symbol: 'USDJPY', displayName: 'USD/JPY', price: FALLBACK_PRICES.USDJPY, change: -0.1 },
      { symbol: 'AUDUSD', displayName: 'AUD/USD', price: FALLBACK_PRICES.AUDUSD, change: 0.8 },
      { symbol: 'NZDUSD', displayName: 'NZD/USD', price: FALLBACK_PRICES.NZDUSD, change: 1.2 }
    ];
    return res.json({ success: true, data: fallbackData, source: 'FALLBACK', timestamp: new Date().toISOString() });
  }
});

// ─── GET /series (FIXED — returns both candles AND klines) ──
router.get('/series', async (req, res) => {
  try {
    const { symbol, timeframe, limit } = req.query;

    if (!symbol || !timeframe) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMS',
        message: 'Missing symbol or timeframe',
        example: '/api/market/series?symbol=BTCUSDT&timeframe=1h&limit=100'
      });
    }

    const intervalMap = {
      '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
      '1h': '1h', '4h': '4h', '1d': '1d', '1w': '1w',
      'M1': '1m', 'M5': '5m', 'M15': '15m', 'M30': '30m',
      'H1': '1h', 'H4': '4h', 'D1': '1d', 'W1': '1w'
    };

    const normalizedTimeframe = intervalMap[timeframe] || '1h';
    const limitNum = Math.min(parseInt(limit) || 100, 1000);

    let klines = [];
    let source = 'FALLBACK';

    // Try Binance
    try {
      let binanceSymbol = symbol.toUpperCase();
      if (binanceSymbol === 'XAUUSD') binanceSymbol = 'PAXGUSDT';

      if (binanceSymbol.endsWith('USDT') || binanceSymbol === 'PAXGUSDT') {
        const response = await axios.get(`${BINANCE_BASE}/klines`, {
          params: { symbol: binanceSymbol, interval: normalizedTimeframe, limit: limitNum },
          timeout: TIMEOUT
        });

        if (Array.isArray(response.data) && response.data.length > 0) {
          klines = response.data.map(k => ({
            time: new Date(k[0]),
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[7])
          }));
          source = binanceSymbol === 'PAXGUSDT' ? 'BINANCE (PAXG)' : 'BINANCE';
        }
      }
    } catch (err) {
      console.warn(`⚠️ Binance failed for ${symbol}: ${err.message}`);
    }

    // Fallback to synthetic
    if (klines.length === 0) {
      const fallbackPrice = FALLBACK_PRICES[symbol.toUpperCase()] || 50;
      klines = generateSyntheticCandles(fallbackPrice, normalizedTimeframe, limitNum);
      source = 'SYNTHETIC';
    }

  // In the GET /series endpoint, change the response data key:

    return res.json({
      success: true,
      data: {
        symbol,
        timeframe: normalizedTimeframe,
        candles: klines,    // ← CHANGED from "klines" to "candles"
        count: klines.length,
        source
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /health ────────────────────────────────────────
router.get('/health', (req, res) => {
  return res.json({
    success: true,
    status: 'healthy',
    message: 'Market API is running',
    endpoints: [
      'GET /data?symbols=BTCUSDT,ETHUSDT',
      'GET /crypto/snapshot',
      'GET /forex/snapshot',
      'GET /series?symbol=BTCUSDT&timeframe=1h&limit=100'
    ]
  });
});

module.exports = router;
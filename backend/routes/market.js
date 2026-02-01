const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// ============================================
// MARKET DATA ENDPOINTS
// ============================================

// Get crypto market snapshot (Binance)
router.get('/crypto/snapshot', async (req, res) => {
  try {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
    const marketData = {};

    for (const symbol of symbols) {
      try {
        const response = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
        );
        const data = await response.json();

        marketData[symbol] = {
          symbol,
          price: parseFloat(data.lastPrice),
          change: parseFloat(data.priceChangePercent),
          high: parseFloat(data.highPrice),
          low: parseFloat(data.lowPrice),
          volume: parseFloat(data.volume),
          quoteAsset: data.quoteAsset,
          timestamp: Date.now()
        };
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error.message);
        marketData[symbol] = { symbol, error: 'Failed to fetch' };
      }
    }

    res.json({
      success: true,
      data: marketData,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Crypto snapshot error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error fetching crypto market data'
    });
  }
});

// Get forex market snapshot (ExchangeRate API)
router.get('/forex/snapshot', async (req, res) => {
  try {
    const pairs = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'NZD', 'CAD'];
    const marketData = {};

    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();

      pairs.forEach(pair => {
        const rate = data.rates[pair] || null;
        marketData[`USD${pair}`] = {
          symbol: `USD${pair}`,
          price: rate,
          change: 0, // ExchangeRate API doesn't provide % change
          timestamp: Date.now()
        };
      });
    } catch (error) {
      console.error('ExchangeRate API error:', error.message);
    }

    // Add gold (XAU/USD) via crypto proxy (PAXGUSDT on Binance)
    try {
      const response = await fetch(
        'https://api.binance.com/api/v3/ticker/24hr?symbol=PAXGUSDT'
      );
      const data = await response.json();

      marketData['XAUUSD'] = {
        symbol: 'XAUUSD',
        price: parseFloat(data.lastPrice),
        change: parseFloat(data.priceChangePercent),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Gold data error:', error.message);
    }

    res.json({
      success: true,
      data: marketData,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Forex snapshot error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error fetching forex market data'
    });
  }
});

// Get market series (OHLCV candles)
router.get('/series', async (req, res) => {
  try {
    const { symbol, timeframe = 'H1', limit = 120 } = req.query;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_SYMBOL',
        message: 'Symbol parameter is required'
      });
    }

    // Normalize timeframe format
    const normalizeTimeframe = (tf) => {
      if (typeof tf !== 'string') return '1h';
      const upperTf = tf.toUpperCase();
      // Already normalized
      if (['1M', '5M', '15M', '30M', '1H', '4H', '1D', '1W'].includes(upperTf)) return upperTf.toLowerCase();
      // Convert format
      return upperTf
        .replace('H1', '1h')
        .replace('H4', '4h')
        .replace('D1', '1d')
        .replace('M30', '30m')
        .replace('M15', '15m')
        .replace('M5', '5m')
        .replace('M1', '1m')
        .replace('W1', '1w');
    };

    const normalizedTimeframe = normalizeTimeframe(timeframe);

    // Validate timeframe
    const validTimeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
    if (!validTimeframes.includes(normalizedTimeframe)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_TIMEFRAME',
        message: `Invalid timeframe: ${timeframe} (normalized to: ${normalizedTimeframe})`
      });
    }

    // Validate limit
    const validLimit = Math.min(Math.max(parseInt(limit) || 120, 1), 1000);

    // Try to fetch from Binance
    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${normalizedTimeframe}&limit=${validLimit}`
      );

      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`);
      }

      const data = await response.json();

      // Format klines into OHLCV
      const candles = data.map(k => ({
        time: Math.floor(k[0] / 1000),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[7])
      }));

      res.json({
        success: true,
        data: {
          symbol,
          timeframe,
          candles,
          count: candles.length
        }
      });
    } catch (error) {
      console.error('Binance fetch error:', error.message);
      res.status(500).json({
        success: false,
        error: 'API_ERROR',
        message: 'Failed to fetch market series'
      });
    }
  } catch (error) {
    console.error('Series fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error fetching market series'
    });
  }
});

// Get multiple symbols snapshot
router.post('/snapshot/batch', async (req, res) => {
  try {
    const { symbols } = req.body;

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_SYMBOLS',
        message: 'symbols must be a non-empty array'
      });
    }

    const marketData = {};

    for (const symbol of symbols.slice(0, 20)) {
      // Limit to 20 symbols per request
      try {
        const response = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
        );
        const data = await response.json();

        if (data.code) {
          // Error in response
          marketData[symbol] = { symbol, error: data.msg };
          continue;
        }

        marketData[symbol] = {
          symbol,
          price: parseFloat(data.lastPrice),
          change: parseFloat(data.priceChangePercent),
          high: parseFloat(data.highPrice),
          low: parseFloat(data.lowPrice),
          volume: parseFloat(data.volume),
          timestamp: Date.now()
        };
      } catch (error) {
        marketData[symbol] = { symbol, error: 'Failed to fetch' };
      }
    }

    res.json({
      success: true,
      data: marketData,
      count: Object.keys(marketData).length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Batch snapshot error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error fetching batch snapshot'
    });
  }
});

module.exports = router;

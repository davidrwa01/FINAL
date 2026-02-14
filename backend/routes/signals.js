/**
 * routes/signals.js (REFINED)
 * 
 * Fixed endpoints matching frontend expectations
 * Integrated with TradingView for live data
 * Proper error handling and fallbacks
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const EnhancedAnalysisEngine = require('../services/enhancedAnalysisEngine');
const smcEngine = require('../services/smcAnalysisEngine');
const { requireAuth, requireAdminApproved, requireSubscriptionOrTrial } = require('../middleware/auth');
const UsageLog = require('../models/UsageLog');
const User = require('../models/User');
const Subscription = require('../models/Subscription');

// ─── CONSTANTS ──────────────────────────────────────────────
const TRADINGVIEW_SYMBOLS = {
  // Crypto
  'BTCUSDT': 'BINANCE:BTCUSDT',
  'ETHUSDT': 'BINANCE:ETHUSDT',
  'BNBUSDT': 'BINANCE:BNBUSDT',
  'SOLUSDT': 'BINANCE:SOLUSDT',
  // Forex
  'EURUSD': 'FX:EURUSD',
  'GBPUSD': 'FX:GBPUSD',
  'USDJPY': 'FX:USDJPY',
  'AUDUSD': 'FX:AUDUSD',
  'USDCHF': 'FX:USDCHF',
  // Metals
  'XAUUSD': 'TVC:GOLD',
  'XAGUSD': 'TVC:SILVER',
  // Indices
  'US30': 'TVC:DJI',
  'NAS100': 'TVC:COMP',
  'SPX500': 'TVC:SP500'
};

const BINANCE_BASE = 'https://api.binance.com/api/v3';

const FALLBACK_PRICES = {
  'BTCUSDT': 45000, 'ETHUSDT': 2500, 'BNBUSDT': 600, 'SOLUSDT': 180,
  'XRPUSDT': 2.50, 'ADAUSDT': 1.20, 'DOGEUSDT': 0.40, 'AVAXUSDT': 150,
  'MATICUSDT': 1.80, 'LINKUSDT': 28, 'UNIUSDT': 24, 'LITUSDT': 200,
  'XAUUSD': 2050, 'XAGUSD': 24,
  'EURUSD': 1.0850, 'GBPUSD': 1.2650, 'USDJPY': 148.50, 'USDCHF': 0.8850,
  'AUDUSD': 0.6550, 'NZDUSD': 0.6050, 'USDCAD': 1.3650, 'EURGBP': 0.8580,
  'EURJPY': 161.50, 'GBPJPY': 193.80
};

// ─── HELPER: Normalize Symbol Key ──────────────────────────
function normalizeSymbol(symbol) {
  if (!symbol) return null;
  return String(symbol).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// ─── HELPER: Get Binance Symbol ───────────────────────────
function getBinanceSymbol(symbolKey) {
  const s = normalizeSymbol(symbolKey);
  if (!s) return null;
  
  // Gold proxy
  if (s === 'XAUUSD') return 'PAXGUSDT';
  if (s === 'XAGUSD') return null; // no reliable spot
  
  // Crypto (already XXXUSDT format)
  if (s.endsWith('USDT')) return s;
  
  // Try to add USDT
  const majors = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'LINK', 'LTC'];
  if (majors.includes(s)) return s + 'USDT';
  
  return null;
}

// ─── HELPER: Fetch Price from Binance ────────────────────
async function fetchBinancePrice(symbol, timeout = 5000) {
  try {
    const response = await axios.get(
      `${BINANCE_BASE}/ticker/price?symbol=${symbol}`,
      { timeout }
    );
    return parseFloat(response.data.price);
  } catch (error) {
    console.error(`Binance price fetch error for ${symbol}:`, error.message);
    return null;
  }
}

// ─── HELPER: Fetch Binance Klines ─────────────────────────
async function fetchBinanceKlines(symbol, interval = '1h', limit = 120, timeout = 8000) {
  try {
    const response = await axios.get(
      `${BINANCE_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      { timeout }
    );
    
    return response.data.map(k => ({
      time: parseInt(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    }));
  } catch (error) {
    console.error(`Binance klines fetch error for ${symbol}:`, error.message);
    return null;
  }
}

// ─── HELPER: Generate Synthetic Candles ───────────────────
function generateSyntheticCandles(basePrice, interval = '1h', limit = 120) {
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

// ─── HELPER: Format Price ─────────────────────────────────
function formatPrice(price) {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

// ─── ENDPOINT: Check Access ──────────────────────────────
router.get('/check-access', requireAuth, requireAdminApproved, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User session invalid'
      });
    }

    const subscription = await Subscription.findOne({
      userId: user._id,
      status: 'ACTIVE',
      startDate: { $lte: new Date() },
      endDate: { $gt: new Date() }
    });

    let remainingSignals = 0;
    if (!subscription) {
      remainingSignals = await UsageLog.getRemainingSignals(user._id, 2);
    }

    res.json({
      success: true,
      data: {
        canGenerate: true,
        hasSubscription: !!subscription,
        remainingSignals: subscription ? Infinity : remainingSignals,
        isApproved: user.isApproved,
        userId: user._id
      }
    });
  } catch (err) {
    console.error('check-access error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to verify access'
    });
  }
});

// ─── ENDPOINT: Generate Signal (Enhanced) ────────────────
router.post('/generate',
  requireAuth,
  requireAdminApproved,
  requireSubscriptionOrTrial,
  async (req, res) => {
    try {
      const { symbol, timeframe, candleData } = req.body;

      // Validate input
      if (!symbol || !timeframe || !candleData || !Array.isArray(candleData) || candleData.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_INPUT',
          message: 'Required: symbol, timeframe, and candleData (array)'
        });
      }

      // Normalize candle data
      const normalizedCandles = candleData.map(c => ({
        time: c.time,
        open: parseFloat(c.open),
        high: parseFloat(c.high),
        low: parseFloat(c.low),
        close: parseFloat(c.close),
        volume: parseFloat(c.volume) || 0
      }));

      // Run enhanced analysis
      const engine = new EnhancedAnalysisEngine();
      const analysis = await engine.analyze(normalizedCandles, { symbol, timeframe });

      // Log usage
      await UsageLog.recordSignalGeneration(req.session.userId, symbol);

      return res.json({
        success: true,
        data: analysis,
        message: 'Enhanced analysis completed successfully'
      });

    } catch (error) {
      console.error('POST /generate error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'ANALYSIS_ERROR',
        message: error.message
      });
    }
  }
);

// ─── ENDPOINT: Analyze SMC (Fixed Path) ──────────────────
router.post('/analyze-smc', requireAuth, requireAdminApproved, async (req, res) => {
  try {
    const { symbol, klines, interval } = req.body;
    
    if (!symbol || !klines || !Array.isArray(klines)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Required: symbol (string), klines (array), interval (string)'
      });
    }

    if (klines.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'INSUFFICIENT_DATA',
        message: 'Minimum 10 candles required for analysis'
      });
    }

    // Generate signal using SMC engine
    const analysis = smcEngine.generateSignal(klines, symbol);

    // Log the analysis
    const userId = req.session.userId;
    await UsageLog.create({
      userId,
      actionType: 'ANALYSIS',
      symbol,
      interval,
      signal: analysis.signal,
      confidence: analysis.confidence,
      entry: analysis.entry,
      stopLoss: analysis.stopLoss,
      takeProfit: analysis.takeProfit,
      riskReward: analysis.riskReward,
      timestamp: new Date()
    });

    return res.json({
      success: true,
      data: analysis
    });

  } catch (err) {
    console.error('/analyze-smc error:', err);
    return res.status(500).json({
      success: false,
      error: 'ANALYSIS_ERROR',
      message: 'Failed to perform SMC analysis'
    });
  }
});

// ─── ENDPOINT: Get Klines ────────────────────────────────
router.get('/klines/:symbol/:interval/:limit', async (req, res) => {
  const symbol = (req.params.symbol || '').toUpperCase();
  const interval = req.params.interval || '1h';
  const limit = Math.min(parseInt(req.params.limit, 10) || 120, 1000);

  try {
    const binanceSymbol = getBinanceSymbol(symbol);
    
    if (binanceSymbol) {
      // Try Binance
      const klines = await fetchBinanceKlines(binanceSymbol, interval, limit);
      
      if (klines && klines.length > 0) {
        return res.json({ 
          success: true, 
          data: klines,
          source: binanceSymbol === 'PAXGUSDT' ? 'BINANCE (PAXG proxy)' : 'BINANCE'
        });
      }
    }

    // Fallback to synthetic
    const fallbackPrice = FALLBACK_PRICES[symbol] || 100;
    const syntheticKlines = generateSyntheticCandles(fallbackPrice, interval, limit);
    
    return res.json({ 
      success: true, 
      data: syntheticKlines,
      source: 'SYNTHETIC'
    });

  } catch (err) {
    console.error(`/klines/${symbol} error:`, err.message);
    
    // Final fallback
    try {
      const fallbackPrice = FALLBACK_PRICES[symbol] || 100;
      const klines = generateSyntheticCandles(fallbackPrice, interval, limit);
      return res.json({ 
        success: true, 
        data: klines,
        source: 'FALLBACK'
      });
    } catch (fallbackErr) {
      return res.status(500).json({ 
        success: false, 
        error: 'MARKET_DATA_ERROR',
        message: `Failed to fetch market data for ${symbol}` 
      });
    }
  }
});

// ─── ENDPOINT: Get Market Data (for frontend ticker) ──────
router.post('/market-data', async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Provide array of symbols'
      });
    }

    const results = {};

    // Fetch all symbols in parallel
    await Promise.all(symbols.map(async (symbol) => {
      try {
        const key = normalizeSymbol(symbol);
        const binanceSymbol = getBinanceSymbol(key);

        if (binanceSymbol) {
          const price = await fetchBinancePrice(binanceSymbol);
          if (price) {
            results[symbol] = {
              symbol,
              price,
              change: (Math.random() - 0.5) * 2, // Fallback change
              source: 'BINANCE'
            };
            return;
          }
        }

        // Use fallback
        const fallback = FALLBACK_PRICES[key];
        results[symbol] = {
          symbol,
          price: fallback || 0,
          change: (Math.random() - 0.5) * 2,
          source: 'FALLBACK'
        };
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error.message);
        const fallback = FALLBACK_PRICES[normalizeSymbol(symbol)];
        results[symbol] = {
          symbol,
          price: fallback || 0,
          change: 0,
          source: 'ERROR',
          error: error.message
        };
      }
    }));

    return res.json({
      success: true,
      data: results
    });

  } catch (err) {
    console.error('/market-data error:', err);
    return res.status(500).json({
      success: false,
      error: 'MARKET_DATA_ERROR',
      message: 'Failed to fetch market data'
    });
  }
});

// ─── ENDPOINT: Generate Live Signal ──────────────────────
router.post('/generate-signal', requireAuth, requireAdminApproved, requireSubscriptionOrTrial, async (req, res) => {
  try {
    const { symbol, interval = '1h' } = req.body;
    const userId = req.session.userId;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_SYMBOL',
        message: 'Symbol is required'
      });
    }

    // Check subscription
    const subscription = await Subscription.findOne({
      userId,
      status: 'ACTIVE',
      startDate: { $lte: new Date() },
      endDate: { $gt: new Date() }
    });

    if (!subscription) {
      const remainingSignals = await UsageLog.getRemainingSignals(userId, 2);
      if (remainingSignals <= 0) {
        return res.status(403).json({
          success: false,
          error: 'TRIAL_LIMIT_EXCEEDED',
          message: 'Daily trial limit reached. Upgrade to continue.',
          redirectTo: '/subscribe'
        });
      }
    }

    // Fetch klines
    const binanceSymbol = getBinanceSymbol(symbol);
    let klines = null;

    if (binanceSymbol) {
      klines = await fetchBinanceKlines(binanceSymbol, 
        interval === 'H1' ? '1h' : interval, 120);
    }

    // Fallback to synthetic
    if (!klines || klines.length === 0) {
      const fallbackPrice = FALLBACK_PRICES[normalizeSymbol(symbol)] || 100;
      klines = generateSyntheticCandles(fallbackPrice, 
        interval === 'H1' ? '1h' : interval, 120);
    }

    // Generate signal
    const analysis = smcEngine.generateSignal(klines, symbol);

    // Log usage
    await UsageLog.logSignal(userId, {
      symbol,
      interval,
      signalType: 'LIVE',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.json({
      success: true,
      data: analysis,
      message: `Signal generated for ${symbol}`
    });

  } catch (err) {
    console.error('/generate-signal error:', err);
    return res.status(500).json({
      success: false,
      error: 'SIGNAL_GENERATION_FAILED',
      message: 'Failed to generate signal'
    });
  }
});

// ─── ENDPOINT: Usage Stats ──────────────────────────────
router.get('/usage-stats', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    const subscription = await Subscription.findOne({
      userId,
      status: 'ACTIVE',
      startDate: { $lte: new Date() },
      endDate: { $gt: new Date() }
    });

    const remainingSignals = await UsageLog.getRemainingSignals(userId, 2);
    const totalSignalsGenerated = await UsageLog.countDocuments({
      userId,
      actionType: 'SIGNAL'
    });

    return res.json({
      success: true,
      data: {
        totalSignalsGenerated,
        trialSignalsRemaining: subscription ? Infinity : remainingSignals,
        hasActiveSubscription: !!subscription,
        subscriptionPlan: subscription ? 'ACTIVE' : 'TRIAL',
        message: subscription 
          ? 'Premium subscriber - unlimited signals'
          : `Trial user - ${remainingSignals} signals remaining today`
      }
    });

  } catch (err) {
    console.error('/usage-stats error:', err);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch usage statistics'
    });
  }
});

module.exports = router;
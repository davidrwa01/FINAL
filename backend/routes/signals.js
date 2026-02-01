const express = require('express');
const router = express.Router();
const UsageLog = require('../models/UsageLog');
const {
  requireAuth,
  requireAdminApproved,
  requireSubscriptionOrTrial,
  enforceDailyTrialLimit,
  logSignalUsage
} = require('../middleware/auth');

// Protected route: Generate signal/analysis
// This is the main protection layer for the Smart-KORAFX app
router.post('/generate',
  requireAuth,                          // Must be logged in
  requireAdminApproved,                  // Must be admin-approved
  requireSubscriptionOrTrial,            // Check subscription status
  enforceDailyTrialLimit(2),             // Enforce 2 signals/day for trial users
  async (req, res) => {
    try {
      // At this point, user is:
      // ✅ Logged in
      // ✅ Admin approved
      // ✅ Either has active subscription OR hasn't exceeded trial limit

      // Your original signal generation logic would go here
      // This endpoint just validates access and returns status
      
      const { symbol, timeframe, signalType } = req.body;

      // Log usage if on trial
      if (!req.hasActiveSubscription) {
        await UsageLog.logSignal(req.session.userId, {
          symbol,
          timeframe,
          signalType,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });
      }

      // Return success with usage info
      res.json({
        success: true,
        message: 'Signal access granted',
        data: {
          hasActiveSubscription: req.hasActiveSubscription,
          onFreeTrial: req.onFreeTrial,
          remainingSignals: req.remainingSignals || null,
          dailyLimit: req.trialLimit || null,
          canGenerate: true
        }
      });
    } catch (error) {
      console.error('Signal generation error:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Error processing signal request'
      });
    }
  }
);

// Check if user can generate signal (before making request)
router.get('/check-access',
  requireAuth,
  requireAdminApproved,
  requireSubscriptionOrTrial,
  async (req, res) => {
    try {
      const userId = req.session.userId;
      const dailyLimit = parseInt(process.env.FREE_TRIAL_SIGNALS_PER_DAY) || 2;

      // If has subscription, unlimited access
      if (req.hasActiveSubscription) {
        return res.json({
          success: true,
          data: {
            canGenerate: true,
            hasActiveSubscription: true,
            subscription: {
              plan: req.subscription.planId.tier,
              endDate: req.subscription.endDate
            },
            unlimited: true
          }
        });
      }

      // Check trial limits
      const remaining = await UsageLog.getRemainingSignals(userId, dailyLimit);
      const used = dailyLimit - remaining;

      res.json({
        success: true,
        data: {
          canGenerate: remaining > 0,
          hasActiveSubscription: false,
          onFreeTrial: true,
          trial: {
            dailyLimit,
            used,
            remaining,
            message: remaining === 0 
              ? 'Daily trial limit reached. Upgrade to continue.' 
              : `${remaining} signal${remaining === 1 ? '' : 's'} remaining today`
          }
        }
      });
    } catch (error) {
      console.error('Check access error:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Error checking signal access'
      });
    }
  }
);

// Get usage statistics
router.get('/usage-stats',
  requireAuth,
  requireAdminApproved,
  async (req, res) => {
    try {
      const userId = req.session.userId;
      const dateKey = UsageLog.getTodayDateKey();
      
      const todayUsage = await UsageLog.countSignalsForDate(userId, dateKey);
      const dailyLimit = parseInt(process.env.FREE_TRIAL_SIGNALS_PER_DAY) || 2;

      // Get last 7 days usage
      const last7Days = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const key = date.toISOString().split('T')[0];
        const count = await UsageLog.countSignalsForDate(userId, key);
        last7Days.push({
          date: key,
          count
        });
      }

      res.json({
        success: true,
        data: {
          today: {
            date: dateKey,
            used: todayUsage,
            limit: dailyLimit,
            remaining: Math.max(0, dailyLimit - todayUsage)
          },
          history: last7Days.reverse()
        }
      });
    } catch (error) {
      console.error('Get usage stats error:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Error fetching usage statistics'
      });
    }
  }
);

// Public route: Get live market data (no auth required)
router.get('/market-data/:symbols', async (req, res) => {
  try {
    const { symbols } = req.params;
    const symbolsArray = JSON.parse(symbols);
    
    // Convert array to JSON string format for Binance API
    const symbolsParam = JSON.stringify(symbolsArray);
    
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbolsParam)}`
    );
    
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    res.json({
      success: true,
      data: Array.isArray(data) ? data : [data]
    });
  } catch (error) {
    console.error('Market data fetch error:', error);
    // Return fallback data on error
    res.json({
      success: true,
      data: [
        { symbol: 'BTCUSDT', lastPrice: '42500', priceChangePercent: '2.5' },
        { symbol: 'ETHUSDT', lastPrice: '2300', priceChangePercent: '1.8' },
        { symbol: 'XAUUSD', lastPrice: '1950', priceChangePercent: '0.3' },
        { symbol: 'EURUSD', lastPrice: '1.08', priceChangePercent: '-0.2' }
      ]
    });
  }
});

// Public route: Get klines (candlestick data)
router.get('/klines/:symbol/:interval/:limit', async (req, res) => {
  try {
    let { symbol, interval, limit } = req.params;
    
    // Validate and normalize parameters
    symbol = symbol.toUpperCase().trim();
    interval = interval.toLowerCase().trim();
    limit = parseInt(limit) || 100;
    
    // Validate interval format (must be valid Binance interval)
    const validIntervals = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];
    if (!validIntervals.includes(interval)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INTERVAL',
        message: `Invalid interval. Must be one of: ${validIntervals.join(', ')}`
      });
    }
    
    // Validate limit
    if (limit < 1 || limit > 1000) {
      limit = Math.min(Math.max(limit, 1), 1000);
    }
    
    console.log(`Fetching klines: symbol=${symbol}, interval=${interval}, limit=${limit}`);
    
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Binance API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Klines fetch error:', error);
    // Return fallback data on error
    res.json({
      success: false,
      error: 'MARKET_DATA_ERROR',
      message: error.message,
      data: []
    });
  }
});

// Protected route: Get trading signal history
router.get('/history', requireAuth, async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        error: 'NOT_AUTHENTICATED',
        message: 'Please login to view history'
      });
    }

    // In production, fetch from database
    // For now, return sample data matching frontend mock
    const mockHistory = [
      {
        id: '1',
        pair: 'BTC/USDT',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        signal: 'BUY',
        confidence: 92,
        entry: 43250,
        stopLoss: 42800,
        takeProfit: 44200,
        result: 'WIN'
      },
      {
        id: '2',
        pair: 'ETH/USDT',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        signal: 'SELL',
        confidence: 78,
        entry: 2380,
        stopLoss: 2420,
        takeProfit: 2300,
        result: 'WIN'
      },
      {
        id: '3',
        pair: 'XAU/USD',
        date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        signal: 'BUY',
        confidence: 85,
        entry: 1945,
        stopLoss: 1930,
        takeProfit: 1970,
        result: 'LOSS'
      },
      {
        id: '4',
        pair: 'EUR/USD',
        date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        signal: 'WAIT',
        confidence: 45,
        entry: 1.0820,
        stopLoss: 1.0800,
        takeProfit: 1.0850,
        result: 'SKIPPED'
      }
    ];

    res.json({
      success: true,
      message: 'Trading history retrieved',
      data: {
        total: mockHistory.length,
        scans: mockHistory,
        stats: {
          totalScans: mockHistory.length,
          thisWeekScans: 2,
          winRate: 66.67,
          avgRR: 1.85
        }
      }
    });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error retrieving trading history'
    });
  }
});

module.exports = router;

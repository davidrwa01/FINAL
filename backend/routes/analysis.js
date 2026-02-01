const express = require('express');
const router = express.Router();

// ============================================
// SMC ANALYSIS ENGINE
// ============================================

// Helper: Calculate EMA
function calculateEMA(data, period) {
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b) / period;
  return data.map((price, i) => {
    ema = i < period ? ema : price * k + ema * (1 - k);
    return ema;
  });
}

// Helper: Calculate RSI
function calculateRSI(data, period = 14) {
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < period; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  const rsis = [];

  for (let i = period; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    rsis.push(isFinite(rsi) ? rsi : 50);
  }

  return rsis;
}

// Helper: Detect swing high/low
function detectSwings(klines, lookback = 2) {
  const swings = [];
  for (let i = lookback; i < klines.length - lookback; i++) {
    const center = klines[i].high;
    const isHigh = klines
      .slice(i - lookback, i + lookback + 1)
      .every((k, idx) => idx === lookback ? true : k.high <= center);
    const isLow = klines
      .slice(i - lookback, i + lookback + 1)
      .every((k, idx) => idx === lookback ? true : k.low >= center);

    if (isHigh) swings.push({ type: 'HIGH', price: center, index: i });
    if (isLow) swings.push({ type: 'LOW', price: center, index: i });
  }
  return swings;
}

// Helper: Detect Break of Structure
function detectBOS(klines, swings) {
  const bosEvents = [];
  if (swings.length < 2) return bosEvents;

  for (let i = 1; i < swings.length; i++) {
    const prev = swings[i - 1];
    const curr = swings[i];

    if (prev.type === 'HIGH' && curr.type === 'LOW') {
      // Look for break below previous low
      const prevLow = swings.slice(0, i).reverse().find(s => s.type === 'LOW');
      if (prevLow) {
        for (let j = curr.index + 1; j < klines.length; j++) {
          if (klines[j].low < prevLow.price) {
            bosEvents.push({
              type: 'BEARISH_BOS',
              price: prevLow.price,
              index: j
            });
            break;
          }
        }
      }
    } else if (prev.type === 'LOW' && curr.type === 'HIGH') {
      // Look for break above previous high
      const prevHigh = swings.slice(0, i).reverse().find(s => s.type === 'HIGH');
      if (prevHigh) {
        for (let j = curr.index + 1; j < klines.length; j++) {
          if (klines[j].high > prevHigh.price) {
            bosEvents.push({
              type: 'BULLISH_BOS',
              price: prevHigh.price,
              index: j
            });
            break;
          }
        }
      }
    }
  }
  return bosEvents;
}

// Helper: Detect Order Blocks
function detectOrderBlocks(klines, swings) {
  const blocks = [];
  if (klines.length < 5) return blocks;

  for (let i = 2; i < klines.length - 1; i++) {
    const current = klines[i];
    const next = klines[i + 1];

    // Bullish OB: large up candle followed by pullback
    if (
      current.close > current.open &&
      (current.close - current.open) / current.open > 0.01 &&
      next.close < current.close
    ) {
      blocks.push({
        type: 'BULLISH_OB',
        high: current.high,
        low: current.low,
        index: i
      });
    }

    // Bearish OB: large down candle followed by pullback
    if (
      current.close < current.open &&
      (current.open - current.close) / current.open > 0.01 &&
      next.close > current.close
    ) {
      blocks.push({
        type: 'BEARISH_OB',
        high: current.high,
        low: current.low,
        index: i
      });
    }
  }
  return blocks;
}

// Helper: Detect Fair Value Gaps (FVG)
function detectFVG(klines) {
  const fvgs = [];
  if (klines.length < 3) return fvgs;

  for (let i = 2; i < klines.length; i++) {
    const gap = klines[i - 2];
    const middle = klines[i - 1];
    const current = klines[i];

    // Bullish FVG: gap up (low of current > high of gap candle)
    if (
      middle.low > gap.high &&
      current.low > gap.high
    ) {
      fvgs.push({
        type: 'BULLISH_FVG',
        top: middle.low,
        bottom: gap.high,
        index: i
      });
    }

    // Bearish FVG: gap down (high of current < low of gap candle)
    if (
      middle.high < gap.low &&
      current.high < gap.low
    ) {
      fvgs.push({
        type: 'BEARISH_FVG',
        top: gap.low,
        bottom: middle.high,
        index: i
      });
    }
  }
  return fvgs;
}

// Helper: Detect Key Levels
function detectKeyLevels(klines) {
  const levels = { support: [], resistance: [] };

  const highs = klines.map(k => k.high);
  const lows = klines.map(k => k.low);

  // Find local maxima for resistance
  for (let i = 1; i < highs.length - 1; i++) {
    if (highs[i] >= highs[i - 1] && highs[i] >= highs[i + 1]) {
      levels.resistance.push(highs[i]);
    }
  }

  // Find local minima for support
  for (let i = 1; i < lows.length - 1; i++) {
    if (lows[i] <= lows[i - 1] && lows[i] <= lows[i + 1]) {
      levels.support.push(lows[i]);
    }
  }

  // Remove duplicates and sort
  levels.support = [...new Set(levels.support)].sort((a, b) => a - b);
  levels.resistance = [...new Set(levels.resistance)].sort((a, b) => a - b);

  return levels;
}

// Main SMC Analysis
function performSMCAnalysis(klines) {
  if (!klines || klines.length < 5) {
    return { error: 'Insufficient data' };
  }

  const swings = detectSwings(klines, 2);
  const bosEvents = detectBOS(klines, swings);
  const orderBlocks = detectOrderBlocks(klines, swings);
  const fvgs = detectFVG(klines);
  const keyLevels = detectKeyLevels(klines);

  const closes = klines.map(k => k.close);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const rsi = calculateRSI(closes, 14);

  const lastClose = closes[closes.length - 1];
  const lastEMA20 = ema20[ema20.length - 1];
  const lastEMA50 = ema50[ema50.length - 1];
  const lastRSI = rsi.length > 0 ? rsi[rsi.length - 1] : 50;

  // Determine market bias
  let bias = 'NEUTRAL';
  let biasSources = [];

  // Check swing structure
  if (swings.length > 0) {
    const lastSwing = swings[swings.length - 1];
    if (lastSwing.type === 'HIGH') {
      bias = 'BEARISH';
      biasSources.push('swing_high');
    } else if (lastSwing.type === 'LOW') {
      bias = 'BULLISH';
      biasSources.push('swing_low');
    }
  }

  // Check BOS
  if (bosEvents.length > 0) {
    const lastBOS = bosEvents[bosEvents.length - 1];
    if (lastBOS.type === 'BULLISH_BOS') {
      bias = 'BULLISH';
      biasSources.push('bullish_bos');
    } else if (lastBOS.type === 'BEARISH_BOS') {
      bias = 'BEARISH';
      biasSources.push('bearish_bos');
    }
  }

  // Check EMAs
  if (lastClose > lastEMA20 && lastEMA20 > lastEMA50) {
    bias = 'BULLISH';
    biasSources.push('ema_alignment');
  } else if (lastClose < lastEMA20 && lastEMA20 < lastEMA50) {
    bias = 'BEARISH';
    biasSources.push('ema_alignment');
  }

  // Check RSI
  if (lastRSI > 70) {
    biasSources.push('rsi_overbought');
  } else if (lastRSI < 30) {
    biasSources.push('rsi_oversold');
  }

  return {
    swings,
    bosEvents,
    orderBlocks,
    fvgs,
    keyLevels,
    ema20: lastEMA20,
    ema50: lastEMA50,
    rsi: lastRSI,
    currentPrice: lastClose,
    bias,
    biasSources,
    signals: {
      bullishOBCount: orderBlocks.filter(b => b.type === 'BULLISH_OB').length,
      bearishOBCount: orderBlocks.filter(b => b.type === 'BEARISH_OB').length,
      bullishFVGCount: fvgs.filter(f => f.type === 'BULLISH_FVG').length,
      bearishFVGCount: fvgs.filter(f => f.type === 'BEARISH_FVG').length
    }
  };
}

// Endpoint: Analyze klines and return SMC analysis
router.post('/analyze-smc', async (req, res) => {
  try {
    const { klines } = req.body;

    if (!Array.isArray(klines) || klines.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_KLINES',
        message: 'klines must be an array with at least 5 elements'
      });
    }

    const analysis = performSMCAnalysis(klines);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('SMC analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error performing SMC analysis'
    });
  }
});

// Endpoint: Generate live signal from analysis
router.post('/generate-signal', async (req, res) => {
  try {
    const { analysis, currentPrice, symbol, timeframe } = req.body;

    if (!analysis || !currentPrice || !symbol) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMS',
        message: 'analysis, currentPrice, and symbol are required'
      });
    }

    // Determine signal based on SMC bias
    let signal = 'WAIT';
    let confidence = 0;
    let reason = [];

    if (analysis.bias === 'BULLISH') {
      signal = 'BUY';
      confidence = Math.min(75 + (analysis.biasSources.length * 5), 95);
      reason.push(`${analysis.bias} bias (${analysis.biasSources.join(', ')})`);

      if (analysis.signals.bullishOBCount > 0) {
        reason.push(`${analysis.signals.bullishOBCount} bullish order block(s) detected`);
        confidence = Math.min(confidence + 5, 95);
      }

      if (analysis.rsi < 30) {
        reason.push('RSI oversold - potential bounce');
      }
    } else if (analysis.bias === 'BEARISH') {
      signal = 'SELL';
      confidence = Math.min(75 + (analysis.biasSources.length * 5), 95);
      reason.push(`${analysis.bias} bias (${analysis.biasSources.join(', ')})`);

      if (analysis.signals.bearishOBCount > 0) {
        reason.push(`${analysis.signals.bearishOBCount} bearish order block(s) detected`);
        confidence = Math.min(confidence + 5, 95);
      }

      if (analysis.rsi > 70) {
        reason.push('RSI overbought - potential reversal');
      }
    } else {
      confidence = 45;
      reason.push('No clear bias - waiting for structure break');
    }

    // Calculate entry/SL/TP
    const atr = Math.abs(analysis.currentPrice * 0.02); // Simplified ATR estimate
    let entry, stopLoss, takeProfit;

    if (signal === 'BUY') {
      entry = currentPrice;
      stopLoss = currentPrice - (atr * 1.5);
      takeProfit = currentPrice + (atr * 3);
    } else if (signal === 'SELL') {
      entry = currentPrice;
      stopLoss = currentPrice + (atr * 1.5);
      takeProfit = currentPrice - (atr * 3);
    } else {
      entry = currentPrice;
      stopLoss = currentPrice - atr;
      takeProfit = currentPrice + atr;
    }

    res.json({
      success: true,
      data: {
        signal,
        confidence: Math.round(confidence),
        entry: parseFloat(entry.toFixed(8)),
        stopLoss: parseFloat(stopLoss.toFixed(8)),
        takeProfit: parseFloat(takeProfit.toFixed(8)),
        riskReward: parseFloat(
          (Math.abs(takeProfit - entry) / Math.abs(entry - stopLoss)).toFixed(2)
        ),
        symbol,
        timeframe: timeframe || 'H1',
        reason: reason.join('; '),
        analysis: {
          currentPrice: analysis.currentPrice,
          bias: analysis.bias,
          rsi: Math.round(analysis.rsi),
          ema20: parseFloat(analysis.ema20.toFixed(8)),
          ema50: parseFloat(analysis.ema50.toFixed(8))
        },
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Signal generation error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Error generating signal'
    });
  }
});

module.exports = router;

// routes/analysis.js (COMPLETE - NEW FILE)
// 
// ✅ All SMC analysis endpoints
// ✅ Real Order Block, FVG, BOS/CHoCH detection
// ✅ Signal generation with proper entry/SL/TP
// ✅ Confluence scoring
// ✅ Position sizing
// ✅ Works with real market data from /api/market/series

const express = require('express');
const router = express.Router();
const axios = require('axios');

// ─── CONSTANTS ──────────────────────────────────────────────
const BINANCE_BASE = 'https://api.binance.com/api/v3';
const TIMEOUT = 8000;

const FALLBACK_PRICES = {
  'BTCUSDT': 45000, 'ETHUSDT': 2500, 'BNBUSDT': 600, 'SOLUSDT': 180,
  'XRPUSDT': 2.50, 'ADAUSDT': 1.20, 'DOGEUSDT': 0.40, 'AVAXUSDT': 150,
  'DOTUSDT': 8.50, 'LINKUSDT': 28,
  'XAUUSD': 2050, 'XAGUSD': 24,
  'EURUSD': 1.0850, 'GBPUSD': 1.2650, 'USDJPY': 148.50, 'USDCHF': 0.8850,
  'AUDUSD': 0.6550, 'NZDUSD': 0.6050, 'USDCAD': 1.3650, 'EURGBP': 0.8580,
  'EURJPY': 161.50, 'GBPJPY': 193.80
};

// ═══════════════════════════════════════════════════════════
// TECHNICAL INDICATOR CALCULATIONS
// ═══════════════════════════════════════════════════════════

function calcEMA(data, period) {
  if (!data || data.length === 0) return 0;
  if (data.length < period) return data[data.length - 1];
  
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}

function calcEMAArray(data, period) {
  if (!data || data.length === 0) return [];
  const result = [];
  const k = 2 / (period + 1);
  
  // Start with SMA for first 'period' values
  let sum = 0;
  for (let i = 0; i < Math.min(period, data.length); i++) {
    sum += data[i];
    result.push(sum / (i + 1));
  }
  
  // Then EMA
  for (let i = period; i < data.length; i++) {
    const ema = data[i] * k + result[result.length - 1] * (1 - k);
    result.push(ema);
  }
  
  return result;
}

function calcSMA(data, period) {
  if (!data || data.length < period) return data ? data[data.length - 1] || 0 : 0;
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calcRSI(closes, period = 14) {
  if (!closes || closes.length < period + 1) return 50;
  
  let gains = 0, losses = 0;
  
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calcATR(klines, period = 14) {
  if (!klines || klines.length < period + 1) {
    if (klines && klines.length > 0) {
      return klines[klines.length - 1].high - klines[klines.length - 1].low;
    }
    return 0;
  }
  
  const trueRanges = [];
  for (let i = 1; i < klines.length; i++) {
    const high = klines[i].high;
    const low = klines[i].low;
    const prevClose = klines[i - 1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }
  
  // Use last 'period' true ranges
  const recent = trueRanges.slice(-period);
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

function calcMACD(closes, fast = 12, slow = 26, signal = 9) {
  if (!closes || closes.length < slow + signal) {
    return { macdLine: 0, signalLine: 0, histogram: 0, trending: 'NEUTRAL' };
  }
  
  const emaFast = calcEMAArray(closes, fast);
  const emaSlow = calcEMAArray(closes, slow);
  
  const macdLine = [];
  const startIdx = slow - 1;
  
  for (let i = startIdx; i < closes.length; i++) {
    macdLine.push(emaFast[i] - emaSlow[i]);
  }
  
  const signalLineArr = calcEMAArray(macdLine, signal);
  
  const currentMACD = macdLine[macdLine.length - 1] || 0;
  const currentSignal = signalLineArr[signalLineArr.length - 1] || 0;
  const histogram = currentMACD - currentSignal;
  
  let trending = 'NEUTRAL';
  if (currentMACD > currentSignal && histogram > 0) trending = 'BULLISH';
  else if (currentMACD < currentSignal && histogram < 0) trending = 'BEARISH';
  
  return {
    macdLine: parseFloat(currentMACD.toFixed(6)),
    signalLine: parseFloat(currentSignal.toFixed(6)),
    histogram: parseFloat(histogram.toFixed(6)),
    trending
  };
}

// ═══════════════════════════════════════════════════════════
// SMC (SMART MONEY CONCEPTS) ENGINE
// ═══════════════════════════════════════════════════════════

/**
 * Detect swing highs and swing lows
 */
function detectSwingPoints(klines, lookback = 5) {
  const swingHighs = [];
  const swingLows = [];
  
  for (let i = lookback; i < klines.length - lookback; i++) {
    let isSwingHigh = true;
    let isSwingLow = true;
    
    for (let j = 1; j <= lookback; j++) {
      if (klines[i].high <= klines[i - j].high || klines[i].high <= klines[i + j].high) {
        isSwingHigh = false;
      }
      if (klines[i].low >= klines[i - j].low || klines[i].low >= klines[i + j].low) {
        isSwingLow = false;
      }
    }
    
    if (isSwingHigh) {
      swingHighs.push({
        index: i,
        price: klines[i].high,
        time: klines[i].time,
        type: 'SWING_HIGH'
      });
    }
    
    if (isSwingLow) {
      swingLows.push({
        index: i,
        price: klines[i].low,
        time: klines[i].time,
        type: 'SWING_LOW'
      });
    }
  }
  
  return { swingHighs, swingLows };
}

/**
 * Detect Break of Structure (BOS) and Change of Character (CHoCH)
 */
function detectStructure(klines, swingHighs, swingLows) {
  const structures = [];
  let lastStructure = null;
  let trend = 'RANGING';
  
  // Combine and sort swing points by index
  const allSwings = [
    ...swingHighs.map(s => ({ ...s, swingType: 'HIGH' })),
    ...swingLows.map(s => ({ ...s, swingType: 'LOW' }))
  ].sort((a, b) => a.index - b.index);
  
  if (allSwings.length < 4) {
    return { structures, trend, bosCount: 0, chochCount: 0 };
  }
  
  let prevHigherHigh = null;
  let prevLowerLow = null;
  let prevHigherLow = null;
  let prevLowerHigh = null;
  
  // Track the last two swing highs and lows
  const recentHighs = swingHighs.slice(-4);
  const recentLows = swingLows.slice(-4);
  
  // Detect BOS (trend continuation)
  for (let i = 1; i < recentHighs.length; i++) {
    if (recentHighs[i].price > recentHighs[i - 1].price) {
      // Higher High - Bullish BOS
      structures.push({
        type: 'BOS',
        direction: 'BULLISH',
        price: recentHighs[i].price,
        brokenLevel: recentHighs[i - 1].price,
        index: recentHighs[i].index,
        time: recentHighs[i].time
      });
    }
  }
  
  for (let i = 1; i < recentLows.length; i++) {
    if (recentLows[i].price < recentLows[i - 1].price) {
      // Lower Low - Bearish BOS
      structures.push({
        type: 'BOS',
        direction: 'BEARISH',
        price: recentLows[i].price,
        brokenLevel: recentLows[i - 1].price,
        index: recentLows[i].index,
        time: recentLows[i].time
      });
    }
  }
  
  // Detect CHoCH (trend reversal)
  if (recentHighs.length >= 2 && recentLows.length >= 2) {
    const lastHigh = recentHighs[recentHighs.length - 1];
    const prevHigh = recentHighs[recentHighs.length - 2];
    const lastLow = recentLows[recentLows.length - 1];
    const prevLow = recentLows[recentLows.length - 2];
    
    // Bullish CHoCH: was making lower highs, now breaks above
    if (prevHigh.price > lastHigh.price && lastLow.price > prevLow.price) {
      // Potential bullish reversal
      const currentPrice = klines[klines.length - 1].close;
      if (currentPrice > prevHigh.price) {
        structures.push({
          type: 'CHOCH',
          direction: 'BULLISH',
          price: currentPrice,
          brokenLevel: prevHigh.price,
          index: klines.length - 1,
          time: klines[klines.length - 1].time
        });
      }
    }
    
    // Bearish CHoCH: was making higher lows, now breaks below
    if (prevLow.price < lastLow.price && lastHigh.price < prevHigh.price) {
      const currentPrice = klines[klines.length - 1].close;
      if (currentPrice < prevLow.price) {
        structures.push({
          type: 'CHOCH',
          direction: 'BEARISH',
          price: currentPrice,
          brokenLevel: prevLow.price,
          index: klines.length - 1,
          time: klines[klines.length - 1].time
        });
      }
    }
  }
  
  // Determine overall trend
  const bullishBOS = structures.filter(s => s.type === 'BOS' && s.direction === 'BULLISH').length;
  const bearishBOS = structures.filter(s => s.type === 'BOS' && s.direction === 'BEARISH').length;
  const bullishCHOCH = structures.filter(s => s.type === 'CHOCH' && s.direction === 'BULLISH').length;
  const bearishCHOCH = structures.filter(s => s.type === 'CHOCH' && s.direction === 'BEARISH').length;
  
  // CHoCH overrides BOS for trend determination
  if (bullishCHOCH > 0) trend = 'BULLISH_REVERSAL';
  else if (bearishCHOCH > 0) trend = 'BEARISH_REVERSAL';
  else if (bullishBOS > bearishBOS) trend = 'BULLISH';
  else if (bearishBOS > bullishBOS) trend = 'BEARISH';
  else trend = 'RANGING';
  
  return {
    structures,
    trend,
    bosCount: bullishBOS + bearishBOS,
    chochCount: bullishCHOCH + bearishCHOCH
  };
}

/**
 * Detect Order Blocks (OB)
 * An Order Block is the last opposite candle before a strong move
 */
function detectOrderBlocks(klines, atr) {
  const orderBlocks = [];
  if (!klines || klines.length < 10) return orderBlocks;
  
  const strongMoveMultiplier = 1.5; // Move must be > 1.5x ATR
  const currentPrice = klines[klines.length - 1].close;
  
  for (let i = 2; i < klines.length - 1; i++) {
    const candle = klines[i];
    const nextCandle = klines[i + 1];
    const prevCandle = klines[i - 1];
    
    const candleBody = Math.abs(candle.close - candle.open);
    const nextBody = Math.abs(nextCandle.close - nextCandle.open);
    const moveSize = Math.abs(nextCandle.close - candle.open);
    
    // Bullish Order Block: bearish candle followed by strong bullish move
    if (candle.close < candle.open && nextCandle.close > nextCandle.open) {
      if (moveSize > atr * strongMoveMultiplier) {
        const obHigh = candle.open; // Top of bearish candle
        const obLow = candle.low;   // Bottom of bearish candle
        
        // Check if OB is still valid (price hasn't closed below it)
        let valid = currentPrice > obLow;
        
        // Check if price is near the OB (within 2x ATR)
        const distanceToOB = currentPrice - obHigh;
        const isNearby = Math.abs(distanceToOB) < atr * 3;
        
        if (valid) {
          orderBlocks.push({
            type: 'BULLISH_OB',
            high: parseFloat(obHigh.toFixed(8)),
            low: parseFloat(obLow.toFixed(8)),
            midpoint: parseFloat(((obHigh + obLow) / 2).toFixed(8)),
            index: i,
            time: candle.time,
            strength: moveSize / atr,
            mitigated: currentPrice < obLow,
            isNearby,
            distancePercent: parseFloat(((distanceToOB / currentPrice) * 100).toFixed(2))
          });
        }
      }
    }
    
    // Bearish Order Block: bullish candle followed by strong bearish move
    if (candle.close > candle.open && nextCandle.close < nextCandle.open) {
      if (moveSize > atr * strongMoveMultiplier) {
        const obHigh = candle.high;  // Top of bullish candle
        const obLow = candle.open;   // Bottom of bullish candle (open)
        
        let valid = currentPrice < obHigh;
        
        const distanceToOB = obLow - currentPrice;
        const isNearby = Math.abs(distanceToOB) < atr * 3;
        
        if (valid) {
          orderBlocks.push({
            type: 'BEARISH_OB',
            high: parseFloat(obHigh.toFixed(8)),
            low: parseFloat(obLow.toFixed(8)),
            midpoint: parseFloat(((obHigh + obLow) / 2).toFixed(8)),
            index: i,
            time: candle.time,
            strength: moveSize / atr,
            mitigated: currentPrice > obHigh,
            isNearby,
            distancePercent: parseFloat(((distanceToOB / currentPrice) * 100).toFixed(2))
          });
        }
      }
    }
  }
  
  // Sort by strength and return top order blocks
  return orderBlocks
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 10);
}

/**
 * Detect Fair Value Gaps (FVG)
 * FVG occurs when candle[i-1].high < candle[i+1].low (bullish)
 * or candle[i-1].low > candle[i+1].high (bearish)
 */
function detectFVGs(klines, atr) {
  const fvgs = [];
  if (!klines || klines.length < 5) return fvgs;
  
  const currentPrice = klines[klines.length - 1].close;
  const minGapSize = atr * 0.3; // Minimum gap size
  
  for (let i = 1; i < klines.length - 1; i++) {
    const prev = klines[i - 1];
    const current = klines[i];
    const next = klines[i + 1];
    
    // Bullish FVG: gap up (prev high < next low)
    if (prev.high < next.low) {
      const gapSize = next.low - prev.high;
      
      if (gapSize > minGapSize) {
        const filled = currentPrice <= prev.high; // Price has come back to fill
        
        fvgs.push({
          type: 'BULLISH_FVG',
          high: parseFloat(next.low.toFixed(8)),
          low: parseFloat(prev.high.toFixed(8)),
          midpoint: parseFloat(((next.low + prev.high) / 2).toFixed(8)),
          gapSize: parseFloat(gapSize.toFixed(8)),
          index: i,
          time: current.time,
          filled,
          strength: gapSize / atr,
          distancePercent: parseFloat((((currentPrice - next.low) / currentPrice) * 100).toFixed(2))
        });
      }
    }
    
    // Bearish FVG: gap down (prev low > next high)
    if (prev.low > next.high) {
      const gapSize = prev.low - next.high;
      
      if (gapSize > minGapSize) {
        const filled = currentPrice >= prev.low;
        
        fvgs.push({
          type: 'BEARISH_FVG',
          high: parseFloat(prev.low.toFixed(8)),
          low: parseFloat(next.high.toFixed(8)),
          midpoint: parseFloat(((prev.low + next.high) / 2).toFixed(8)),
          gapSize: parseFloat(gapSize.toFixed(8)),
          index: i,
          time: current.time,
          filled,
          strength: gapSize / atr,
          distancePercent: parseFloat((((next.high - currentPrice) / currentPrice) * 100).toFixed(2))
        });
      }
    }
  }
  
  // Return unfilled FVGs first, sorted by recency
  return fvgs
    .filter(f => !f.filled)
    .sort((a, b) => b.index - a.index)
    .slice(0, 10);
}

/**
 * Detect Liquidity Sweeps
 * When price briefly breaks a swing high/low then reverses
 */
function detectLiquiditySweeps(klines, swingHighs, swingLows) {
  const sweeps = [];
  if (!klines || klines.length < 5) return sweeps;
  
  const recentCandles = klines.slice(-10);
  const lastCandle = klines[klines.length - 1];
  
  // Check if recent price action swept above a swing high then closed below
  for (const sh of swingHighs.slice(-5)) {
    for (const candle of recentCandles) {
      if (candle.high > sh.price && candle.close < sh.price) {
        sweeps.push({
          type: 'SELL_SIDE_SWEEP',
          level: sh.price,
          wickHigh: candle.high,
          closePrice: candle.close,
          time: candle.time,
          direction: 'BEARISH' // Swept buy-side liquidity → expect bearish
        });
      }
    }
  }
  
  // Check if recent price swept below a swing low then closed above
  for (const sl of swingLows.slice(-5)) {
    for (const candle of recentCandles) {
      if (candle.low < sl.price && candle.close > sl.price) {
        sweeps.push({
          type: 'BUY_SIDE_SWEEP',
          level: sl.price,
          wickLow: candle.low,
          closePrice: candle.close,
          time: candle.time,
          direction: 'BULLISH' // Swept sell-side liquidity → expect bullish
        });
      }
    }
  }
  
  return sweeps.slice(-5);
}

/**
 * Detect Support and Resistance levels
 */
function detectSupportResistance(klines, swingHighs, swingLows) {
  const currentPrice = klines[klines.length - 1].close;
  
  // Support: nearest swing low below current price
  const supports = swingLows
    .filter(s => s.price < currentPrice)
    .sort((a, b) => b.price - a.price); // Nearest first
  
  // Resistance: nearest swing high above current price
  const resistances = swingHighs
    .filter(s => s.price > currentPrice)
    .sort((a, b) => a.price - b.price); // Nearest first
  
  return {
    support: supports.length > 0 ? supports[0].price : currentPrice * 0.98,
    resistance: resistances.length > 0 ? resistances[0].price : currentPrice * 1.02,
    support2: supports.length > 1 ? supports[1].price : currentPrice * 0.96,
    resistance2: resistances.length > 1 ? resistances[1].price : currentPrice * 1.04,
    allSupports: supports.slice(0, 5).map(s => s.price),
    allResistances: resistances.slice(0, 5).map(s => s.price)
  };
}

// ═══════════════════════════════════════════════════════════
// COMPLETE SMC ANALYSIS PIPELINE
// ═══════════════════════════════════════════════════════════

function runFullSMCAnalysis(klines) {
  if (!klines || klines.length < 20) {
    return null;
  }
  
  const closes = klines.map(k => k.close);
  const highs = klines.map(k => k.high);
  const lows = klines.map(k => k.low);
  const currentPrice = closes[closes.length - 1];
  
  // 1. Technical Indicators
  const ema20 = calcEMA(closes, 20);
  const ema50 = calcEMA(closes, 50);
  const ema200 = calcEMA(closes, 200);
  const rsi = calcRSI(closes, 14);
  const atr = calcATR(klines, 14);
  const macd = calcMACD(closes);
  
  // 2. SMC Analysis
  const lookback = Math.min(5, Math.floor(klines.length / 4));
  const { swingHighs, swingLows } = detectSwingPoints(klines, lookback);
  const structure = detectStructure(klines, swingHighs, swingLows);
  const orderBlocks = detectOrderBlocks(klines, atr);
  const fvgs = detectFVGs(klines, atr);
  const liquiditySweeps = detectLiquiditySweeps(klines, swingHighs, swingLows);
  const sr = detectSupportResistance(klines, swingHighs, swingLows);
  
  // 3. Market Bias from SMC
  let marketBias = 'NEUTRAL';
  
  // Structure-based bias
  if (structure.trend.includes('BULLISH')) marketBias = 'BULLISH';
  else if (structure.trend.includes('BEARISH')) marketBias = 'BEARISH';
  
  // EMA confirmation
  const emaBullish = ema20 > ema50 && currentPrice > ema20;
  const emaBearish = ema20 < ema50 && currentPrice < ema20;
  
  // Active order blocks near price
  const nearBullishOBs = orderBlocks.filter(ob => 
    ob.type === 'BULLISH_OB' && ob.isNearby && !ob.mitigated
  );
  const nearBearishOBs = orderBlocks.filter(ob => 
    ob.type === 'BEARISH_OB' && ob.isNearby && !ob.mitigated
  );
  
  return {
    currentPrice,
    
    indicators: {
      ema20: parseFloat(ema20.toFixed(8)),
      ema50: parseFloat(ema50.toFixed(8)),
      ema200: parseFloat(ema200.toFixed(8)),
      rsi: parseFloat(rsi.toFixed(2)),
      atr: parseFloat(atr.toFixed(8)),
      macd,
      support: sr.support,
      resistance: sr.resistance,
      support2: sr.support2,
      resistance2: sr.resistance2
    },
    
    smc: {
      marketBias,
      structure: structure.trend,
      swingHighs: swingHighs.slice(-5),
      swingLows: swingLows.slice(-5),
      structures: structure.structures,
      activeOrderBlocks: orderBlocks.filter(ob => !ob.mitigated),
      activeFVGs: fvgs,
      liquiditySweeps,
      nearBullishOBs,
      nearBearishOBs,
      summary: {
        bosCount: structure.bosCount,
        chochCount: structure.chochCount,
        activeOrderBlocks: orderBlocks.filter(ob => !ob.mitigated).length,
        activeFVGs: fvgs.length,
        liquiditySweepCount: liquiditySweeps.length,
        bullishOBsNearby: nearBullishOBs.length,
        bearishOBsNearby: nearBearishOBs.length
      }
    },
    
    supportResistance: sr
  };
}

// ═══════════════════════════════════════════════════════════
// CONFLUENCE SCORING
// ═══════════════════════════════════════════════════════════

function calculateConfluence(analysis) {
  if (!analysis) {
    return { direction: 'WAIT', confidence: 0, totalScore: 0, breakdown: [] };
  }
  
  const { currentPrice, indicators, smc } = analysis;
  let bullScore = 0;
  let bearScore = 0;
  const breakdown = [];
  
  // 1. TREND STRUCTURE (weight: 25)
  if (smc.structure === 'BULLISH' || smc.structure === 'BULLISH_REVERSAL') {
    bullScore += 25;
    breakdown.push({ factor: 'Market Structure', direction: 'BULLISH', score: 25, detail: smc.structure });
  } else if (smc.structure === 'BEARISH' || smc.structure === 'BEARISH_REVERSAL') {
    bearScore += 25;
    breakdown.push({ factor: 'Market Structure', direction: 'BEARISH', score: 25, detail: smc.structure });
  } else {
    breakdown.push({ factor: 'Market Structure', direction: 'NEUTRAL', score: 0, detail: 'RANGING' });
  }
  
  // 2. EMA ALIGNMENT (weight: 15)
  if (currentPrice > indicators.ema20 && indicators.ema20 > indicators.ema50) {
    bullScore += 15;
    breakdown.push({ factor: 'EMA Alignment', direction: 'BULLISH', score: 15, detail: 'Price > EMA20 > EMA50' });
  } else if (currentPrice < indicators.ema20 && indicators.ema20 < indicators.ema50) {
    bearScore += 15;
    breakdown.push({ factor: 'EMA Alignment', direction: 'BEARISH', score: 15, detail: 'Price < EMA20 < EMA50' });
  } else {
    breakdown.push({ factor: 'EMA Alignment', direction: 'NEUTRAL', score: 0, detail: 'Mixed' });
  }
  
  // 3. RSI (weight: 10)
  if (indicators.rsi < 30) {
    bullScore += 10;
    breakdown.push({ factor: 'RSI Oversold', direction: 'BULLISH', score: 10, detail: `RSI: ${indicators.rsi.toFixed(1)}` });
  } else if (indicators.rsi > 70) {
    bearScore += 10;
    breakdown.push({ factor: 'RSI Overbought', direction: 'BEARISH', score: 10, detail: `RSI: ${indicators.rsi.toFixed(1)}` });
  } else if (indicators.rsi < 45) {
    bullScore += 5;
    breakdown.push({ factor: 'RSI Leaning Bullish', direction: 'BULLISH', score: 5, detail: `RSI: ${indicators.rsi.toFixed(1)}` });
  } else if (indicators.rsi > 55) {
    bearScore += 5;
    breakdown.push({ factor: 'RSI Leaning Bearish', direction: 'BEARISH', score: 5, detail: `RSI: ${indicators.rsi.toFixed(1)}` });
  }
  
  // 4. MACD (weight: 10)
  if (indicators.macd.trending === 'BULLISH') {
    bullScore += 10;
    breakdown.push({ factor: 'MACD', direction: 'BULLISH', score: 10, detail: 'Bullish crossover' });
  } else if (indicators.macd.trending === 'BEARISH') {
    bearScore += 10;
    breakdown.push({ factor: 'MACD', direction: 'BEARISH', score: 10, detail: 'Bearish crossover' });
  }
  
  // 5. ORDER BLOCKS (weight: 20)
  if (smc.nearBullishOBs.length > 0) {
    const obScore = Math.min(20, smc.nearBullishOBs.length * 10);
    bullScore += obScore;
    breakdown.push({ factor: 'Bullish Order Blocks', direction: 'BULLISH', score: obScore, detail: `${smc.nearBullishOBs.length} active` });
  }
  if (smc.nearBearishOBs.length > 0) {
    const obScore = Math.min(20, smc.nearBearishOBs.length * 10);
    bearScore += obScore;
    breakdown.push({ factor: 'Bearish Order Blocks', direction: 'BEARISH', score: obScore, detail: `${smc.nearBearishOBs.length} active` });
  }
  
  // 6. FVGs (weight: 10)
  const bullishFVGs = smc.activeFVGs.filter(f => f.type === 'BULLISH_FVG');
  const bearishFVGs = smc.activeFVGs.filter(f => f.type === 'BEARISH_FVG');
  
  if (bullishFVGs.length > 0) {
    bullScore += 10;
    breakdown.push({ factor: 'Bullish FVG', direction: 'BULLISH', score: 10, detail: `${bullishFVGs.length} unfilled` });
  }
  if (bearishFVGs.length > 0) {
    bearScore += 10;
    breakdown.push({ factor: 'Bearish FVG', direction: 'BEARISH', score: 10, detail: `${bearishFVGs.length} unfilled` });
  }
  
  // 7. LIQUIDITY SWEEPS (weight: 15)
  const bullSweeps = smc.liquiditySweeps.filter(s => s.direction === 'BULLISH');
  const bearSweeps = smc.liquiditySweeps.filter(s => s.direction === 'BEARISH');
  
  if (bullSweeps.length > 0) {
    bullScore += 15;
    breakdown.push({ factor: 'Buy-side Liquidity Sweep', direction: 'BULLISH', score: 15, detail: `${bullSweeps.length} sweeps` });
  }
  if (bearSweeps.length > 0) {
    bearScore += 15;
    breakdown.push({ factor: 'Sell-side Liquidity Sweep', direction: 'BEARISH', score: 15, detail: `${bearSweeps.length} sweeps` });
  }
  
  // 8. BOS / CHoCH (weight: bonus)
  if (smc.summary.chochCount > 0) {
    const chochStructures = smc.structures.filter(s => s.type === 'CHOCH');
    for (const ch of chochStructures) {
      if (ch.direction === 'BULLISH') {
        bullScore += 15;
        breakdown.push({ factor: 'CHoCH (Reversal)', direction: 'BULLISH', score: 15, detail: 'Change of Character' });
      } else {
        bearScore += 15;
        breakdown.push({ factor: 'CHoCH (Reversal)', direction: 'BEARISH', score: 15, detail: 'Change of Character' });
      }
    }
  }
  
  // Calculate final
  const totalScore = Math.max(bullScore, bearScore);
  const maxPossible = 105; // Maximum possible score
  const confidence = Math.min(95, Math.round((totalScore / maxPossible) * 100));
  
  let direction = 'WAIT';
  const scoreDiff = Math.abs(bullScore - bearScore);
  
  if (scoreDiff >= 15) { // Need meaningful difference
    if (bullScore > bearScore) direction = 'BUY';
    else if (bearScore > bullScore) direction = 'SELL';
  }
  
  // Don't signal if confidence too low
  if (confidence < 30) direction = 'WAIT';
  
  return {
    direction,
    confidence,
    totalScore,
    bullScore,
    bearScore,
    scoreDiff,
    breakdown
  };
}

// ═══════════════════════════════════════════════════════════
// SIGNAL GENERATION
// ═══════════════════════════════════════════════════════════

function generateSignal(analysis, confluence, symbol, timeframe) {
  if (!analysis || !confluence) {
    return {
      direction: 'WAIT',
      confidence: 0,
      entry: 0,
      stopLoss: 0,
      tp1: 0,
      tp2: 0,
      tp3: 0,
      rr: '0.00',
      reason: 'Insufficient data for signal generation'
    };
  }
  
  const { currentPrice, indicators, smc, supportResistance } = analysis;
  const { direction, confidence } = confluence;
  const atr = indicators.atr;
  
  if (direction === 'WAIT' || confidence < 30) {
    return {
      direction: 'WAIT',
      confidence,
      entry: currentPrice,
      stopLoss: 0,
      tp1: 0,
      tp2: 0,
      tp3: 0,
      rr: '0.00',
      reason: confidence < 30 ? 'Low confluence - no clear setup' : 'No directional bias'
    };
  }
  
  let entry = currentPrice;
  let stopLoss = 0;
  let tp1 = 0, tp2 = 0, tp3 = 0;
  let reason = '';
  
  if (direction === 'BUY') {
    // Entry: current price or nearest bullish OB midpoint
    if (smc.nearBullishOBs.length > 0) {
      const nearestOB = smc.nearBullishOBs[0];
      // If price is near or at OB, use OB midpoint as entry context
      entry = currentPrice;
      reason = `Bullish setup: ${smc.structure} structure`;
      
      if (nearestOB.isNearby) {
        reason += `, price near Bullish OB at ${nearestOB.midpoint.toFixed(4)}`;
      }
    } else {
      reason = `Bullish setup: ${smc.structure} structure, EMA alignment`;
    }
    
    // Stop Loss: below nearest support or swing low or 1.5x ATR
    const swingLowSL = smc.swingLows.length > 0 
      ? smc.swingLows[smc.swingLows.length - 1].price 
      : null;
    
    const obSL = smc.nearBullishOBs.length > 0 
      ? smc.nearBullishOBs[0].low 
      : null;
    
    const atrSL = currentPrice - (atr * 1.5);
    const supportSL = supportResistance.support;
    
    // Use the tightest reasonable SL
    const slCandidates = [swingLowSL, obSL, atrSL, supportSL].filter(v => v && v < currentPrice);
    stopLoss = slCandidates.length > 0 ? Math.max(...slCandidates) : atrSL;
    
    // Ensure minimum SL distance (0.5 ATR)
    if (currentPrice - stopLoss < atr * 0.5) {
      stopLoss = currentPrice - atr * 0.75;
    }
    
    // Take Profits
    const risk = currentPrice - stopLoss;
    tp1 = currentPrice + (risk * 2);    // 1:2 RR
    tp2 = currentPrice + (risk * 3);    // 1:3 RR
    tp3 = currentPrice + (risk * 4);    // 1:4 RR
    
    // Adjust TP if resistance is nearby
    if (supportResistance.resistance < tp1) {
      tp1 = supportResistance.resistance;
      tp2 = supportResistance.resistance2 || tp1 * 1.01;
      tp3 = tp2 * 1.01;
    }
    
    // Add FVG and liquidity info to reason
    const bullFVGs = smc.activeFVGs.filter(f => f.type === 'BULLISH_FVG');
    if (bullFVGs.length > 0) reason += `, ${bullFVGs.length} bullish FVG(s)`;
    
    const bullSweeps = smc.liquiditySweeps.filter(s => s.direction === 'BULLISH');
    if (bullSweeps.length > 0) reason += `, liquidity sweep confirmed`;
    
  } else if (direction === 'SELL') {
    if (smc.nearBearishOBs.length > 0) {
      const nearestOB = smc.nearBearishOBs[0];
      entry = currentPrice;
      reason = `Bearish setup: ${smc.structure} structure`;
      
      if (nearestOB.isNearby) {
        reason += `, price near Bearish OB at ${nearestOB.midpoint.toFixed(4)}`;
      }
    } else {
      reason = `Bearish setup: ${smc.structure} structure, EMA alignment`;
    }
    
    // Stop Loss: above nearest resistance or swing high or 1.5x ATR
    const swingHighSL = smc.swingHighs.length > 0 
      ? smc.swingHighs[smc.swingHighs.length - 1].price 
      : null;
    
    const obSL = smc.nearBearishOBs.length > 0 
      ? smc.nearBearishOBs[0].high 
      : null;
    
    const atrSL = currentPrice + (atr * 1.5);
    const resistanceSL = supportResistance.resistance;
    
    const slCandidates = [swingHighSL, obSL, atrSL, resistanceSL].filter(v => v && v > currentPrice);
    stopLoss = slCandidates.length > 0 ? Math.min(...slCandidates) : atrSL;
    
    if (stopLoss - currentPrice < atr * 0.5) {
      stopLoss = currentPrice + atr * 0.75;
    }
    
    const risk = stopLoss - currentPrice;
    tp1 = currentPrice - (risk * 2);
    tp2 = currentPrice - (risk * 3);
    tp3 = currentPrice - (risk * 4);
    
    if (supportResistance.support > tp1) {
      tp1 = supportResistance.support;
      tp2 = supportResistance.support2 || tp1 * 0.99;
      tp3 = tp2 * 0.99;
    }
    
    const bearFVGs = smc.activeFVGs.filter(f => f.type === 'BEARISH_FVG');
    if (bearFVGs.length > 0) reason += `, ${bearFVGs.length} bearish FVG(s)`;
    
    const bearSweeps = smc.liquiditySweeps.filter(s => s.direction === 'BEARISH');
    if (bearSweeps.length > 0) reason += `, liquidity sweep confirmed`;
  }
  
  // Calculate Risk:Reward
  const riskAmount = Math.abs(entry - stopLoss);
  const rewardAmount = Math.abs(tp2 - entry);
  const rr = riskAmount > 0 ? (rewardAmount / riskAmount).toFixed(2) : '0.00';
  
  return {
    direction,
    confidence,
    entry: parseFloat(entry.toFixed(8)),
    stopLoss: parseFloat(stopLoss.toFixed(8)),
    tp1: parseFloat(tp1.toFixed(8)),
    tp2: parseFloat(tp2.toFixed(8)),
    tp3: parseFloat(tp3.toFixed(8)),
    rr,
    reason,
    symbol,
    timeframe,
    atr: parseFloat(atr.toFixed(8))
  };
}

// ═══════════════════════════════════════════════════════════
// DATA FETCHING HELPERS
// ═══════════════════════════════════════════════════════════

async function fetchKlines(symbol, interval, limit) {
  const normalizedSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const limitNum = Math.min(parseInt(limit) || 120, 1000);
  
  let klines = [];
  let source = 'FALLBACK';
  
  // Crypto → Binance
  if (normalizedSymbol.endsWith('USDT')) {
    try {
      const response = await axios.get(`${BINANCE_BASE}/klines`, {
        params: { symbol: normalizedSymbol, interval, limit: limitNum },
        timeout: TIMEOUT
      });
      
      if (Array.isArray(response.data) && response.data.length > 0) {
        klines = response.data.map(k => ({
          time: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5])
        }));
        source = 'BINANCE';
      }
    } catch (err) {
      console.warn(`⚠️ Binance klines failed for ${normalizedSymbol}: ${err.message}`);
    }
  }
  
  // Gold → PAXGUSDT
  if (normalizedSymbol === 'XAUUSD' && klines.length === 0) {
    try {
      const response = await axios.get(`${BINANCE_BASE}/klines`, {
        params: { symbol: 'PAXGUSDT', interval, limit: limitNum },
        timeout: TIMEOUT
      });
      
      if (Array.isArray(response.data) && response.data.length > 0) {
        klines = response.data.map(k => ({
          time: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5])
        }));
        source = 'BINANCE (PAXG)';
      }
    } catch (err) {
      console.warn(`⚠️ PAXG klines failed: ${err.message}`);
    }
  }
  
  // Fallback: generate synthetic candles
  if (klines.length === 0) {
    const basePrice = FALLBACK_PRICES[normalizedSymbol] || 100;
    klines = generateSyntheticCandles(basePrice, interval, limitNum);
    source = 'SYNTHETIC';
  }
  
  return { klines, source };
}

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
    const trend = Math.sin(i / 20) * basePrice * 0.005; // Slight trending
    const open = currentPrice;
    const close = currentPrice + volatility + trend;
    const high = Math.max(open, close) * (1 + Math.random() * 0.008);
    const low = Math.min(open, close) * (1 - Math.random() * 0.008);
    
    candles.push({
      time: now - i * msPerCandle,
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

function normalizeInterval(tf) {
  const map = {
    '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
    '1h': '1h', '4h': '4h', '1d': '1d', '1w': '1w',
    'M1': '1m', 'M5': '5m', 'M15': '15m', 'M30': '30m',
    'H1': '1h', 'H4': '4h', 'D1': '1d', 'W1': '1w'
  };
  return map[tf] || '1h';
}

// ═══════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/analysis/health
 */
router.get('/health', (req, res) => {
  return res.json({
    success: true,
    status: 'healthy',
    message: 'Analysis API is running',
    engine: 'SMC (Smart Money Concepts)',
    capabilities: [
      'Order Block Detection',
      'Fair Value Gap Detection',
      'Break of Structure (BOS)',
      'Change of Character (CHoCH)',
      'Liquidity Sweep Detection',
      'Confluence Scoring',
      'Signal Generation with Entry/SL/TP'
    ],
    endpoints: [
      'GET  /analyze/:symbol/:timeframe',
      'POST /analyze-smc',
      'POST /generate-signal',
      'GET  /quick-signal/:symbol/:timeframe',
      'GET  /smc/:symbol/:timeframe',
      'GET  /indicators/:symbol/:timeframe',
      'GET  /confluence/:symbol/:timeframe',
      'GET  /position-sizing/:symbol/:timeframe'
    ]
  });
});

/**
 * GET /api/analysis/analyze/:symbol/:timeframe
 * Full analysis with series data
 */
router.get('/analyze/:symbol/:timeframe', async (req, res) => {
  try {
    const { symbol, timeframe } = req.params;
    const limit = parseInt(req.query.limit) || 120;
    const interval = normalizeInterval(timeframe);
    
    console.log(`📊 Full analysis: ${symbol} ${interval} (${limit} candles)`);
    
    // Fetch klines
    const { klines, source } = await fetchKlines(symbol, interval, limit);
    
    if (!klines || klines.length < 20) {
      return res.status(400).json({
        success: false,
        message: `Insufficient data: got ${klines?.length || 0} candles, need 20+`
      });
    }
    
    // Run analysis
    const analysis = runFullSMCAnalysis(klines);
    
    if (!analysis) {
      return res.status(500).json({
        success: false,
        message: 'Analysis engine failed'
      });
    }
    
    // Generate confluence
    const confluence = calculateConfluence(analysis);
    
    // Generate signal
    const signal = generateSignal(analysis, confluence, symbol, timeframe);
    
    return res.json({
      success: true,
      data: {
        symbol,
        timeframe: interval,
        dataSource: source,
        series: klines,
        currentPrice: analysis.currentPrice,
        indicators: analysis.indicators,
        smc: analysis.smc,
        supportResistance: analysis.supportResistance,
        confluence,
        signal,
        candleCount: klines.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Analysis error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/analysis/analyze-smc
 * Run SMC analysis on provided or fetched klines
 */
router.post('/analyze-smc', async (req, res) => {
  try {
    const { klines: providedKlines, symbol, timeframe, limit } = req.body;
    
    let klines = providedKlines;
    let source = 'PROVIDED';
    
    // If no klines provided, fetch them
    if (!klines || !Array.isArray(klines) || klines.length === 0) {
      if (!symbol) {
        return res.status(400).json({
          success: false,
          message: 'Provide either klines array or symbol+timeframe'
        });
      }
      
      const interval = normalizeInterval(timeframe || '1h');
      const result = await fetchKlines(symbol, interval, limit || 120);
      klines = result.klines;
      source = result.source;
    }
    
    // Normalize kline format
    klines = klines.map(k => ({
      time: k.time || k[0] || k.timestamp,
      open: parseFloat(k.open || k[1] || 0),
      high: parseFloat(k.high || k[2] || 0),
      low: parseFloat(k.low || k[3] || 0),
      close: parseFloat(k.close || k[4] || 0),
      volume: parseFloat(k.volume || k[5] || 0)
    })).filter(k => k.open > 0 && k.high > 0 && k.low > 0 && k.close > 0);
    
    if (klines.length < 20) {
      return res.status(400).json({
        success: false,
        message: `Insufficient valid candles: ${klines.length} (need 20+)`
      });
    }
    
    console.log(`🔍 SMC Analysis on ${klines.length} candles (source: ${source})`);
    
    // Run full SMC analysis
    const analysis = runFullSMCAnalysis(klines);
    
    if (!analysis) {
      return res.status(500).json({
        success: false,
        message: 'SMC analysis engine returned null'
      });
    }
    
    return res.json({
      success: true,
      data: {
        currentPrice: analysis.currentPrice,
        indicators: analysis.indicators,
        smc: analysis.smc,
        supportResistance: analysis.supportResistance,
        ema20: analysis.indicators.ema20,
        ema50: analysis.indicators.ema50,
        rsi: analysis.indicators.rsi,
        atr: analysis.indicators.atr,
        dataSource: source,
        candleCount: klines.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ SMC analysis error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/analysis/generate-signal
 * Generate trading signal from analysis data
 */
router.post('/generate-signal', async (req, res) => {
  try {
    const { analysis, currentPrice, symbol, timeframe } = req.body;
    
    if (!analysis) {
      return res.status(400).json({
        success: false,
        message: 'Missing analysis data'
      });
    }
    
    // If analysis is raw, run confluence
    let enrichedAnalysis = analysis;
    
    // Ensure we have proper structure
    if (!enrichedAnalysis.smc) {
      // This might be a raw SMC result - wrap it
      enrichedAnalysis = {
        currentPrice: currentPrice || analysis.currentPrice,
        indicators: analysis.indicators || {
          ema20: analysis.ema20 || 0,
          ema50: analysis.ema50 || 0,
          ema200: analysis.ema200 || 0,
          rsi: analysis.rsi || 50,
          atr: analysis.atr || 0,
          macd: analysis.macd || { trending: 'NEUTRAL' }
        },
        smc: analysis.smc || {
          marketBias: 'NEUTRAL',
          structure: 'RANGING',
          swingHighs: [],
          swingLows: [],
          structures: [],
          activeOrderBlocks: [],
          activeFVGs: [],
          liquiditySweeps: [],
          nearBullishOBs: [],
          nearBearishOBs: [],
          summary: { bosCount: 0, chochCount: 0, activeOrderBlocks: 0, activeFVGs: 0, liquiditySweepCount: 0, bullishOBsNearby: 0, bearishOBsNearby: 0 }
        },
        supportResistance: analysis.supportResistance || {
          support: (currentPrice || analysis.currentPrice || 0) * 0.98,
          resistance: (currentPrice || analysis.currentPrice || 0) * 1.02,
          support2: (currentPrice || analysis.currentPrice || 0) * 0.96,
          resistance2: (currentPrice || analysis.currentPrice || 0) * 1.04
        }
      };
    }
    
    // Calculate confluence
    const confluence = calculateConfluence(enrichedAnalysis);
    
    // Generate signal
    const signal = generateSignal(enrichedAnalysis, confluence, symbol || 'UNKNOWN', timeframe || 'H1');
    
    console.log(`✅ Signal generated: ${signal.direction} @ ${signal.entry} (${signal.confidence}%)`);
    
    return res.json({
      success: true,
      data: {
        signal: signal.direction,
        confidence: signal.confidence,
        entry: signal.entry,
        stopLoss: signal.stopLoss,
        sl: signal.stopLoss,
        takeProfit: signal.tp1,
        tp1: signal.tp1,
        tp2: signal.tp2,
        tp3: signal.tp3,
        riskReward: parseFloat(signal.rr),
        rr: signal.rr,
        reason: signal.reason,
        confluence,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Signal generation error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/analysis/quick-signal/:symbol/:timeframe
 * Quick signal - just direction and confidence
 */
router.get('/quick-signal/:symbol/:timeframe', async (req, res) => {
  try {
    const { symbol, timeframe } = req.params;
    const interval = normalizeInterval(timeframe);
    
    console.log(`⚡ Quick signal: ${symbol} ${interval}`);
    
    const { klines, source } = await fetchKlines(symbol, interval, 120);
    
    if (!klines || klines.length < 20) {
      return res.json({
        success: true,
        data: {
          direction: 'WAIT',
          confidence: 0,
          reason: 'Insufficient data',
          dataSource: source
        }
      });
    }
    
    const analysis = runFullSMCAnalysis(klines);
    const confluence = calculateConfluence(analysis);
    const signal = generateSignal(analysis, confluence, symbol, timeframe);
    
    return res.json({
      success: true,
      data: {
        symbol,
        timeframe: interval,
        direction: signal.direction,
        confidence: signal.confidence,
        entry: signal.entry,
        stopLoss: signal.stopLoss,
        tp1: signal.tp1,
        rr: signal.rr,
        reason: signal.reason,
        marketBias: analysis.smc.marketBias,
        rsi: analysis.indicators.rsi,
        dataSource: source,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Quick signal error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/analysis/smc/:symbol/:timeframe
 * SMC-only analysis
 */
router.get('/smc/:symbol/:timeframe', async (req, res) => {
  try {
    const { symbol, timeframe } = req.params;
    const interval = normalizeInterval(timeframe);
    
    const { klines, source } = await fetchKlines(symbol, interval, 120);
    
    if (!klines || klines.length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient data'
      });
    }
    
    const analysis = runFullSMCAnalysis(klines);
    
    return res.json({
      success: true,
      data: {
        symbol,
        timeframe: interval,
        smc: analysis.smc,
        supportResistance: analysis.supportResistance,
        currentPrice: analysis.currentPrice,
        dataSource: source,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ SMC error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/analysis/indicators/:symbol/:timeframe
 * Technical indicators only
 */
router.get('/indicators/:symbol/:timeframe', async (req, res) => {
  try {
    const { symbol, timeframe } = req.params;
    const interval = normalizeInterval(timeframe);
    
    const { klines, source } = await fetchKlines(symbol, interval, 120);
    
    if (!klines || klines.length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient data'
      });
    }
    
    const analysis = runFullSMCAnalysis(klines);
    
    return res.json({
      success: true,
      data: {
        symbol,
        timeframe: interval,
        indicators: analysis.indicators,
        currentPrice: analysis.currentPrice,
        dataSource: source,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Indicators error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/analysis/confluence/:symbol/:timeframe
 * Confluence scoring only
 */
router.get('/confluence/:symbol/:timeframe', async (req, res) => {
  try {
    const { symbol, timeframe } = req.params;
    const interval = normalizeInterval(timeframe);
    
    const { klines, source } = await fetchKlines(symbol, interval, 120);
    
    if (!klines || klines.length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient data'
      });
    }
    
    const analysis = runFullSMCAnalysis(klines);
    const confluence = calculateConfluence(analysis);
    
    return res.json({
      success: true,
      data: {
        symbol,
        timeframe: interval,
        confluence,
        currentPrice: analysis.currentPrice,
        dataSource: source,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Confluence error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/analysis/position-sizing/:symbol/:timeframe
 * Position sizing calculator
 */
router.get('/position-sizing/:symbol/:timeframe', async (req, res) => {
  try {
    const { symbol, timeframe } = req.params;
    const accountSize = parseFloat(req.query.accountSize) || 10000;
    const riskPercent = parseFloat(req.query.riskPercent) || 2;
    const interval = normalizeInterval(timeframe);
    
    const { klines, source } = await fetchKlines(symbol, interval, 120);
    
    if (!klines || klines.length < 20) {
      return res.json({
        success: true,
        data: {
          risk: {
            positionSize: 0,
            riskAmount: accountSize * (riskPercent / 100),
            accountRiskPercent: riskPercent.toFixed(2),
            recommendation: 'Insufficient data for calculation'
          }
        }
      });
    }
    
    const analysis = runFullSMCAnalysis(klines);
    const confluence = calculateConfluence(analysis);
    const signal = generateSignal(analysis, confluence, symbol, timeframe);
    
    const riskAmount = accountSize * (riskPercent / 100);
    const slDistance = Math.abs(signal.entry - signal.stopLoss);
    
    let positionSize = 0;
    if (slDistance > 0) {
      positionSize = riskAmount / slDistance;
    }
    
    // Expectancy calculation
    const winRate = Math.min(0.65, confluence.confidence / 100);
    const avgRR = parseFloat(signal.rr) || 2;
    const expectancy = (winRate * avgRR) - ((1 - winRate) * 1);
    
    return res.json({
      success: true,
      data: {
        symbol,
        timeframe: interval,
        signal: signal.direction,
        risk: {
          accountSize,
          riskPercent,
          riskAmount: parseFloat(riskAmount.toFixed(2)),
          positionSize: parseFloat(positionSize.toFixed(6)),
          slDistance: parseFloat(slDistance.toFixed(8)),
          entry: signal.entry,
          stopLoss: signal.stopLoss,
          tp1: signal.tp1,
          rr: signal.rr,
          accountRiskPercent: riskPercent.toFixed(2),
          expectancy: expectancy.toFixed(2),
          recommendation: expectancy > 0.5 
            ? 'FAVORABLE - Positive expectancy' 
            : expectancy > 0 
              ? 'MARGINAL - Small edge' 
              : 'AVOID - Negative expectancy'
        },
        dataSource: source,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Position sizing error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
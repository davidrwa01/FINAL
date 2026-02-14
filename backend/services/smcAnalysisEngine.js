/**
 * services/smcAnalysisEngine.js
 * 
 * Smart Money Concepts (SMC) analysis engine.
 * Identifies market structure, BOS/CHoCH, Order Blocks, Fair Value Gaps,
 * and generates trading signals with Entry/SL/TP based on price action.
 */

// ─── CANDLE HELPERS ─────────────────────────────────────────

/**
 * Determine candle body direction and size
 */
function analyzeCandleBody(candle) {
  const { open, close, high, low } = candle;
  const bodyRange = Math.abs(close - open);
  const totalRange = high - low;
  const bodyPercent = totalRange > 0 ? (bodyRange / totalRange) * 100 : 50;
  
  return {
    isUp: close > open,
    isDown: close < open,
    isDoji: bodyRange < totalRange * 0.1, // < 10% of range
    bodySize: bodyRange,
    bodyPercent,
    totalRange,
    upperWick: high - Math.max(open, close),
    lowerWick: Math.min(open, close) - low
  };
}

/**
 * Identify if candle is an expansion or contraction
 */
function identifyCandleExpansion(current, previous) {
  if (!previous) return null;
  
  const currBody = analyzeCandleBody(current);
  const prevBody = analyzeCandleBody(previous);
  
  const bodyExpansion = currBody.bodySize > prevBody.bodySize * 1.2;
  const rangeExpansion = currBody.totalRange > prevBody.totalRange * 1.2;
  
  return {
    isExpansion: bodyExpansion || rangeExpansion,
    isContraction: !bodyExpansion && !rangeExpansion,
    bodyRatio: prevBody.bodySize > 0 ? currBody.bodySize / prevBody.bodySize : 1
  };
}

// ─── STRUCTURE ANALYSIS ────────────────────────────────────

/**
 * Detect market structure: Bullish, Bearish, or Ranging
 * Bullish: Higher Lows (HL) + Higher Highs (HH)
 * Bearish: Lower Highs (LH) + Lower Lows (LL)
 * Ranging: No clear direction
 */
function analyzeMarketStructure(klines) {
  if (klines.length < 5) return { structure: 'INSUFFICIENT_DATA' };
  
  const recentKlines = klines.slice(-20); // Analyze last 20 candles
  const swings = findSwings(recentKlines);
  
  if (swings.length < 4) {
    return { structure: 'RANGING', confidence: 0.3 };
  }
  
  // Check last 3 swings for structure
  const lastSwings = swings.slice(-3);
  let bullishCount = 0;
  let bearishCount = 0;
  
  for (let i = 1; i < lastSwings.length; i++) {
    const prev = lastSwings[i - 1];
    const curr = lastSwings[i];
    
    if (prev.type === 'high' && curr.type === 'low') {
      // High followed by low = bearish structure
      if (curr.price < prev.price) bearishCount++;
      else if (curr.price > prev.price) bullishCount++;
    } else if (prev.type === 'low' && curr.type === 'high') {
      // Low followed by high = bullish structure
      if (curr.price > prev.price) bullishCount++;
      else if (curr.price < prev.price) bearishCount++;
    }
  }
  
  let structure = 'RANGING';
  let confidence = 0.5;
  
  if (bullishCount > bearishCount) {
    structure = 'BULLISH';
    confidence = Math.min(0.9, 0.5 + (bullishCount * 0.15));
  } else if (bearishCount > bullishCount) {
    structure = 'BEARISH';
    confidence = Math.min(0.9, 0.5 + (bearishCount * 0.15));
  }
  
  return {
    structure,
    confidence,
    lastSwings,
    bullishSignals: bullishCount,
    bearishSignals: bearishCount
  };
}

/**
 * Find local swings (highs and lows)
 */
function findSwings(klines, lookback = 3) {
  const swings = [];
  
  for (let i = lookback; i < klines.length - lookback; i++) {
    const current = klines[i];
    let isHigh = true;
    let isLow = true;
    
    // Check if local high
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && klines[j].high > current.high) {
        isHigh = false;
        break;
      }
    }
    
    // Check if local low
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && klines[j].low < current.low) {
        isLow = false;
        break;
      }
    }
    
    if (isHigh) {
      swings.push({
        type: 'high',
        price: current.high,
        time: current.time,
        index: i
      });
    }
    
    if (isLow) {
      swings.push({
        type: 'low',
        price: current.low,
        time: current.time,
        index: i
      });
    }
  }
  
  return swings;
}

// ─── BOS / CHoCH DETECTION ─────────────────────────────────

/**
 * Detect Break of Structure (BOS) and Change of Character (CHoCH)
 * BOS: Price breaks previous high/low
 * CHoCH: Structure changes direction (bullish → bearish or vice versa)
 */
function detectBosChoCh(klines) {
  if (klines.length < 10) return [];
  
  const events = [];
  const swings = findSwings(klines, 2);
  
  if (swings.length < 4) return events;
  
  // Get last 4 swings to detect BOS/CHoCH
  const recent = swings.slice(-4);
  const lastCandle = klines[klines.length - 1];
  
  // Check for CHoCH (structure reversal)
  if (recent.length >= 3) {
    const prevType = recent[recent.length - 2].type;
    const currType = recent[recent.length - 1].type;
    
    if (prevType !== currType) {
      // Structure changed from high to low or vice versa
      events.push({
        type: 'CHoCH',
        direction: prevType === 'high' ? 'BEARISH' : 'BULLISH',
        price: recent[recent.length - 1].price,
        time: recent[recent.length - 1].time,
        strength: 'CONFIRMED'
      });
    }
  }
  
  // Check for BOS (break of structure)
  if (recent.length >= 2) {
    const structureLevel = recent[recent.length - 2].price;
    const bosDirection = recent[recent.length - 2].type;
    
    const lastHigh = lastCandle.high;
    const lastLow = lastCandle.low;
    
    if (bosDirection === 'high' && lastLow < structureLevel) {
      // Broke below previous high = bearish BOS
      events.push({
        type: 'BOS',
        direction: 'BEARISH',
        level: structureLevel,
        currentPrice: lastCandle.close,
        time: lastCandle.time,
        strength: 'PENDING'
      });
    } else if (bosDirection === 'low' && lastHigh > structureLevel) {
      // Broke above previous low = bullish BOS
      events.push({
        type: 'BOS',
        direction: 'BULLISH',
        level: structureLevel,
        currentPrice: lastCandle.close,
        time: lastCandle.time,
        strength: 'PENDING'
      });
    }
  }
  
  return events;
}

// ─── ORDER BLOCK DETECTION ──────────────────────────────────

/**
 * Identify Order Blocks (last expansion candles before structure reversal)
 * Bullish OB: Last down candle(s) before price reverses up
 * Bearish OB: Last up candle(s) before price reverses down
 */
function detectOrderBlocks(klines) {
  if (klines.length < 8) return [];
  
  const orderBlocks = [];
  const recentKlines = klines.slice(-15);
  
  for (let i = 1; i < recentKlines.length - 2; i++) {
    const prev = recentKlines[i - 1];
    const curr = recentKlines[i];
    const next = recentKlines[i + 1];
    const nextNext = recentKlines[i + 2];
    
    const prevBody = analyzeCandleBody(prev);
    const currBody = analyzeCandleBody(curr);
    const nextBody = analyzeCandleBody(next);
    
    // Bearish OB: Strong down candle followed by reversal up
    if (prevBody.isDown && currBody.isUp && 
        prevBody.bodyPercent > 60 && 
        curr.close > prev.high) {
      orderBlocks.push({
        type: 'BEARISH',
        high: Math.max(prev.high, prev.open, prev.close),
        low: Math.min(prev.low, prev.open, prev.close),
        time: prev.time,
        strength: nextBody.isUp ? 'STRONG' : 'WEAK',
        description: 'Last bearish candle before bullish reversal'
      });
    }
    
    // Bullish OB: Strong up candle followed by reversal down
    if (prevBody.isUp && currBody.isDown && 
        prevBody.bodyPercent > 60 && 
        curr.close < prev.low) {
      orderBlocks.push({
        type: 'BULLISH',
        high: Math.max(prev.high, prev.open, prev.close),
        low: Math.min(prev.low, prev.open, prev.close),
        time: prev.time,
        strength: nextBody.isDown ? 'STRONG' : 'WEAK',
        description: 'Last bullish candle before bearish reversal'
      });
    }
  }
  
  return orderBlocks.slice(-2); // Return last 2 OBs
}

// ─── FAIR VALUE GAP DETECTION ───────────────────────────────

/**
 * Detect Fair Value Gaps (FVG) / Imbalances
 * Gap between candle wicks (not filled)
 */
function detectFairValueGaps(klines) {
  if (klines.length < 3) return [];
  
  const gaps = [];
  
  for (let i = 2; i < klines.length; i++) {
    const prev2 = klines[i - 2];
    const prev1 = klines[i - 1];
    const curr = klines[i];
    
    // Bullish FVG: Gap between candle low and next candle high (price jumped up)
    const bullishGapTop = prev1.low;
    const bullishGapBottom = prev2.high;
    
    if (bullishGapBottom < bullishGapTop && curr.low >= bullishGapBottom) {
      gaps.push({
        type: 'BULLISH',
        high: bullishGapTop,
        low: bullishGapBottom,
        size: bullishGapTop - bullishGapBottom,
        timeGapped: prev1.time,
        filled: curr.low < bullishGapBottom,
        description: 'Bullish imbalance (gap up)'
      });
    }
    
    // Bearish FVG: Gap between candle high and next candle low (price jumped down)
    const bearishGapBottom = prev1.high;
    const bearishGapTop = prev2.low;
    
    if (bearishGapTop > bearishGapBottom && curr.high <= bearishGapTop) {
      gaps.push({
        type: 'BEARISH',
        high: bearishGapTop,
        low: bearishGapBottom,
        size: bearishGapTop - bearishGapBottom,
        timeGapped: prev1.time,
        filled: curr.high > bearishGapTop,
        description: 'Bearish imbalance (gap down)'
      });
    }
  }
  
  return gaps.filter(g => !g.filled).slice(-3); // Return unfilled gaps
}

// ─── LIQUIDITY ANALYSIS ────────────────────────────────────

/**
 * Analyze liquidity zones (swing highs/lows, premium/discount)
 */
function analyzeLiquidity(klines) {
  if (klines.length < 5) return {};
  
  const recentKlines = klines.slice(-30);
  const swings = findSwings(recentKlines, 2);
  
  if (swings.length < 2) return {};
  
  const highSwings = swings.filter(s => s.type === 'high').map(s => s.price);
  const lowSwings = swings.filter(s => s.type === 'low').map(s => s.price);
  
  const sessionHigh = Math.max(...recentKlines.map(k => k.high));
  const sessionLow = Math.min(...recentKlines.map(k => k.low));
  const midPoint = (sessionHigh + sessionLow) / 2;
  
  const lastCandle = klines[klines.length - 1];
  const lastClose = lastCandle.close;
  
  return {
    swingHighs: highSwings.slice(-2),
    swingLows: lowSwings.slice(-2),
    sessionHigh,
    sessionLow,
    midPoint,
    premiumZone: { start: midPoint, end: sessionHigh },
    discountZone: { start: sessionLow, end: midPoint },
    currentZone: lastClose > midPoint ? 'PREMIUM' : 'DISCOUNT',
    liquiditySweep: (highSwings.length > 0 && lastCandle.high > Math.max(...highSwings)) ||
                     (lowSwings.length > 0 && lastCandle.low < Math.min(...lowSwings))
  };
}

// ─── SIGNAL GENERATION ──────────────────────────────────────

/**
 * Generate BUY/SELL/WAIT signals with Entry, SL, TP
 */
function generateSignal(klines, instrument) {
  if (klines.length < 10) {
    return {
      signal: 'WAIT',
      reason: 'Insufficient candle data',
      confidence: 0
    };
  }
  
  const structure = analyzeMarketStructure(klines);
  const bosChoCh = detectBosChoCh(klines);
  const orderBlocks = detectOrderBlocks(klines);
  const fvgs = detectFairValueGaps(klines);
  const liquidity = analyzeLiquidity(klines);
  
  const lastCandle = klines[klines.length - 1];
  const lastPrice = lastCandle.close;
  const lastHigh = lastCandle.high;
  const lastLow = lastCandle.low;
  
  let signal = 'WAIT';
  let confidence = 0;
  let entry = lastPrice;
  let stopLoss = lastPrice;
  let takeProfit = lastPrice;
  let riskReward = 1;
  let reasoning = [];
  
  // ── BULLISH SIGNAL LOGIC ──
  if (structure.structure === 'BULLISH' && structure.confidence > 0.6) {
    reasoning.push(`Bullish structure detected (confidence: ${(structure.confidence * 100).toFixed(0)}%)`);
    confidence += 0.3;
    
    // Check for bullish confirmation
    if (liquidity.currentZone === 'DISCOUNT') {
      reasoning.push('Price in discount zone (below midpoint)');
      confidence += 0.2;
    }
    
    // Check for Order Block retest
    const bullishOB = orderBlocks.find(ob => ob.type === 'BULLISH');
    if (bullishOB && lastPrice > bullishOB.low && lastPrice < bullishOB.high) {
      reasoning.push('Price testing bullish Order Block');
      confidence += 0.2;
      stopLoss = bullishOB.low - (bullishOB.high - bullishOB.low) * 0.2; // Below OB
    } else if (liquidity.swingLows && liquidity.swingLows.length > 0) {
      stopLoss = Math.min(...liquidity.swingLows) * 0.99; // Below swing low with buffer
      reasoning.push('Stop Loss at recent swing low');
    }
    
    // Check for FVG fill
    const bullishFVG = fvgs.find(f => f.type === 'BULLISH' && !f.filled);
    if (bullishFVG) {
      takeProfit = bullishFVG.high;
      reasoning.push(`Target: Bullish FVG at ${bullishFVG.high.toFixed(4)}`);
    } else if (liquidity.swingHighs && liquidity.swingHighs.length > 0) {
      takeProfit = Math.max(...liquidity.swingHighs) * 1.01;
      reasoning.push('Target: Swing high');
    }
    
    // Check for BOS confirmation
    const bullishBOS = bosChoCh.find(e => e.direction === 'BULLISH');
    if (bullishBOS) {
      reasoning.push('BOS/CHoCH confirms bullish direction');
      confidence += 0.15;
    }
    
    if (confidence >= 0.7) {
      signal = 'BUY';
      entry = lastPrice;
    }
  }
  
  // ── BEARISH SIGNAL LOGIC ──
  else if (structure.structure === 'BEARISH' && structure.confidence > 0.6) {
    reasoning.push(`Bearish structure detected (confidence: ${(structure.confidence * 100).toFixed(0)}%)`);
    confidence += 0.3;
    
    // Check for bearish confirmation
    if (liquidity.currentZone === 'PREMIUM') {
      reasoning.push('Price in premium zone (above midpoint)');
      confidence += 0.2;
    }
    
    // Check for Order Block retest
    const bearishOB = orderBlocks.find(ob => ob.type === 'BEARISH');
    if (bearishOB && lastPrice < bearishOB.high && lastPrice > bearishOB.low) {
      reasoning.push('Price testing bearish Order Block');
      confidence += 0.2;
      stopLoss = bearishOB.high + (bearishOB.high - bearishOB.low) * 0.2; // Above OB
    } else if (liquidity.swingHighs && liquidity.swingHighs.length > 0) {
      stopLoss = Math.max(...liquidity.swingHighs) * 1.01; // Above swing high with buffer
      reasoning.push('Stop Loss at recent swing high');
    }
    
    // Check for FVG fill
    const bearishFVG = fvgs.find(f => f.type === 'BEARISH' && !f.filled);
    if (bearishFVG) {
      takeProfit = bearishFVG.low;
      reasoning.push(`Target: Bearish FVG at ${bearishFVG.low.toFixed(4)}`);
    } else if (liquidity.swingLows && liquidity.swingLows.length > 0) {
      takeProfit = Math.min(...liquidity.swingLows) * 0.99;
      reasoning.push('Target: Swing low');
    }
    
    // Check for BOS confirmation
    const bearishBOS = bosChoCh.find(e => e.direction === 'BEARISH');
    if (bearishBOS) {
      reasoning.push('BOS/CHoCH confirms bearish direction');
      confidence += 0.15;
    }
    
    if (confidence >= 0.7) {
      signal = 'SELL';
      entry = lastPrice;
    }
  }
  
  // Calculate Risk:Reward
  if (signal === 'BUY') {
    const risk = Math.abs(entry - stopLoss);
    const reward = Math.abs(takeProfit - entry);
    riskReward = risk > 0 ? reward / risk : 0;
  } else if (signal === 'SELL') {
    const risk = Math.abs(stopLoss - entry);
    const reward = Math.abs(entry - takeProfit);
    riskReward = risk > 0 ? reward / risk : 0;
  }
  
  // Enforce minimum R:R of 1:1.5
  if (signal !== 'WAIT' && riskReward < 1.5) {
    if (signal === 'BUY') {
      const risk = Math.abs(entry - stopLoss);
      takeProfit = entry + risk * 1.5;
    } else if (signal === 'SELL') {
      const risk = Math.abs(stopLoss - entry);
      takeProfit = entry - risk * 1.5;
    }
    reasoning.push('Adjusted TP to meet minimum 1:1.5 R:R');
  }
  
  return {
    signal,
    confidence: Math.min(1, confidence),
    entry: parseFloat(entry.toFixed(6)),
    stopLoss: parseFloat(stopLoss.toFixed(6)),
    takeProfit: parseFloat(takeProfit.toFixed(6)),
    riskReward: parseFloat(riskReward.toFixed(2)),
    reasoning,
    analysis: {
      structure,
      bosChoCh,
      orderBlocks,
      fairValueGaps: fvgs,
      liquidity,
      lastPrice,
      timestamp: lastCandle.time
    }
  };
}

module.exports = {
  analyzeMarketStructure,
  detectBosChoCh,
  detectOrderBlocks,
  detectFairValueGaps,
  analyzeLiquidity,
  generateSignal,
  findSwings,
  analyzeCandleBody
};

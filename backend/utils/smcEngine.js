/**
 * utils/smcEngine.js
 * 
 * Smart Money Concepts (SMC) Analysis Engine
 * 
 * Implements:
 *  - Technical Indicators (EMA, RSI, ATR, MACD, Bollinger)
 *  - Market Structure (Swing Highs/Lows, BOS, CHoCH)
 *  - Order Blocks (demand/supply zones)
 *  - Fair Value Gaps (imbalances)
 *  - Confluence Scoring
 *  - Signal Generation with Entry/SL/TP/R:R
 */

// ═══════════════════════════════════════════════════════════
// INDICATOR CALCULATIONS
// ═══════════════════════════════════════════════════════════

function calcEMA(data, period) {
  if (!data || data.length === 0) return 0;
  if (data.length < period) {
    return data.reduce((a, b) => a + b, 0) / data.length;
  }
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * k + ema;
  }
  return ema;
}

function calcEMAArray(data, period) {
  if (!data || data.length === 0) return [];
  const k = 2 / (period + 1);
  const result = [];
  let ema = data.slice(0, Math.min(period, data.length)).reduce((a, b) => a + b, 0) / Math.min(period, data.length);
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      ema = data.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1);
    } else {
      ema = (data[i] - ema) * k + ema;
    }
    result.push(ema);
  }
  return result;
}

function calcRSI(closes, period = 14) {
  if (!closes || closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function calcATR(highs, lows, closes, period = 14) {
  if (!highs || highs.length < 2) return 0;
  const trs = [];
  for (let i = 1; i < highs.length; i++) {
    trs.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ));
  }
  if (trs.length === 0) return 0;
  if (trs.length < period) return trs.reduce((a, b) => a + b, 0) / trs.length;
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return atr;
}

function calcMACD(closes, fast = 12, slow = 26, sig = 9) {
  if (!closes || closes.length < slow + sig) {
    return { line: 0, signal: 0, histogram: 0, trending: 'NEUTRAL' };
  }
  const emaFast = calcEMAArray(closes, fast);
  const emaSlow = calcEMAArray(closes, slow);
  const macdLine = emaFast.map((v, i) => v - emaSlow[i]);
  const signalLine = calcEMAArray(macdLine.slice(slow - 1), sig);

  const line = macdLine[macdLine.length - 1] || 0;
  const signal = signalLine[signalLine.length - 1] || 0;
  const histogram = line - signal;
  const prevHistogram = macdLine.length > 1 && signalLine.length > 1
    ? macdLine[macdLine.length - 2] - signalLine[signalLine.length - 2]
    : 0;

  let trending = 'NEUTRAL';
  if (histogram > 0 && histogram > prevHistogram) trending = 'BULLISH';
  else if (histogram > 0 && histogram <= prevHistogram) trending = 'BULLISH_WEAKENING';
  else if (histogram < 0 && histogram < prevHistogram) trending = 'BEARISH';
  else if (histogram < 0 && histogram >= prevHistogram) trending = 'BEARISH_WEAKENING';

  return { line, signal, histogram, trending };
}

// ═══════════════════════════════════════════════════════════
// MARKET STRUCTURE
// ═══════════════════════════════════════════════════════════

function detectSwingPoints(highs, lows, lookback = 3) {
  const swingHighs = [];
  const swingLows = [];

  for (let i = lookback; i < highs.length - lookback; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (highs[i] <= highs[i - j] || highs[i] <= highs[i + j]) isHigh = false;
      if (lows[i] >= lows[i - j] || lows[i] >= lows[i + j]) isLow = false;
    }
    if (isHigh) swingHighs.push({ index: i, price: highs[i] });
    if (isLow) swingLows.push({ index: i, price: lows[i] });
  }

  return { swingHighs, swingLows };
}

function analyzeStructure(highs, lows, closes) {
  const { swingHighs, swingLows } = detectSwingPoints(highs, lows, 3);

  const bos = [];   // Break of Structure
  const choch = []; // Change of Character

  // Determine trend from last few swings
  let currentTrend = 'NEUTRAL';

  if (swingHighs.length >= 2 && swingLows.length >= 2) {
    const lastSH = swingHighs[swingHighs.length - 1];
    const prevSH = swingHighs[swingHighs.length - 2];
    const lastSL = swingLows[swingLows.length - 1];
    const prevSL = swingLows[swingLows.length - 2];

    const higherHighs = lastSH.price > prevSH.price;
    const higherLows = lastSL.price > prevSL.price;
    const lowerHighs = lastSH.price < prevSH.price;
    const lowerLows = lastSL.price < prevSL.price;

    if (higherHighs && higherLows) currentTrend = 'BULLISH';
    else if (lowerHighs && lowerLows) currentTrend = 'BEARISH';

    // BOS detection: price breaks a swing level in the trend direction
    const currentPrice = closes[closes.length - 1];

    // Check for bullish BOS (price breaks above previous swing high)
    for (let i = 1; i < swingHighs.length; i++) {
      const sh = swingHighs[i];
      const prevSh = swingHighs[i - 1];
      if (sh.price > prevSh.price) {
        bos.push({
          type: 'BULLISH_BOS',
          level: prevSh.price,
          index: sh.index,
          description: `Break above ${prevSh.price.toFixed(4)}`
        });
      }
    }

    // Check for bearish BOS
    for (let i = 1; i < swingLows.length; i++) {
      const sl = swingLows[i];
      const prevSl = swingLows[i - 1];
      if (sl.price < prevSl.price) {
        bos.push({
          type: 'BEARISH_BOS',
          level: prevSl.price,
          index: sl.index,
          description: `Break below ${prevSl.price.toFixed(4)}`
        });
      }
    }

    // CHoCH detection: trend reversal signals
    if (currentTrend === 'BULLISH' && lowerHighs) {
      choch.push({
        type: 'BEARISH_CHOCH',
        level: prevSH.price,
        index: lastSH.index,
        description: 'Lower high formed in uptrend — potential reversal'
      });
    }
    if (currentTrend === 'BEARISH' && higherLows) {
      choch.push({
        type: 'BULLISH_CHOCH',
        level: prevSL.price,
        index: lastSL.index,
        description: 'Higher low formed in downtrend — potential reversal'
      });
    }
  }

  return {
    trend: currentTrend,
    swingHighs,
    swingLows,
    bos: bos.slice(-5),     // Keep last 5
    choch: choch.slice(-3), // Keep last 3
    lastSwingHigh: swingHighs[swingHighs.length - 1] || null,
    lastSwingLow: swingLows[swingLows.length - 1] || null
  };
}

// ═══════════════════════════════════════════════════════════
// ORDER BLOCKS
// ═══════════════════════════════════════════════════════════

function findOrderBlocks(klines, structure) {
  const orderBlocks = [];
  if (!klines || klines.length < 10) return orderBlocks;

  const atr = calcATR(
    klines.map(k => k.high),
    klines.map(k => k.low),
    klines.map(k => k.close)
  );

  const currentPrice = klines[klines.length - 1].close;
  const impulsiveThreshold = atr * 1.5;

  for (let i = 2; i < klines.length - 1; i++) {
    const prev = klines[i - 1];
    const curr = klines[i];
    const next = klines[i + 1];

    // Bullish OB: bearish candle followed by strong bullish move
    const prevBearish = prev.close < prev.open;
    const nextBullish = next.close > next.open;
    const bullishImpulse = next.close - next.open > impulsiveThreshold;

    if (prevBearish && nextBullish && bullishImpulse) {
      const obTop = Math.max(prev.open, prev.close);
      const obBottom = prev.low;
      const active = currentPrice >= obBottom && currentPrice <= obTop * 1.02;
      const nearby = Math.abs(currentPrice - obTop) <= atr * 2;

      orderBlocks.push({
        type: 'BULLISH',
        top: obTop,
        bottom: obBottom,
        index: i - 1,
        time: prev.time,
        active: active || nearby,
        mitigated: currentPrice < obBottom,
        distance: currentPrice - obTop
      });
    }

    // Bearish OB: bullish candle followed by strong bearish move
    const prevBullish = prev.close > prev.open;
    const nextBearishCandle = next.close < next.open;
    const bearishImpulse = next.open - next.close > impulsiveThreshold;

    if (prevBullish && nextBearishCandle && bearishImpulse) {
      const obTop = prev.high;
      const obBottom = Math.min(prev.open, prev.close);
      const active = currentPrice >= obBottom * 0.98 && currentPrice <= obTop;
      const nearby = Math.abs(currentPrice - obBottom) <= atr * 2;

      orderBlocks.push({
        type: 'BEARISH',
        top: obTop,
        bottom: obBottom,
        index: i - 1,
        time: prev.time,
        active: active || nearby,
        mitigated: currentPrice > obTop,
        distance: obBottom - currentPrice
      });
    }
  }

  // Sort by recency (most recent first), keep most relevant
  return orderBlocks
    .sort((a, b) => b.index - a.index)
    .slice(0, 10);
}

// ═══════════════════════════════════════════════════════════
// FAIR VALUE GAPS (FVG)
// ═══════════════════════════════════════════════════════════

function findFVGs(klines) {
  const fvgs = [];
  if (!klines || klines.length < 3) return fvgs;

  const currentPrice = klines[klines.length - 1].close;

  for (let i = 1; i < klines.length - 1; i++) {
    const candle1 = klines[i - 1];
    const candle2 = klines[i];
    const candle3 = klines[i + 1];

    // Bullish FVG: candle3.low > candle1.high (gap up)
    if (candle3.low > candle1.high) {
      const gapTop = candle3.low;
      const gapBottom = candle1.high;
      const filled = currentPrice <= gapBottom;
      const active = !filled && currentPrice <= gapTop * 1.01;

      fvgs.push({
        type: 'BULLISH',
        top: gapTop,
        bottom: gapBottom,
        size: gapTop - gapBottom,
        index: i,
        time: candle2.time,
        active,
        filled,
        distance: currentPrice - gapTop
      });
    }

    // Bearish FVG: candle3.high < candle1.low (gap down)
    if (candle3.high < candle1.low) {
      const gapTop = candle1.low;
      const gapBottom = candle3.high;
      const filled = currentPrice >= gapTop;
      const active = !filled && currentPrice >= gapBottom * 0.99;

      fvgs.push({
        type: 'BEARISH',
        top: gapTop,
        bottom: gapBottom,
        size: gapTop - gapBottom,
        index: i,
        time: candle2.time,
        active,
        filled,
        distance: gapBottom - currentPrice
      });
    }
  }

  return fvgs
    .sort((a, b) => b.index - a.index)
    .slice(0, 10);
}

// ═══════════════════════════════════════════════════════════
// KEY LEVELS (SUPPORT / RESISTANCE)
// ═══════════════════════════════════════════════════════════

function findKeyLevels(highs, lows, closes, structure) {
  const recentHighs = highs.slice(-30);
  const recentLows = lows.slice(-30);

  const resistance = structure.lastSwingHigh
    ? structure.lastSwingHigh.price
    : Math.max(...recentHighs);

  const support = structure.lastSwingLow
    ? structure.lastSwingLow.price
    : Math.min(...recentLows);

  const currentPrice = closes[closes.length - 1];

  // Find nearby swing levels as S/R
  const allLevels = [];

  if (structure.swingHighs) {
    structure.swingHighs.slice(-5).forEach(sh => {
      allLevels.push({ price: sh.price, type: 'RESISTANCE', source: 'SWING_HIGH' });
    });
  }
  if (structure.swingLows) {
    structure.swingLows.slice(-5).forEach(sl => {
      allLevels.push({ price: sl.price, type: 'SUPPORT', source: 'SWING_LOW' });
    });
  }

  return {
    support,
    resistance,
    levels: allLevels,
    range: resistance - support,
    midpoint: (resistance + support) / 2,
    pricePosition: resistance !== support
      ? ((currentPrice - support) / (resistance - support) * 100).toFixed(1)
      : '50.0'
  };
}

// ═══════════════════════════════════════════════════════════
// MARKET BIAS
// ═══════════════════════════════════════════════════════════

function determineMarketBias(indicators, structure, currentPrice) {
  let bullishPoints = 0;
  let bearishPoints = 0;

  // EMA alignment
  if (indicators.ema20 > indicators.ema50) bullishPoints += 2;
  else bearishPoints += 2;

  if (indicators.ema50 > indicators.ema200) bullishPoints += 1;
  else bearishPoints += 1;

  // Price vs EMAs
  if (currentPrice > indicators.ema20) bullishPoints += 1;
  else bearishPoints += 1;

  if (currentPrice > indicators.ema200) bullishPoints += 1;
  else bearishPoints += 1;

  // Structure
  if (structure.trend === 'BULLISH') bullishPoints += 3;
  else if (structure.trend === 'BEARISH') bearishPoints += 3;

  // RSI
  if (indicators.rsi > 55) bullishPoints += 1;
  else if (indicators.rsi < 45) bearishPoints += 1;

  // MACD
  if (indicators.macd.histogram > 0) bullishPoints += 1;
  else if (indicators.macd.histogram < 0) bearishPoints += 1;

  // CHoCH (reversal signals)
  if (structure.choch.length > 0) {
    const lastChoch = structure.choch[structure.choch.length - 1];
    if (lastChoch.type === 'BULLISH_CHOCH') bullishPoints += 2;
    if (lastChoch.type === 'BEARISH_CHOCH') bearishPoints += 2;
  }

  const total = bullishPoints + bearishPoints;
  const direction = bullishPoints > bearishPoints ? 'BULLISH'
    : bearishPoints > bullishPoints ? 'BEARISH'
    : 'NEUTRAL';

  return {
    direction,
    strength: total > 0 ? Math.round(Math.abs(bullishPoints - bearishPoints) / total * 100) : 0,
    bullishPoints,
    bearishPoints,
    structureType: structure.trend === 'BULLISH' ? 'UPTREND'
      : structure.trend === 'BEARISH' ? 'DOWNTREND'
      : 'RANGING'
  };
}

// ═══════════════════════════════════════════════════════════
// CONFLUENCE SCORING
// ═══════════════════════════════════════════════════════════

function calculateConfluence(indicators, structure, orderBlocks, fvgs, levels, currentPrice, bias) {
  let score = 0;
  let maxScore = 0;
  const breakdown = [];

  const direction = bias.direction;

  // 1. Trend alignment via EMA (max 20)
  maxScore += 20;
  if (direction === 'BULLISH' && indicators.ema20 > indicators.ema50) {
    score += 15;
    breakdown.push({ factor: 'EMA Alignment', score: 15, max: 20, detail: 'EMA20 > EMA50 (bullish)' });
    if (currentPrice > indicators.ema200) {
      score += 5;
      breakdown[breakdown.length - 1].score = 20;
    }
  } else if (direction === 'BEARISH' && indicators.ema20 < indicators.ema50) {
    score += 15;
    breakdown.push({ factor: 'EMA Alignment', score: 15, max: 20, detail: 'EMA20 < EMA50 (bearish)' });
    if (currentPrice < indicators.ema200) {
      score += 5;
      breakdown[breakdown.length - 1].score = 20;
    }
  } else {
    breakdown.push({ factor: 'EMA Alignment', score: 0, max: 20, detail: 'EMAs not aligned' });
  }

  // 2. Market structure (max 25)
  maxScore += 25;
  if (structure.trend === 'BULLISH' && direction === 'BULLISH') {
    score += 20;
    if (structure.bos.some(b => b.type === 'BULLISH_BOS')) score += 5;
    breakdown.push({ factor: 'Market Structure', score: Math.min(score, 25), max: 25, detail: 'Bullish structure with BOS' });
  } else if (structure.trend === 'BEARISH' && direction === 'BEARISH') {
    score += 20;
    if (structure.bos.some(b => b.type === 'BEARISH_BOS')) score += 5;
    breakdown.push({ factor: 'Market Structure', score: Math.min(score, 25), max: 25, detail: 'Bearish structure with BOS' });
  } else if (structure.choch.length > 0) {
    const lastChoch = structure.choch[structure.choch.length - 1];
    if ((lastChoch.type === 'BULLISH_CHOCH' && direction === 'BULLISH') ||
        (lastChoch.type === 'BEARISH_CHOCH' && direction === 'BEARISH')) {
      score += 15;
      breakdown.push({ factor: 'Market Structure', score: 15, max: 25, detail: 'CHoCH detected' });
    } else {
      breakdown.push({ factor: 'Market Structure', score: 0, max: 25, detail: 'Structure unclear' });
    }
  } else {
    breakdown.push({ factor: 'Market Structure', score: 0, max: 25, detail: 'No clear structure' });
  }

  // 3. Order Block proximity (max 20)
  maxScore += 20;
  const relevantOBs = orderBlocks.filter(ob => {
    if (direction === 'BULLISH') return ob.type === 'BULLISH' && ob.active;
    if (direction === 'BEARISH') return ob.type === 'BEARISH' && ob.active;
    return false;
  });

  if (relevantOBs.length > 0) {
    const nearestOB = relevantOBs[0];
    const atr = indicators.atr || 1;
    const distanceInATR = Math.abs(nearestOB.distance) / atr;

    if (distanceInATR < 0.5) {
      score += 20;
      breakdown.push({ factor: 'Order Block', score: 20, max: 20, detail: 'Price AT order block' });
    } else if (distanceInATR < 1.5) {
      score += 15;
      breakdown.push({ factor: 'Order Block', score: 15, max: 20, detail: 'Price NEAR order block' });
    } else {
      score += 5;
      breakdown.push({ factor: 'Order Block', score: 5, max: 20, detail: 'Order block found but distant' });
    }
  } else {
    breakdown.push({ factor: 'Order Block', score: 0, max: 20, detail: 'No relevant order block' });
  }

  // 4. FVG support (max 15)
  maxScore += 15;
  const relevantFVGs = fvgs.filter(fvg => {
    if (direction === 'BULLISH') return fvg.type === 'BULLISH' && fvg.active;
    if (direction === 'BEARISH') return fvg.type === 'BEARISH' && fvg.active;
    return false;
  });

  if (relevantFVGs.length > 0) {
    score += 15;
    breakdown.push({ factor: 'Fair Value Gap', score: 15, max: 15, detail: `${relevantFVGs.length} active FVG(s)` });
  } else if (fvgs.some(f => (direction === 'BULLISH' ? f.type === 'BULLISH' : f.type === 'BEARISH'))) {
    score += 5;
    breakdown.push({ factor: 'Fair Value Gap', score: 5, max: 15, detail: 'FVG exists but not active' });
  } else {
    breakdown.push({ factor: 'Fair Value Gap', score: 0, max: 15, detail: 'No supporting FVG' });
  }

  // 5. RSI confirmation (max 10)
  maxScore += 10;
  if (direction === 'BULLISH' && indicators.rsi > 40 && indicators.rsi < 70) {
    score += 10;
    breakdown.push({ factor: 'RSI', score: 10, max: 10, detail: `RSI ${indicators.rsi.toFixed(0)} — bullish confirmation` });
  } else if (direction === 'BEARISH' && indicators.rsi > 30 && indicators.rsi < 60) {
    score += 10;
    breakdown.push({ factor: 'RSI', score: 10, max: 10, detail: `RSI ${indicators.rsi.toFixed(0)} — bearish confirmation` });
  } else if (indicators.rsi > 30 && indicators.rsi < 70) {
    score += 5;
    breakdown.push({ factor: 'RSI', score: 5, max: 10, detail: `RSI ${indicators.rsi.toFixed(0)} — neutral zone` });
  } else {
    breakdown.push({ factor: 'RSI', score: 0, max: 10, detail: `RSI ${indicators.rsi.toFixed(0)} — extreme` });
  }

  // 6. MACD confirmation (max 10)
  maxScore += 10;
  if ((direction === 'BULLISH' && indicators.macd.histogram > 0) ||
      (direction === 'BEARISH' && indicators.macd.histogram < 0)) {
    score += 10;
    breakdown.push({ factor: 'MACD', score: 10, max: 10, detail: `MACD ${indicators.macd.trending}` });
  } else {
    breakdown.push({ factor: 'MACD', score: 0, max: 10, detail: `MACD opposing direction` });
  }

  const confidence = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return {
    direction: confidence >= 50 ? direction : 'WAIT',
    confidence,
    totalScore: score,
    maxScore,
    breakdown
  };
}

// ═══════════════════════════════════════════════════════════
// SIGNAL GENERATION
// ═══════════════════════════════════════════════════════════

function generateSignal(currentPrice, indicators, structure, orderBlocks, fvgs, levels, bias, confluence) {
  // No trade if confluence too low
  if (confluence.confidence < 40 || confluence.direction === 'WAIT') {
    return {
      direction: 'WAIT',
      confidence: confluence.confidence,
      entry: currentPrice,
      stopLoss: 0,
      tp1: 0,
      tp2: 0,
      tp3: 0,
      rr: '0.00',
      reason: `Low confluence (${confluence.confidence}%) — no clear edge`
    };
  }

  const direction = confluence.direction;
  const atr = indicators.atr || currentPrice * 0.01;

  let entry = currentPrice;
  let stopLoss, tp1, tp2, tp3;
  let reason = '';

  if (direction === 'BULLISH' || direction === 'BUY') {
    // Find SL level
    const bullishOBs = orderBlocks.filter(ob => ob.type === 'BULLISH' && !ob.mitigated);
    const nearestOB = bullishOBs[0];

    if (nearestOB) {
      stopLoss = nearestOB.bottom - atr * 0.3;
      reason = 'Buy from bullish order block';
    } else if (structure.lastSwingLow) {
      stopLoss = structure.lastSwingLow.price - atr * 0.3;
      reason = 'Buy from swing low support';
    } else {
      stopLoss = currentPrice - atr * 1.5;
      reason = 'Buy — bullish bias with ATR stop';
    }

    const risk = Math.abs(entry - stopLoss);
    tp1 = entry + risk * 1.5;
    tp2 = entry + risk * 2.5;
    tp3 = entry + risk * 3.5;

    // Use resistance as TP if closer
    if (levels.resistance && levels.resistance > entry && levels.resistance < tp2) {
      tp1 = levels.resistance;
    }

    return {
      direction: 'BUY',
      confidence: confluence.confidence,
      entry: parseFloat(entry.toFixed(8)),
      stopLoss: parseFloat(stopLoss.toFixed(8)),
      tp1: parseFloat(tp1.toFixed(8)),
      tp2: parseFloat(tp2.toFixed(8)),
      tp3: parseFloat(tp3.toFixed(8)),
      rr: risk > 0 ? (Math.abs(tp2 - entry) / risk).toFixed(2) : '0.00',
      reason: reason + ` | Structure: ${structure.trend} | RSI: ${indicators.rsi.toFixed(0)}`
    };
  }

  if (direction === 'BEARISH' || direction === 'SELL') {
    const bearishOBs = orderBlocks.filter(ob => ob.type === 'BEARISH' && !ob.mitigated);
    const nearestOB = bearishOBs[0];

    if (nearestOB) {
      stopLoss = nearestOB.top + atr * 0.3;
      reason = 'Sell from bearish order block';
    } else if (structure.lastSwingHigh) {
      stopLoss = structure.lastSwingHigh.price + atr * 0.3;
      reason = 'Sell from swing high resistance';
    } else {
      stopLoss = currentPrice + atr * 1.5;
      reason = 'Sell — bearish bias with ATR stop';
    }

    const risk = Math.abs(stopLoss - entry);
    tp1 = entry - risk * 1.5;
    tp2 = entry - risk * 2.5;
    tp3 = entry - risk * 3.5;

    if (levels.support && levels.support < entry && levels.support > tp2) {
      tp1 = levels.support;
    }

    return {
      direction: 'SELL',
      confidence: confluence.confidence,
      entry: parseFloat(entry.toFixed(8)),
      stopLoss: parseFloat(stopLoss.toFixed(8)),
      tp1: parseFloat(tp1.toFixed(8)),
      tp2: parseFloat(tp2.toFixed(8)),
      tp3: parseFloat(tp3.toFixed(8)),
      rr: risk > 0 ? (Math.abs(entry - tp2) / risk).toFixed(2) : '0.00',
      reason: reason + ` | Structure: ${structure.trend} | RSI: ${indicators.rsi.toFixed(0)}`
    };
  }

  return {
    direction: 'WAIT',
    confidence: 0,
    entry: currentPrice,
    stopLoss: 0, tp1: 0, tp2: 0, tp3: 0,
    rr: '0.00',
    reason: 'No clear directional bias'
  };
}

// ═══════════════════════════════════════════════════════════
// MAIN ANALYSIS FUNCTION
// ═══════════════════════════════════════════════════════════

function fullAnalysis(klines) {
  if (!klines || klines.length < 20) {
    return {
      success: false,
      error: 'Insufficient data (need 20+ candles)',
      signal: {
        direction: 'WAIT', confidence: 0, entry: 0,
        stopLoss: 0, tp1: 0, tp2: 0, tp3: 0, rr: '0.00',
        reason: 'Not enough data'
      }
    };
  }

  try {
    const opens   = klines.map(k => parseFloat(k.open));
    const highs   = klines.map(k => parseFloat(k.high));
    const lows    = klines.map(k => parseFloat(k.low));
    const closes  = klines.map(k => parseFloat(k.close));
    const volumes = klines.map(k => parseFloat(k.volume || 0));
    const currentPrice = closes[closes.length - 1];

    // 1. Indicators
    const ema20  = calcEMA(closes, 20);
    const ema50  = calcEMA(closes, 50);
    const ema200 = calcEMA(closes, 200);
    const rsi    = calcRSI(closes, 14);
    const atr    = calcATR(highs, lows, closes, 14);
    const macd   = calcMACD(closes, 12, 26, 9);

    const indicators = {
      currentPrice, ema20, ema50, ema200, rsi, atr, macd
    };

    // 2. Structure
    const structure = analyzeStructure(highs, lows, closes);

    // 3. Order Blocks
    const orderBlocks = findOrderBlocks(klines, structure);

    // 4. FVGs
    const fvgs = findFVGs(klines);

    // 5. Key Levels
    const keyLevels = findKeyLevels(highs, lows, closes, structure);
    indicators.support    = keyLevels.support;
    indicators.resistance = keyLevels.resistance;

    // 6. Market Bias
    const bias = determineMarketBias(indicators, structure, currentPrice);

    // 7. Confluence
    const confluence = calculateConfluence(
      indicators, structure, orderBlocks, fvgs, keyLevels, currentPrice, bias
    );

    // 8. Signal
    const signal = generateSignal(
      currentPrice, indicators, structure, orderBlocks, fvgs, keyLevels, bias, confluence
    );

    return {
      success: true,
      currentPrice,
      indicators,
      structure: {
        trend: structure.trend,
        swingHighs: structure.swingHighs.slice(-5),
        swingLows: structure.swingLows.slice(-5),
        lastSwingHigh: structure.lastSwingHigh,
        lastSwingLow: structure.lastSwingLow,
        bos: structure.bos,
        choch: structure.choch
      },
      smc: {
        marketBias: bias.direction,
        biasStrength: bias.strength,
        structure: bias.structureType,
        orderBlocks: orderBlocks.filter(ob => ob.active),
        fvgs: fvgs.filter(fvg => fvg.active),
        allOrderBlocks: orderBlocks,
        allFVGs: fvgs,
        summary: {
          bosCount: structure.bos.length,
          chochCount: structure.choch.length,
          activeOrderBlocks: orderBlocks.filter(ob => ob.active).length,
          activeFVGs: fvgs.filter(fvg => fvg.active).length
        }
      },
      levels: keyLevels,
      confluence,
      signal,
      bias
    };
  } catch (err) {
    console.error('SMC Engine error:', err);
    return {
      success: false,
      error: err.message,
      signal: {
        direction: 'WAIT', confidence: 0, entry: 0,
        stopLoss: 0, tp1: 0, tp2: 0, tp3: 0, rr: '0.00',
        reason: 'Analysis error: ' + err.message
      }
    };
  }
}

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  fullAnalysis,
  calcEMA,
  calcRSI,
  calcATR,
  calcMACD,
  detectSwingPoints,
  analyzeStructure,
  findOrderBlocks,
  findFVGs,
  findKeyLevels,
  determineMarketBias,
  calculateConfluence,
  generateSignal
};
// EXPONENTIAL MOVING AVERAGE
export function calculateEMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1];
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  return ema;
}

// SIMPLE MOVING AVERAGE
export function calculateSMA(closes, period) {
  if (!closes || closes.length < period) return 0;
  return closes.slice(-period).reduce((sum, close) => sum + close, 0) / period;
}

// RELATIVE STRENGTH INDEX
export function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  return rsi;
}

// AVERAGE TRUE RANGE
export function calculateATR(highs, lows, closes, period = 14) {
  if (!highs || !lows || !closes || highs.length < period) return 0;
  const trueRanges = [];
  for (let i = 1; i < closes.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trueRanges.push(tr);
  }
  if (trueRanges.length === 0) return 0;
  return trueRanges.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;
}

// MACD (Moving Average Convergence Divergence)
export function calculateMACD(closes) {
  if (!closes || closes.length < 26) return { line: 0, signal: 0, histogram: 0 };
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const line = ema12 - ema26;
  
  const macdValues = [];
  for (let i = 0; i < closes.length; i++) {
    const e12 = calculateEMA(closes.slice(0, i + 1), 12);
    const e26 = calculateEMA(closes.slice(0, i + 1), 26);
    macdValues.push(e12 - e26);
  }
  const signal = calculateEMA(macdValues, 9);
  return {
    line,
    signal,
    histogram: line - signal
  };
}

// BOLLINGER BANDS
export function calculateBollingerBands(closes, period = 20, stdDev = 2) {
  if (!closes || closes.length < period) return { upper: 0, middle: 0, lower: 0 };
  const middle = calculateSMA(closes, period);
  const squaredDiffs = closes.slice(-period).map(c => Math.pow(c - middle, 2));
  const variance = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / period;
  const std = Math.sqrt(variance);
  return {
    upper: middle + (std * stdDev),
    middle,
    lower: middle - (std * stdDev)
  };
}

// DETECT SWING HIGHS AND LOWS
export function detectSwings(highs, lows, period = 5) {
  const swingHighs = [];
  const swingLows = [];
  for (let i = period; i < highs.length - period; i++) {
    let isSwingHigh = true;
    let isSwingLow = true;
    for (let j = -period; j <= period; j++) {
      if (j === 0) continue;
      if (highs[i + j] >= highs[i]) isSwingHigh = false;
      if (lows[i + j] <= lows[i]) isSwingLow = false;
    }
    if (isSwingHigh) swingHighs.push({ index: i, value: highs[i] });
    if (isSwingLow) swingLows.push({ index: i, value: lows[i] });
  }
  return { swingHighs, swingLows };
}

// FORMAT PRICE WITH CORRECT DECIMALS
export function formatPrice(price, decimals) {
  return price.toFixed(decimals);
}

// GET DECIMAL PLACES FOR SYMBOL
export function getDecimals(price) {
  if (!price || typeof price !== 'number') {
    // Fallback for different instrument types
    if (price > 100) return 2;
    if (price > 1) return 4;
    return 5;
  }
  const str = price.toString();
  if (!str.includes('.')) return 0;
  return str.split('.')[1].length;
}

// CALCULATE SUPPORT AND RESISTANCE LEVELS
export function calculateSR(highs, lows, period = 20) {
  const recentHighs = highs.slice(-period);
  const recentLows = lows.slice(-period);
  return {
    resistance: Math.max(...recentHighs),
    support: Math.min(...recentLows),
    midpoint: (Math.max(...recentHighs) + Math.min(...recentLows)) / 2
  };
}

// FIBONACCI RETRACEMENT LEVELS
export function calculateFibonacci(high, low) {
  const diff = high - low;
  return {
    level0: high,
    level236: high - (diff * 0.236),
    level382: high - (diff * 0.382),
    level500: high - (diff * 0.5),
    level618: high - (diff * 0.618),
    level786: high - (diff * 0.786),
    level100: low
  };
}

// CALCULATE PIPS
export function calculatePips(entry, exit, symbol) {
  const pips = Math.abs(exit - entry) * (symbol.includes('JPY') ? 100 : 10000);
  return pips.toFixed(1);
}

// CALCULATE RISK REWARD RATIO
export function calculateRiskReward(entry, sl, tp) {
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  return risk > 0 ? (reward / risk).toFixed(2) : 0;
}

// STOCHASTIC OSCILLATOR
export function calculateStochastic(closes, highs, lows, period = 14) {
  if (closes.length < period) return { k: 50, d: 50 };
  const lowest = Math.min(...lows.slice(-period));
  const highest = Math.max(...highs.slice(-period));
  const k = ((closes[closes.length - 1] - lowest) / (highest - lowest)) * 100;
  const d = k; // Simplified - normally would be 3-period SMA of K
  return { k, d };
}

// IDENTIFY MARKET TREND
export function identifyTrend(ema20, ema50, ema200) {
  if (ema20 > ema50 && ema50 > ema200) return 'STRONG_UPTREND';
  if (ema20 > ema50) return 'UPTREND';
  if (ema20 < ema50 && ema50 < ema200) return 'STRONG_DOWNTREND';
  if (ema20 < ema50) return 'DOWNTREND';
  return 'RANGING';
}

/**
 * indicators-complete.js
 * All technical-analysis helpers used by TradingDashboard.
 * 
 * FIX: getDecimals now guards against undefined/null price so
 *      SignalDisplay never crashes when signal.entry is missing.
 */

// ─── EMA ────────────────────────────────────────────────────
export function calculateEMA(data, period) {
  if (!Array.isArray(data) || data.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = data[0];
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}

// ─── SMA ────────────────────────────────────────────────────
export function calculateSMA(data, period) {
  if (!Array.isArray(data) || data.length < period) return 0;
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// ─── RSI ────────────────────────────────────────────────────
export function calculateRSI(data, period = 14) {
  if (!Array.isArray(data) || data.length < period + 1) return 50;

  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// ─── ATR ────────────────────────────────────────────────────
export function calculateATR(klines, period = 14) {
  if (!Array.isArray(klines) || klines.length < period + 1) return 0;

  const trs = [];
  for (let i = 1; i < klines.length; i++) {
    const prevClose = klines[i - 1].close;
    const high = klines[i].high;
    const low = klines[i].low;
    trs.push(
      Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose))
    );
  }

  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return atr;
}

// ─── MACD ───────────────────────────────────────────────────
export function calculateMACD(closes, fast = 12, slow = 26, signal = 9) {
  if (!Array.isArray(closes) || closes.length < slow + signal + 5) return null;

  const emaSeries = (data, period) => {
    const k = 2 / (period + 1);
    let ema = data[0];
    return data.map((v, i) => {
      ema = i === 0 ? v : v * k + ema * (1 - k);
      return ema;
    });
  };

  const emaFast = emaSeries(closes, fast);
  const emaSlow = emaSeries(closes, slow);
  const macdLine = emaFast.map((v, i) => v - emaSlow[i]);
  const signalLine = emaSeries(macdLine, signal);

  return {
    macd: macdLine[macdLine.length - 1],
    signal: signalLine[signalLine.length - 1],
    hist: macdLine[macdLine.length - 1] - signalLine[signalLine.length - 1]
  };
}

// ─── SWING DETECTION ────────────────────────────────────────
export function detectSwings(klines, lookback = 2) {
  if (!Array.isArray(klines) || klines.length < lookback * 2 + 1) {
    return { highs: [], lows: [], all: [] };
  }

  const swings = { highs: [], lows: [], all: [] };

  for (let i = lookback; i < klines.length - lookback; i++) {
    const h = klines[i].high;
    const l = klines[i].low;
    let isHigh = true;
    let isLow = true;

    for (let j = 1; j <= lookback; j++) {
      if (klines[i - j].high >= h || klines[i + j].high >= h) isHigh = false;
      if (klines[i - j].low <= l || klines[i + j].low <= l) isLow = false;
    }

    if (isHigh) {
      const s = { i, price: h, time: klines[i].time, type: 'HIGH' };
      swings.highs.push(s);
      swings.all.push(s);
    }
    if (isLow) {
      const s = { i, price: l, time: klines[i].time, type: 'LOW' };
      swings.lows.push(s);
      swings.all.push(s);
    }
  }

  swings.all.sort((a, b) => a.i - b.i);
  return swings;
}

// ─── FORMAT PRICE ───────────────────────────────────────────
export function formatPrice(price) {
  if (price == null || isNaN(price)) return '0.00';
  if (price >= 1000)
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

// ─── GET DECIMALS  ──────────────────────────────────────────
// ROOT CAUSE FIX: previously did price.toString() without null-check → crash
export function getDecimals(price) {
  if (price == null || isNaN(Number(price))) return 2; // safe default
  const num = Number(price);
  if (num >= 1000) return 2;
  if (num >= 1)    return 4;
  return 5;
}
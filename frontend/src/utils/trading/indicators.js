/**
 * Calculate EMA (Exponential Moving Average)
 * EXACT COPY from your original code
 */
export function calculateEMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1];

    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < prices.length; i++) {
        ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
}

/**
 * Calculate RSI (Relative Strength Index)
 * EXACT COPY from your original code
 */
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

/**
 * Calculate ATR (Average True Range)
 * EXACT COPY from your original code
 */
export function calculateATR(klines, period = 14) {
    if (!klines || klines.length < period + 1) return null;
    const trs = [];
    for (let i = 1; i < klines.length; i++) {
        const prevClose = klines[i - 1].close;
        const high = klines[i].high;
        const low = klines[i].low;
        const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
        trs.push(tr);
    }
    // Wilder smoothing
    let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < trs.length; i++) {
        atr = (atr * (period - 1) + trs[i]) / period;
    }
    return atr;
}

/**
 * Calculate MACD
 * EXACT COPY from your original code
 */
export function calculateMACD(closes, fast = 12, slow = 26, signal = 9) {
    if (!closes || closes.length < slow + signal + 5) return null;
    const emaFastSeries = emaSeries(closes, fast);
    const emaSlowSeries = emaSeries(closes, slow);
    const macdLine = emaFastSeries.map((v, i) => v - emaSlowSeries[i]);
    const signalLine = emaSeries(macdLine, signal);
    const hist = macdLine[macdLine.length - 1] - signalLine[signalLine.length - 1];
    return {
        macd: macdLine[macdLine.length - 1],
        signal: signalLine[signalLine.length - 1],
        hist
    };
}

function emaSeries(data, period) {
    const k = 2 / (period + 1);
    let ema = data[0];
    const out = [ema];
    for (let i = 1; i < data.length; i++) {
        ema = data[i] * k + ema * (1 - k);
        out.push(ema);
    }
    return out;
}

// Export all your other indicator functions...

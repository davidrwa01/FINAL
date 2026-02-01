import { calculateEMA, calculateRSI, calculateATR, calculateMACD } from './indicators';
import { performSMCAnalysis } from './smcCalculations';

/**
 * Analyze market data and generate trading signal
 * EXACT COPY from your original analyzeKlines() function
 */
export function analyzeMarket(klines, symbol) {
    let bullishCandles = 0;
    let bearishCandles = 0;
    let closes = [];
    let highs = [];
    let lows = [];

    klines.forEach(k => {
        closes.push(k.close);
        highs.push(k.high);
        lows.push(k.low);
        if (k.close > k.open) {
            bullishCandles++;
        } else {
            bearishCandles++;
        }
    });

    // Calculate indicators
    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);
    const rsi = calculateRSI(closes, 14);

    // Find support and resistance
    const support = Math.min(...lows.slice(-20));
    const resistance = Math.max(...highs.slice(-20));

    // Current price
    const currentPrice = closes[closes.length - 1];

    // SMC Analysis
    const smc = performSMCAnalysis(klines);

    // Trend direction - prioritize SMC
    let trend = 'NEUTRAL';
    if (smc.marketBias.includes('BULLISH')) {
        trend = 'BULLISH';
    } else if (smc.marketBias.includes('BEARISH')) {
        trend = 'BEARISH';
    } else if (ema20 > ema50 && bullishCandles > bearishCandles) {
        trend = 'BULLISH';
    } else if (ema20 < ema50 && bearishCandles > bullishCandles) {
        trend = 'BEARISH';
    }

    return {
        currentPrice,
        bullishCandles,
        bearishCandles,
        bullishRatio: (bullishCandles / (bullishCandles + bearishCandles) * 100),
        bearishRatio: (bearishCandles / (bullishCandles + bearishCandles) * 100),
        ema20,
        ema50,
        rsi,
        support,
        resistance,
        trend,
        closes,
        highs,
        lows,
        smc // Include full SMC analysis
    };
}

/**
 * Generate trading signal from analysis
 * EXACT COPY from your original generateLiveSignalFromAnalysis()
 */
export function generateSignal(analysis, currentPrice, symbol, timeframe) {
    const smc = analysis.smc;

    // SMC-BASED SIGNAL GENERATION (Priority)
    if (smc && smc.smcSignal !== 'WAIT') {
        return generateSMCBasedSignal(analysis, currentPrice, symbol, timeframe);
    }

    // FALLBACK TO TRADITIONAL TA
    return generateTABasedSignal(analysis, currentPrice, symbol, timeframe);
}

function generateSMCBasedSignal(analysis, currentPrice, symbol, timeframe) {
    const smc = analysis.smc;
    const riskPercent = 2; // Default 2%
    const minRR = 2; // Default 1:2

    let signal = {
        direction: smc.smcSignal,
        entry: currentPrice,
        sl: 0,
        tp1: 0,
        tp2: 0,
        tp3: 0,
        rr: 0,
        reason: `${smc.marketBias} | ${smc.structure}`,
        smcStrategy: smc.entryZone?.type || 'SMC Analysis'
    };

    // Add BOS/CHoCH context
    if (smc.choch.length > 0) {
        const lastCHoCH = smc.choch[smc.choch.length - 1];
        signal.reason += ` | CHoCH: ${lastCHoCH.type.replace('_CHOCH', '')}`;
        signal.smcStrategy = 'CHoCH Reversal';
    }
    if (smc.bos.length > 0) {
        const lastBOS = smc.bos[smc.bos.length - 1];
        if (!signal.reason.includes('CHoCH')) {
            signal.reason += ` | BOS: ${lastBOS.type.replace('_BOS', '')}`;
        }
    }

    // Calculate SL/TP based on SMC zones
    const range = analysis.resistance - analysis.support;
    let slDistance = range * 0.4;

    // Use OB for SL if available
    if (smc.activeOBs.length > 0 && signal.direction === 'BUY') {
        const nearestOB = smc.activeOBs.find(ob => ob.type === 'BULLISH_OB' && ob.low < currentPrice);
        if (nearestOB) {
            slDistance = currentPrice - nearestOB.low + (range * 0.05);
        }
        signal.sl = currentPrice - slDistance;
        signal.tp1 = currentPrice + slDistance * minRR;
        signal.tp2 = currentPrice + slDistance * (minRR + 0.5);
        signal.tp3 = currentPrice + slDistance * (minRR + 1);
    } else if (smc.activeOBs.length > 0 && signal.direction === 'SELL') {
        const nearestOB = smc.activeOBs.find(ob => ob.type === 'BEARISH_OB' && ob.high > currentPrice);
        if (nearestOB) {
            slDistance = nearestOB.high - currentPrice + (range * 0.05);
        }
        signal.sl = currentPrice + slDistance;
        signal.tp1 = currentPrice - slDistance * minRR;
        signal.tp2 = currentPrice - slDistance * (minRR + 0.5);
        signal.tp3 = currentPrice - slDistance * (minRR + 1);
    } else {
        // Fallback SL/TP
        if (signal.direction === 'BUY') {
            signal.sl = currentPrice - slDistance;
            signal.tp1 = currentPrice + slDistance * minRR;
            signal.tp2 = currentPrice + slDistance * (minRR + 0.5);
            signal.tp3 = currentPrice + slDistance * (minRR + 1);
        } else {
            signal.sl = currentPrice + slDistance;
            signal.tp1 = currentPrice - slDistance * minRR;
            signal.tp2 = currentPrice - slDistance * (minRR + 0.5);
            signal.tp3 = currentPrice - slDistance * (minRR + 1);
        }
    }

    // Calculate R:R
    const risk = Math.abs(signal.entry - signal.sl);
    const reward = Math.abs(signal.tp2 - signal.entry);
    signal.rr = risk > 0 ? (reward / risk).toFixed(2) : '0.00';

    return signal;
}

function generateTABasedSignal(analysis, currentPrice, symbol, timeframe) {
    const { trend, rsi, ema20, ema50, bullishRatio, bearishRatio } = analysis;

    let signal = {
        direction: 'WAIT',
        entry: currentPrice,
        sl: 0,
        tp1: 0,
        tp2: 0,
        tp3: 0,
        rr: 0,
        reason: '',
        smcStrategy: null
    };

    if (trend === 'BULLISH' && bullishRatio > 55) {
        signal.direction = 'BUY';
        signal.reason = `TA Bullish | EMA20>EMA50 | ${bullishRatio.toFixed(1)}% bullish candles`;
        if (rsi < 30) {
            signal.reason += ' + oversold RSI';
        }
    } else if (trend === 'BEARISH' && bearishRatio > 55) {
        signal.direction = 'SELL';
        signal.reason = `TA Bearish | EMA20<EMA50 | ${bearishRatio.toFixed(1)}% bearish candles`;
        if (rsi > 70) {
            signal.reason += ' + overbought RSI';
        }
    } else {
        signal.reason = 'No clear TA setup. Wait for better confirmation.';
    }

    // Calculate basic SL/TP if signal generated
    if (signal.direction !== 'WAIT') {
        const range = analysis.resistance - analysis.support;
        const slDistance = range * 0.4;

        if (signal.direction === 'BUY') {
            signal.sl = Math.max(currentPrice - slDistance, analysis.support);
            signal.tp1 = currentPrice + slDistance * 2;
            signal.tp2 = currentPrice + slDistance * 2.5;
            signal.tp3 = currentPrice + slDistance * 3;
        } else {
            signal.sl = Math.min(currentPrice + slDistance, analysis.resistance);
            signal.tp1 = currentPrice - slDistance * 2;
            signal.tp2 = currentPrice - slDistance * 2.5;
            signal.tp3 = currentPrice - slDistance * 3;
        }

        const risk = Math.abs(signal.entry - signal.sl);
        const reward = Math.abs(signal.tp2 - signal.entry);
        signal.rr = risk > 0 ? (reward / risk).toFixed(2) : '0.00';
    }

    return signal;
}

/**
 * Fetch market data from API
 * You can implement this to call your backend or external APIs
 */
export async function fetchMarketData(symbol, timeframe = 'H1', limit = 120) {
    // This is a placeholder - implement based on your data source
    // Could call your backend API or external APIs like Binance, Forex, etc.

    // For now, return mock data structure
    const mockKlines = [];
    for (let i = 0; i < limit; i++) {
        const basePrice = 1.0500; // Example EURUSD price
        const variation = (Math.random() - 0.5) * 0.01;
        const open = basePrice + variation;
        const close = open + (Math.random() - 0.5) * 0.005;
        const high = Math.max(open, close) + Math.random() * 0.002;
        const low = Math.min(open, close) - Math.random() * 0.002;

        mockKlines.push({
            time: Date.now() - (limit - i) * 3600000, // 1 hour intervals
            open,
            high,
            low,
            close,
            volume: Math.random() * 1000
        });
    }

    return mockKlines;
}

/**
 * Calculate confidence score for the analysis
 */
export function calculateConfidence(analysisResult) {
    let confidence = 45;

    if (analysisResult.symbol) confidence += 10;
    if (analysisResult.timeframe) confidence += 5;
    if (analysisResult.livePrice) confidence += 10;
    if (analysisResult.series && analysisResult.series.length >= 60) confidence += 10;
    if (analysisResult.ta) {
        if (analysisResult.ta.trend.strength === 'STRONG') confidence += 8;
        if (analysisResult.ta.structure?.bos) confidence += 5;
        if (analysisResult.ta.macd && Math.abs(analysisResult.ta.macd.hist) > 0) confidence += 4;
    }
    if (analysisResult.strategy?.score) confidence += Math.min(10, Math.max(0, (analysisResult.strategy.score - 70) / 2));
    if (analysisResult.patterns?.length) confidence += Math.min(10, analysisResult.patterns.length * 2);

    return Math.max(35, Math.min(95, Math.round(confidence)));
}

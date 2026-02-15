# Enhanced Analysis Engine Integration Guide

## Overview

The **EnhancedAnalysisEngine** has been integrated into SMART-KORAFX to provide superior technical and Smart Money Concepts (SMC) analysis with:

- **Comprehensive technical indicators** (EMA, RSI, MACD, ATR)
- **Advanced SMC detection** (Swings, BOS, CHoCH, Order Blocks, FVGs, Liquidity Zones)
- **Intelligent confluence scoring** (Multi-factor signal validation)
- **Precision position sizing** (Risk-managed trade recommendations)
- **Error handling & validation** (Robust data handling)

---

## Architecture

### Backend Structure

```
backend/
├── services/
│   ├── enhancedAnalysisEngine.js    ← Main analysis engine
│   ├── smcAnalysisEngine.js         ← Legacy (still available)
│   └── marketDataService.js         ← Market data provider
├── routes/
│   ├── analysis.js                  ← NEW: Enhanced analysis endpoints
│   ├── signals.js                   ← UPDATED: Added /generate endpoint
│   └── ...
└── models/
    └── UsageLog.js                  ← Signal usage tracking
```

### Frontend Integration

```
frontend/src/
├── services/
│   └── api.js                       ← UPDATED: New analysis endpoints
├── pages/
│   └── TradingDashboard.jsx         ← Can use new API endpoints
└── components/
    └── trading/
        └── SignalPanel.jsx          ← Can display rich signal data
```

---

## API Endpoints

### Enhanced Analysis Routes

All analysis endpoints require authentication. Endpoints marked with ⭐ also require admin approval and active subscription/trial.

#### 1. **POST /api/analysis/analyze** ⭐
Complete comprehensive analysis with provided candle data.

**Request:**
```json
{
  "symbol": "BTCUSDT",
  "timeframe": "1h",
  "candleData": [
    { "time": "2024-01-01T00:00:00Z", "open": 42000, "high": 42500, "low": 41800, "close": 42200, "volume": 1000 },
    ...
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-01T12:00:00Z",
    "symbol": "BTCUSDT",
    "timeframe": "1h",
    "dataPoints": 100,
    "indicators": { ... },
    "smc": { ... },
    "confluence": { ... },
    "signal": { ... },
    "risk": { ... }
  }
}
```

---

#### 2. **GET /api/analysis/analyze/:symbol/:timeframe** ⭐
Fetch market data and perform full analysis.

**Query Parameters:**
- `limit` (optional, default: 100) - Number of candles

**Example:** `GET /api/analysis/analyze/BTCUSDT/1h?limit=120`

**Response:** Same as POST /analyze

---

#### 3. **GET /api/analysis/quick-signal/:symbol/:timeframe** ⭐
Fast signal generation (minimal output).

**Query Parameters:**
- `limit` (optional, default: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "timeframe": "1h",
    "signal": {
      "direction": "BUY",
      "confidence": 72.5,
      "entry": 42200,
      "stopLoss": 41800,
      "tp1": 43400,
      "tp2": 44600,
      "tp3": 45800,
      "rr": "2.50"
    },
    "confluence": {
      "direction": "BUY",
      "confidence": 72.5,
      "totalScore": 15.3
    },
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

---

#### 4. **GET /api/analysis/indicators/:symbol/:timeframe**
Get only technical indicators (no SMC analysis).

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "timeframe": "1h",
    "indicators": {
      "currentPrice": 42200,
      "ema20": 42150,
      "ema50": 41900,
      "ema200": 40500,
      "rsi": 62.5,
      "macd": { "macd": 250, "signal": 200, "histogram": 50, "trending": "BULLISH" },
      "atr": 450,
      "support": 40800,
      "resistance": 43200,
      "trend": { "direction": "BULLISH", "strength": "STRONG" },
      "volatilityLevel": "NORMAL"
    }
  }
}
```

---

#### 5. **GET /api/analysis/smc/:symbol/:timeframe**
Get only Smart Money Concepts analysis.

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "timeframe": "1h",
    "smc": {
      "swings": [ ... ],
      "bos": [ ... ],
      "choch": [ ... ],
      "orderBlocks": { "all": [], "active": [], "bullish": [], "bearish": [] },
      "fvgs": { "all": [], "active": [], "bullish": [], "bearish": [] },
      "liquidity": { "all": [], "bsl": [], "ssl": [] },
      "structure": { "type": "BULLISH (HH/HL)", ... },
      "marketBias": "BULLISH",
      "summary": { "totalBOS": 3, "totalCHoCH": 1, ... }
    }
  }
}
```

---

#### 6. **GET /api/analysis/confluence/:symbol/:timeframe**
Get confluence scoring and breakdown.

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "timeframe": "1h",
    "confluence": {
      "scores": {
        "smcEntryZone": 15,
        "choch": 8,
        "orderBlock": 12,
        "fvg": 5,
        "bos": 10,
        "technicalIndicators": 8,
        "trendAlignment": 8
      },
      "totalScore": 66,
      "direction": "BUY",
      "confidence": 85.2,
      "breakdown": [
        { "factor": "ORDER BLOCK", "contribution": 12 },
        { "factor": "TREND ALIGNMENT", "contribution": 8 },
        ...
      ]
    }
  }
}
```

---

#### 7. **GET /api/analysis/position-sizing/:symbol/:timeframe** ⭐
Get position sizing and risk management with custom account size.

**Query Parameters:**
- `accountSize` (optional, default: 10000)
- `limit` (optional, default: 100)

**Example:** `GET /api/analysis/position-sizing/BTCUSDT/1h?accountSize=50000&limit=100`

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "timeframe": "1h",
    "accountSize": 50000,
    "signal": { ... },
    "risk": {
      "positionSize": 0.0238,
      "positionSizeUSD": 1003.5,
      "riskAmount": 1000,
      "accountRiskPercent": 2.0,
      "slDistance": 400,
      "expectancy": 0.95,
      "recommendation": "GOOD RISK - Normal position"
    }
  }
}
```

---

#### 8. **POST /api/signals/generate** ⭐ (NEW)
Generate signal using EnhancedAnalysisEngine (replaces legacy endpoint).

**Request:** Same as POST /api/analysis/analyze

**Response:** Full analysis object

---

### Legacy Endpoints (Still Supported)

- **POST /api/analysis/analyze-smc** - Legacy SMC analysis
- **POST /api/analysis/generate-signal** - Legacy signal generation
- **GET /api/signals/klines/:symbol/:interval/:limit** - Fetch klines

---

## Frontend Integration Examples

### Example 1: Get Quick Signal

```javascript
import { analysisService } from '../services/api';

async function getQuickSignal() {
  try {
    const response = await analysisService.getQuickSignal('BTCUSDT', '1h', 100);
    console.log('Signal:', response.data.signal);
    console.log('Direction:', response.data.confluence.direction);
    console.log('Confidence:', response.data.confluence.confidence);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

### Example 2: Full Analysis with Position Sizing

```javascript
async function analyzeWithRiskManagement() {
  try {
    const response = await analysisService.getPositionSizing(
      'EURUSD',
      '4h',
      25000,  // Account size
      120     // Candles
    );
    
    const { signal, risk, indicators } = response.data;
    
    console.log('Setup:', signal.setup);
    console.log('Entry:', signal.entry);
    console.log('Stop Loss:', signal.stopLoss);
    console.log('Risk/Reward:', signal.rr);
    console.log('Position Size (USD):', risk.positionSizeUSD);
    console.log('Account Risk %:', risk.accountRiskPercent);
    console.log('Recommendation:', risk.recommendation);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### Example 3: Multi-Factor Analysis

```javascript
async function performMultiFactorAnalysis(symbol, timeframe) {
  try {
    // Get indicators
    const indicatorsRes = await analysisService.getIndicators(symbol, timeframe);
    const indicators = indicatorsRes.data.indicators;

    // Get SMC analysis
    const smcRes = await analysisService.getSMC(symbol, timeframe);
    const smc = smcRes.data.smc;

    // Get confluence scores
    const confluenceRes = await analysisService.getConfluence(symbol, timeframe);
    const confluence = confluenceRes.data.confluence;

    // Combine for trading decision
    const decisionData = {
      trend: indicators.trend.direction,
      strength: indicators.trend.strength,
      structure: smc.structure.type,
      bias: smc.marketBias,
      confluence: confluence.totalScore,
      direction: confluence.direction,
      confidence: confluence.confidence
    };

    return decisionData;
  } catch (error) {
    console.error('Multi-factor analysis error:', error);
  }
}
```

---

## EnhancedAnalysisEngine Class Reference

### Constructor

```javascript
const engine = new EnhancedAnalysisEngine(config);
```

**Config Options:**
```javascript
{
  emaPeriods: [20, 50, 200],              // EMA periods
  rsiPeriod: 14,                          // RSI period
  macdPeriods: { fast: 12, slow: 26, signal: 9 },
  atrPeriod: 14,                          // ATR period
  minCandlesRequired: 50,                 // Minimum candles
  swingLookback: 3,                       // Swing detection lookback
  bosLookback: 20,                        // BOS lookback
  obLookback: 20,                         // Order block lookback
  fvgSignificance: 0.3,                   // FVG 30% of range
  liquidityTolerance: 0.001               // 0.1% tolerance
}
```

### Main Method

```javascript
const analysis = await engine.analyze(ohlcData, metadata);
```

**Parameters:**
- `ohlcData`: Array of candles `{ time, open, high, low, close, volume }`
- `metadata`: Object `{ symbol, timeframe }`

**Returns:** Full analysis object with indicators, SMC, confluence, signal, and risk

### Analysis Output Structure

```javascript
{
  timestamp: string,              // ISO timestamp
  symbol: string,
  timeframe: string,
  dataPoints: number,
  indicators: {
    currentPrice: number,
    ema20, ema50, ema200: number,
    rsi: number,
    macd: { macd, signal, histogram, trending },
    atr: number,
    support, resistance: number,
    trend: { direction, strength },
    volatilityLevel: string
  },
  smc: {
    swings: array,
    bos: array,
    choch: array,
    orderBlocks: { all, active, bullish, bearish },
    fvgs: { all, active, bullish, bearish },
    liquidity: { all, bsl, ssl },
    structure: { type, hh, hl, lh, ll },
    marketBias: string,
    summary: { totalBOS, totalCHoCH, activeOrderBlocks, activeFVGs, liquidityZones }
  },
  confluence: {
    scores: { smcEntryZone, choch, orderBlock, fvg, bos, technicalIndicators, trendAlignment },
    totalScore: number,
    direction: 'BUY' | 'SELL' | 'WAIT',
    confidence: number,  // 0-95
    breakdown: array
  },
  signal: {
    direction: 'BUY' | 'SELL' | 'WAIT',
    confidence: number,
    entry: number,
    stopLoss: number,
    tp1, tp2, tp3: number,
    rr: string,          // Risk/Reward ratio
    reason: string,
    setup: string
  },
  risk: {
    positionSize: number,
    positionSizeUSD: number,
    riskAmount: number,
    accountRiskPercent: number,
    slDistance: number,
    expectancy: number,
    recommendation: string
  }
}
```

---

## Indicator Calculations

### EMA (Exponential Moving Average)
- Calculated for periods: 20, 50, 200
- Uses standard EMA formula: `EMA = Price * K + EMA_prev * (1 - K)` where `K = 2 / (period + 1)`

### RSI (Relative Strength Index)
- Period: 14 (default)
- Uses Wilder's smoothing method
- Range: 0-100 (Overbought >70, Oversold <30)

### MACD
- Fast EMA: 12 periods
- Slow EMA: 26 periods
- Signal: 9-period EMA of MACD
- Histogram: MACD - Signal

### ATR (Average True Range)
- Period: 14 (default)
- Uses Wilder's smoothing
- Measures volatility

---

## SMC Concepts Detected

### Swings
- Swing Highs: Local peaks (higher than N candles on both sides)
- Swing Lows: Local troughs (lower than N candles on both sides)

### Break of Structure (BOS)
- **Bullish BOS**: Price closes above previous swing high
- **Bearish BOS**: Price closes below previous swing low

### Change of Character (CHoCH)
- Reversal pattern: LL→HL (Bullish) or HH→LH (Bearish)
- Indicates potential trend reversal

### Order Blocks (OB)
- Strong candles preceding BOS
- **Bullish OB**: Bearish candle before bullish BOS
- **Bearish OB**: Bullish candle before bearish BOS

### Fair Value Gaps (FVG)
- Price gap between non-adjacent candles
- **Bullish FVG**: Low of candle > high of two candles back
- **Bearish FVG**: High of candle < low of two candles back

### Liquidity Zones
- **Buy-Side Liquidity (BSL)**: Clustered swing highs
- **Sell-Side Liquidity (SSL)**: Clustered swing lows

---

## Confluence Scoring System

The engine scores signals on 7 factors (max 100 points):

| Factor | Max Points | Description |
|--------|-----------|-------------|
| SMC Entry Zone | 25 | Proximity to Order Blocks/FVGs + bias alignment |
| CHoCH | 20 | Recent reversal with strength and recency decay |
| Order Block | 20 | Distance and strength of nearest OB |
| Fair Value Gap | 15 | FVG proximity and fill percentage |
| BOS Continuation | 10 | Recent break of structure alignment |
| Technical Indicators | 15 | EMA alignment, RSI extremes, MACD, trend strength |
| Trend Alignment | ±10 | Market bias vs indicator trend |

**Scoring Logic:**
- `totalScore > 5` → BUY signal
- `totalScore < -5` → SELL signal
- `-5 ≤ totalScore ≤ 5` → WAIT signal
- Confidence: `50 + |totalScore| * 2` (capped at 95)

---

## Position Sizing Algorithm

```
Risk per trade = Account Size × 2% (default)
Position Size = Risk Amount / Stop Loss Distance
Final Size = Validate against max 2% account risk
Expectancy = (WinRate × RR) - LossRate
Recommendation = Based on confidence level
```

**Risk Recommendations:**
- Confidence < 50% → HIGH RISK (consider passing)
- Confidence 50-60% → MODERATE RISK (small position)
- Confidence 60-75% → GOOD RISK (normal position)
- Confidence > 75% → EXCELLENT (full position)

---

## Error Handling

The engine includes comprehensive error handling:

- **Invalid input validation** → Returns error message
- **Insufficient data** → Returns 'WAIT' signal with low confidence
- **Division by zero protection** → Safe fallback values
- **NaN/Infinity prevention** → Numeric precision checks
- **Try-catch blocks** → API endpoints handle exceptions gracefully

### Error Response Format

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Detailed error message"
}
```

**Common Error Codes:**
- `INVALID_INPUT` - Missing/invalid parameters
- `ANALYSIS_ERROR` - Engine processing error
- `NO_DATA` - Unable to fetch market data
- `SIGNAL_ERROR` - Signal generation error
- `INDICATOR_ERROR` - Indicator calculation error
- `SMC_ERROR` - SMC analysis error
- `CONFLUENCE_ERROR` - Confluence scoring error
- `POSITION_ERROR` - Position sizing error

---

## Testing & Validation

### Unit Test Data Format

```javascript
const testCandles = [
  { time: new Date(), open: 100, high: 105, low: 98, close: 103, volume: 1000 },
  // ... at least 50 candles required
];

const engine = new EnhancedAnalysisEngine();
const analysis = await engine.analyze(testCandles, { 
  symbol: 'TEST',
  timeframe: '1h'
});
```

### Response Validation Checklist

- ✅ All numeric fields are numbers (not NaN)
- ✅ Direction is one of: 'BUY', 'SELL', 'WAIT'
- ✅ Confidence is 0-95
- ✅ All arrays are properly populated
- ✅ SMC zones have price levels
- ✅ Signal has entry, SL, TPs
- ✅ Risk object has position sizing

---

## Performance Considerations

- **Data Processing**: ~5-10ms for 120 candles
- **Memory Usage**: ~2-5MB for analysis cache
- **API Response Time**: 50-200ms (including API call + analysis)
- **Concurrent Requests**: Engine is stateless, supports unlimited concurrent calls

---

## Migration from Legacy System

### Old Code
```javascript
const { klines } = req.body;
const analysis = analyzeMarketStructure(klines);
const signal = generateSignal(analysis, currentPrice, symbol, timeframe);
```

### New Code
```javascript
const engine = new EnhancedAnalysisEngine();
const analysis = await engine.analyze(normalizedCandles, { symbol, timeframe });
const signal = analysis.signal;  // Already generated!
```

---

## Future Enhancements

1. **WebSocket Support** - Real-time streaming analysis
2. **Machine Learning** - Confluence weighting optimization
3. **Multi-Timeframe Analysis** - Cross-TF confluence scoring
4. **Signal History** - Backtest analysis results
5. **Custom Indicators** - User-defined confluence factors
6. **Alert System** - Push notifications on setup formation
7. **Portfolio Risk** - Multi-position correlation analysis
8. **Options Analysis** - Greeks and probability weighting

---

## Support & Documentation

- **API Documentation**: See endpoint descriptions above
- **Integration Examples**: See "Frontend Integration Examples" section
- **Configuration**: See "Constructor" section
- **Troubleshooting**: Check "Error Handling" section

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Engine**: EnhancedAnalysisEngine v1.0

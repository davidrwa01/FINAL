# Phase 2: SMC Analysis Engine - API Documentation

## Overview

**Phase 2** introduces Smart Money Concepts (SMC) analysis directly to signal generation. The system now detects market structure, Break of Structure (BOS), Change of Character (CHoCH), Order Blocks, Fair Value Gaps, and generates intelligent trading signals with Entry/Stop Loss/Take Profit levels.

## New Endpoints

### 1. POST /api/signals/analyze-smc
**Perform SMC analysis on provided candle data**

**Authentication:** Required (Auth → Admin Approved → Subscription/Trial)

**Request Body:**
```json
{
  "symbol": "BTCUSDT",
  "interval": "1h",
  "klines": [
    {
      "time": 1704067200000,
      "open": 42500,
      "high": 43000,
      "low": 42300,
      "close": 42800,
      "volume": 1500
    },
    // ... minimum 10 candles required
  ]
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "signal": "BUY",
    "confidence": 0.78,
    "entry": 42800,
    "stopLoss": 42200,
    "takeProfit": 44200,
    "riskReward": 2.0,
    "reasoning": [
      "Bullish structure detected (confidence: 85%)",
      "Price in discount zone (below midpoint)",
      "Price testing bullish Order Block",
      "Stop Loss at recent swing low",
      "Target: Bullish FVG at 44200"
    ],
    "analysis": {
      "structure": {
        "structure": "BULLISH",
        "confidence": 0.85,
        "bullishSignals": 2,
        "bearishSignals": 0
      },
      "bosChoCh": [
        {
          "type": "CHoCH",
          "direction": "BULLISH",
          "price": 42500,
          "strength": "CONFIRMED"
        }
      ],
      "orderBlocks": [
        {
          "type": "BULLISH",
          "high": 42900,
          "low": 42100,
          "strength": "STRONG"
        }
      ],
      "fairValueGaps": [
        {
          "type": "BULLISH",
          "high": 44200,
          "low": 43800,
          "size": 400,
          "filled": false
        }
      ],
      "liquidity": {
        "swingHighs": [43500, 43800],
        "swingLows": [42000, 42200],
        "sessionHigh": 43800,
        "sessionLow": 42000,
        "midPoint": 42900,
        "premiumZone": { "start": 42900, "end": 43800 },
        "discountZone": { "start": 42000, "end": 42900 },
        "currentZone": "DISCOUNT",
        "liquiditySweep": false
      }
    }
  }
}
```

**Response (Error - Insufficient Data):**
```json
{
  "success": false,
  "error": "INSUFFICIENT_DATA",
  "message": "Minimum 10 candles required for analysis"
}
```

---

### 2. POST /api/signals/generate-signal
**Generate a trading signal with automatic kline fetching**

**Authentication:** Required (Auth → Admin Approved → Subscription/Trial)

**Request Body:**
```json
{
  "symbol": "BTCUSDT",
  "interval": "1h"  // Optional, defaults to "1h"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "signal": "SELL",
    "confidence": 0.72,
    "entry": 45200,
    "stopLoss": 45800,
    "takeProfit": 43500,
    "riskReward": 1.63,
    "reasoning": [
      "Bearish structure detected (confidence: 75%)",
      "Price in premium zone (above midpoint)",
      "Price testing bearish Order Block",
      "Stop Loss at recent swing high",
      "Target: Swing low"
    ],
    "analysis": { /* detailed structure */ }
  },
  "message": "Signal generated for BTCUSDT"
}
```

**Response (Error - Trial Limit):**
```json
{
  "success": false,
  "error": "TRIAL_LIMIT_EXCEEDED",
  "message": "You have reached the 2 signal limit for today. Upgrade to continue.",
  "redirectTo": "/subscribe"
}
```

---

## SMC Analysis Engine Components

### 1. Market Structure Detection
Identifies whether market is **BULLISH**, **BEARISH**, or **RANGING**

**Logic:**
- **BULLISH**: Higher Lows (HL) + Higher Highs (HH) with 2+ confirmations
- **BEARISH**: Lower Highs (LH) + Lower Lows (LL) with 2+ confirmations  
- **RANGING**: No clear directional bias

**Output:**
```javascript
{
  structure: "BULLISH",
  confidence: 0.85,  // 0-1 scale
  lastSwings: [ /* swing points */ ],
  bullishSignals: 2,
  bearishSignals: 0
}
```

---

### 2. Break of Structure (BOS) / Change of Character (CHoCH)
Detects key reversal points in the market

**Break of Structure (BOS):**
- Price breaks above a previous swing high (bullish BOS)
- Price breaks below a previous swing low (bearish BOS)
- Indicates potential continuation of trend

**Change of Character (CHoCH):**
- Structure reverses from bullish to bearish or vice versa
- Last expansion candle before the shift
- Early warning signal for potential reversal

**Output:**
```javascript
[
  {
    type: "BOS",           // or "CHoCH"
    direction: "BULLISH",  // or "BEARISH"
    level: 42500,
    currentPrice: 42800,
    strength: "PENDING"    // or "CONFIRMED"
  }
]
```

---

### 3. Order Blocks (OB)
Identifies last expansion candles before structure reversal

**Bullish OB:**
- Last strong down candle(s) before reversal up
- Price tends to return here for support after breaking higher
- Aggressive entry zone

**Bearish OB:**
- Last strong up candle(s) before reversal down
- Price tends to return here for resistance after breaking lower
- Aggressive entry zone

**Output:**
```javascript
[
  {
    type: "BULLISH",       // or "BEARISH"
    high: 42900,
    low: 42100,
    time: 1704067200000,
    strength: "STRONG",    // or "WEAK"
    description: "Last bearish candle before bullish reversal"
  }
]
```

---

### 4. Fair Value Gaps (FVG)
Detects imbalances (gaps) in price that are typically filled

**Bullish FVG:**
- Gap created when price gaps up (candle high > previous candle low)
- Market tends to pull back to fill the gap
- Acts as profit target

**Bearish FVG:**
- Gap created when price gaps down (candle low < previous candle high)
- Market tends to rally back to fill the gap
- Acts as profit target

**Output:**
```javascript
[
  {
    type: "BULLISH",         // or "BEARISH"
    high: 44200,
    low: 43800,
    size: 400,
    timeGapped: 1704067200000,
    filled: false,           // true if price returned to fill
    description: "Bullish imbalance (gap up)"
  }
]
```

---

### 5. Liquidity Analysis
Identifies key price levels and zones

**Components:**
- **Swing Highs/Lows**: Local turning points
- **Premium Zone**: Area above session midpoint (typically sellers active)
- **Discount Zone**: Area below session midpoint (typically buyers active)
- **Liquidity Sweeps**: Price breaks swing highs/lows (catches stop losses)

**Output:**
```javascript
{
  swingHighs: [43500, 43800],
  swingLows: [42000, 42200],
  sessionHigh: 43800,
  sessionLow: 42000,
  midPoint: 42900,
  premiumZone: { start: 42900, end: 43800 },
  discountZone: { start: 42000, end: 42900 },
  currentZone: "PREMIUM",  // or "DISCOUNT"
  liquiditySweep: false    // true if price swept recent swings
}
```

---

## Signal Generation Logic

### Signal Types

#### BUY Signal
Triggered when:
1. **Bullish structure** detected with confidence > 60%
2. **Price in discount zone** (below session midpoint) ✅ +0.2 confidence
3. **Order Block support** or **Liquidity support** nearby ✅ +0.2 confidence
4. **Overall confidence ≥ 70%** triggers BUY

**Entry:** Current price  
**Stop Loss:** Below swing low or below Order Block  
**Take Profit:** Bullish FVG level or swing high  

#### SELL Signal
Triggered when:
1. **Bearish structure** detected with confidence > 60%
2. **Price in premium zone** (above session midpoint) ✅ +0.2 confidence
3. **Order Block resistance** or **Liquidity resistance** nearby ✅ +0.2 confidence
4. **Overall confidence ≥ 70%** triggers SELL

**Entry:** Current price  
**Stop Loss:** Above swing high or above Order Block  
**Take Profit:** Bearish FVG level or swing low  

#### WAIT Signal
- When structure is RANGING or confidence < 70%
- Insufficient candle data
- No clear directional bias with Order Block confirmation

---

### Risk:Reward (R:R) Calculation

**Formula:**
```
R:R = Distance to Target / Distance to Stop Loss

Example: 
  Entry: 42800
  SL: 42200 (600 pips risk)
  TP: 44200 (1400 pips reward)
  R:R = 1400 / 600 = 2.33
```

**Minimum R:R Requirement: 1:1.5**
- If calculated R:R < 1.5, TP is automatically adjusted upward
- Ensures risk/reward is always favorable

---

## Signal Confidence Scoring

Confidence built from these factors:

| Factor | Weight | Condition |
|--------|--------|-----------|
| Structure | 0.3 | Bullish/Bearish with 85% confidence |
| Liquidity Zone | 0.2 | Price in discount (bullish) or premium (bearish) |
| Order Block | 0.2 | Price currently testing OB |
| BOS/CHoCH | 0.15 | Break of structure confirmed |
| FVG Target | 0.15 | Unfilled FVG aligned with structure |

**Final Score Formula:**
```
confidence = SUM(factor * weight) for all triggered factors
Max confidence = 1.0 (100%)
```

---

## Usage Example

### Step 1: Get Market Data
```javascript
// Frontend calls market endpoint
GET /api/market/candles/BTCUSDT/1h?limit=50
```

### Step 2: Generate Signal
```javascript
// Frontend sends candles + symbol to backend
POST /api/signals/analyze-smc
{
  "symbol": "BTCUSDT",
  "interval": "1h",
  "klines": [ ... 50 candles ... ]
}
```

### Step 3: Display Signal to User
```javascript
{
  signal: "BUY",
  confidence: 0.78,
  entry: 42800,
  stopLoss: 42200,
  takeProfit: 44200,
  riskReward: 2.0,
  reasoning: [
    "Bullish structure detected...",
    "Price in discount zone...",
    "Price testing bullish Order Block...",
    "Target: Bullish FVG at 44200"
  ]
}
```

---

## Integration with Frontend

### TradingDashboard Component Update

```javascript
// In TradingDashboard.jsx
const [selectedPair, setSelectedPair] = useState('BTCUSDT');

const generateSignal = async () => {
  const klines = await api.getCandles(selectedPair, '1h', 50);
  const signal = await api.analyzeSMC({
    symbol: selectedPair,
    interval: '1h',
    klines
  });
  
  // Display signal to user
  console.log(signal);
  // Show Entry, SL, TP on chart
  // Display reasoning
};
```

---

## Error Handling

| Error Code | HTTP | Message |
|------------|------|---------|
| INVALID_INPUT | 400 | Missing symbol/klines |
| INSUFFICIENT_DATA | 400 | < 10 candles provided |
| TRIAL_LIMIT_EXCEEDED | 403 | 2 signals/day exhausted (trial users) |
| SIGNAL_GENERATION_FAILED | 500 | Kline fetch or analysis error |
| ANALYSIS_ERROR | 500 | SMC engine failure |

---

## Performance Notes

- **Analysis Time:** ~50ms per symbol (50 candles)
- **Confidence Range:** 0.0 - 1.0 (0-100%)
- **Minimum Candles:** 10 (recommended: 50)
- **Supported Intervals:** 1m, 5m, 15m, 30m, 1h, 4h, 1d

---

## Files Created/Modified in Phase 2

1. **backend/services/smcAnalysisEngine.js** (NEW)
   - Market structure detection
   - BOS/CHoCH detection
   - Order Block identification
   - Fair Value Gap detection
   - Liquidity analysis
   - Signal generation with Entry/SL/TP

2. **backend/routes/signals.js** (MODIFIED)
   - Added POST /analyze-smc endpoint
   - Added POST /generate-signal endpoint
   - Integrated SMC analysis engine

3. **backend/models/UsageLog.js** (ENHANCED)
   - Logs analysis type, confidence, entry, SL, TP per signal

---

## Next Steps (Phase 3)

1. **Frontend Integration**
   - Add SMC signal UI to TradingDashboard
   - Display Entry/SL/TP on chart
   - Show reasoning/analysis breakdown

2. **Real-time Updates**
   - WebSocket for live signal streaming
   - Market alerts when signals generated

3. **Advanced Features**
   - Multi-timeframe analysis (1h + 4h confirmation)
   - Correlation analysis (BTC moves Alts)
   - Performance tracking dashboard

---

**Phase 2 Complete! ✅**

# API Response Format Reference

## Market Data Endpoints

### GET /api/market/crypto/snapshot
**Response:**
```json
{
  "success": true,
  "data": {
    "BTCUSDT": {
      "symbol": "BTCUSDT",
      "price": 42500.50,
      "change": 2.45,
      "high": 43200.00,
      "low": 41800.00,
      "volume": 28500.45,
      "quoteAsset": "USDT",
      "timestamp": 1706745600000
    },
    "ETHUSDT": { ... }
  },
  "timestamp": 1706745600000
}
```

### GET /api/market/forex/snapshot
**Response:**
```json
{
  "success": true,
  "data": {
    "USDEUR": {
      "symbol": "USDEUR",
      "price": 1.0850,
      "change": -0.15,
      "timestamp": 1706745600000
    },
    "XAUUSD": {
      "symbol": "XAUUSD",
      "price": 1950.25,
      "change": 0.45,
      "timestamp": 1706745600000
    }
  },
  "timestamp": 1706745600000
}
```

### GET /api/market/series?symbol=BTCUSDT&timeframe=1h&limit=120
**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "timeframe": "1h",
    "candles": [
      [
        1706740000000,  // time
        42300.50,       // open
        42600.00,       // high
        42100.00,       // low
        42400.50,       // close
        1250.45         // volume
      ],
      // ... more candles
    ],
    "count": 120
  }
}
```

### POST /api/market/snapshot/batch
**Request:**
```json
{
  "symbols": ["BTCUSDT", "ETHUSDT", "EURUSD"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "BTCUSDT": {
      "symbol": "BTCUSDT",
      "price": 42500.50,
      "change": 2.45,
      "high": 43200.00,
      "low": 41800.00,
      "volume": 28500.45,
      "timestamp": 1706745600000
    },
    // ... more symbols
  },
  "count": 3,
  "timestamp": 1706745600000
}
```

## Analysis Endpoints

### POST /api/analysis/analyze-smc
**Request:**
```json
{
  "klines": [
    [1706740000000, 42300.50, 42600.00, 42100.00, 42400.50, 1250.45],
    [1706743600000, 42400.50, 42800.00, 42300.00, 42700.25, 1350.20],
    // ... more klines
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "swings": [
      { "type": "HIGH", "price": 42800.00, "index": 5 },
      { "type": "LOW", "price": 42100.00, "index": 2 }
    ],
    "bosEvents": [
      {
        "type": "BULLISH_BOS",
        "price": 42100.00,
        "index": 8
      }
    ],
    "orderBlocks": [
      {
        "type": "BULLISH_OB",
        "high": 42600.00,
        "low": 42400.00,
        "index": 3
      }
    ],
    "fvgs": [
      {
        "type": "BULLISH_FVG",
        "top": 42800.00,
        "bottom": 42700.00,
        "index": 6
      }
    ],
    "keyLevels": {
      "support": [42100.00, 42050.00],
      "resistance": [42800.00, 42850.00]
    },
    "ema20": 42450.30,
    "ema50": 42380.15,
    "rsi": 65.45,
    "currentPrice": 42500.50,
    "bias": "BULLISH",
    "biasSources": ["ema_alignment", "bullish_bos"],
    "signals": {
      "bullishOBCount": 2,
      "bearishOBCount": 0,
      "bullishFVGCount": 1,
      "bearishFVGCount": 0
    }
  }
}
```

### POST /api/analysis/generate-signal
**Request:**
```json
{
  "analysis": {
    // ... analysis object from analyze-smc
  },
  "currentPrice": 42500.50,
  "symbol": "BTCUSDT",
  "timeframe": "H1"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signal": "BUY",
    "confidence": 78,
    "entry": 42500.50,
    "stopLoss": 42200.00,
    "takeProfit": 43400.00,
    "riskReward": 2.35,
    "symbol": "BTCUSDT",
    "timeframe": "H1",
    "reason": "Bullish bias (ema_alignment, bullish_bos); 2 bullish order block(s) detected; RSI oversold - potential bounce",
    "analysis": {
      "currentPrice": 42500.50,
      "bias": "BULLISH",
      "rsi": 65.45,
      "ema20": 42450.30,
      "ema50": 42380.15
    },
    "timestamp": 1706745600000
  }
}
```

## Signal Endpoints

### GET /api/signals/klines/:symbol/:interval/:limit
**Example:** `/api/signals/klines/BTCUSDT/1h/100`

**Response:**
```json
{
  "success": true,
  "data": [
    [1706740000000, 42300.50, 42600.00, 42100.00, 42400.50, 1250.45],
    [1706743600000, 42400.50, 42800.00, 42300.00, 42700.25, 1350.20],
    // ... more klines (max 1000)
  ]
}
```

### GET /api/signals/market-data/:symbols
**Example:** `/api/signals/market-data/["BTCUSDT","ETHUSDT","EURUSD"]`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "BTCUSDT",
      "lastPrice": "42500.50",
      "priceChangePercent": "2.45",
      "highPrice": "43200.00",
      "lowPrice": "41800.00",
      "volume": "28500.45"
    },
    // ... more symbols
  ]
}
```

### POST /api/signals/generate
**Request:**
```json
{
  "symbol": "BTCUSDT",
  "timeframe": "H4",
  "signalType": "LIVE_ANALYSIS"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Signal access granted",
  "data": {
    "hasActiveSubscription": false,
    "onFreeTrial": true,
    "remainingSignals": 1,
    "dailyLimit": 2,
    "canGenerate": true
  }
}
```

### GET /api/signals/check-access
**Response:**
```json
{
  "success": true,
  "data": {
    "canGenerate": true,
    "hasActiveSubscription": true,
    "subscription": {
      "plan": "Standard",
      "endDate": "2024-02-28T23:59:59.000Z"
    },
    "unlimited": true
  }
}
```

Or (free trial):
```json
{
  "success": true,
  "data": {
    "canGenerate": true,
    "hasActiveSubscription": false,
    "onFreeTrial": true,
    "trial": {
      "dailyLimit": 2,
      "used": 1,
      "remaining": 1,
      "message": "1 signal remaining today"
    }
  }
}
```

## Error Responses

### Generic Error
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message"
}
```

### Examples

**Invalid Symbol:**
```json
{
  "success": false,
  "error": "INVALID_SYMBOL",
  "message": "Symbol INVALID not found. Supported: BTCUSDT, ETHUSDT, etc."
}
```

**Trial Limit Exceeded:**
```json
{
  "success": false,
  "error": "TRIAL_LIMIT_EXCEEDED",
  "message": "Daily trial limit reached. Upgrade to continue.",
  "redirectTo": "/subscribe"
}
```

**Not Authenticated:**
```json
{
  "success": false,
  "error": "NOT_AUTHENTICATED",
  "message": "Please login to access this resource",
  "redirectTo": "/login"
}
```

**Not Approved:**
```json
{
  "success": false,
  "error": "NOT_APPROVED",
  "message": "Your account is pending admin approval",
  "redirectTo": "/pending-approval"
}
```

## Usage in Frontend

```javascript
// Example: Fetching market data
async function getMarketData() {
  try {
    const response = await marketService.getMarketSeries('BTCUSDT', 'H1', 120);
    
    if (!response.success) {
      console.error('API Error:', response.error, response.message);
      return null;
    }

    return response.data.candles; // Array of [time, open, high, low, close, volume]
  } catch (error) {
    console.error('Network error:', error);
    return null;
  }
}

// Example: Generating signal
async function generateSignal(symbol, timeframe) {
  try {
    // Fetch klines
    const klinesResp = await marketService.getMarketSeries(symbol, timeframe, 120);
    const klines = klinesResp.data.candles;

    // Analyze with SMC
    const analysisResp = await analysisService.analyzeSMC(klines);
    const analysis = analysisResp.data;

    // Generate signal
    const signalResp = await analysisService.generateSignal(
      analysis,
      analysis.currentPrice,
      symbol,
      timeframe
    );

    if (!signalResp.success) {
      throw new Error(signalResp.message);
    }

    return signalResp.data; // Signal with direction, confidence, entry, SL, TP
  } catch (error) {
    console.error('Signal generation failed:', error);
    return null;
  }
}
```

## Response Time Expectations

| Endpoint | Avg Time | Max Time |
|----------|----------|----------|
| Crypto snapshot | 200ms | 500ms |
| Forex snapshot | 300ms | 800ms |
| Market series | 150ms | 400ms |
| SMC analysis | 500ms | 1500ms |
| Signal generation | 100ms | 300ms |

Total signal flow: ~1.2 seconds average

---

All endpoints follow RESTful conventions and return proper HTTP status codes:
- 200: Success
- 400: Bad request (validation error)
- 401: Unauthorized
- 403: Forbidden (not approved)
- 500: Server error

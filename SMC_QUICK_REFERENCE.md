# 🚀 SMC Engine - Quick Reference Card

## API Endpoints (Phase 2)

### 1. Analyze with Provided Candles
```
POST /api/signals/analyze-smc
Authorization: Session required

Body: {
  "symbol": "BTCUSDT",
  "interval": "1h",
  "klines": [ { time, open, high, low, close, volume }, ... ]  // Min 10
}

Response: {
  "signal": "BUY|SELL|WAIT",
  "confidence": 0.0-1.0,
  "entry": 42800,
  "stopLoss": 42200,
  "takeProfit": 44200,
  "riskReward": 2.0,
  "reasoning": ["reason1", "reason2", ...],
  "analysis": { structure, bosChoCh, orderBlocks, fvgs, liquidity }
}
```

### 2. Generate with Auto-Fetch
```
POST /api/signals/generate-signal
Authorization: Session + Admin Approved + Subscription/Trial

Body: {
  "symbol": "BTCUSDT",
  "interval": "1h"  // optional, defaults to 1h
}

Response: Same as /analyze-smc + logs action
Error (Trial): 403 with redirectTo: "/subscribe"
```

---

## SMC Analysis Components

### Market Structure
```javascript
{
  "structure": "BULLISH|BEARISH|RANGING",
  "confidence": 0.85,
  "bullishSignals": 2,
  "bearishSignals": 0
}
```

### Break of Structure / Change of Character
```javascript
[
  {
    "type": "BOS|CHoCH",
    "direction": "BULLISH|BEARISH",
    "level": 42500,
    "strength": "PENDING|CONFIRMED"
  }
]
```

### Order Blocks
```javascript
[
  {
    "type": "BULLISH|BEARISH",
    "high": 42900,
    "low": 42100,
    "strength": "STRONG|WEAK"
  }
]
```

### Fair Value Gaps
```javascript
[
  {
    "type": "BULLISH|BEARISH",
    "high": 44200,
    "low": 43800,
    "size": 400,
    "filled": false
  }
]
```

### Liquidity
```javascript
{
  "swingHighs": [43500, 43800],
  "swingLows": [42000, 42200],
  "sessionHigh": 43800,
  "sessionLow": 42000,
  "midPoint": 42900,
  "currentZone": "PREMIUM|DISCOUNT",
  "liquiditySweep": false
}
```

---

## Signal Confidence Factors

| Factor | Weight | Trigger |
|--------|--------|---------|
| Structure (Bull/Bear) | 0.30 | Base: 0.3 if confidence > 0.6 |
| Liquidity Zone | 0.20 | Price in discount (BUY) or premium (SELL) |
| Order Block | 0.20 | Price currently testing OB |
| BOS/CHoCH | 0.15 | Breakout/structure reversal confirmed |
| FVG Target | 0.15 | Unfilled gap aligns with structure |
| **Min to Signal** | **0.70** | Confidence ≥ 70% triggers BUY/SELL |

**WAIT Signal:** Confidence < 0.70 or structure = RANGING

---

## Risk:Reward Guarantee

```
R:R = TP Distance / SL Distance

Example:
  Entry: 42800
  SL: 42200 (600 risk)
  TP: 44200 (1400 reward)
  R:R = 1400/600 = 2.33 ✅

Minimum Requirement: 1:1.5
If R:R < 1.5, TP auto-adjusted upward
```

---

## Entry Point Logic

### BUY Signal Entry
✅ Bullish structure + Price in discount + Order Block support + Conf ≥ 70%
- **Entry:** Current price
- **SL:** Below swing low or OB
- **TP:** Bullish FVG or swing high
- **Example:** Entry 42800, SL 42200, TP 44200 (R:R 2.0)

### SELL Signal Entry
✅ Bearish structure + Price in premium + Order Block resistance + Conf ≥ 70%
- **Entry:** Current price
- **SL:** Above swing high or OB
- **TP:** Bearish FVG or swing low
- **Example:** Entry 45200, SL 45800, TP 43500 (R:R 1.6)

---

## Database Schema (UsageLog)

```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // User reference
  actionType: "SIGNAL|ANALYSIS",
  symbol: "BTCUSDT",
  interval: "1h",
  signal: "BUY|SELL|WAIT",
  confidence: 0.78,           // 0-1
  entry: 42800,
  stopLoss: 42200,
  takeProfit: 44200,
  riskReward: 2.0,
  timestamp: Date             // Created at
}
```

---

## Code Usage Examples

### Import & Use Engine
```javascript
const smcEngine = require('../services/smcAnalysisEngine');

// Generate signal from candles
const signal = smcEngine.generateSignal(klines, 'BTCUSDT');
console.log(signal.signal);        // "BUY", "SELL", or "WAIT"
console.log(signal.confidence);    // 0.78
console.log(signal.entry);         // 42800
console.log(signal.riskReward);    // 2.0
```

### Analyze Market Structure
```javascript
const structure = smcEngine.analyzeMarketStructure(klines);
console.log(structure.structure);    // "BULLISH"
console.log(structure.confidence);   // 0.85
```

### Detect Order Blocks
```javascript
const orderBlocks = smcEngine.detectOrderBlocks(klines);
orderBlocks.forEach(ob => {
  console.log(`${ob.type} OB: ${ob.low} - ${ob.high}`);
});
```

---

## Authentication Flow

```
1. POST /api/signals/generate-signal
   ↓
2. middleware/auth.js → requireAuth
   Check: req.session.userId exists
   ✓ Continue | ✗ Return 401
   ↓
3. middleware/auth.js → requireAdminApproved
   Check: user.isApproved === true
   ✓ Continue | ✗ Redirect to /pending-approval
   ↓
4. middleware/auth.js → requireSubscriptionOrTrial
   Check: Active subscription OR trial signals remaining
   ✓ Continue | ✗ Return 403 with redirectTo: /subscribe
   ↓
5. Enforce trial limit (2 signals/day for free users)
   ✓ Continue | ✗ Return 403 TRIAL_LIMIT_EXCEEDED
   ↓
6. Generate signal + log to database
```

---

## Error Codes & Solutions

| Code | Status | Solution |
|------|--------|----------|
| INVALID_INPUT | 400 | Check symbol, klines, interval format |
| INSUFFICIENT_DATA | 400 | Provide min 10 candles, recommend 50 |
| TRIAL_LIMIT_EXCEEDED | 403 | User at 2 signals/day limit (free) |
| SIGNAL_GENERATION_FAILED | 500 | Check kline format: time/open/high/low/close/volume |
| ANALYSIS_ERROR | 500 | Verify candle data is valid JSON |

---

## Performance & Limits

- **Analysis Speed:** ~50ms per symbol
- **Max Symbols:** No limit (process sequentially)
- **Min Candles:** 10 (confidence reduced)
- **Recommended:** 50 candles per analysis
- **Max Payload:** 50 candles × 6 fields = ~1.2KB
- **Trial Limit:** 2 signals/day free, unlimited paid
- **Supported Intervals:** 1m, 5m, 15m, 30m, 1h, 4h, 1d

---

## Frontend Integration Checklist

- [ ] Add `/api/signals/generate-signal` to `services/api.js`
- [ ] Fetch candles from market endpoint
- [ ] Call SMC analysis endpoint
- [ ] Display signal (BUY/SELL/WAIT) prominently
- [ ] Show Entry/SL/TP on chart
- [ ] Display confidence percentage
- [ ] Show reasoning bullets
- [ ] Handle 403 TRIAL_LIMIT_EXCEEDED → redirect to subscribe
- [ ] Add loading state during analysis
- [ ] Add error handling with user messages

---

## Debugging Tips

### Check Signal Generation
```bash
# Run test script
cd backend && node scripts/test-smc-analysis.js
```

### Verify Database
```javascript
// Check signal logs
db.usagelogs.find({ actionType: "SIGNAL" }).sort({ timestamp: -1 }).limit(5)
```

### API Response Format
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
    "reasoning": ["Bullish structure...", "Price in discount..."],
    "analysis": { /* detailed breakdown */ }
  }
}
```

---

## Quick Test API Call

```bash
# Generate signal for BTCUSDT
curl -X POST http://localhost:3000/api/signals/generate-signal \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","interval":"1h"}' \
  --cookie "connect.sid=YOUR_SESSION_ID"

# Response (example):
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
      "Target: Bullish FVG at 44200"
    ]
  }
}
```

---

## File Locations

```
backend/
├── services/smcAnalysisEngine.js    ← SMC Core Logic
├── routes/signals.js                ← API Endpoints
├── scripts/test-smc-analysis.js     ← Demo/Testing
└── models/UsageLog.js               ← Signal Logging
```

---

## Next Phase: Frontend

**Phase 3 Tasks:**
1. Integrate SMC signal generation into TradingDashboard
2. Display signals with Entry/SL/TP overlay
3. Add reasoning panel
4. Implement chart upload + OCR
5. Real-time WebSocket updates
6. Performance dashboard

---

**Need Help?** Check [PHASE_2_SMC_API_GUIDE.md](PHASE_2_SMC_API_GUIDE.md) for full documentation.


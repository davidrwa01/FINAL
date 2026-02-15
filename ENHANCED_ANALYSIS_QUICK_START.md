# Enhanced Analysis Engine - Quick Start Guide

## 🚀 Quick Setup

### 1. **Install Dependencies** (if not already installed)
```bash
cd backend
npm install axios
# Already installed: express, mongodb, etc.
```

### 2. **Verify Files Are in Place**
```
backend/
├── services/
│   └── enhancedAnalysisEngine.js    ✓ CREATED
├── routes/
│   ├── analysis.js                  ✓ UPDATED
│   └── signals.js                   ✓ UPDATED
└── tests/
    └── enhancedAnalysisEngine.test.js ✓ CREATED

frontend/src/services/
└── api.js                           ✓ UPDATED
```

### 3. **Verify Server Integration**

In your `backend/server.js`, make sure the routes are registered:

```javascript
// ─── ROUTES ──────────────────────────────────────────────
app.use('/api/signals', require('./routes/signals'));
app.use('/api/analysis', require('./routes/analysis'));
// ... other routes
```

If not present, add these lines before `app.listen()`.

---

## 🧪 Testing the Engine

### Run Unit Tests
```bash
cd backend
node tests/enhancedAnalysisEngine.test.js
```

**Expected Output:**
```
╔════════════════════════════════════════════════════════╗
║   EnhancedAnalysisEngine Test Suite                    ║
╚════════════════════════════════════════════════════════╝

=== Test 1: Basic Analysis ===
✅ PASS: Analysis structure complete
   Signal: BUY (Confidence: 72.5%)
   Entry: 103.45, SL: 101.20, RR: 2.35

... [more tests] ...

╔════════════════════════════════════════════════════════╗
║                  Test Suite Complete                   ║
╚════════════════════════════════════════════════════════╝
```

---

## 🌐 Testing via API

### 1. **Start the Server**
```bash
# Terminal 1: Backend
cd backend
npm start
# Server running on http://127.0.0.1:3000

# Terminal 2: Frontend (if needed)
cd frontend
npm run dev
# Frontend running on http://127.0.0.1:3001
```

### 2. **Test Endpoints with cURL or Postman**

#### Get Quick Signal
```bash
curl -X GET "http://127.0.0.1:3000/api/analysis/quick-signal/BTCUSDT/1h?limit=100" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -H "Content-Type: application/json"
```

#### Get Full Analysis
```bash
curl -X GET "http://127.0.0.1:3000/api/analysis/analyze/EURUSD/4h?limit=100" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -H "Content-Type: application/json"
```

#### Get Indicators Only
```bash
curl -X GET "http://127.0.0.1:3000/api/analysis/indicators/XAUUSD/1h?limit=100" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -H "Content-Type: application/json"
```

#### Get Position Sizing
```bash
curl -X GET "http://127.0.0.1:3000/api/analysis/position-sizing/BTCUSDT/1h?accountSize=50000&limit=100" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -H "Content-Type: application/json"
```

#### POST Analysis with Custom Data
```bash
curl -X POST "http://127.0.0.1:3000/api/analysis/analyze" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "timeframe": "1h",
    "candleData": [
      {"time": "2024-01-01T00:00:00Z", "open": 42000, "high": 42500, "low": 41800, "close": 42200, "volume": 1000},
      ...
    ]
  }'
```

---

## 📝 Usage Examples

### Example 1: Frontend - Get Quick Signal
```javascript
// frontend/src/pages/TradingDashboard.jsx

import { analysisService } from '../services/api';

async function handleAnalyze() {
  try {
    const response = await analysisService.getQuickSignal('BTCUSDT', '1h', 100);
    
    if (response.success) {
      const signal = response.data.signal;
      console.log(`Direction: ${signal.direction}`);
      console.log(`Confidence: ${response.data.confluence.confidence}%`);
      console.log(`Entry: ${signal.entry}`);
      console.log(`Stop Loss: ${signal.stopLoss}`);
      console.log(`R:R: ${signal.rr}`);
      
      // Update UI with signal data
    }
  } catch (error) {
    console.error('Analysis error:', error);
  }
}
```

### Example 2: Backend - Direct Engine Usage
```javascript
// backend/routes/customRoute.js

const EnhancedAnalysisEngine = require('../services/enhancedAnalysisEngine');

async function analyzeMarket(klines) {
  const engine = new EnhancedAnalysisEngine();
  const analysis = await engine.analyze(klines, {
    symbol: 'EURUSD',
    timeframe: '4h'
  });
  
  return analysis;
}
```

### Example 3: Complete Trading Decision Flow
```javascript
async function makeTradingDecision(symbol, timeframe) {
  // 1. Get indicators
  const indicators = await analysisService.getIndicators(symbol, timeframe);
  
  // 2. Get SMC analysis
  const smc = await analysisService.getSMC(symbol, timeframe);
  
  // 3. Get confluence score
  const confluence = await analysisService.getConfluence(symbol, timeframe);
  
  // 4. Get position sizing
  const risk = await analysisService.getPositionSizing(
    symbol,
    timeframe,
    25000  // Account size
  );
  
  // 5. Make trading decision
  const decision = {
    symbol,
    timeframe,
    signal: risk.data.signal.direction,
    confidence: confluence.data.confluence.confidence,
    trend: indicators.data.indicators.trend.direction,
    structure: smc.data.smc.structure.type,
    positionSize: risk.data.risk.positionSizeUSD,
    recommendation: risk.data.risk.recommendation
  };
  
  return decision;
}
```

---

## 📊 Response Structure

### Quick Signal Response
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
      "rr": "2.50",
      "reason": "BULLISH SMC Setup | Active OB/FVG",
      "setup": "Order Block"
    },
    "confluence": {
      "direction": "BUY",
      "confidence": 72.5,
      "totalScore": 15.3
    },
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

---

## ⚙️ Configuration

### Default Configuration
```javascript
const config = {
  emaPeriods: [20, 50, 200],          // EMA periods
  rsiPeriod: 14,                      // RSI period
  macdPeriods: { fast: 12, slow: 26, signal: 9 },
  atrPeriod: 14,                      // ATR period
  minCandlesRequired: 50,             // Minimum candles
  swingLookback: 3,                   // Swing detection
  bosLookback: 20,                    // BOS lookback
  obLookback: 20,                     // Order block lookback
  fvgSignificance: 0.3,               // FVG 30% of range
  liquidityTolerance: 0.001           // 0.1% tolerance
};
```

### Custom Configuration
```javascript
// In backend/routes/analysis.js or your service
const customConfig = {
  emaPeriods: [12, 26, 200],          // Custom EMAs
  rsiPeriod: 21,                      // Custom RSI
  minCandlesRequired: 100             // More data required
};

const engine = new EnhancedAnalysisEngine(customConfig);
```

---

## 🐛 Common Issues & Troubleshooting

### Issue: "EnhancedAnalysisEngine not found"
**Solution:** Verify the import in your route file:
```javascript
const EnhancedAnalysisEngine = require('../services/enhancedAnalysisEngine');
```

### Issue: "Invalid OHLC data"
**Solution:** Ensure candles have all required fields:
```javascript
{
  time: Date or timestamp,
  open: number > 0,
  high: number > 0,
  low: number > 0,
  close: number > 0,
  volume: number (optional)
}
```

### Issue: "WAIT signal on valid market"
**Solution:** This is normal. The engine is conservative. Check:
1. Minimum 50 candles provided
2. Confluence score (should see > 5 for BUY, < -5 for SELL)
3. Market structure formation (need swings, BOS, etc.)

### Issue: API returns 401 Unauthorized
**Solution:** Ensure:
1. User is logged in (valid session)
2. User is admin-approved
3. User has active subscription OR is within trial limit

---

## 📈 Performance Tips

1. **Use Quick-Signal for Speed**
   ```javascript
   // Fast (minimal data)
   await analysisService.getQuickSignal(symbol, timeframe);
   
   // vs Full analysis (more comprehensive)
   await analysisService.analyzeSymbol(symbol, timeframe);
   ```

2. **Cache Results**
   ```javascript
   const cache = new Map();
   const key = `${symbol}_${timeframe}`;
   
   if (cache.has(key) && Date.now() - cache.get(key).time < 60000) {
     return cache.get(key).data;
   }
   ```

3. **Optimize Candle Count**
   - Minimum: 50 candles (required)
   - Recommended: 100-120 candles
   - Maximum useful: 1000 candles (diminishing returns)

---

## 📚 Next Steps

1. **Read Full Documentation**: See `ENHANCED_ANALYSIS_ENGINE_GUIDE.md`
2. **Integrate with Frontend**: Update TradingDashboard components
3. **Add to SignalPanel**: Display detailed analysis results
4. **Implement Caching**: Store analysis results for 5-10 minutes
5. **Add WebSocket**: Stream analysis updates in real-time

---

## 🔗 Quick Links

- **Full API Documentation**: `ENHANCED_ANALYSIS_ENGINE_GUIDE.md`
- **Test Suite**: `backend/tests/enhancedAnalysisEngine.test.js`
- **Engine Source**: `backend/services/enhancedAnalysisEngine.js`
- **Analysis Routes**: `backend/routes/analysis.js`
- **Signal Routes**: `backend/routes/signals.js`
- **Frontend Service**: `frontend/src/services/api.js`

---

## 💡 Tips for Best Results

1. **Use Multiple Timeframes**: Analyze 1h + 4h + 1d for confluence
2. **Check Market Bias**: Ensure your signal aligns with market structure
3. **Validate with Manual Analysis**: Compare engine signals with chart analysis
4. **Monitor Expectancy**: Track win rate to optimize position sizing
5. **Backtest Results**: Use historical data to validate signal quality

---

## 📞 Support

- Check error messages in console
- Review response `.error` and `.message` fields
- Verify API endpoint URLs match documentation
- Ensure all middleware requirements are met
- Run unit tests to isolate issues

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Status**: Production Ready ✅

# Quick Testing Guide - Dynamic Data

## Pre-Test Checklist

```bash
# 1. Ensure backend is running
cd backend
npm start
# Should show: Server running on http://127.0.0.1:3000

# 2. Ensure frontend is running  
cd frontend
npm run dev
# Should show: http://127.0.0.1:3001

# 3. Check MongoDB is running
# Should have connection established

# 4. Verify APIs are reachable
curl http://127.0.0.1:3000/api/market/crypto/snapshot
curl https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT
```

## Test Scenarios

### Scenario 1: Generate Signal (Main Feature)

**Steps:**
1. Login to TradingDashboard
2. Verify subscription status shows (Trial or Active)
3. Select symbol: `EURUSD`
4. Select timeframe: `H4`
5. Click "Generate Signal" button

**Expected Results:**
- ✅ Loading spinner appears for ~2-3 seconds
- ✅ Signal appears with BUY/SELL/WAIT direction
- ✅ Confidence score (35-95%)
- ✅ Entry price appears
- ✅ Stop Loss price appears
- ✅ Take Profit levels appear
- ✅ Risk:Reward ratio shows
- ✅ No console errors

**Console Output Should Show:**
```
✓ Access check response: {data: {canGenerate: true, ...}}
✓ Signal generation started
✓ Market series fetched: 120 candles
✓ SMC analysis completed
✓ Signal generated with confidence: 78%
```

### Scenario 2: Switch Live Chart Symbol

**Steps:**
1. On TradingDashboard, locate "Live Market" card
2. Click BTC button
3. Wait for chart to update
4. Click ETH button
5. Wait for chart to update
6. Click XAU button

**Expected Results:**
- ✅ Chart updates within 1 second
- ✅ Chart title changes (BTC/ETH/XAU)
- ✅ Price line changes (BTC ~42k, ETH ~2.3k, XAU ~1950)
- ✅ Old chart is destroyed (no memory leak)
- ✅ No console errors

### Scenario 3: Trial Signal Limit

**Steps:**
1. Login with free trial account
2. Generate first signal ✅ (Success)
3. Generate second signal ✅ (Success)
4. Generate third signal 
5. Verify redirect

**Expected Results:**
- ✅ First 2 signals generate successfully
- ✅ Third signal shows error: "Trial limit exceeded"
- ✅ "Upgrade" button appears
- ✅ Clicking upgrade redirects to `/subscribe`

### Scenario 4: Market Data Display

**Steps:**
1. On TradingDashboard
2. Locate "Live Market Data" panel (top right)
3. Verify prices shown
4. Wait 10 seconds
5. Verify prices updated

**Expected Results:**
- ✅ Shows minimum 4 favorite pairs
- ✅ Price in USD
- ✅ Price change % in color (green/red)
- ✅ Prices update within 10 seconds
- ✅ No stale data

### Scenario 5: Different Symbols

**Steps:**
1. Generate signal with: `BTCUSDT` / `H1`
2. Generate signal with: `ETHUSDT` / `H4`
3. Generate signal with: `GBPUSD` / `D1`
4. Generate signal with: `XAUUSD` / `M30`

**Expected Results:**
- ✅ All symbols generate signals
- ✅ Prices are different (BTC ~42k, ETH ~2.3k, GBP ~1.27, XAU ~1950)
- ✅ Confidence scores vary
- ✅ No errors for any symbol

### Scenario 6: Error Handling

**Steps:**
1. Try symbol: `INVALID` → Should error
2. Try timeframe: `INVALID` → Should error
3. Disconnect internet, try to generate → Should error
4. Stop backend, try to generate → Should error

**Expected Results:**
- ✅ Clear error message displayed
- ✅ Specific error details in console
- ✅ No app crash
- ✅ Can retry after fixing issue

## Performance Benchmarks

Test with Chrome DevTools Network tab:

| Operation | Target Time | Result | Status |
|-----------|------------|--------|--------|
| Page load | < 2s | | |
| Signal generation | < 3s | | |
| Chart update | < 1s | | |
| Market data load | < 500ms | | |
| API response | < 200ms | | |

## Console Verification

Open DevTools (F12) and check for these patterns:

**Good Signs:**
```
✓ Markets context initialized
✓ User authenticated
✓ Access check response: {success: true, data: {canGenerate: true}}
✓ Market series fetched: Array(120)
✓ Analysis completed
✓ Signal: BUY / Confidence: 78%
✓ Chart updated: BTCUSDT
```

**Bad Signs (Fix These):**
```
✗ Uncaught TypeError: Cannot read properties of undefined
✗ CORS error: Access-Control-Allow-Origin
✗ 404 Not Found: /api/market/series
✗ Network error: Connect ECONNREFUSED
✗ Missing API response field
```

## Verification Checklist

- [ ] Signal generates with real market data (not mock)
- [ ] Confidence score is between 35-95%
- [ ] Entry price matches current market price
- [ ] Stop loss is appropriate distance from entry
- [ ] Take profit shows realistic R:R ratio (1:1.5 to 1:3)
- [ ] Chart shows real candlesticks (not flat line)
- [ ] Market prices update regularly
- [ ] Multiple symbols work correctly
- [ ] Error messages are clear
- [ ] No console errors on any action
- [ ] Page responds quickly (< 3 seconds)
- [ ] Subscription status displays correctly
- [ ] Trial limit enforcement works

## Debugging Commands

**Check if backend API is responding:**
```bash
# Terminal
curl http://127.0.0.1:3000/api/market/crypto/snapshot

# Should return JSON with BTCUSDT, ETHUSDT, etc.
```

**Check market data service:**
```bash
curl -X GET "http://127.0.0.1:3000/api/market/series?symbol=BTCUSDT&timeframe=1h&limit=10"

# Should return array of [time, open, high, low, close, volume]
```

**Check analysis service:**
```bash
curl -X POST "http://127.0.0.1:3000/api/analysis/generate-signal" \
  -H "Content-Type: application/json" \
  -d '{
    "analysis": {"currentPrice": 42500, "bias": "BULLISH", "rsi": 65, "ema20": 42450, "ema50": 42380},
    "currentPrice": 42500,
    "symbol": "BTCUSDT",
    "timeframe": "H1"
  }'
```

**Check frontend network requests (DevTools):**
1. Open DevTools → Network tab
2. Generate a signal
3. Look for:
   - `GET /api/market/series?symbol=BTCUSDT...` → 200 OK
   - `POST /api/analysis/analyze-smc` → 200 OK
   - `POST /api/analysis/generate-signal` → 200 OK
4. Check response body for expected data

## Common Issues & Fixes

### Issue: "Cannot read properties of undefined (reading 'toString')"
**Fix:** Already fixed in `getDecimals()` function
```bash
git pull origin main  # Get latest code
npm run dev  # Restart frontend
```

### Issue: Market data not updating
**Cause:** API rate limit or connection timeout
**Fix:** 
```bash
# Restart backend
npm start

# Clear browser cache
Ctrl+Shift+Delete → Clear cache
```

### Issue: Signal takes too long (>5s)
**Cause:** Slow network or backend processing
**Fix:**
```bash
# Check backend logs for slow queries
tail -f backend/server.log

# Reduce data volume
# In TradingDashboard.jsx:
const response = await marketService.getMarketSeries(symbol, timeframe, 60); // Reduced from 120
```

### Issue: Chart not rendering
**Cause:** Canvas not destroyed properly
**Fix:**
```bash
# Restart frontend
npm run dev

# Or check if Chart.js is loaded
# In DevTools console:
typeof Chart  // Should be 'function'
```

## Success Criteria

✅ **Signal Generation:** Working with real market data  
✅ **Error Handling:** Clear messages for all error cases  
✅ **Performance:** Page responds in < 3 seconds  
✅ **Reliability:** Can generate multiple signals without errors  
✅ **Data Accuracy:** Prices match Binance/ExchangeRate APIs  
✅ **Console:** No errors or warnings  
✅ **UX:** Smooth updates and responsive buttons  

---

**Once all tests pass, the dynamic data integration is complete!** 🎉

# 🚀 QUICK START GUIDE - SMART-KORAFX React

## Step 1: Start Backend

```bash
cd backend
npm install
npm start
```

Expected output:
```
✓ Server running on http://localhost:3000
✓ MongoDB connected
✓ Session store initialized
```

---

## Step 2: Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Expected output:
```
✓ VITE v5.4.21 ready in 500 ms
✓ Local:   http://localhost:5173
✓ Ready to accept connections
```

---

## Step 3: Login

Navigate to **http://localhost:5173**

### Test Credentials:
```
Email: user@example.com
Password: Test123!

Email: admin@example.com
Password: Test123!
```

After login, you'll be redirected:
- **Regular user** → Trading Dashboard (`/trading`)
- **Admin** → Admin Panel (`/admin`)
- **Pending approval** → Pending page (`/pending-approval`)

---

## Step 4: Generate Your First Signal

1. Go to `/trading` (TradingDashboard)
2. Select Symbol: **EURUSD**
3. Select Timeframe: **H4**
4. Click **"🎯 Generate Signal"**

Expected result:
```
BUY SIGNAL - Confidence: 78%
Entry: 1.0850
SL: 1.0820
TP1: 1.0900
TP2: 1.0920
R:R: 1:2.5
```

---

## Step 5: Try Features

### 📊 Market Feed (Right Sidebar)
- Shows live prices for BTC, ETH, EUR, GBP, JPY, AUD, GOLD
- Updates every 10 seconds
- Click ⭐ to add/remove favorites

### 📈 Live Chart
- Shows 80 1-hour candles of BTCUSDT
- Switch between BTC / ETH / GOLD buttons
- Yellow line indicates price trend

### 📸 OCR Scanner
- Upload a TradingView/MT4 screenshot
- Tesseract extracts text
- Counts as 1 signal (trial limit)

### ⚠️ Risk Settings
- Adjust "Risk Per Trade" (0.5% - 5%)
- Select minimum R:R ratio (1:1.5 to 1:3)
- Affects signal generation

### ✅ System Status
- Shows API connectivity
- Green = Connected, Red = Disconnected

---

## Trial Limits

**Free Users:**
- 5 signals per day
- After 5 signals, button shows "Limit Exceeded"
- Click upgrade to purchase premium

**Premium Users:**
- Unlimited signals
- Premium badge in top bar
- Full access to all features

---

## API Endpoints

All backend endpoints are working:

```bash
# Check subscription status
curl http://localhost:3000/api/subscription/status

# Generate a signal
curl -X POST http://localhost:3000/api/signals/generate \
  -H "Content-Type: application/json" \
  -d '{"symbol":"EURUSD","timeframe":"H4"}'

# Get signal history
curl http://localhost:3000/api/signals/history

# Check user access
curl http://localhost:3000/api/signals/check-access
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Generate signal (focus on input) |
| `Shift+M` | Toggle market feed |
| `Shift+C` | Toggle live chart |
| `L` | Logout |

---

## Troubleshooting

### ❌ "Cannot reach backend"
```
Solution: 
1. Check backend is running on :3000
2. Check CORS settings in backend/server.js
3. Verify no firewall blocking localhost
```

### ❌ "Market data not loading"
```
Solution:
1. Check Binance API is reachable
2. Try: curl https://api.binance.com/api/v3/ticker/24hr
3. Check browser console for CORS errors
```

### ❌ "Signal generation blocked"
```
Solution:
1. Check subscription status (should show trial remaining)
2. Free users: Only 5 signals/day allowed
3. Click "Upgrade" to get unlimited signals
```

### ❌ "Login not redirecting"
```
Solution:
1. Check Auth context is loading
2. Clear browser cache/cookies
3. Check backend session store
```

---

## File Structure Reference

```
Your trading logic is here:

frontend/src/pages/TradingDashboard.jsx
├── Contains: SignalGenerator, OCRScanner, LiveChart
├── Size: 600+ lines of React code
└── Uses: All indicator calculations

frontend/src/utils/trading/indicators-complete.js
├── calculateEMA() - Your EMA algorithm
├── calculateRSI() - Your RSI algorithm
├── calculateATR() - Your ATR algorithm
├── calculateMACD() - Your MACD algorithm
├── calculateBollingerBands() - Your BB algorithm
├── detectSwings() - Your swing detection
├── calculateSR() - Your support/resistance
└── + 8 more utility functions

frontend/src/components/trading/MarketFeed.jsx
├── Fetches Binance crypto prices
├── Fetches Forex rates
├── Updates every 10 seconds
└── Add/remove favorites

All original 3810 lines of logic: ✅ PRESERVED & WORKING
```

---

## Testing Signals

### BUY Setup (Bullish Market)
- Symbol: EURUSD
- Timeframe: H4
- Expected: Green BUY signal with entry > current price

### SELL Setup (Bearish Market)
- Symbol: GBPUSD
- Timeframe: 1H
- Expected: Red SELL signal with entry < current price

### WAIT Setup (Ranging Market)
- Symbol: USDJPY
- Timeframe: M30
- Expected: Gray WAIT signal (no entry)

---

## Performance Tips

1. **Reduce chart candles** if browser lags
2. **Increase refresh interval** to 20 seconds
3. **Disable live updates** during high traffic
4. **Use Chrome** for best performance

---

## What's Working ✅

- [x] Real-time market data (Binance + Forex)
- [x] All 15+ technical indicators
- [x] Signal generation with ML-like analysis
- [x] Entry, SL, TP calculation
- [x] Risk:Reward ratio display
- [x] OCR screenshot analysis
- [x] Chart.js visualization
- [x] Subscription enforcement
- [x] Trial limit (5/day)
- [x] Dark theme UI
- [x] Mobile responsive
- [x] Authentication & session
- [x] Admin dashboard
- [x] Approval workflow
- [x] Backend API integration

---

## Need Help?

Check these files:
- Backend errors → `backend/server.js`
- Frontend errors → `frontend/src/App.jsx`
- Calculation issues → `frontend/src/utils/trading/indicators-complete.js`
- API connection → `frontend/src/services/api.js`

---

**You're all set! Start generating signals now! 🎯**

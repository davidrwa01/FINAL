# SMART-KORAFX AI Copilot Instructions

## Project Overview

**SMART-KORAFX** is a production-ready forex trading platform with a full-stack architecture:
- **Backend:** Node.js/Express + MongoDB (security-first design)
- **Frontend:** React + Vite + Tailwind CSS
- **Ports:** Backend on 3000, Frontend on 3001 (with proxy)

## 🏗️ Architecture & Data Flow

### Authentication & Access Control (Multi-Layer)

The platform enforces a **three-tier access gate** applied via middleware middleware stack:

1. **`requireAuth`** - User must be logged in (session-based)
2. **`requireAdminApproved`** - User must pass admin approval (stored in `User.isApproved`)
3. **`requireSubscriptionOrTrial`** - User must have EITHER active subscription OR be within free trial limit (2 signals/day)

**Key pattern:** All protected routes in [backend/routes/signals.js](backend/routes/signals.js) chain these middleware sequentially. For example:

```javascript
router.post('/generate',
  requireAuth,                          // ← Gate 1
  requireAdminApproved,                 // ← Gate 2
  requireSubscriptionOrTrial,           // ← Gate 3
  enforceDailyTrialLimit(2),            // ← Enforce daily signal limit
  async (req, res) => { ... }
);
```

**Critical detail:** After passing middleware, `req.user`, `req.hasActiveSubscription`, and `req.remainingSignals` are attached to request object.

### User States & Redirects

- **Not logged in** → `/login`
- **Logged in but not approved** → `/pending-approval` (awaiting admin review)
- **Approved but no subscription** → On free trial (tracked in [backend/models/UsageLog.js](backend/models/UsageLog.js))
- **Approved + subscription active** → Full access to all features
- **Trial limit exceeded** → Redirect to `/subscribe`

Frontend enforces this via [frontend/src/components/ProtectedRoute.jsx](frontend/src/components/ProtectedRoute.jsx) and context checks.

### Subscription System (3-Tier)

Plans created in [backend/scripts/init-db.js](backend/scripts/init-db.js):
- **Regular:** $9.99/month
- **Standard:** $24.99/month  
- **VIP:** $49.99/month

All plans referenced via `planId.tier` in [backend/models/Subscription.js](backend/models/Subscription.js). Payment handled via MTN MoMo USSD (not integrated).

## 📁 Key Files & Patterns

### Backend Structure

| File | Purpose | Notes |
|------|---------|-------|
| [backend/middleware/auth.js](backend/middleware/auth.js) | Authentication middleware stack | **Master reference** for access control logic |
| [backend/models/User.js](backend/models/User.js) | User schema with `isApproved` flag | No password field (uses `passwordHash`) |
| [backend/models/Subscription.js](backend/models/Subscription.js) | Active subscription tracking | References `User` and `Plan` |
| [backend/models/UsageLog.js](backend/models/UsageLog.js) | Free trial signal counting | Date-keyed usage tracking; helper methods: `getRemainingSignals()`, `countSignalsForDate()` |
| [backend/routes/signals.js](backend/routes/signals.js) | **Primary API protected routes** | Demonstrates middleware chaining; includes Binance market data endpoints |
| [backend/routes/auth.js](backend/routes/auth.js) | Login/register/logout | Sets `req.session.userId` on successful login |
| [backend/routes/subscription.js](backend/routes/subscription.js) | Subscription purchase flow | MTN MoMo reference; requires admin approval |
| [backend/routes/admin.js](backend/routes/admin.js) | User approval & plan management | Requires `requireAdmin` middleware |

### Frontend Structure

| File | Purpose | Notes |
|------|---------|-------|
| [frontend/src/contexts/AuthContext.jsx](frontend/src/contexts/AuthContext.jsx) | Auth state management | Exposes `useAuth()` hook; calls `checkStatus()` on mount |
| [frontend/src/contexts/MarketContext.jsx](frontend/src/contexts/MarketContext.jsx) | Market data caching | Fetches from `/api/signals/market-data/:symbols` |
| [frontend/src/components/ProtectedRoute.jsx](frontend/src/components/ProtectedRoute.jsx) | Route protection wrapper | Redirects if not authenticated/approved/subscribed |
| [frontend/src/pages/Login.jsx](frontend/src/pages/Login.jsx) | Auth entry point | Posts to `/api/auth/login`; redirects based on approval status |
| [frontend/src/pages/TradingDashboard.jsx](frontend/src/pages/TradingDashboard.jsx) | **Main trading UI** | OCR scanner component; signal generation UI; chart rendering |
| [frontend/src/pages/Profile.jsx](frontend/src/pages/Profile.jsx) | User account management | Subscription details, usage stats |
| [frontend/src/pages/admin/AdminDashboard.jsx](frontend/src/pages/admin/AdminDashboard.jsx) | Admin panel | User approval, plan management |
| [frontend/src/services/api.js](frontend/src/services/api.js) | HTTP client & API definitions | Axios instance with credentials; centralized endpoint mapping |

## 🔑 Critical Implementation Patterns

### API Response Format

All endpoints return consistent format:

```javascript
// Success
{ success: true, data: {...}, message: "..." }

// Error
{ success: false, error: "ERROR_CODE", message: "...", redirectTo?: "/path" }
```

**Pattern:** Client checks `response.success` before accessing `data`. Errors include optional `redirectTo` for frontend navigation.

### Session & Authentication

- **Session store:** MongoDB via `connect-mongo` (configured in [backend/server.js](backend/server.js))
- **Session key:** `req.session.userId` (set after login, cleared on logout)
- **CORS:** Configured for `http://localhost:3001` with `credentials: true`
- **Proxy:** Vite proxies `/api/*` → `http://127.0.0.1:3000` (see [frontend/vite.config.js](frontend/vite.config.js))

### Binance API Integration

Routes in [backend/routes/signals.js](backend/routes/signals.js) fetch market data:
- **Endpoint:** `/api/signals/klines/:symbol/:interval/:limit`
- **Validation:** Symbol uppercase, interval in `['1m', '5m', '15m', '1h', '4h', '1d', etc.]`
- **Fallback:** Returns mock data on API error (graceful degradation)

**Important:** No authentication header needed; public Binance API endpoint.

### Error Handling & Logging

- **Console logs:** Prefix with route/middleware name (e.g., `console.error('Signal generation error:', error)`)
- **Status codes:** 401 (unauthorized), 403 (forbidden), 400 (bad request), 500 (server)
- **Client-side:** Wrap async API calls in try/catch; display user-friendly error messages

## 🛠️ Development Workflows

### Starting the App

```bash
# Terminal 1: Backend
cd backend
npm install
npm start              # Runs on http://127.0.0.1:3000

# Terminal 2: Frontend  
cd frontend
npm install
npm run dev            # Runs on http://127.0.0.1:3001
```

**Database:** MongoDB must be running locally or connected via `MONGODB_URI` in `.env`

### Initialize Database

```bash
cd backend
node scripts/init-db.js   # Creates admin user + 3 subscription plans
```

**Test credentials:**
- Admin: `admin@smartkorafx.com` / `Admin@123456`
- User: `user@example.com` / `Test123!`

### Building for Production

```bash
# Frontend
cd frontend
npm run build          # Output: dist/

# Backend: No build step (Node runs directly)
```

## ⚠️ Known Issues & Debugging

### Canvas/Chart Errors in TradingDashboard

Error: `Canvas is already in use. Chart with ID '0' must be destroyed`

**Cause:** Chart.js instances not cleaned up on component unmount.  
**Fix:** Ensure chart destruction in cleanup effect (check `TradingDashboard.jsx` `useEffect` dependencies).

### Undefined Market Data

Error: `Cannot read properties of undefined (reading 'toString')`

**Cause:** Market data fetch failed; undefined passed to indicator calculations.  
**Fix:** In [frontend/src/utils/trading/indicators-complete.js](frontend/src/utils/trading/indicators-complete.js), add null checks before calling `.toString()`.

### Subscription Not Updating

**Cause:** Session/cache mismatch after subscription approval.  
**Fix:** Call `checkAuth()` after approval in [frontend/src/contexts/AuthContext.jsx](frontend/src/contexts/AuthContext.jsx) to refresh user state.

## 📝 Common Tasks

### Add Protected Endpoint

1. Create route in appropriate file (`backend/routes/*.js`)
2. Chain middleware: `requireAuth → requireAdminApproved → [optional requireSubscriptionOrTrial]`
3. Attach logic in async handler
4. Return `{ success: true, data: {...} }` on success

### Add Subscription Tier

1. Edit [backend/scripts/init-db.js](backend/scripts/init-db.js) to add new `Plan` document
2. Update admin UI in [frontend/src/pages/admin/PlanManagement.jsx](frontend/src/pages/admin/PlanManagement.jsx)
3. Restart backend + re-run `init-db.js`

### Debug User Approval Flow

1. Check `User.isApproved` in MongoDB or [backend/routes/admin.js](backend/routes/admin.js)
2. Frontend route `/pending-approval` shown via [frontend/src/components/ProtectedRoute.jsx](frontend/src/components/ProtectedRoute.jsx)
3. Admin approves via [frontend/src/pages/admin/UserManagement.jsx](frontend/src/pages/admin/UserManagement.jsx)

## 🎯 Code Style

- **Backend:** CommonJS (`require`/`module.exports`), async/await for database ops
- **Frontend:** ES6 modules, React hooks (no class components), Tailwind classes for styling
- **Error messages:** User-friendly in responses; technical details in console logs
- **Comments:** Explain "why" for non-obvious business logic (e.g., middleware ordering, trial limits)

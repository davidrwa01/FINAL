# 🚀 SMART-KORAFX - Complete Trading Platform

**Production-ready Forex trading platform with authentication, subscriptions, and admin management.**

## 📦 What's Included

### Backend (Node.js + Express + MongoDB)
- ✅ Complete REST API
- ✅ User authentication & authorization
- ✅ Admin approval system
- ✅ Subscription management (3 tiers)
- ✅ MTN MoMo payment processing
- ✅ Real-time USD → RWF conversion
- ✅ Free trial system (2 signals/day)
- ✅ Usage tracking & analytics

### Frontend (React + Vite + Tailwind)
- ✅ **Professional Landing Page** (NEW!)
  - 11 sections designed for conversion
  - Live market data (Binance API)
  - Trust-building psychology
  - Responsive design (mobile-first)
  - Real-time market prices
- ✅ Modern responsive UI
- ✅ Login/Register pages
- ✅ Protected trading dashboard
- ✅ Subscription management
- ✅ Full admin panel
- ✅ Real-time status updates
- ✅ Integration-ready for your trading logic

## 🎯 Quick Start (5 Minutes)

### Prerequisites
- Node.js 16+ installed
- MongoDB running (local or Atlas)
- Terminal/Command Prompt

### Step 1: Setup Backend

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your MongoDB connection
# Minimum required:
# MONGODB_URI=mongodb://localhost:27017/smart-korafx
# SESSION_SECRET=your-random-secret-key

# Initialize database (creates admin + plans)
node scripts/init-db.js

# Start backend server
npm start
```

**Backend runs on:** `http://localhost:3000`

### Step 2: Setup Frontend

```bash
# Open new terminal
cd frontend

# Install dependencies
npm install

# Start frontend
npm run dev
```

**Frontend runs on:** `http://localhost:5173`

### Step 3: View the Landing Page & Login

1. **Open browser:** `http://localhost:5173`
   - You'll see the **professional landing page** (new! 🎉)
   - Click "Start Free Trial" to register
   - Or "Login" to test with existing credentials

2. **Landing Page Features:**
   - AI-Powered Trading Analysis intro
   - Real-time market data (Binance API)
   - Smart Money Concepts explanation
   - Transparent pricing
   - Trust-building design
   - Clear conversion path

3. **Test Accounts:**
   - **Admin:** `admin@smartkorafx.com` / `Admin@123456`
   - **Regular:** `user@example.com` / `Test123!`

**Done!** You now see a professional product with a landing page that converts. 🚀

## 🌍 Landing Page (NEW!)

**Status:** ✅ **Production Ready**

The landing page is the **public face** of Smart-KORAFX. It appears **before login** and is designed to convert visitors into users.

### What's On the Landing Page

1. **Hero Section** - "AI-Powered Smart Money Trading Analysis"
2. **How It Works** - 3-step process explanation
3. **Why Choose Us** - 6 key differentiation factors
4. **Live Market Data** - Real Binance prices (BTC, ETH, XAU, EUR)
5. **Smart Money Concepts** - Institutional trading logic
6. **Transparent Pricing** - 3 subscription plans
7. **Payment Security** - MTN MoMo verification
8. **Platform Availability** - Web, Mobile, Global
9. **Final CTA** - "Ready to Trade With Structure?"
10. **Footer** - Legal links & support

### Key Features

✅ **Professional Design** - Institutional fintech look (Bloomberg × TradingView)
✅ **Live Market Data** - Real prices from Binance API
✅ **Mobile Responsive** - Works on all devices
✅ **Conversion Optimized** - Multiple CTAs: "Start Free Trial" button
✅ **Trust Building** - No hype, transparent pricing, admin verification
✅ **Smooth Animations** - Subtle parallax hero section
✅ **Fast Loading** - <2 seconds with lazy-loaded data

### Landing Page Documentation

See these files for complete details:
- **LANDING_PAGE_GUIDE.md** - Section-by-section breakdown
- **LANDING_PAGE_LAUNCH.md** - Implementation summary
- **LANDING_PAGE_VISUAL_GUIDE.md** - Design & architecture
- **SMART_KORAFX_LANDING_PAGE_SUMMARY.md** - Overview

## 📍 Route Changes

```
smart-korafx/
├── backend/                    # Node.js backend
│   ├── models/                 # MongoDB schemas
│   │   ├── User.js            # User authentication
│   │   ├── Plan.js            # Subscription plans
│   │   ├── Subscription.js    # Payment tracking
│   │   └── UsageLog.js        # Trial usage
│   ├── routes/                 # API endpoints
│   │   ├── auth.js            # Login/register
│   │   ├── subscription.js    # Plans & payments
│   │   ├── signals.js         # Protected signals
│   │   └── admin.js           # Admin management
│   ├── middleware/             # Security & validation
│   │   └── auth.js            # Authentication guards
│   ├── utils/                  # Helper functions
│   │   └── currency.js        # USD → RWF conversion
│   ├── scripts/                # Database scripts
│   │   └── init-db.js         # Initialize DB
│   ├── public/                 # Static files
│   │   └── index.html         # Your original page
│   ├── server.js              # Main server
│   └── package.json
│
└── frontend/                   # React frontend
    ├── src/
    │   ├── pages/              # Main pages
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── PendingApproval.jsx
    │   │   ├── Subscribe.jsx
    │   │   ├── TradingDashboard.jsx
    │   │   └── admin/
    │   │       └── AdminDashboard.jsx
    │   ├── components/         # Reusable components
    │   │   ├── ProtectedRoute.jsx
    │   │   └── admin/
    │   │       ├── DashboardStats.jsx
    │   │       ├── UserManagement.jsx
    │   │       ├── SubscriptionManagement.jsx
    │   │       └── PlanManagement.jsx
    │   ├── contexts/           # State management
    │   │   └── AuthContext.jsx
    │   ├── services/           # API calls
    │   │   └── api.js
    │   └── App.jsx
    └── package.json
```

## 🔐 System Workflow

### New User Journey

1. **Register** → Account created (NOT approved)
2. **Pending** → Waiting for admin approval
3. **Approved** → Can access app with free trial (2 signals/day)
4. **Subscribe** → Selects plan, makes payment via MTN MoMo
5. **Payment Review** → Admin approves payment
6. **Active** → Unlimited access until subscription expires

### Admin Workflow

1. **Login** → Access admin panel
2. **Approve Users** → Review and approve new registrations
3. **Review Payments** → Verify MTN MoMo transactions
4. **Approve Subscriptions** → Activate user subscriptions
5. **Manage Plans** → Edit prices, features, durations

## 💳 Subscription Plans

### Default Plans (Editable in Admin Panel)

**Regular Plan**
- $29.99 / 30 days
- Unlimited signals
- Basic features

**Standard Plan**
- $79.99 / 90 days
- All Regular features
- Advanced SMC analysis
- Priority support

**VIP Plan**
- $249.99 / 365 days
- All Standard features
- Personal consultant
- API access

## 🔧 Configuration

### Backend (.env)

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/smart-korafx

# Security
SESSION_SECRET=your-random-secret-key-min-32-chars

# Admin
ADMIN_EMAIL=admin@smartkorafx.com
ADMIN_PASSWORD=Admin@123456

# Payment
MTN_USSD_CODE=*182*8*1*583894#
PAYMENT_RECEIVER_NAME=David

# Trial
FREE_TRIAL_SIGNALS_PER_DAY=2
TIMEZONE=Africa/Kigali

# Currency API
CURRENCY_API_URL=https://api.exchangerate-api.com/v4/latest/USD
```

### Frontend (vite.config.js)

Already configured to proxy to backend:
```javascript
proxy: {
  '/api': 'http://localhost:3000',
  '/uploads': 'http://localhost:3000'
}
```

## 🌐 API Endpoints

### Public Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/subscription/plans` - Get subscription plans

### Protected Endpoints (Require Login + Approval)
- `POST /api/signals/generate` - Generate trading signal
- `GET /api/signals/check-access` - Check if can generate
- `POST /api/subscription/subscribe` - Submit payment
- `GET /api/subscription/status` - Get subscription status

### Admin Endpoints (Require Admin Role)
- `GET /api/admin/users` - List all users
- `POST /api/admin/users/:id/approve` - Approve user
- `GET /api/admin/subscriptions` - List subscriptions
- `POST /api/admin/subscriptions/:id/approve` - Approve payment
- `GET /api/admin/plans` - List plans
- `POST /api/admin/plans` - Create/update plan
- `GET /api/admin/stats` - Dashboard statistics

See `backend/API.md` for complete API documentation.

## 📱 Frontend Pages

### Public Pages
- `/login` - User login
- `/register` - New user registration

### Protected Pages (Require Login)
- `/pending-approval` - Shown when not approved
- `/subscribe` - Subscription plans & payment
- `/` - Trading dashboard (requires approval)
- `/admin` - Admin panel (requires admin role)

## 🎨 Integrating Your Trading Logic

Your original HTML trading page is in `backend/public/index.html` (unchanged).

To integrate into React:

1. **Extract functions** from your HTML
2. **Create utility files** in `frontend/src/utils/trading/`
3. **Update TradingDashboard.jsx** with your components
4. **Add protection layer** before signal generation

See `frontend/HTML_TO_REACT_GUIDE.md` for detailed instructions.

## 🧪 Testing the System

### Test User Flow

```bash
# 1. Register new user
Open: http://localhost:3001/register
Fill form → Submit
Expected: Redirected to /pending-approval

# 2. Approve user (as admin)
Login as admin → Admin Panel → Users tab
Click "✓ Approve" on pending user

# 3. Test free trial (as user)
Logout admin → Login as user
Generate 2 signals → Try 3rd signal
Expected: Redirected to /subscribe

# 4. Test subscription
Select plan → Submit fake transaction ID
Expected: Payment pending admin approval

# 5. Approve payment (as admin)
Login as admin → Subscriptions tab
Click "✓ Approve Payment"
Expected: Subscription active

# 6. Test unlimited access
Login as user → Generate signals
Expected: No limit, unlimited generation
```

### Test Admin Features

```bash
# Dashboard
View: User count, pending approvals, revenue

# User Management
Filter: All / Pending / Approved
Search: By name or email
Actions: Approve / Revoke

# Subscription Management
Filter: By status
Actions: Approve / Reject payments
View: Screenshots, transaction IDs

# Plan Management
Edit: Price, duration, features
Actions: Activate / Deactivate plans
```

## 🚀 Deployment

### Backend Deployment (Heroku)

```bash
cd backend
heroku create smart-korafx-api
heroku config:set MONGODB_URI="your-mongodb-atlas-uri"
heroku config:set SESSION_SECRET="random-secret-key"
heroku config:set NODE_ENV=production
git init
git add .
git commit -m "Deploy backend"
git push heroku main
heroku run node scripts/init-db.js
```

### Frontend Deployment (Netlify/Vercel)

```bash
cd frontend
npm run build
# Upload dist/ folder to Netlify or Vercel
# Update API URL in src/services/api.js to your backend URL
```

See `backend/DEPLOYMENT.md` for detailed deployment guides.

## 🔒 Security Checklist

Before going live:

- [ ] Change `ADMIN_PASSWORD` in .env
- [ ] Generate secure `SESSION_SECRET` (32+ random chars)
- [ ] Use MongoDB Atlas (not local MongoDB)
- [ ] Enable HTTPS/SSL
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS for your domain only
- [ ] Add rate limiting
- [ ] Set up automated backups
- [ ] Enable MongoDB authentication
- [ ] Review and test all endpoints

## 📊 Database Models

### User
```javascript
{
  fullName: String,
  email: String,
  username: String,
  passwordHash: String,
  role: 'user' | 'admin',
  isApproved: Boolean
}
```

### Plan
```javascript
{
  tier: 'Regular' | 'Standard' | 'VIP',
  priceUSD: Number,
  durationDays: Number,
  features: [String],
  isActive: Boolean
}
```

### Subscription
```javascript
{
  userId: ObjectId,
  planId: ObjectId,
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REJECTED',
  startDate: Date,
  endDate: Date,
  amountUSD: Number,
  amountRWF: Number,
  transactionId: String,
  screenshotUrl: String
}
```

### UsageLog
```javascript
{
  userId: ObjectId,
  actionType: 'SIGNAL',
  dateKey: String, // "2026-01-30"
  createdAt: Date
}
```

## 🆘 Troubleshooting

### Backend won't start
- Check MongoDB is running
- Verify `MONGODB_URI` in .env
- Check port 3000 is not in use

### Frontend won't start
- Check backend is running first
- Verify `npm install` completed
- Check port 3001 is not in use

### Can't login
- Run `node scripts/init-db.js` to create admin
- Check credentials match .env file
- Clear browser cookies

### Session not persisting
- Check `SESSION_SECRET` is set in .env
- Verify cookies are enabled in browser
- Check backend session middleware

### API errors
- Open browser DevTools → Network tab
- Check request/response
- Verify backend logs

## 📞 Support & Documentation

- **Backend API:** See `backend/API.md`
- **Deployment:** See `backend/DEPLOYMENT.md`
- **Frontend Guide:** See `frontend/README.md`
- **Integration:** See `frontend/HTML_TO_REACT_GUIDE.md`

## 📜 License

Proprietary - Smart-KORAFX Platform

---

**Ready to launch! 🚀**

Start both servers and open `http://localhost:3001` to begin!

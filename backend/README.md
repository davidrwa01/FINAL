# 🔒 Smart-KORAFX Backend Security System

Complete Node.js backend security, subscription management, and access control system for Smart-KORAFX trading app.

## ✨ Features

### 🔐 Authentication & Authorization
- User registration and login
- Admin approval requirement
- Session-based authentication
- Role-based access control (user/admin)

### 💳 Subscription System
- Three-tier plans: Regular, Standard, VIP
- MTN MoMo USSD payment flow
- Real-time USD to RWF currency conversion
- Manual admin approval for subscriptions
- Payment screenshot upload (optional)

### 🆓 Free Trial System
- 2 signals per day for non-subscribed users
- Automatic daily limit enforcement
- Usage tracking and statistics
- Timezone-aware date tracking

### 👨‍💼 Admin Panel
- User approval management
- Subscription request review (approve/reject)
- Plan management (create, edit, activate/deactivate)
- Usage statistics and revenue tracking
- Dashboard with real-time stats

### 🛡️ Protected Page Access
Your original `index.html` is protected with multi-layer security:
1. ✅ Must be logged in
2. ✅ Must be admin-approved
3. ✅ Must have active subscription OR be within trial limits

## 📋 Requirements

- Node.js 16+ and npm
- MongoDB 5.0+
- Internet connection for currency API

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/smart-korafx
SESSION_SECRET=your-super-secret-session-key-change-this
ADMIN_EMAIL=admin@smartkorafx.com
ADMIN_PASSWORD=Admin@123456
```

### 3. Initialize Database

```bash
node scripts/init-db.js
```

This creates:
- Default admin user
- Three subscription plans (Regular, Standard, VIP)

### 4. Start Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server will start on `http://localhost:3000`

## 🎯 API Endpoints

### Authentication (`/api/auth`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login user |
| `/api/auth/logout` | POST | Logout user |
| `/api/auth/status` | GET | Check authentication status |

### Subscription (`/api/subscription`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/subscription/plans` | GET | No | Get active plans with RWF prices |
| `/api/subscription/subscribe` | POST | Yes | Submit subscription request |
| `/api/subscription/status` | GET | Yes | Get user's subscription status |
| `/api/subscription/history` | GET | Yes | Get subscription history |

### Signals (`/api/signals`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/signals/generate` | POST | Yes + Approved | Generate signal (protected) |
| `/api/signals/check-access` | GET | Yes + Approved | Check if user can generate signal |
| `/api/signals/usage-stats` | GET | Yes + Approved | Get usage statistics |

### Admin (`/api/admin`)

All admin endpoints require admin authentication.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/users` | GET | Get all users |
| `/api/admin/users/:id/approve` | POST | Approve user |
| `/api/admin/users/:id/reject` | POST | Reject/revoke user |
| `/api/admin/users/:id` | GET | Get user details |
| `/api/admin/subscriptions` | GET | Get all subscriptions |
| `/api/admin/subscriptions/:id/approve` | POST | Approve subscription |
| `/api/admin/subscriptions/:id/reject` | POST | Reject subscription |
| `/api/admin/plans` | GET | Get all plans |
| `/api/admin/plans` | POST | Create/update plan |
| `/api/admin/plans/:id/toggle` | PATCH | Toggle plan active status |
| `/api/admin/stats` | GET | Get dashboard statistics |

## 🔑 Access Control Flow

### For Regular Users:

1. **Register** → Account created (not approved)
2. **Wait for Admin Approval** → Can login but see "Pending Approval" page
3. **Admin Approves** → Can access app with free trial (2 signals/day)
4. **Subscribe** → Submit payment, wait for admin approval
5. **Admin Approves Subscription** → Unlimited access

### For Admins:

1. Login with admin credentials
2. Access admin panel at `/admin` routes
3. Approve/reject users
4. Review subscription payments
5. Manage plans and view statistics

## 💰 MTN MoMo Payment Flow

### User Experience:

1. User selects plan on `/subscribe` page
2. System displays:
   - USSD code: `*182*8*1*583894#`
   - Receiver name: **David**
   - Amount in USD and RWF (real-time conversion)
3. User dials USSD code and makes payment
4. User submits:
   - Transaction ID (required)
   - Screenshot (optional)
5. Request goes to admin for review
6. Admin approves → Subscription becomes ACTIVE

### Admin Review:

1. Check `/api/admin/subscriptions?status=PENDING`
2. Verify transaction ID
3. Approve or reject with reason
4. System automatically sets start/end dates

## 📊 Database Models

### User
```javascript
{
  fullName: String,
  email: String,
  username: String,
  passwordHash: String,
  role: 'user' | 'admin',
  isApproved: Boolean,
  approvedBy: ObjectId,
  approvedAt: Date
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
  exchangeRate: Number,
  transactionId: String,
  screenshotUrl: String,
  adminReviewedBy: ObjectId
}
```

### UsageLog
```javascript
{
  userId: ObjectId,
  actionType: 'SIGNAL',
  dateKey: String, // "2026-01-30"
  metadata: Object
}
```

## 🎨 Frontend Integration

### Protecting Your Existing Page

Your original `index.html` is now automatically protected. When a user visits `/`:

1. Backend checks authentication
2. Redirects to `/login` if not logged in
3. Redirects to `/pending-approval` if not approved
4. Checks subscription/trial limits
5. Redirects to `/subscribe` if trial exceeded
6. Serves `index.html` if all checks pass

### Adding API Calls to Your Page

Modify your existing signal generation function to call the backend:

```javascript
// Before generating a signal, check access
async function generateSignal() {
  try {
    // Check if user can generate signal
    const checkResponse = await fetch('/api/signals/check-access');
    const checkData = await checkResponse.json();
    
    if (!checkData.data.canGenerate) {
      alert(checkData.data.trial?.message || 'Cannot generate signal');
      window.location.href = '/subscribe';
      return;
    }
    
    // User can generate - proceed with your signal logic
    // ... your existing signal generation code ...
    
    // Log the usage
    await fetch('/api/signals/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: selectedSymbol,
        timeframe: selectedTimeframe
      })
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### Displaying User Status

Add this to your HTML to show subscription status:

```javascript
async function loadUserStatus() {
  const response = await fetch('/api/subscription/status');
  const data = await response.json();
  
  if (data.success) {
    const status = data.data;
    
    if (status.hasActiveSubscription) {
      console.log('Active subscription:', status.activeSubscription.plan);
    } else {
      console.log('Free trial:', status.trial.remaining, 'signals remaining');
    }
  }
}
```

## 🔧 Configuration

### Trial Limits

Default: 2 signals per day. Change in `.env`:

```env
FREE_TRIAL_SIGNALS_PER_DAY=3
```

### Timezone

Default: Africa/Kigali. Change in `.env`:

```env
TIMEZONE=Africa/Nairobi
```

### Currency API

Uses free exchange rate API. Can change in `.env`:

```env
CURRENCY_API_URL=https://api.exchangerate-api.com/v4/latest/USD
```

### Session Duration

Default: 7 days. Modify in `server.js`:

```javascript
cookie: {
  maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
}
```

## 📱 Default Credentials

### Admin Account
- Email: `admin@smartkorafx.com`
- Password: `Admin@123456`

⚠️ **CHANGE THESE IN PRODUCTION!**

### Default Plans
- **Regular**: $29.99 / 30 days
- **Standard**: $79.99 / 90 days
- **VIP**: $249.99 / 365 days

## 🛡️ Security Features

- Bcrypt password hashing
- Session-based authentication
- MongoDB session store
- CSRF protection (via SameSite cookies)
- Rate limiting ready
- Input validation
- SQL injection protection (NoSQL)
- XSS protection (via proper escaping)

## 📝 License

This backend security system is proprietary to Smart-KORAFX.

## 🤝 Support

For issues or questions, contact the development team.

---

**Built for Smart-KORAFX** | Secure • Scalable • Professional

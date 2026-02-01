# 🚀 Smart-KORAFX React Frontend

Modern React frontend for Smart-KORAFX trading platform with complete authentication, subscription management, and protected trading interface.

## ✨ Features

### 🔐 Authentication System
- User registration with validation
- Login/logout functionality
- Session management with cookies
- Automatic redirect based on user status

### 👥 User Access Control
- Admin approval requirement
- Pending approval page
- Protected routes with middleware
- Role-based access (user/admin)

### 💳 Subscription Management
- View subscription plans with real-time USD to RWF conversion
- MTN MoMo USSD payment flow
- Payment submission with transaction ID
- Screenshot upload (optional)
- Subscription status display
- Payment history

### 🆓 Free Trial System
- 2 signals per day for non-subscribed users
- Real-time trial limit display
- Automatic redirect when limit exceeded
- Usage statistics

### 📊 Trading Dashboard
- Protected trading interface
- Signal generation with access control
- Subscription status display
- Trial limits enforcement
- Integration point for your original trading logic

## 📋 Requirements

- Node.js 16+ and npm
- Backend API running on `http://localhost:3000`

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

Frontend runs on: **http://localhost:3001**

### 3. Build for Production

```bash
npm run build
```

## 🏗️ Project Structure

```
smart-korafx-frontend/
├── src/
│   ├── components/
│   │   └── ProtectedRoute.jsx      # Route protection component
│   ├── contexts/
│   │   └── AuthContext.jsx         # Authentication state management
│   ├── pages/
│   │   ├── Login.jsx               # Login page
│   │   ├── Register.jsx            # Registration page
│   │   ├── PendingApproval.jsx     # Waiting for approval
│   │   ├── Subscribe.jsx           # Subscription plans & payment
│   │   └── TradingDashboard.jsx    # Main trading interface
│   ├── services/
│   │   └── api.js                  # Backend API communication
│   ├── App.jsx                     # Main app with routing
│   ├── main.jsx                    # Entry point
│   └── index.css                   # Styles with Tailwind
├── index.html
├── package.json
├── vite.config.js                  # Vite configuration
└── tailwind.config.js              # Tailwind configuration
```

## 🔄 How It Works

### Authentication Flow

1. **User visits `/`**
   - Not logged in → Redirect to `/login`
   - Logged in but not approved → Redirect to `/pending-approval`
   - Logged in + approved → Access trading dashboard

2. **Registration**
   - Fill form → Submit to backend
   - Account created (not approved)
   - Redirect to `/pending-approval`

3. **Admin Approval**
   - Admin approves user in backend
   - User can now access trading features

### Subscription Flow

1. **Free Trial**
   - User gets 2 signals per day
   - Backend tracks usage per user per day
   - After 2 signals → Redirect to `/subscribe`

2. **Subscription**
   - User selects plan
   - System shows:
     - USSD code: `*182*8*1*583894#`
     - Receiver: David
     - Amount in USD & RWF (real-time conversion)
   - User makes payment via MTN MoMo
   - User submits transaction ID + screenshot
   - Request goes to admin for approval

3. **Active Subscription**
   - Admin approves payment
   - User gets unlimited signals
   - Subscription active until end date

### Signal Generation Protection

Before generating any signal:

```javascript
const generateSignal = async () => {
  // Check if user can generate
  const allowed = await onSignalGeneration({
    symbol: selectedSymbol,
    timeframe: selectedTimeframe,
    signalType: 'BUY'
  });
  
  if (!allowed) {
    // Trial limit exceeded
    return;
  }
  
  // Proceed with signal generation
  // ... your original logic ...
};
```

## 🔧 Integration with Your Original Code

### Step 1: Add Your Trading Logic

Open `src/pages/TradingDashboard.jsx` and replace the `TradingInterface` component with your original trading logic.

### Step 2: Convert to React

Your original code structure:
```javascript
// Vanilla JS
let selectedSymbol = 'EURUSD';
document.getElementById('symbolSelect').addEventListener('change', (e) => {
  selectedSymbol = e.target.value;
});
```

Convert to React:
```javascript
// React
const [selectedSymbol, setSelectedSymbol] = useState('EURUSD');

<select 
  value={selectedSymbol}
  onChange={(e) => setSelectedSymbol(e.target.value)}
>
  {/* options */}
</select>
```

### Step 3: Protect Signal Generation

Before any signal generation, add:

```javascript
const handleGenerateSignal = async () => {
  // Check access
  const allowed = await onSignalGeneration({
    symbol: selectedSymbol,
    timeframe: selectedTimeframe,
    signalType: signalDirection
  });
  
  if (!allowed) {
    // Trial limit exceeded - user will be redirected
    return;
  }
  
  // Your original signal generation code
  const signal = analyzeMarket(chartData);
  displaySignal(signal);
  // ... etc
};
```

### Step 4: Keep Your Original Functions

All your original functions can stay the same:
- `analyzeMarket()`
- `calculateSMC()`
- `detectStructure()`
- `extractOCR()`
- etc.

Just wrap them in React components and add the protection layer.

## 🎨 Styling

Uses Tailwind CSS with custom color scheme matching your original design:
- Yellow: `#FFD700`
- Black: `#0B0B0B`
- Green: `#00D26A`
- Red: `#FF4757`

Custom classes available:
- `.glow-yellow` - Yellow glow effect
- `.glow-green` - Green glow effect
- `.signal-card` - Signal card styling
- `.loading-bar` - Loading animation
- `.spinner` - Loading spinner

## 📡 API Integration

All API calls go through `src/services/api.js`:

```javascript
import { signalService, subscriptionService, authService } from '../services/api';

// Check if user can generate signal
const response = await signalService.checkAccess();

// Submit signal generation
await signalService.generate({ symbol, timeframe, signalType });

// Get subscription status
const status = await subscriptionService.getStatus();

// Get plans
const plans = await subscriptionService.getPlans();
```

## 🔒 Security Features

- Session-based authentication with httpOnly cookies
- Protected routes with automatic redirects
- API calls with credentials included
- CSRF protection via SameSite cookies
- Input validation on all forms
- XSS protection via React

## 🚢 Deployment

### Build for Production

```bash
npm run build
```

This creates a `dist/` folder with optimized files.

### Deploy Options

**Option 1: Serve with Backend**
```bash
# Build frontend
npm run build

# Copy to backend public folder
cp -r dist/* ../smart-korafx-backend/public/
```

**Option 2: Separate Deployment (Netlify, Vercel)**
```bash
# Build
npm run build

# Deploy dist/ folder to hosting service
# Update API proxy configuration in vite.config.js
```

## ⚙️ Configuration

### Backend API URL

Development (via proxy):
- Configured in `vite.config.js`
- Proxies `/api` and `/uploads` to `http://localhost:3000`

Production:
- Update `src/services/api.js` baseURL
- Or use environment variables

### Environment Variables

Create `.env` file:

```env
VITE_API_URL=http://localhost:3000/api
```

Use in code:
```javascript
const apiUrl = import.meta.env.VITE_API_URL;
```

## 🧪 Testing

### Test Authentication

1. Register new user
2. Should see "Pending Approval" page
3. Have admin approve user (via backend API)
4. Refresh page - should see trading dashboard

### Test Trial Limits

1. Generate 2 signals
2. Try to generate 3rd signal
3. Should redirect to `/subscribe`

### Test Subscription

1. Go to `/subscribe`
2. Select plan
3. Submit fake transaction ID
4. Admin approve subscription (via backend)
5. Return to dashboard - should see "Plan Active"

## 📞 Support

For issues or questions:
- Check backend is running on port 3000
- Check browser console for errors
- Verify API responses in Network tab
- Ensure cookies are enabled

## 🔄 Updates

To update dependencies:
```bash
npm update
```

To add new packages:
```bash
npm install package-name
```

---

**Built for Smart-KORAFX** | Secure • Modern • Fast

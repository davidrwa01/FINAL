const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// ==================== MIDDLEWARE ====================

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

app.use(cors({
  origin: [
    'http://localhost:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
  ],
  credentials: true
}));

// Trust proxy (important for correct IP detection behind reverse proxy)
app.set('trust proxy', 1);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-super-secret-session-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600 // Lazy session update (24 hours)
  }),
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  }
}));

// Static files
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Serve the protected HTML page
app.use(express.static('public'));

// ==================== ROUTES ====================

// Import route handlers
const authRoutes = require('./routes/auth');
const subscriptionRoutes = require('./routes/subscription');
const signalRoutes = require('./routes/signals');
const adminRoutes = require('./routes/admin');
const marketRoutes = require('./routes/market');
const analysisRoutes = require('./routes/analysis');

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Smart-KORAFX Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/signals', signalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/analysis', analysisRoutes);

// ==================== PROTECTED PAGE ROUTES ====================

const { 
  requireAuth, 
  requireAdminApproved, 
  requireSubscriptionOrTrial,
  attachUserInfo 
} = require('./middleware/auth');

// Serve index.html (protected page) with access control
app.get('/', 
  attachUserInfo,
  async (req, res, next) => {
    // If not logged in, redirect to login page
    if (!req.user) {
      return res.redirect('/login');
    }

    // If not approved, redirect to pending approval page
    if (!req.user.isApproved) {
      return res.redirect('/pending-approval');
    }

    // Check subscription/trial status
    const Subscription = require('./models/Subscription');
    const UsageLog = require('./models/UsageLog');
    
    const activeSubscription = await Subscription.findActiveForUser(req.user._id);
    const hasSubscription = activeSubscription && activeSubscription.isCurrentlyActive();
    
    if (!hasSubscription) {
      // User is on trial - check if they've exceeded limit
      const dailyLimit = parseInt(process.env.FREE_TRIAL_SIGNALS_PER_DAY) || 2;
      const exceeded = await UsageLog.hasExceededDailyLimit(req.user._id, dailyLimit);
      
      if (exceeded) {
        return res.redirect('/subscribe');
      }
    }

    // User has access - serve the protected page
    next();
  },
  (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
);

// Login page (you would create this)
app.get('/login', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Login - Smart-KORAFX</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          background: #0B0B0B; 
          color: white; 
          display: flex; 
          justify-content: center; 
          align-items: center; 
          height: 100vh; 
          margin: 0;
        }
        .login-container { 
          background: #1A1A1A; 
          padding: 40px; 
          border-radius: 10px; 
          max-width: 400px; 
          width: 100%;
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
        }
        h1 { color: #FFD700; text-align: center; margin-bottom: 30px; }
        input { 
          width: 100%; 
          padding: 12px; 
          margin: 10px 0; 
          background: #252525; 
          border: 1px solid #333; 
          color: white; 
          border-radius: 5px;
          box-sizing: border-box;
        }
        button { 
          width: 100%; 
          padding: 12px; 
          background: #FFD700; 
          color: #0B0B0B; 
          border: none; 
          border-radius: 5px; 
          font-weight: bold; 
          cursor: pointer; 
          margin-top: 20px;
        }
        button:hover { background: #E6C200; }
        .error { color: #FF4757; margin: 10px 0; }
        .success { color: #00D26A; margin: 10px 0; }
        a { color: #FFD700; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .link-container { text-align: center; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="login-container">
        <h1>🔐 Login to Smart-KORAFX</h1>
        <div id="message"></div>
        <form id="loginForm">
          <input type="text" id="emailOrUsername" placeholder="Email or Username" required>
          <input type="password" id="password" placeholder="Password" required>
          <button type="submit">Login</button>
        </form>
        <div class="link-container">
          <p>Don't have an account? <a href="/register">Register here</a></p>
        </div>
      </div>
      <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const messageDiv = document.getElementById('message');
          
          try {
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                emailOrUsername: document.getElementById('emailOrUsername').value,
                password: document.getElementById('password').value
              })
            });
            
            const data = await response.json();
            
            if (data.success) {
              messageDiv.innerHTML = '<p class="success">' + data.message + '</p>';
              setTimeout(() => window.location.href = data.redirectTo || '/', 1000);
            } else {
              messageDiv.innerHTML = '<p class="error">' + data.message + '</p>';
            }
          } catch (error) {
            messageDiv.innerHTML = '<p class="error">Login failed. Please try again.</p>';
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Register page
app.get('/register', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Register - Smart-KORAFX</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          background: #0B0B0B; 
          color: white; 
          display: flex; 
          justify-content: center; 
          align-items: center; 
          min-height: 100vh; 
          margin: 0;
          padding: 20px;
        }
        .register-container { 
          background: #1A1A1A; 
          padding: 40px; 
          border-radius: 10px; 
          max-width: 400px; 
          width: 100%;
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
        }
        h1 { color: #FFD700; text-align: center; margin-bottom: 30px; }
        input { 
          width: 100%; 
          padding: 12px; 
          margin: 10px 0; 
          background: #252525; 
          border: 1px solid #333; 
          color: white; 
          border-radius: 5px;
          box-sizing: border-box;
        }
        button { 
          width: 100%; 
          padding: 12px; 
          background: #FFD700; 
          color: #0B0B0B; 
          border: none; 
          border-radius: 5px; 
          font-weight: bold; 
          cursor: pointer; 
          margin-top: 20px;
        }
        button:hover { background: #E6C200; }
        .error { color: #FF4757; margin: 10px 0; }
        .success { color: #00D26A; margin: 10px 0; }
        a { color: #FFD700; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .link-container { text-align: center; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="register-container">
        <h1>📝 Register for Smart-KORAFX</h1>
        <div id="message"></div>
        <form id="registerForm">
          <input type="text" id="fullName" placeholder="Full Name" required>
          <input type="email" id="email" placeholder="Email" required>
          <input type="text" id="username" placeholder="Username" required>
          <input type="password" id="password" placeholder="Password (min 8 characters)" required>
          <button type="submit">Register</button>
        </form>
        <div class="link-container">
          <p>Already have an account? <a href="/login">Login here</a></p>
        </div>
      </div>
      <script>
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const messageDiv = document.getElementById('message');
          
          try {
            const response = await fetch('/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fullName: document.getElementById('fullName').value,
                email: document.getElementById('email').value,
                username: document.getElementById('username').value,
                password: document.getElementById('password').value
              })
            });
            
            const data = await response.json();
            
            if (data.success) {
              messageDiv.innerHTML = '<p class="success">' + data.message + '</p>';
              setTimeout(() => window.location.href = data.redirectTo || '/pending-approval', 2000);
            } else {
              messageDiv.innerHTML = '<p class="error">' + data.message + '</p>';
            }
          } catch (error) {
            messageDiv.innerHTML = '<p class="error">Registration failed. Please try again.</p>';
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Pending approval page
app.get('/pending-approval', requireAuth, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Pending Approval - Smart-KORAFX</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          background: #0B0B0B; 
          color: white; 
          display: flex; 
          justify-content: center; 
          align-items: center; 
          height: 100vh; 
          margin: 0;
        }
        .pending-container { 
          background: #1A1A1A; 
          padding: 40px; 
          border-radius: 10px; 
          max-width: 500px; 
          text-align: center;
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
        }
        h1 { color: #FFD700; }
        p { color: #888; line-height: 1.6; }
        button { 
          padding: 12px 24px; 
          background: #FF4757; 
          color: white; 
          border: none; 
          border-radius: 5px; 
          cursor: pointer; 
          margin-top: 20px;
        }
        button:hover { background: #E63946; }
        .icon { font-size: 64px; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="pending-container">
        <div class="icon">⏳</div>
        <h1>Account Pending Approval</h1>
        <p>Thank you for registering! Your account is currently pending admin approval.</p>
        <p>You will receive access to the trading platform once an administrator reviews and approves your account.</p>
        <p>This usually takes 24-48 hours.</p>
        <button onclick="logout()">Logout</button>
      </div>
      <script>
        async function logout() {
          await fetch('/api/auth/logout', { method: 'POST' });
          window.location.href = '/login';
        }
      </script>
    </body>
    </html>
  `);
});

// Subscribe page
app.get('/subscribe', requireAuth, requireAdminApproved, async (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Subscribe - Smart-KORAFX</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          background: #0B0B0B; 
          color: white; 
          padding: 40px 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #FFD700; text-align: center; margin-bottom: 40px; }
        .plans { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; }
        .plan { 
          background: #1A1A1A; 
          padding: 30px; 
          border-radius: 10px; 
          border: 2px solid #333;
          transition: all 0.3s;
        }
        .plan:hover { border-color: #FFD700; transform: translateY(-5px); }
        .plan h2 { color: #FFD700; margin-top: 0; }
        .price { font-size: 32px; font-weight: bold; color: #FFD700; margin: 20px 0; }
        .features { list-style: none; padding: 0; }
        .features li { padding: 8px 0; color: #888; }
        .features li:before { content: "✓ "; color: #00D26A; }
        button { 
          width: 100%; 
          padding: 12px; 
          background: #FFD700; 
          color: #0B0B0B; 
          border: none; 
          border-radius: 5px; 
          font-weight: bold; 
          cursor: pointer; 
          margin-top: 20px;
        }
        button:hover { background: #E6C200; }
        .trial-info {
          background: #252525;
          padding: 20px;
          border-radius: 10px;
          text-align: center;
          margin-bottom: 40px;
          border-left: 4px solid #FFD700;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 Choose Your Plan</h1>
        <div class="trial-info">
          <h3 style="color: #FFD700; margin-top: 0;">Free Trial Limit Reached</h3>
          <p>You've used your 2 free signals today. Upgrade to get unlimited access!</p>
        </div>
        <div class="plans" id="plansContainer">
          <p style="text-align: center; color: #888;">Loading plans...</p>
        </div>
      </div>
      <script>
        async function loadPlans() {
          try {
            const response = await fetch('/api/subscription/plans');
            const data = await response.json();
            
            if (data.success) {
              const container = document.getElementById('plansContainer');
              container.innerHTML = data.data.plans.map(plan => \`
                <div class="plan">
                  <h2>\${plan.tier}</h2>
                  <div class="price">\${plan.formattedUSD}</div>
                  <p style="color: #888;">≈ \${plan.formattedRWF}</p>
                  <p style="color: #888; font-size: 14px;">Duration: \${plan.durationDays} days</p>
                  <ul class="features">
                    \${plan.features.map(f => \`<li>\${f}</li>\`).join('')}
                  </ul>
                  <button onclick="selectPlan('\${plan.id}', '\${plan.tier}', \${plan.priceUSD}, \${plan.priceRWF})">
                    Select Plan
                  </button>
                </div>
              \`).join('');
            }
          } catch (error) {
            console.error('Error loading plans:', error);
          }
        }
        
        function selectPlan(planId, tier, priceUSD, priceRWF) {
          alert('Payment flow would open here for ' + tier + ' plan ($' + priceUSD + ' / ' + priceRWF + ' FRW)');
          // You would implement the payment modal here
        }
        
        loadPlans();
      </script>
    </body>
    </html>
  `);
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: 'The requested resource was not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.name || 'SERVER_ERROR',
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==================== DATABASE & SERVER ====================

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('📦 Connected to MongoDB');
    
    // Initialize database with default data
    const initializeDatabase = require('./scripts/init-db');
    await initializeDatabase();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Smart-KORAFX Backend running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   API: http://localhost:${PORT}/api`);
      console.log(`   Health: http://localhost:${PORT}/health`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = app;

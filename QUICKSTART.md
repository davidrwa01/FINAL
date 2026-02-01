# ⚡ QUICK START GUIDE

Get Smart-KORAFX running in 5 minutes!

## 🎯 Step-by-Step Setup

### Option A: Automatic Setup (Recommended)

**Windows:**
```cmd
1. Double-click setup.bat
2. Wait for installation
3. Follow on-screen instructions
```

**Mac/Linux:**
```bash
1. Open terminal in project folder
2. Run: ./setup.sh
3. Follow on-screen instructions
```

### Option B: Manual Setup

#### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create environment file
copy .env.example .env          # Windows
cp .env.example .env            # Mac/Linux

# Edit .env file - SET YOUR MONGODB_URI
# Minimum required:
# MONGODB_URI=mongodb://localhost:27017/smart-korafx

# Initialize database (creates admin + plans)
node scripts/init-db.js

# Start backend
npm start
```

**Backend is now running on: http://localhost:3000**

#### 2. Frontend Setup

**Open NEW terminal/command prompt**

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start frontend
npm run dev
```

**Frontend is now running on: http://localhost:3001**

## 🔓 First Login

1. **Open Browser:** http://localhost:3001
2. **Login with admin account:**
   - Email: `admin@smartkorafx.com`
   - Password: `Admin@123456`
3. **You're in!** 🎉

## 🧪 Testing the System

### Test 1: Register New User

1. Click "Register here" link
2. Fill in the form
3. Submit
4. You'll see "Pending Approval" page ✅

### Test 2: Approve User (as Admin)

1. Login as admin
2. Click "⚡ Admin Panel" button
3. Go to "Users" tab
4. Click "✓ Approve" on pending user
5. User can now login! ✅

### Test 3: Free Trial

1. Logout admin
2. Login as approved user
3. Try to generate signals
4. After 2 signals → Redirected to subscribe ✅

### Test 4: Subscription Flow

1. Go to Subscribe page
2. Select a plan
3. Enter fake transaction ID: `TEST123456`
4. Submit payment
5. Login as admin
6. Go to Subscriptions tab
7. Click "✓ Approve Payment"
8. User now has unlimited access! ✅

## 📁 What You Have

```
smart-korafx/
├── backend/              # Node.js API server
│   ├── PORT: 3000
│   └── Database: MongoDB
│
├── frontend/             # React web app
│   ├── PORT: 3001
│   └── Framework: Vite + React
│
├── README.md            # Complete documentation
├── QUICKSTART.md        # This file
├── setup.sh             # Auto setup (Mac/Linux)
└── setup.bat            # Auto setup (Windows)
```

## 🚨 Common Issues

### "Cannot find module"
```bash
# Run in the folder showing error:
npm install
```

### "MongoDB connection failed"
```bash
# Make sure MongoDB is running
# Windows: Start MongoDB service
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongod

# OR use MongoDB Atlas (free cloud database):
# 1. Go to mongodb.com/cloud/atlas
# 2. Create free cluster
# 3. Get connection string
# 4. Update MONGODB_URI in backend/.env
```

### "Port already in use"
```bash
# Backend (3000):
# Windows: netstat -ano | findstr :3000
# Mac/Linux: lsof -i :3000

# Frontend (3001):
# Change port in frontend/vite.config.js
```

### "Session not working"
```bash
# Clear browser cookies
# Or use incognito/private window
```

## 📚 Next Steps

1. ✅ System is running
2. 📖 Read `README.md` for complete features
3. 🎨 Add your trading logic (see `frontend/HTML_TO_REACT_GUIDE.md`)
4. 🚀 Deploy to production (see `backend/DEPLOYMENT.md`)

## 💡 Pro Tips

### Keep Both Terminals Open
- Terminal 1: Backend (keep running)
- Terminal 2: Frontend (keep running)

### Use Logs for Debugging
- Backend logs show API requests
- Browser DevTools shows frontend errors

### Test with Multiple Accounts
- Admin account
- User account (free trial)
- User account (with subscription)

## 🎓 Learning Resources

**Backend API:**
- Full documentation: `backend/API.md`
- Test endpoints: Use Postman or curl

**Frontend:**
- Component structure: `frontend/src/`
- API calls: `frontend/src/services/api.js`
- Styling: Tailwind CSS classes

**Database:**
- Models: `backend/models/`
- MongoDB Compass: Visual database tool

## 🆘 Need Help?

1. Check terminal/console for errors
2. Read error messages carefully
3. Check `README.md` for detailed docs
4. Verify all dependencies installed
5. Try restarting both servers

## ✅ Success Checklist

- [ ] Both servers running (no errors)
- [ ] Can open http://localhost:3001
- [ ] Can login as admin
- [ ] Can see admin panel
- [ ] Can register new user
- [ ] Can approve user
- [ ] Can test subscription flow

**All checked? You're ready to build! 🚀**

---

**Quick Commands:**

```bash
# Start backend
cd backend && npm start

# Start frontend  
cd frontend && npm run dev

# Initialize database
cd backend && node scripts/init-db.js

# Install dependencies
cd backend && npm install
cd frontend && npm install
```

That's it! Happy coding! 🎉

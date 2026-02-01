# 🚀 Quick Start Guide - Smart-KORAFX Backend

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
# Copy the example file
copy .env.example .env

# Edit .env and add your MongoDB connection
# At minimum, set:
# MONGODB_URI=mongodb://localhost:27017/smart-korafx
```

### 3. Initialize Database
```bash
node scripts/init-db.js
```

This creates:
- Admin user: `admin@smartkorafx.com` / `Admin@123456`
- 3 subscription plans (Regular, Standard, VIP)

### 4. Start Server
```bash
npm start
```

Server runs on: **http://localhost:3000**

## Test It

1. Go to `http://localhost:3000/` - Should redirect to login
2. Login with: `admin@smartkorafx.com` / `Admin@123456`
3. You'll see your protected trading page!

## 📚 More Documentation

- **README.md** - Full features guide
- **API.md** - Complete API reference
- **DEPLOYMENT.md** - Production deployment

Your original `index.html` is in `public/` folder - 100% unchanged! 🔒

@echo off
echo.
echo ============================================================
echo   SMART-KORAFX Platform Setup
echo ============================================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js 16+ from https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js version:
node --version
echo.

REM Backend setup
echo ------------------------------------------------------------
echo Setting up Backend...
echo ------------------------------------------------------------
cd backend

if not exist "node_modules" (
    echo Installing backend dependencies...
    call npm install
)

if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env
    echo.
    echo [WARNING] Please edit backend\.env with your MongoDB connection!
    echo.
)

echo [OK] Backend ready
echo.

REM Frontend setup
cd ..\frontend
echo ------------------------------------------------------------
echo Setting up Frontend...
echo ------------------------------------------------------------

if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)

echo [OK] Frontend ready
echo.

REM Instructions
cd ..
echo.
echo ============================================================
echo   Setup Complete!
echo ============================================================
echo.
echo To start the platform:
echo.
echo   1. Start Backend (in one command prompt):
echo      cd backend
echo      npm start
echo.
echo   2. Start Frontend (in another command prompt):
echo      cd frontend
echo      npm run dev
echo.
echo   3. Open browser:
echo      http://localhost:3001
echo.
echo Default Admin Login:
echo   Email: admin@smartkorafx.com
echo   Password: Admin@123456
echo.
echo ============================================================
echo.
echo First time? Run this command in backend folder:
echo   node scripts\init-db.js
echo.
echo ============================================================
echo.
pause

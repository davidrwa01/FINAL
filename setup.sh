#!/bin/bash

echo "🚀 Starting Smart-KORAFX Platform..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 16+ first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js version: $(node --version)${NC}"
echo ""

# Backend setup
echo -e "${YELLOW}📦 Setting up Backend...${NC}"
cd backend

if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit backend/.env with your MongoDB connection!${NC}"
fi

echo -e "${GREEN}✅ Backend ready${NC}"
echo ""

# Frontend setup
echo -e "${YELLOW}📦 Setting up Frontend...${NC}"
cd ../frontend

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

echo -e "${GREEN}✅ Frontend ready${NC}"
echo ""

# Instructions
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "To start the platform:"
echo ""
echo "  1. Start Backend (in one terminal):"
echo -e "     ${YELLOW}cd backend && npm start${NC}"
echo ""
echo "  2. Start Frontend (in another terminal):"
echo -e "     ${YELLOW}cd frontend && npm run dev${NC}"
echo ""
echo "  3. Open browser:"
echo -e "     ${YELLOW}http://localhost:3001${NC}"
echo ""
echo "Default Admin Login:"
echo -e "  Email: ${GREEN}admin@smartkorafx.com${NC}"
echo -e "  Password: ${GREEN}Admin@123456${NC}"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo -e "${YELLOW}⚠️  First time? Run this in backend folder:${NC}"
echo -e "   ${YELLOW}node scripts/init-db.js${NC}"
echo ""

#!/bin/bash

# Omnivox-AI Deployment Verification Script
# Run this script to test your deployment after setting up Vercel

echo "🚀 Omnivox-AI Deployment Verification"
echo "====================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="https://froniterai-production.up.railway.app"
FRONTEND_URL="$1" # Pass your Vercel URL as first argument

if [ -z "$FRONTEND_URL" ]; then
    echo -e "${YELLOW}Usage: $0 <your-vercel-url>${NC}"
    echo -e "${YELLOW}Example: $0 https://omnivox-ai-frontend.vercel.app${NC}"
    exit 1
fi

echo "Frontend URL: $FRONTEND_URL"
echo "Backend URL: $BACKEND_URL"
echo ""

# Test Backend Health
echo "🔍 Testing Backend (Railway)..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/health" || echo "000")

if [ "$BACKEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Backend is healthy (Status: $BACKEND_STATUS)${NC}"
else
    echo -e "${RED}❌ Backend check failed (Status: $BACKEND_STATUS)${NC}"
fi

# Test Frontend Health
echo "🔍 Testing Frontend (Vercel)..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" || echo "000")

if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Frontend is healthy (Status: $FRONTEND_STATUS)${NC}"
else
    echo -e "${RED}❌ Frontend check failed (Status: $FRONTEND_STATUS)${NC}"
fi

# Test API Proxy
echo "🔍 Testing API Proxy..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/api/admin/dnc" || echo "000")

if [ "$API_STATUS" = "200" ] || [ "$API_STATUS" = "401" ]; then
    echo -e "${GREEN}✅ API Proxy is working (Status: $API_STATUS)${NC}"
else
    echo -e "${RED}❌ API Proxy check failed (Status: $API_STATUS)${NC}"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Test login at: $FRONTEND_URL/login"
echo "2. Check Business Settings: $FRONTEND_URL/admin"
echo "3. Verify Do Not Call functionality"
echo "4. Test manual dialing (if Twilio configured)"

if [ "$BACKEND_STATUS" = "200" ] && [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}"
    echo "🎉 Deployment Verification PASSED!"
    echo "Your Omnivox-AI platform is ready for production use!"
    echo -e "${NC}"
else
    echo -e "${RED}"
    echo "⚠️  Some checks failed. Please review the deployment guide."
    echo -e "${NC}"
fi
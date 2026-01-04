#!/bin/bash

echo "🚀 Starting Omnivox Frontend to Test Inbound Numbers"
echo "==============================================="

# Navigate to frontend directory
cd /Users/zenan/kennex/frontend

echo "📦 Installing dependencies (if needed)..."
npm install

echo "🌐 Starting development server..."
echo "🔗 Frontend will be available at: http://localhost:3000"
echo "📱 Navigate to: http://localhost:3000/voice/inbound-numbers"
echo ""
echo "ℹ️  After logging in, you should see only 1 inbound number: +442046343130"
echo "ℹ️  If you see 4 numbers, the Railway backend may need time to sync"
echo ""

npm run dev
#!/bin/bash

cd /Users/zenan/kennex/backend

echo "🔧 Starting backend with fresh Prisma client..."
npm run dev &
BACKEND_PID=$!

echo "⏰ Waiting for server startup..."
sleep 5

echo "🔐 Testing authentication..."
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kennex.ai","password":"admin123"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo "🛑 Cleaning up..."
kill $BACKEND_PID
wait $BACKEND_PID 2>/dev/null

echo "✅ Test completed!"
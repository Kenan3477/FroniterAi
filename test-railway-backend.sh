#!/bin/bash

echo "🧪 Testing Railway Backend Deployment"
echo "======================================"

RAILWAY_URL="https://froniterai-production.up.railway.app"

echo ""
echo "Testing health endpoint..."
curl -s -w "%{http_code}" "$RAILWAY_URL/health" || echo "Health check failed"

echo ""
echo ""
echo "Testing flows API endpoint..."
curl -s -w "%{http_code}" "$RAILWAY_URL/api/flows" | head -100

echo ""
echo ""
echo "✅ Railway backend test completed!"
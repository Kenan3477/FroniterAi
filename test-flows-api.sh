#!/bin/bash

echo "🧪 Testing Flows API Endpoint"
echo "=============================="

echo ""
echo "Testing GET /api/flows..."
curl -s http://localhost:3007/api/flows | python3 -m json.tool || echo "Failed to parse JSON response"

echo ""
echo "✅ Flows API test completed!"
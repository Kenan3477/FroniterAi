#!/bin/bash

# Get the cookie from the frontend session if it exists
COOKIE=""
if [ -f "/Users/zenan/kennex/frontend/cookies.txt" ]; then
    COOKIE="$(cat /Users/zenan/kennex/frontend/cookies.txt)"
fi

echo "🔍 Testing Campaign Management API Endpoint..."
echo "==============================================="

# Test the campaign management endpoint via frontend proxy
echo ""
echo "📊 GET /api/admin/campaign-management/campaigns"
echo "Response:"

curl -s -X GET "http://localhost:3001/api/admin/campaign-management/campaigns" \
    -H "Content-Type: application/json" \
    -H "Cookie: $COOKIE" | jq '.'

echo ""
echo "🔢 Campaign Count:"
curl -s -X GET "http://localhost:3001/api/admin/campaign-management/campaigns" \
    -H "Content-Type: application/json" \
    -H "Cookie: $COOKIE" | jq '.data | length'

echo ""
echo "📝 Campaign Names:"
curl -s -X GET "http://localhost:3001/api/admin/campaign-management/campaigns" \
    -H "Content-Type: application/json" \
    -H "Cookie: $COOKIE" | jq '.data[] | .name'

echo ""
echo "✅ Test Complete!"
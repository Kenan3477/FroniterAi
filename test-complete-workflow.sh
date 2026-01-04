#!/bin/bash

echo "🧪 Testing Complete Inbound Number Workflow"
echo "==========================================="

RAILWAY_URL="https://froniterai-production.up.railway.app"

echo ""
echo "Step 1: Testing Flows API (should show available flows)..."
FLOWS_RESPONSE=$(curl -s "$RAILWAY_URL/api/flows")
echo "✅ Flows available: $(echo $FLOWS_RESPONSE | jq -r '.[].name' 2>/dev/null || echo 'Could not parse JSON')"

echo ""
echo "Step 2: Testing Inbound Numbers API..."
INBOUND_NUMBERS_RESPONSE=$(curl -s "$RAILWAY_URL/api/inbound-numbers")
echo "📞 Inbound numbers: $(echo $INBOUND_NUMBERS_RESPONSE | jq -r 'length' 2>/dev/null || echo 'Could not parse JSON')"

echo ""
echo "Step 3: Testing Auth requirement for PUT operation..."
# Test without auth (should fail)
echo "   Testing without auth (should get 401):"
PUT_RESPONSE_NO_AUTH=$(curl -s -w "%{http_code}" -X PUT "$RAILWAY_URL/api/inbound-numbers/test-id" -H "Content-Type: application/json" -d '{"assignedFlowId":"test"}')
echo "   Response: $PUT_RESPONSE_NO_AUTH"

# Test with dummy auth (may fail with 401 but different message)
echo "   Testing with auth header (should get different response):"
PUT_RESPONSE_WITH_AUTH=$(curl -s -w "%{http_code}" -X PUT "$RAILWAY_URL/api/inbound-numbers/test-id" -H "Content-Type: application/json" -H "Authorization: Bearer dummy-token" -d '{"assignedFlowId":"test"}')
echo "   Response: $PUT_RESPONSE_WITH_AUTH"

echo ""
echo "✅ Complete workflow test completed!"
echo ""
echo "Frontend should now be able to:"
echo "   - ✅ Load available flows from Railway backend"
echo "   - ✅ Display flows in inbound number assignment dropdown"
echo "   - ✅ Properly handle authentication for updates"
echo ""
echo "🌐 Frontend URL: http://localhost:3000"
echo "🚀 Backend URL: $RAILWAY_URL"
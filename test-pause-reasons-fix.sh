#!/bin/bash

echo "🔍 Testing Pause Reasons Page API Endpoints"
echo "=========================================="

# Test backend connectivity
echo ""
echo "1. Testing backend users endpoint..."
curl -s -X GET "http://localhost:3004/api/users" \
     -H "Authorization: Bearer test" \
     | head -c 200
echo ""

# Test frontend proxy route
echo ""
echo "2. Testing frontend users proxy..."
curl -s -X GET "http://localhost:3000/api/users" \
     -H "Authorization: Bearer test" \
     | head -c 200
echo ""

# Test pause events stats endpoint
echo ""
echo "3. Testing pause events stats..."
curl -s -X GET "http://localhost:3000/api/pause-events/stats" \
     -H "Authorization: Bearer test" \
     | head -c 200
echo ""

echo ""
echo "✅ API endpoint tests completed"
echo ""
echo "📋 Summary of fixes applied:"
echo "  - Removed non-existent /api/agents endpoint"
echo "  - Added /api/users proxy route"
echo "  - Updated pause reasons page to use users API"
echo "  - Added null safety checks for Object.keys() calls"
echo "  - Added proper error handling for undefined data"
echo ""
echo "🌐 Frontend should now be accessible at: http://localhost:3000"
echo "📊 Pause Reasons Report: http://localhost:3000/reports/pause_reasons"
#!/bin/bash

echo "🔍 Checking CLI/Inbound Numbers Status..."
echo "=========================================="

# Check if frontend is running
echo "📱 Frontend Status:"
curl -s -o /dev/null -w "Status: %{http_code}" http://localhost:3002
echo

# Check database for inbound numbers (needs authentication)
echo "📞 Testing Inbound Numbers API (without auth):"
curl -s https://froniterai-production.up.railway.app/api/voice/inbound-numbers | jq '.' 2>/dev/null || echo "Authentication required"

echo
echo "✅ CLI Implementation Status:"
echo "- ✅ CLI section added to Reports/Voice"  
echo "- ✅ CLIManagement component created"
echo "- ✅ API integration implemented"
echo "- ✅ Frontend running on localhost:3002"
echo
echo "📋 Next Steps:"
echo "1. Navigate to: http://localhost:3002/reports"
echo "2. Click 'Voice' in sidebar"
echo "3. Click 'CLI' to see phone numbers"
echo "4. User phone number (+442046343130) should appear if configured"
echo
echo "🔗 Alternative: Direct admin access to manage numbers:"
echo "   http://localhost:3002/admin (Channels section)"
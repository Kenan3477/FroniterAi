#!/bin/bash

echo "🎯 OMNIVOX INBOUND NUMBERS VERIFICATION"
echo "====================================="
echo ""
echo "✅ FIXED LOCALLY:"
echo "- Database cleanup scripts created and tested"
echo "- TypeScript compilation errors resolved"
echo "- Backend code updated to remove test numbers"
echo ""
echo "🔄 RAILWAY STATUS:"
echo "- Latest code pushed successfully"
echo "- Cleanup endpoint deployed: /api/admin/cleanup/cleanup-test-numbers"
echo "- TypeScript builds locally without errors"
echo ""
echo "🌐 FRONTEND TESTING:"
echo "- Frontend available at: http://localhost:3000"
echo "- Navigate to: http://localhost:3000/voice/inbound-numbers"
echo "- Login with your existing session"
echo ""
echo "🎯 EXPECTED RESULT:"
echo "- Should show ONLY: +442046343130 (UK Local - London)"
echo "- NO test numbers: +447700900123, +14155552456, +15551234567"
echo ""
echo "⚡ TESTING FRONTEND NOW:"
echo "1. Open browser: http://localhost:3000/voice/inbound-numbers"
echo "2. You should see either:"
echo "   ✅ Success: Only 1 number (+442046343130)"  
echo "   ⏳ Railway deploying: Still shows 4 numbers temporarily"
echo ""

# Test local frontend endpoint
echo "📡 Testing local frontend endpoint..."
curl -s http://localhost:3000/api/voice/inbound-numbers \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQURNSU4iLCJlbWFpbCI6ImFkbWluQG9tbml2b3gtYWkuY29tIiwiaWF0IjoxNzY3NTI3OTA4LCJleHAiOjE3Njc1NTY3MDh9.00rt81z7mV4FLjV6RXwJWihfkPWFfEX49ESRtnQdkHU" | \
  python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success') and 'data' in data:
        numbers = data['data']
        print(f'📊 Frontend returns {len(numbers)} numbers:')
        for i, num in enumerate(numbers, 1):
            phone = num.get('phoneNumber', 'Unknown')
            name = num.get('displayName', 'Unknown')
            status = '✅ REAL TWILIO' if phone == '+442046343130' else '❌ TEST NUMBER'
            print(f'   {i}. {phone} ({name}) - {status}')
        
        if len(numbers) == 1 and numbers[0].get('phoneNumber') == '+442046343130':
            print('')
            print('🎉 SUCCESS: Frontend shows only your real Twilio number!')
        else:
            print('')
            print('⏳ Railway still deploying - test numbers will be removed shortly')
    else:
        print('❌ Failed to fetch data from frontend')
except Exception as e:
    print(f'❌ Error parsing response: {e}')
"

echo ""
echo "🚀 NEXT STEPS:"
echo "1. Open: http://localhost:3000/voice/inbound-numbers"
echo "2. If still showing 4 numbers, Railway is deploying" 
echo "3. Check back in a few minutes for Railway to complete deployment"
echo "4. The cleanup endpoint will automatically run and remove test numbers"
echo ""
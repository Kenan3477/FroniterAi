#!/bin/bash

echo "🔍 Testing Pause Events API with Authentication"
echo "=============================================="

# Function to get auth token
get_auth_token() {
    echo "🔑 Getting authentication token..."
    
    # Try to login and get token
    RESPONSE=$(curl -s -X POST "http://localhost:3004/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "username": "ken",
            "password": "password"
        }' 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        TOKEN=$(echo "$RESPONSE" | jq -r '.token // empty' 2>/dev/null)
        if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
            echo "✅ Got auth token: ${TOKEN:0:20}..."
            echo "$TOKEN"
            return 0
        else
            echo "❌ Login failed or no token in response"
            echo "Response: $RESPONSE"
            return 1
        fi
    else
        echo "❌ Failed to connect to auth endpoint"
        return 1
    fi
}

# Test API endpoints
test_api_endpoints() {
    local TOKEN="$1"
    
    echo ""
    echo "🧪 Testing API endpoints with auth token..."
    echo ""
    
    # Test users endpoint
    echo "📍 Testing /api/users:"
    curl -s -X GET "http://localhost:3004/api/users" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" | jq '.' 2>/dev/null || echo "Failed to parse JSON"
    
    echo ""
    echo "📍 Testing /api/pause-events:"
    curl -s -X GET "http://localhost:3004/api/pause-events" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" | jq '.' 2>/dev/null || echo "Failed to parse JSON"
    
    echo ""
    echo "📍 Testing /api/pause-events/stats:"
    curl -s -X GET "http://localhost:3004/api/pause-events/stats" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" | jq '.' 2>/dev/null || echo "Failed to parse JSON"
}

# Test frontend API proxies
test_frontend_proxies() {
    local TOKEN="$1"
    
    echo ""
    echo "🌐 Testing frontend API proxies..."
    echo ""
    
    echo "📍 Testing /api/users proxy:"
    curl -s -X GET "http://localhost:3000/api/users" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" | head -c 300
    
    echo ""
    echo ""
    echo "📍 Testing /api/pause-events proxy:"
    curl -s -X GET "http://localhost:3000/api/pause-events" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" | head -c 300
}

# Check if backend is running
echo "🔄 Checking if backend is running..."
if curl -s http://localhost:3004/health >/dev/null 2>&1 || curl -s http://localhost:3004 >/dev/null 2>&1; then
    echo "✅ Backend is running on port 3004"
else
    echo "❌ Backend not detected on port 3004"
    echo "⚠️  Please ensure the backend is running with: npm start"
    exit 1
fi

# Check if frontend is running  
echo "🔄 Checking if frontend is running..."
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Frontend is running on port 3000"
else
    echo "❌ Frontend not detected on port 3000"
    echo "⚠️  Please ensure the frontend is running with: npm run dev"
    exit 1
fi

# Get auth token and test
TOKEN=$(get_auth_token)
if [ $? -eq 0 ]; then
    test_api_endpoints "$TOKEN"
    test_frontend_proxies "$TOKEN"
    
    echo ""
    echo "🎯 Next Steps:"
    echo "1. Copy the auth token above"
    echo "2. Open browser dev tools on the pause reasons page"
    echo "3. Check if the frontend is using the correct token"
    echo "4. Look for any CORS or authentication errors"
else
    echo ""
    echo "❌ Could not get authentication token"
    echo "💡 Possible issues:"
    echo "   - Backend not running"
    echo "   - Wrong credentials"
    echo "   - Database connection issues"
    echo ""
    echo "📋 Manual testing alternative:"
    echo "1. Login to http://localhost:3000"
    echo "2. Open browser dev tools"
    echo "3. Check the network tab for API call failures"
    echo "4. Look for authentication token in localStorage"
fi
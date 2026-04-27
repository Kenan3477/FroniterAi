#!/bin/bash

echo "🔄 Auto-Check: Waiting for Railway deployment and running diagnostic..."
echo ""

MAX_ATTEMPTS=20
ATTEMPT=0
SLEEP_TIME=15

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  ATTEMPT=$((ATTEMPT + 1))
  echo "📍 Attempt $ATTEMPT of $MAX_ATTEMPTS - Checking if /api/test/get-token is available..."
  
  # Check if endpoint exists
  RESPONSE=$(curl -s -X POST https://froniterai-production.up.railway.app/api/test/get-token \
    -H "Content-Type: application/json" \
    -d '{"userId":509,"username":"Kenan","role":"ADMIN"}')
  
  if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Endpoint is live! Railway has deployed the latest code."
    echo ""
    echo "🎫 Getting test token..."
    echo ""
    
    TOKEN=$(echo "$RESPONSE" | jq -r '.token')
    
    if [ ! -z "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
      echo "✅ Token received: $TOKEN"
      echo ""
      echo "🔍 Running full diagnostic with valid token..."
      echo ""
      
      # Update the diagnostic script with the token
      sed -i.bak "s/const AUTH_TOKEN = .*/const AUTH_TOKEN = '$TOKEN';/" diagnose-call-system.js
      
      # Run the full diagnostic
      node diagnose-call-system.js
      
      exit 0
    else
      echo "❌ Failed to extract token from response"
      echo "Response: $RESPONSE"
      exit 1
    fi
  else
    echo "⏳ Not ready yet. Waiting $SLEEP_TIME seconds..."
    echo "   Response: $(echo $RESPONSE | jq -c '.' 2>/dev/null || echo $RESPONSE)"
    sleep $SLEEP_TIME
  fi
done

echo ""
echo "❌ Timeout: Railway did not deploy after $((MAX_ATTEMPTS * SLEEP_TIME)) seconds"
echo "   Please check Railway dashboard for build status"
exit 1

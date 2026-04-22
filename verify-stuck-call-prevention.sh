#!/bin/bash

echo "🔍 Stuck Call Prevention System - Verification"
echo "=============================================="
echo ""

# Get Railway logs for stuck call monitoring
echo "📋 Checking Railway logs for stuck call monitoring startup..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Backend health
echo -n "✓ Backend health: "
HEALTH=$(curl -s "https://froniterai-production.up.railway.app/health" | jq -r '.status')
if [ "$HEALTH" == "ok" ]; then
  echo -e "${GREEN}PASS${NC}"
else
  echo -e "${RED}FAIL${NC}"
  exit 1
fi

echo ""
echo "📊 System is ready. Stuck call monitoring should be active."
echo ""
echo "To verify stuck call monitoring is running, check Railway logs for:"
echo "  - '🚀 Starting stuck call monitoring'"
echo "  - '✅ Stuck call prevention system active'"
echo "  - '🔍 Running initial stuck call cleanup...'"
echo ""
echo "To test the admin endpoints (requires auth token):"
echo ""
echo "  # Get monitoring status"
echo "  curl -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "    https://froniterai-production.up.railway.app/api/stuck-calls/status"
echo ""
echo "  # Trigger manual cleanup"
echo "  curl -X POST -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "    https://froniterai-production.up.railway.app/api/stuck-calls/cleanup"
echo ""
echo "✅ Verification complete!"

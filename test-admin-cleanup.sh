#!/bin/bash

# Admin Cleanup Test Script
# Tests the new call record cleanup endpoints

BACKEND_URL="https://omnivox-ai-production.up.railway.app"

echo "=================================================="
echo "OMNIVOX-AI ADMIN CLEANUP TEST"
echo "=================================================="
echo ""

# Step 1: Get current statistics
echo "📊 Step 1: Getting current statistics..."
echo ""
curl -s "${BACKEND_URL}/api/admin/cleanup/stats" | jq '.'
echo ""
echo "=================================================="
echo ""

# Step 2: Ask for confirmation
read -p "Do you want to DELETE all call records without recordings? (yes/no): " confirmation

if [ "$confirmation" != "yes" ]; then
    echo "❌ Aborted - no records deleted"
    exit 0
fi

echo ""
echo "=================================================="
echo ""

# Step 3: Delete records without recordings
echo "🗑️  Step 2: Deleting call records without recordings..."
echo ""
curl -s -X DELETE "${BACKEND_URL}/api/admin/cleanup/calls-without-recordings" | jq '.'
echo ""
echo "=================================================="
echo ""

# Step 4: Get updated statistics
echo "📊 Step 3: Getting updated statistics..."
echo ""
curl -s "${BACKEND_URL}/api/admin/cleanup/stats" | jq '.'
echo ""
echo "=================================================="
echo ""

echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "1. Make a test call"
echo "2. Watch Railway logs for duplicate prevention messages"
echo "3. End the call"
echo "4. Verify only ONE call record exists"
echo "5. Verify the call record has a recording"

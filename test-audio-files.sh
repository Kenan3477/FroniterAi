#!/bin/bash

# Test Script for Audio Files
# Run this after uploading your recordings to verify they're accessible

echo "🎙️ Testing Audio Files on Railway..."
echo ""

BASE_URL="https://froniterai-production.up.railway.app/audio"

# Array of required files
FILES=(
  "inbound-greeting.mp3"
  "agents-busy.mp3"
  "transfer-initiating.mp3"
  "transfer-failed.mp3"
  "call-on-hold.mp3"
  "voicemail-prompt.mp3"
  "voicemail-thankyou.mp3"
  "customer-connecting-outbound.mp3"
  "agents-unavailable.mp3"
  "agent-connecting-inbound.mp3"
  "agent-connecting-conference.mp3"
  "agent-connected.mp3"
  "system-error.mp3"
  "connection-failed.mp3"
)

# Counters
PASS=0
FAIL=0

echo "Testing ${#FILES[@]} audio files..."
echo ""

# Test each file
for file in "${FILES[@]}"; do
  echo -n "Testing $file... "
  
  # Check if file exists and is accessible
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/$file")
  
  if [ "$STATUS" = "200" ]; then
    echo "✅ PASS (HTTP $STATUS)"
    ((PASS++))
  else
    echo "❌ FAIL (HTTP $STATUS)"
    ((FAIL++))
  fi
done

echo ""
echo "========================================="
echo "Results: $PASS passed, $FAIL failed"
echo "========================================="

if [ $FAIL -eq 0 ]; then
  echo "✅ All audio files are accessible!"
  echo ""
  echo "Next steps:"
  echo "1. Listen to each file to verify quality"
  echo "2. Implement code changes to replace TTS"
  echo "3. Test call flows end-to-end"
else
  echo "❌ Some files are missing or inaccessible"
  echo ""
  echo "Troubleshooting:"
  echo "1. Verify files are in backend/public/audio/"
  echo "2. Check filenames match exactly (case-sensitive)"
  echo "3. Ensure files are committed and pushed to Railway"
  echo "4. Wait 1-2 minutes for Railway deployment"
fi

echo ""

#!/bin/bash

# Check what audio files are in the backend/public/audio directory

echo "🎙️ Checking audio files in backend/public/audio/..."
echo ""

cd /Users/zenan/kennex/backend/public/audio/

# Count MP3 files
count=$(find . -name "*.mp3" | wc -l | xargs)

if [ "$count" -eq 0 ]; then
  echo "❌ No MP3 files found!"
  echo ""
  echo "Current files in directory:"
  ls -la
  echo ""
  echo "📍 You need to copy your recordings here:"
  echo "   /Users/zenan/kennex/backend/public/audio/"
  echo ""
  echo "💡 Where are your MP3 files located?"
else
  echo "✅ Found $count MP3 file(s)"
  echo ""
  echo "Files:"
  ls -lh *.mp3 2>/dev/null | awk '{print $9, "(" $5 ")"}'
  echo ""
  
  # Check for required files
  echo "Checking required files:"
  
  required=(
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
  
  missing=0
  for file in "${required[@]}"; do
    if [ -f "$file" ]; then
      echo "  ✅ $file"
    else
      echo "  ❌ $file (missing)"
      ((missing++))
    fi
  done
  
  echo ""
  if [ $missing -eq 0 ]; then
    echo "🎉 All 14 required files are present!"
    echo ""
    echo "Next steps:"
    echo "1. git add backend/public/audio/*.mp3"
    echo "2. git commit -m \"Add recorded audio prompts\""
    echo "3. git push"
  else
    echo "⚠️  $missing file(s) missing or misnamed"
    echo ""
    echo "Make sure filenames match exactly (lowercase, hyphens)"
  fi
fi

echo ""

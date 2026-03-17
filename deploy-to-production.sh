#!/bin/bash
set -e

echo "🚀 Deploying Enhanced AI Transcription System to Production..."

# Stage all changes
git add .

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo "📝 No changes to commit"
else
    # Commit changes
    git commit -m "feat: Complete Enhanced AI Transcription Integration

✅ Enhanced Whisper + GPT-4 Speaker Diarization System
• Integrated audio-based speaker identification with OpenAI Whisper
• Added GPT-4 intelligent speaker assignment and call analytics
• Enhanced frontend UI with real-time polling and progress feedback
• Implemented priority system for enhanced vs standard transcripts
• Added comprehensive error handling and user feedback
• Complete end-to-end audio processing pipeline

🎯 Features:
• Real call recording download from Twilio
• OpenAI Whisper speech-to-text with word timestamps
• GPT-4 conversation analysis and speaker identification
• Enhanced transcript modal with segmented conversation view
• Intelligent polling with exponential backoff
• Enhanced API endpoint for background processing

🔧 Integration:
• Enhanced transcript button in CallRecordsView
• Real-time progress feedback and completion notifications
• Seamless fallback to standard transcripts when needed
• Complete Railway backend integration ready"
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin clean-advanced-transcription

echo "✅ Code pushed to GitHub successfully!"

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it first:"
    echo "npm install -g vercel"
    exit 1
fi

# Deploy to Vercel from frontend directory
cd frontend
vercel --prod --confirm

echo ""
echo "🎉 Enhanced AI Transcription System Deployed Successfully!"
echo ""
echo "✅ Production Features Available:"
echo "  • Enhanced Whisper + GPT-4 transcription"
echo "  • Real audio-based speaker diarization" 
echo "  • Intelligent conversation analysis"
echo "  • Real-time progress tracking"
echo "  • Complete end-to-end processing"
echo ""
echo "🎯 Usage:"
echo "  1. Navigate to Call Records"
echo "  2. Find a call with recording"
echo "  3. Click the AI transcription button (💬)"
echo "  4. Wait for enhanced processing (30-60s)"
echo "  5. View properly separated Agent/Customer conversation"
echo ""
echo "🔗 Frontend URL: https://your-app.vercel.app"
echo "🔗 Backend URL: Railway (already deployed)"
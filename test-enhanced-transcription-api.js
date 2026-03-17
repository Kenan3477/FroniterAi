// Test Enhanced AI Transcription API Endpoints
// Run with: node test-enhanced-transcription-api.js

const testCallId = 'cmm1yzsqy001flo97ukrzk9hg'; // Use a known call ID with recording
const backendUrl = process.env.BACKEND_URL || 'https://omnivox-backend.railway.app';
const frontendUrl = process.env.FRONTEND_URL || 'https://frontend-three-eosin-69.vercel.app';

async function testTranscriptionAPIs() {
  console.log('🧪 Testing Enhanced AI Transcription API Endpoints...\n');
  
  // Test 1: Check if enhanced-whisper-diarization.js exists and is executable
  console.log('📁 Test 1: Check Enhanced Whisper Script');
  try {
    const fs = require('fs');
    const path = require('path');
    const scriptPath = path.join(__dirname, 'enhanced-whisper-diarization.js');
    
    if (fs.existsSync(scriptPath)) {
      console.log('✅ enhanced-whisper-diarization.js exists');
    } else {
      console.log('❌ enhanced-whisper-diarization.js NOT FOUND');
    }
  } catch (error) {
    console.log('❌ Error checking script:', error.message);
  }
  
  // Test 2: Test Frontend Direct AI API
  console.log('\n🌐 Test 2: Frontend Direct AI API');
  try {
    const response = await fetch(`${frontendUrl}/api/transcript/direct-ai/${testCallId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Frontend Direct AI API working');
      console.log('📄 Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Frontend Direct AI API failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Frontend Direct AI API error:', error.message);
  }
  
  // Test 3: Test Frontend Transcript Retrieval API
  console.log('\n📄 Test 3: Frontend Transcript API');
  try {
    const response = await fetch(`${frontendUrl}/api/calls/${testCallId}/transcript?format=full&enhanced=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Frontend Transcript API working');
      console.log('📄 Status:', data.status);
      console.log('📄 Provider:', data.transcript?.processingProvider || 'N/A');
      console.log('📄 Segments:', data.transcript?.segments?.length || 0);
    } else {
      console.log('❌ Frontend Transcript API failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Frontend Transcript API error:', error.message);
  }
  
  // Test 4: Test Backend Health
  console.log('\n💚 Test 4: Backend Health Check');
  try {
    const response = await fetch(`${backendUrl}/health`, {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is healthy');
      console.log('📄 Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Backend health check failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Backend error:', error.message);
  }
  
  console.log('\n🎯 Test Complete!');
  console.log('\nTo test the Enhanced AI Transcription:');
  console.log(`1. Go to: ${frontendUrl}/reports`);
  console.log('2. Look for the blue test section at the top');
  console.log('3. Click "🎯 Test Enhanced AI Transcription" button');
  console.log('4. Or find a call with recording and click the blue "AI" button');
}

// Run the tests
testTranscriptionAPIs().catch(console.error);
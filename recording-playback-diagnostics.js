#!/usr/bin/env node

/**
 * Recording Playback Diagnostics Script
 * Tests the failing recording ID to identify the issue
 */

const API_BASE = 'https://froniterai-production.up.railway.app/api';

async function testRecordingPlayback() {
  try {
    console.log('🔍 RECORDING PLAYBACK DIAGNOSTICS');
    console.log('================================');
    
    const failingRecordingId = 'cmls97rikn00qj596qainm53nr';
    console.log(`\n🎵 Testing Recording ID: ${failingRecordingId}`);
    
    // Test 1: Get recording metadata via call records API
    console.log('\n📋 Step 1: Fetching call records...');
    const callRecordsResponse = await fetch(`${API_BASE}/call-records`);
    
    if (callRecordsResponse.ok) {
      const callRecordsData = await callRecordsResponse.json();
      console.log(`   Found ${callRecordsData.records?.length || 0} call records`);
      
      // Find the specific recording
      const recordWithFailingRecording = callRecordsData.records?.find(record => 
        record.recordingFile?.id === failingRecordingId
      );
      
      if (recordWithFailingRecording) {
        console.log('   ✅ Found call record with this recording:');
        console.log(`   Call ID: ${recordWithFailingRecording.callId}`);
        console.log(`   Phone: ${recordWithFailingRecording.phoneNumber}`);
        console.log(`   Campaign: ${recordWithFailingRecording.campaign?.name || 'N/A'}`);
        console.log(`   Recording File ID: ${recordWithFailingRecording.recordingFile.id}`);
        console.log(`   Recording File Path: ${recordWithFailingRecording.recordingFile.filePath}`);
        console.log(`   Recording File Name: ${recordWithFailingRecording.recordingFile.fileName}`);
        
        // Analyze the file path
        const filePath = recordWithFailingRecording.recordingFile.filePath;
        if (filePath.includes('api.twilio.com')) {
          console.log('   📡 Type: Twilio URL format');
        } else if (/^RE[a-zA-Z0-9]{32}$/.test(filePath)) {
          console.log('   🆔 Type: Twilio Recording SID');
        } else if (filePath.startsWith('/') || filePath.includes('.mp3')) {
          console.log('   📁 Type: Local file path');
        } else {
          console.log(`   ❓ Type: Unknown format (${filePath.substring(0, 50)}...)`);
        }
      } else {
        console.log('   ❌ Recording not found in call records');
      }
    } else {
      console.log(`   ❌ Failed to fetch call records: ${callRecordsResponse.status}`);
    }
    
    // Test 2: Direct recording metadata check (if authenticated)
    console.log('\n📋 Step 2: Direct recording check...');
    console.log('   Note: This requires authentication, so will likely fail from this script');
    console.log('   But you can test this manually in the browser');
    
    // Test 3: Backend streaming endpoint
    console.log('\n📡 Step 3: Backend streaming endpoint status...');
    console.log(`   Stream URL: ${API_BASE}/recordings/${failingRecordingId}/stream`);
    console.log(`   Note: This endpoint requires authentication`);
    
    // Test 4: Frontend proxy status  
    console.log('\n🖥️  Step 4: Frontend proxy status...');
    console.log(`   Frontend Stream URL: https://omnivox-ai.vercel.app/api/recordings/${failingRecordingId}/stream`);
    console.log(`   Note: This endpoint should use cookies for authentication`);
    
    console.log('\n🔧 DIAGNOSTIC ACTIONS TO TRY:');
    console.log('=============================');
    console.log('1. Check if the recording file path contains a valid Twilio SID');
    console.log('2. Verify Twilio credentials are working in Railway backend');
    console.log('3. Test the recording endpoint manually while logged in');
    console.log('4. Check Railway backend logs for specific error messages');
    console.log('5. Verify the recording ID exists in the database');
    
    console.log('\n💡 POTENTIAL FIXES:');
    console.log('==================');
    console.log('✅ Backend recording routes updated to handle both URL and SID formats');
    console.log('⏳ Waiting for Railway deployment to complete...');
    console.log('🔄 Once deployed, the recording should work');
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
  }
}

testRecordingPlayback();
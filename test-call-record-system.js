/**
 * Test Call Record Creation and Recording Sync System
 */

const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:3004';

async function testCallRecordSystem() {
  console.log('🧪 Testing Call Record Creation and Recording Sync System...\n');

  // Test 1: Start Call Record
  console.log('📞 Test 1: Creating call record...');
  try {
    const startResponse = await fetch(`${BACKEND_URL}/api/call-records/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // This will need proper auth in production
      },
      body: JSON.stringify({
        callId: `test-call-${Date.now()}`,
        agentId: 'test-agent',
        contactId: `test-contact-${Date.now()}`,
        campaignId: 'MANUAL-DIAL',
        phoneNumber: '+447700900123',
        dialedNumber: '+442046343130',
        callType: 'outbound'
      })
    });

    if (startResponse.ok) {
      const startResult = await startResponse.json();
      console.log('✅ Call record created successfully:', startResult);
    } else {
      console.log('❌ Call record creation failed:', startResponse.status, startResponse.statusText);
    }
  } catch (error) {
    console.log('❌ Error creating call record:', error.message);
  }

  console.log('\n');

  // Test 2: Check Call Records API
  console.log('📋 Test 2: Fetching call records...');
  try {
    const recordsResponse = await fetch(`${BACKEND_URL}/api/call-records?limit=5`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });

    if (recordsResponse.ok) {
      const recordsResult = await recordsResponse.json();
      console.log('✅ Call records fetched successfully:');
      console.log(`   - Total records: ${recordsResult.pagination?.total || 'unknown'}`);
      console.log(`   - Records returned: ${recordsResult.records?.length || 0}`);
      
      if (recordsResult.records && recordsResult.records.length > 0) {
        const latestRecord = recordsResult.records[0];
        console.log(`   - Latest record ID: ${latestRecord.id}`);
        console.log(`   - Campaign: ${latestRecord.campaignId}`);
        console.log(`   - Phone: ${latestRecord.phoneNumber}`);
        console.log(`   - Has recording: ${latestRecord.recording ? 'Yes' : 'No'}`);
      }
    } else {
      console.log('❌ Call records fetch failed:', recordsResponse.status, recordsResponse.statusText);
    }
  } catch (error) {
    console.log('❌ Error fetching call records:', error.message);
  }

  console.log('\n');

  // Test 3: Check Health and API Status
  console.log('🩺 Test 3: Checking backend health...');
  try {
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    
    if (healthResponse.ok) {
      const healthResult = await healthResponse.json();
      console.log('✅ Backend health check passed:', healthResult);
    } else {
      console.log('❌ Backend health check failed:', healthResponse.status);
    }
  } catch (error) {
    console.log('❌ Error checking backend health:', error.message);
  }

  console.log('\n');

  // Test 4: Check if recording webhook endpoint is available
  console.log('🎙️ Test 4: Checking recording webhook availability...');
  try {
    const webhookResponse = await fetch(`${BACKEND_URL}/api/dialer/webhook/recording-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        CallSid: 'test-call-sid',
        RecordingSid: 'test-recording-sid',
        RecordingUrl: 'https://example.com/test-recording.mp3',
        RecordingStatus: 'completed',
        RecordingDuration: '30'
      })
    });

    console.log(`📡 Recording webhook endpoint response: ${webhookResponse.status}`);
    
    // Even if it fails due to auth/validation, a 403/400 response means the endpoint exists
    if (webhookResponse.status === 200 || webhookResponse.status === 403 || webhookResponse.status === 400) {
      console.log('✅ Recording webhook endpoint is active and responding');
    } else {
      console.log('⚠️ Recording webhook endpoint may not be properly configured');
    }
  } catch (error) {
    console.log('❌ Error testing recording webhook:', error.message);
  }

  console.log('\n🏁 Call Record System Test Complete!');
}

// Run the test
testCallRecordSystem().catch(console.error);
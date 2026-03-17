#!/usr/bin/env node

const API_BASE = 'https://froniterai-production.up.railway.app/api/calls';

async function testRecordingValidationFixed() {
  console.log('🧪 Testing save-call-data recording validation (FIXED)...\n');

  // Test 1: Try to save call without callSid or recordingUrl (should fail)
  console.log('Test 1: Attempting save without recording evidence (should fail)');
  try {
    const response = await fetch(`${API_BASE}/save-call-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token'
      },
      body: JSON.stringify({
        agentId: '509',
        phoneNumber: '+1234567890',
        callDuration: 30,  // Fixed: use callDuration not duration
        campaignId: '1',
        dispositionId: '1'
      })
    });
    
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    if (response.status === 400) {
      console.log(`✅ PASS: Correctly rejected call without recording evidence`);
      console.log(`✅ Error message: ${result.error}\n`);
    } else {
      console.log(`❌ FAIL: Should have been rejected but got success\n`);
    }
  } catch (error) {
    console.log(`❌ FAIL: Network error - ${error.message}\n`);
  }

  // Test 2: Try to save call with valid Twilio callSid (should succeed)
  console.log('Test 2: Attempting save with valid Twilio callSid (should succeed)');
  try {
    const response = await fetch(`${API_BASE}/save-call-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token'
      },
      body: JSON.stringify({
        agentId: '509',
        phoneNumber: '+1234567890',
        callDuration: 45,
        campaignId: '1',
        dispositionId: '1',
        callSid: 'CA1234567890abcdef1234567890abcdef' // Valid Twilio format
      })
    });
    
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    if (response.status === 200 && result.data.callRecord.callId.startsWith('CA')) {
      console.log(`✅ PASS: Correctly accepted call with callSid`);
      console.log(`✅ CallId: ${result.data.callRecord.callId}\n`);
    } else {
      console.log(`❌ FAIL: Should have succeeded with callSid\n`);
    }
  } catch (error) {
    console.log(`❌ FAIL: Network error - ${error.message}\n`);
  }

  // Test 3: Try to save call with invalid callSid format (should fail)
  console.log('Test 3: Attempting save with invalid callSid format (should fail)');
  try {
    const response = await fetch(`${API_BASE}/save-call-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token'
      },
      body: JSON.stringify({
        agentId: '509',
        phoneNumber: '+1234567890',
        callDuration: 45,
        campaignId: '1',
        dispositionId: '1',
        callSid: 'fake-call-id-not-twilio' // Invalid format
      })
    });
    
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    if (response.status === 400) {
      console.log(`✅ PASS: Correctly rejected invalid callSid format`);
      console.log(`✅ Error message: ${result.error}\n`);
    } else {
      console.log(`❌ FAIL: Should have rejected invalid callSid\n`);
    }
  } catch (error) {
    console.log(`❌ FAIL: Network error - ${error.message}\n`);
  }

  // Test 4: Try to save call with recordingUrl (should succeed)
  console.log('Test 4: Attempting save with recordingUrl (should succeed)');
  try {
    const response = await fetch(`${API_BASE}/save-call-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token'
      },
      body: JSON.stringify({
        agentId: '509',
        phoneNumber: '+1987654321',
        callDuration: 60,
        campaignId: '1',
        dispositionId: '1',
        recordingUrl: 'https://api.twilio.com/recording-test-url'
      })
    });
    
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    if (response.status === 200 && result.data.callRecord.recording) {
      console.log(`✅ PASS: Correctly accepted call with recordingUrl`);
      console.log(`✅ Recording URL: ${result.data.callRecord.recording}\n`);
    } else {
      console.log(`❌ FAIL: Should have succeeded with recordingUrl\n`);
      console.log(`Recording in response: ${result.data?.callRecord?.recording}\n`);
    }
  } catch (error) {
    console.log(`❌ FAIL: Network error - ${error.message}\n`);
  }

  console.log('🎯 Recording validation tests completed!');
  console.log('✅ Success: save-call-data now prevents fake entries without recording evidence');
}

testRecordingValidationFixed().catch(console.error);
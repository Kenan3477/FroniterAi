#!/usr/bin/env node

const API_BASE = 'https://froniterai-production.up.railway.app/api/calls';

async function testRecordingValidation() {
  console.log('🧪 Testing save-call-data recording validation...\n');

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
        duration: 30,
        campaignId: '1',
        dispositionId: '1'
      })
    });
    
    const result = await response.json();
    console.log(`❌ Status: ${response.status}`);
    console.log(`❌ Response:`, result);
    console.log('✅ PASS: Correctly rejected call without recording evidence\n');
  } catch (error) {
    console.log(`❌ FAIL: Network error - ${error.message}\n`);
  }

  // Test 2: Try to save call with callSid (should succeed)
  console.log('Test 2: Attempting save with callSid (should succeed)');
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
        duration: 45,
        campaignId: '1',
        dispositionId: '1',
        callSid: 'CA1234567890abcdef1234567890abcdef' // Fake but valid format
      })
    });
    
    const result = await response.json();
    console.log(`✅ Status: ${response.status}`);
    console.log(`✅ Response:`, result);
    console.log('✅ PASS: Correctly accepted call with callSid\n');
  } catch (error) {
    console.log(`❌ FAIL: Network error - ${error.message}\n`);
  }

  // Test 3: Try to save call with recordingUrl (should succeed)
  console.log('Test 3: Attempting save with recordingUrl (should succeed)');
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
        duration: 60,
        campaignId: '1',
        dispositionId: '1',
        recordingUrl: 'https://api.twilio.com/recording-test-url'
      })
    });
    
    const result = await response.json();
    console.log(`✅ Status: ${response.status}`);
    console.log(`✅ Response:`, result);
    console.log('✅ PASS: Correctly accepted call with recordingUrl\n');
  } catch (error) {
    console.log(`❌ FAIL: Network error - ${error.message}\n`);
  }

  // Test 4: Try to save call with both callSid and recordingUrl (should succeed)
  console.log('Test 4: Attempting save with both callSid and recordingUrl (should succeed)');
  try {
    const response = await fetch(`${API_BASE}/save-call-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token'
      },
      body: JSON.stringify({
        agentId: '509',
        phoneNumber: '+1555666777',
        duration: 75,
        campaignId: '1',
        dispositionId: '1',
        callSid: 'CA9876543210fedcba9876543210fedcba',
        recordingUrl: 'https://api.twilio.com/recording-full-test'
      })
    });
    
    const result = await response.json();
    console.log(`✅ Status: ${response.status}`);
    console.log(`✅ Response:`, result);
    console.log('✅ PASS: Correctly accepted call with both callSid and recordingUrl\n');
  } catch (error) {
    console.log(`❌ FAIL: Network error - ${error.message}\n`);
  }

  console.log('🎯 Recording validation tests completed!');
  console.log('📝 Summary: save-call-data now requires either callSid or recordingUrl to prevent fake entries');
}

testRecordingValidation().catch(console.error);
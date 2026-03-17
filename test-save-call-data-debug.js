#!/usr/bin/env node

const API_BASE = 'https://froniterai-production.up.railway.app/api/calls';

async function testSaveCallDataEndpoint() {
  console.log('🔍 Testing save-call-data endpoint with various payloads...\n');

  // Test 1: Minimal valid payload to see the exact error
  console.log('Test 1: Testing with minimal valid payload');
  try {
    const response = await fetch(`${API_BASE}/save-call-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token'
      },
      body: JSON.stringify({
        agentId: '509',
        phoneNumber: '07487723751',
        callDuration: 30,
        campaignId: '1',
        callSid: 'CA1234567890abcdef1234567890abcdef'
      })
    });
    
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(result, null, 2));
    
    if (response.status === 500) {
      console.log('🚨 500 error - database operation failed');
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }

  // Test 2: Test with disposition data (like the actual call)
  console.log('\nTest 2: Testing with disposition data');
  try {
    const response = await fetch(`${API_BASE}/save-call-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token'
      },
      body: JSON.stringify({
        agentId: '509',
        phoneNumber: '07487723751',
        callDuration: 45,
        campaignId: '1',
        dispositionId: '1',
        callSid: 'conf-1772107318199-yv6wdk2x8',
        notes: 'Test call for debugging'
      })
    });
    
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(result, null, 2));
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
}

testSaveCallDataEndpoint().catch(console.error);
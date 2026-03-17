#!/usr/bin/env node

const API_BASE = 'https://froniterai-production.up.railway.app/api/calls';

async function debugRequest() {
  console.log('🔍 Debug: Testing save-call-data parameter extraction...\n');

  // Send request with explicit parameter names
  const testPayload = {
    agentId: '509',
    phoneNumber: '+1234567890',
    duration: 30,  // This might be the issue!
    campaignId: '1',
    dispositionId: '1'
  };

  console.log('📤 Sending payload:', JSON.stringify(testPayload, null, 2));

  try {
    const response = await fetch(`${API_BASE}/save-call-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token'
      },
      body: JSON.stringify(testPayload)
    });
    
    const result = await response.json();
    console.log(`📥 Status: ${response.status}`);
    console.log(`📥 Response:`, JSON.stringify(result, null, 2));

    if (response.status === 200 && !result.callRecord.callId.startsWith('CA')) {
      console.log('🔍 This call was saved without recording evidence!');
    }
  } catch (error) {
    console.log(`❌ Network error - ${error.message}`);
  }
}

debugRequest().catch(console.error);
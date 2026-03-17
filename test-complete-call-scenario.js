#!/usr/bin/env node

const API_BASE = 'https://froniterai-production.up.railway.app/api/calls';

async function testCompleteCallScenario() {
  console.log('🎯 Testing complete call scenario with disposition...\n');

  // Simulate the exact call scenario from your test
  const callData = {
    agentId: '509',
    phoneNumber: '07487723751',
    callDuration: 75, // 1 minute 15 seconds
    campaignId: '1',
    dispositionId: '1', // Connected disposition
    callSid: 'conf-test-' + Date.now(), // Unique conference ID
    customerInfo: {
      firstName: 'Test',
      lastName: 'Customer',
      email: 'test@example.com'
    },
    disposition: {
      id: '1',
      notes: 'Customer was interested in our services. Scheduled follow-up call.'
    }
  };

  try {
    console.log('📞 Making save-call-data request...');
    console.log('📋 Call data:', JSON.stringify(callData, null, 2));

    const response = await fetch(`${API_BASE}/save-call-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(callData)
    });
    
    const result = await response.json();
    console.log(`\n✅ Status: ${response.status}`);
    console.log(`✅ Response:`, JSON.stringify(result, null, 2));

    if (response.status === 200 && result.success) {
      console.log('\n🎉 SUCCESS! Call disposition saved successfully');
      console.log(`📞 CallId: ${result.data.callRecord.callId}`);
      console.log(`👤 Agent: ${result.data.callRecord.agentId}`);
      console.log(`📱 Phone: ${result.data.callRecord.phoneNumber}`);
      console.log(`⏱️ Duration: ${result.data.callRecord.duration} seconds`);
      console.log(`📝 Notes: ${result.data.callRecord.notes}`);
      console.log(`👥 Contact: ${result.data.contact.firstName} ${result.data.contact.lastName}`);
    } else {
      console.log('❌ Call save failed');
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testCompleteCallScenario().catch(console.error);
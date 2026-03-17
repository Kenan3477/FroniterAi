#!/usr/bin/env node

const API_BASE = 'https://froniterai-production.up.railway.app/api/calls';

async function testCallWithCorrectDisposition() {
  console.log('🎯 Testing call save with correct disposition ID...\n');

  // Use the actual "Connected" disposition ID from the database
  const callData = {
    agentId: '509',
    phoneNumber: '07487723751',
    callDuration: 75,
    campaignId: '1',
    dispositionId: 'cmm3dgmwb0000bk8b9ipcm8iv', // "Connected" disposition
    callSid: 'conf-final-test-' + Date.now(),
    customerInfo: {
      firstName: 'John',
      lastName: 'Smith', 
      email: 'john.smith@example.com'
    },
    disposition: {
      id: 'cmm3dgmwb0000bk8b9ipcm8iv',
      notes: 'Successful call - customer interested in product demo'
    }
  };

  try {
    console.log('📞 Making save-call-data request with valid disposition...');
    
    const response = await fetch(`${API_BASE}/save-call-data`, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(callData)
    });
    
    const result = await response.json();
    console.log(`\n📊 Status: ${response.status}`);

    if (response.status === 200 && result.success) {
      console.log('🎉 SUCCESS! Call with disposition saved perfectly!');
      console.log(`\n📞 Call Details:`);
      console.log(`   - CallId: ${result.data.callRecord.callId}`);
      console.log(`   - Agent: ${result.data.callRecord.agentId}`);
      console.log(`   - Phone: ${result.data.callRecord.phoneNumber}`);
      console.log(`   - Duration: ${result.data.callRecord.duration} seconds`);
      console.log(`   - Disposition ID: ${result.data.callRecord.dispositionId}`);
      console.log(`   - Notes: ${result.data.callRecord.notes}`);
      console.log(`\n👥 Contact Details:`);
      console.log(`   - Name: ${result.data.contact.firstName} ${result.data.contact.lastName}`);
      console.log(`   - Email: ${result.data.contact.email}`);
      console.log(`   - Phone: ${result.data.contact.phone}`);

      console.log('\n✅ The save-call-data endpoint is now working correctly!');
      console.log('✅ Dispositions can be saved successfully'); 
      console.log('✅ Customer info is being stored properly');
      console.log('✅ Call records are being created/updated without conflicts');

    } else {
      console.log('❌ Call save failed:');
      console.log(JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testCallWithCorrectDisposition().catch(console.error);
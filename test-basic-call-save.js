#!/usr/bin/env node

const API_BASE = 'https://froniterai-production.up.railway.app/api/calls';

async function testBasicCallSave() {
  console.log('🎯 Testing basic call save without disposition first...\n');

  // Simple call without disposition first
  const basicCallData = {
    agentId: '509',
    phoneNumber: '07487723751', 
    callDuration: 45,
    campaignId: '1',
    callSid: 'conf-basic-test-' + Date.now()
  };

  try {
    console.log('📞 Testing basic call save...');
    
    const response = await fetch(`${API_BASE}/save-call-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(basicCallData)
    });
    
    const result = await response.json();
    console.log(`Status: ${response.status}`);

    if (response.status === 200) {
      console.log('✅ Basic call save successful!');
      console.log(`📞 CallId: ${result.data.callRecord.callId}`);
      console.log(`⏱️ Duration: ${result.data.callRecord.duration}s`);
      console.log(`👤 Agent: ${result.data.callRecord.agentId}`);
      console.log(`📱 Phone: ${result.data.callRecord.phoneNumber}`);

      // Now test with the valid disposition ID  
      console.log('\n📞 Testing call save WITH disposition...');
      
      const callWithDisposition = {
        agentId: '509',
        phoneNumber: '07487723751',
        callDuration: 60,
        campaignId: '1',
        callSid: 'conf-disposition-test-' + Date.now(),
        dispositionId: 'cmm3dgmwb0000bk8b9ipcm8iv' // Connected disposition
      };

      const response2 = await fetch(`${API_BASE}/save-call-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', 
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(callWithDisposition)
      });

      const result2 = await response2.json();
      console.log(`Status: ${response2.status}`);

      if (response2.status === 200) {
        console.log('🎉 SUCCESS! Call with disposition saved!');
        console.log(`📞 CallId: ${result2.data.callRecord.callId}`);
        console.log(`📋 DispositionId: ${result2.data.callRecord.dispositionId}`);
        console.log(`⏱️ Duration: ${result2.data.callRecord.duration}s`);
      } else {
        console.log('❌ Call with disposition failed:');
        console.log(JSON.stringify(result2, null, 2));
      }

    } else {
      console.log('❌ Basic call save failed:');
      console.log(JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testBasicCallSave().catch(console.error);
// Test exactly matching frontend request format
const testExactFrontendFormat = async () => {
  console.log('🎯 Testing with EXACT frontend request format...\n');
  
  const frontendData = {
    callSid: 'CA_frontend_format_test',
    duration: 45,  // Frontend sends 'duration'
    disposition: {
      id: 'cmm3dgmwi0002bk8br3qsinpd',
      name: 'Callback Requested',
      outcome: 'callback_requested'
    },
    dispositionId: 'cmm3dgmwi0002bk8br3qsinpd', // Frontend adds explicit dispositionId field
    notes: 'Test notes from frontend format',
    followUpRequired: true,
    followUpDate: new Date().toISOString(),
    phoneNumber: '+1234567890',
    agentId: 'system-agent'
  };
  
  try {
    console.log('📤 Sending EXACT frontend format:');
    console.log(JSON.stringify(frontendData, null, 2));
    
    const response = await fetch('https://froniterai-production.up.railway.app/api/calls/save-call-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(frontendData)
    });
    
    console.log(`\n📊 Response Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP Error: ${response.status}`);
      console.error(`Response: ${errorText}`);
      return;
    }
    
    const responseData = await response.json();
    console.log('\n📋 FULL RESPONSE:');
    console.log(JSON.stringify(responseData, null, 2));
    
    console.log('\n✅ Response received:');
    
    // Check for debug info
    if (responseData.debug) {
      console.log('\n🔍 DEBUG INFO:');
      console.log(`Received dispositionId: ${responseData.debug.receivedDispositionId}`);
      console.log(`Received disposition: ${JSON.stringify(responseData.debug.receivedDisposition)}`);
      console.log(`Validated dispositionId: ${responseData.debug.validatedDispositionId}`);
      console.log(`Final call record: ${JSON.stringify(responseData.debug.finalCallRecord)}`);
    }
    
    // Focus on key fields
    const callRecord = responseData.data?.callRecord;
    if (callRecord) {
      console.log(`Call ID: ${callRecord.callId}`);
      console.log(`Disposition ID: ${callRecord.dispositionId}`);
      console.log(`Agent ID: ${callRecord.agentId}`);
      console.log(`Duration: ${callRecord.duration}`);
      console.log(`Outcome: ${callRecord.outcome}`);
      console.log(`Recording: ${callRecord.recording ? '✅' : '❌'}`);
      
      if (callRecord.dispositionId === 'cmm3dgmwi0002bk8br3qsinpd') {
        console.log('\n🎉 SUCCESS: Disposition ID saved correctly!');
      } else {
        console.log('\n❌ FAILED: Disposition ID is wrong or null');
        console.log(`Expected: cmm3dgmwi0002bk8br3qsinpd`);
        console.log(`Got: ${callRecord.dispositionId}`);
      }
    } else {
      console.log('❌ No call record in response');
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:');
    console.error(error.message);
  }
};

testExactFrontendFormat();
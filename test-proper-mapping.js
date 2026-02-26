// Test with proper field mapping and unique callSid
const testWithProperMapping = async () => {
  console.log('🎯 Testing with proper field mapping and unique callSid...\n');
  
  const timestamp = Date.now();
  const properFormatData = {
    callSid: `CA_proper_test_${timestamp}`,
    callDuration: 45,  // Backend expects 'callDuration', not 'duration'
    disposition: {
      id: 'cmm3dgmwi0002bk8br3qsinpd',
      name: 'Callback Requested',
      outcome: 'callback_requested'
    },
    dispositionId: 'cmm3dgmwi0002bk8br3qsinpd',
    notes: 'Test with proper field mapping',
    phoneNumber: '+1234567890',
    agentId: 'system-agent',
    recordingUrl: 'https://froniterai-production.up.railway.app/test-recording.mp3' // Add recording
  };
  
  try {
    console.log('📤 Sending with proper field mapping:');
    console.log(JSON.stringify(properFormatData, null, 2));
    
    const response = await fetch('https://froniterai-production.up.railway.app/api/calls/save-call-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(properFormatData)
    });
    
    console.log(`\n📊 Response Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP Error: ${response.status}`);
      console.error(`Response: ${errorText}`);
      return;
    }
    
    const responseData = await response.json();
    
    // Focus on key fields
    const callRecord = responseData.data?.callRecord;
    if (callRecord) {
      console.log('\n📋 RESULTS:');
      console.log(`Call ID: ${callRecord.callId}`);
      console.log(`Disposition ID: ${callRecord.dispositionId}`);
      console.log(`Duration: ${callRecord.duration}`);
      console.log(`Recording: ${callRecord.recording ? '✅' : '❌'}`);
      
      if (callRecord.dispositionId === 'cmm3dgmwi0002bk8br3qsinpd') {
        console.log('\n🎉 SUCCESS: Disposition ID saved correctly!');
      } else {
        console.log('\n❌ FAILED: Disposition ID still null');
        
        // Check if debug info exists
        if (responseData.debug) {
          console.log('\n🔍 DEBUG INFO:');
          console.log(JSON.stringify(responseData.debug, null, 2));
        } else {
          console.log('\n⚠️ No debug info in response - deployment may not be active');
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:');
    console.error(error.message);
  }
};

testWithProperMapping();
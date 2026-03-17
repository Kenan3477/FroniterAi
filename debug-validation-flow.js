// Test the actual console output to see where the validation is failing
const testConsoleOutput = async () => {
  console.log('🔍 DEBUGGING: Testing to see actual validation flow...\n');
  
  const testData = {
    callSid: 'CA_debug_validation',
    callDuration: 45,
    dispositionId: 'cmm3dgmwi0002bk8br3qsinpd', // Known valid disposition
    phoneNumber: '+1234567890',
    agentId: 'system-agent',
    recordingUrl: 'https://froniterai-production.up.railway.app/test-recording.mp3'
  };
  
  console.log('📤 Sending simple dispositionId only (no disposition object):');
  console.log(JSON.stringify(testData, null, 2));
  
  try {
    const response = await fetch('https://froniterai-production.up.railway.app/api/calls/save-call-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log(`\n📊 Response Status: ${response.status}`);
    
    const responseData = await response.json();
    
    console.log('\n📋 FULL DEBUG RESPONSE:');
    console.log(JSON.stringify(responseData.debug, null, 2));
    
    if (responseData.debug) {
      console.log('\n🔍 CRITICAL DEBUG INFO:');
      console.log(`Campaign ID: ${responseData.debug.campaignId}`);
      console.log(`Received dispositionId: ${responseData.debug.receivedDispositionId}`);
      console.log(`Validated dispositionId: ${responseData.debug.validatedDispositionId}`);
      
      if (responseData.debug.validatedDispositionId === null) {
        console.log('\n❌ VALIDATION STILL FAILING');
        console.log('   Either disposition not found OR campaign link missing');
        console.log('   Auto-fix logic not working or not being reached');
      } else {
        console.log('\n✅ VALIDATION SUCCESS!');
        console.log('   Auto-fix worked or disposition was already linked');
      }
    }
    
    const callRecord = responseData.data?.callRecord;
    if (callRecord?.dispositionId === 'cmm3dgmwi0002bk8br3qsinpd') {
      console.log('\n🎉 FINAL SUCCESS: Disposition saved in call record!');
    } else {
      console.log('\n❌ FINAL FAILURE: Disposition not saved in call record');
      console.log(`Expected: cmm3dgmwi0002bk8br3qsinpd`);
      console.log(`Got: ${callRecord?.dispositionId}`);
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
  }
};

testConsoleOutput();
// Test the fix for missing disposition + agent mapping
const testDispositionFix = async () => {
  console.log('🧪 Testing disposition fix with agent 509 mapping...\n');
  
  const testData = {
    callSid: 'CA_final_fix_test',
    duration: 45, // Frontend sends 'duration' not 'callDuration'
    disposition: {
      id: 'cmm3dgmwi0002bk8br3qsinpd', // Old non-existent disposition ID
      name: 'Callback Requested',
      outcome: 'callback_requested'
    },
    dispositionId: 'cmm3dgmwi0002bk8br3qsinpd', // This will fail validation
    notes: 'Test with missing disposition',
    phoneNumber: '07487723751',
    agentId: '509', // This will be mapped to system-agent
    recordingUrl: 'https://froniterai-production.up.railway.app/test-recording.mp3'
  };
  
  console.log('📤 Testing with problematic data (should now succeed):');
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
    
    if (response.status === 500) {
      console.log('❌ Still getting 500 error');
      const errorData = await response.json();
      console.log('Error:', JSON.stringify(errorData, null, 2));
      
    } else if (response.status === 200) {
      console.log('✅ SUCCESS! No more 500 error');
      
      const responseData = await response.json();
      const callRecord = responseData.data?.callRecord;
      
      console.log('\n📋 Key Results:');
      console.log(`Call ID: ${callRecord?.callId}`);
      console.log(`Agent ID: ${callRecord?.agentId} (should be system-agent, not 509)`);
      console.log(`Disposition ID: ${callRecord?.dispositionId} (will be null due to missing disposition)`);
      console.log(`Outcome: ${callRecord?.outcome} (should still be saved)`);
      console.log(`Duration: ${callRecord?.duration}`);
      
      if (responseData.warning) {
        console.log(`\n⚠️ Warning: ${responseData.warning}`);
      }
      
      if (callRecord?.agentId === 'system-agent' && callRecord?.outcome === 'callback_requested') {
        console.log('\n🎉 COMPLETE SUCCESS!');
        console.log('   ✅ Agent ID mapped correctly');
        console.log('   ✅ Call saved with outcome despite missing disposition');
        console.log('   ✅ No more 500 errors');
        console.log('\n📞 Browser calls should now work!');
      }
    } else {
      console.log(`⚠️ Unexpected status: ${response.status}`);
      const responseData = await response.json();
      console.log(JSON.stringify(responseData, null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
  }
};

// Wait for deployment and test
setTimeout(testDispositionFix, 60000); // Wait 1 minute for deployment
console.log('⏳ Waiting 60 seconds for Railway deployment to complete...');
console.log('🎯 Then testing the final fix...');
// Test disposition save with current deployment
// This will help us see the exact console errors

const testSaveCallData = async () => {
  console.log('🧪 Testing save-call-data endpoint with current deployment...\n');
  
  const testData = {
    callSid: 'CA_console_test_callsid',
    agentId: 'system-agent',
    dispositionId: 'cmm3dgmwi0002bk8br3qsinpd', // Callback Requested
    duration: 45,
    recordingUrl: 'https://froniterai-production.up.railway.app/test-recording.mp3',
    phoneNumber: '+1234567890',
    outcome: 'completed'
  };
  
  try {
    console.log('📤 Sending request to save-call-data...');
    console.log('Data:', JSON.stringify(testData, null, 2));
    
    const response = await fetch('https://froniterai-production.up.railway.app/api/calls/save-call-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log(`\n📊 Response Status: ${response.status}`);
    
    const responseText = await response.text();
    console.log(`📄 Response Body: ${responseText}`);
    
    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      console.error(`Response: ${responseText}`);
      return;
    }
    
    try {
      const responseData = JSON.parse(responseText);
      console.log('\n✅ Parsed Response:');
      console.log(JSON.stringify(responseData, null, 2));
      
      if (responseData.dispositionId) {
        console.log(`\n✅ SUCCESS: Disposition saved with ID ${responseData.dispositionId}`);
      } else {
        console.log(`\n❌ PROBLEM: Disposition ID is ${responseData.dispositionId}`);
      }
      
    } catch (parseError) {
      console.log('\n📄 Non-JSON Response (likely HTML error page)');
    }
    
  } catch (error) {
    console.error('\n❌ Network/Fetch Error:');
    console.error(error.message);
  }
};

testSaveCallData();
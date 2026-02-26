// Test the exact request that the frontend made to debug the 500 error
const testRealCallScenario = async () => {
  console.log('🔍 Testing the exact scenario from browser console...\n');
  
  // Based on console logs, this would be the data structure
  const realCallData = {
    callSid: 'CAxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // Real Twilio CallSid format
    duration: 30, // Call duration from the browser
    disposition: {
      id: 'cmm3dgmwi0002bk8br3qsinpd',
      name: 'Callback Requested',
      outcome: 'callback_requested'
    },
    dispositionId: 'cmm3dgmwi0002bk8br3qsinpd',
    notes: '',
    followUpRequired: false,
    phoneNumber: '07487723751', // The actual number called
    agentId: '509' // User ID 509 (ken)
  };
  
  console.log('📤 Testing with REAL CALL scenario data:');
  console.log(JSON.stringify(realCallData, null, 2));
  
  try {
    const response = await fetch('https://froniterai-production.up.railway.app/api/calls/save-call-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer dummy-token` // Browser would have real token
      },
      body: JSON.stringify(realCallData)
    });
    
    console.log(`\n📊 Response Status: ${response.status}`);
    
    if (response.status === 500) {
      console.log('🔥 500 ERROR REPRODUCED - This is the same error from browser');
      
      try {
        const errorData = await response.json();
        console.log('\n📋 Error Response:');
        console.log(JSON.stringify(errorData, null, 2));
        
        // Check for specific database errors
        if (errorData.error?.includes('foreign key') || errorData.message?.includes('foreign key')) {
          console.log('\n❌ FOREIGN KEY CONSTRAINT ERROR');
          console.log('   Most likely: agentId "509" does not exist in database');
        } else if (errorData.error?.includes('unique') || errorData.message?.includes('unique')) {
          console.log('\n❌ UNIQUE CONSTRAINT ERROR');
          console.log('   Most likely: duplicate callSid or contact issue');
        } else {
          console.log('\n❌ OTHER DATABASE ERROR');
        }
        
      } catch (parseError) {
        console.log('\n📄 Error response is not JSON');
        const textResponse = await response.text();
        console.log('Raw response:', textResponse);
      }
      
    } else {
      console.log('✅ Different response than expected 500');
      const responseData = await response.json();
      console.log(JSON.stringify(responseData, null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
  }
};

testRealCallScenario();
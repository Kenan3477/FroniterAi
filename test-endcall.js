// Test the endCall endpoint directly
const fetch = require('node-fetch');

async function testEndCall() {
  try {
    console.log('🧪 Testing /api/dialer/end endpoint...\n');
    
    const testData = {
      callSid: 'CA_test_12345',
      duration: 30,
      status: 'completed',
      disposition: 'customer-hangup',
      endedBy: 'customer'
    };
    
    console.log('📤 Sending request:', JSON.stringify(testData, null, 2));
    
    const response = await fetch('https://froniterai-production.up.railway.app/api/calls/end', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('\n📥 Response status:', response.status);
    console.log('📥 Response ok:', response.ok);
    
    const responseText = await response.text();
    console.log('\n📥 Raw response:', responseText);
    
    try {
      const responseData = JSON.parse(responseText);
      console.log('\n📥 Parsed response:', JSON.stringify(responseData, null, 2));
    } catch (e) {
      console.log('\n⚠️  Could not parse as JSON');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testEndCall();

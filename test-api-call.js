/**
 * Test API call to save-call-data to reproduce the 500 error
 */

// Simulate the exact payload being sent
const testPayload = {
  phoneNumber: "+1234567890",
  customerInfo: {
    firstName: "Test",
    lastName: "Customer",
    email: "test@example.com",
    notes: "Test call"
  },
  disposition: {
    outcome: "completed",
    notes: "Test disposition"
  },
  callDuration: 30,
  agentId: "agent-browser",
  campaignId: "manual-dial"
};

async function testSaveCallData() {
  try {
    console.log('🧪 Testing save-call-data API...');
    console.log('📋 Payload:', JSON.stringify(testPayload, null, 2));

    // Test with fetch to localhost
    const response = await fetch('http://localhost:3000/api/calls/save-call-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token`
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    console.log('\n📋 Response Status:', response.status);
    console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('📋 Response Body:', responseText);

    if (!response.ok) {
      console.error('❌ Request failed with status:', response.status);
      if (responseText) {
        try {
          const errorData = JSON.parse(responseText);
          console.error('❌ Error details:', errorData);
        } catch (e) {
          console.error('❌ Raw error response:', responseText);
        }
      }
    } else {
      console.log('✅ Request successful!');
      try {
        const result = JSON.parse(responseText);
        console.log('📋 Parsed result:', result);
      } catch (e) {
        console.log('📋 Non-JSON response:', responseText);
      }
    }

  } catch (error) {
    console.error('❌ Fetch error:', error);
  }
}

testSaveCallData();
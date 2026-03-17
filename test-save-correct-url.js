const testSaveCallDataCorrectUrl = async () => {
  console.log('🧪 Testing save-call-data with CORRECT URL and agent ID...');
  
  try {
    // Test health endpoint first
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch('https://froniterai-production.up.railway.app/health');
    console.log(`Health Status: ${healthResponse.status}`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Backend is running!');
      console.log('Service:', healthData.service);
    }

    // Test save-call-data endpoint
    console.log('\n2. Testing save-call-data endpoint...');
    const testCallData = {
      callId: 'test-call-' + Date.now(),
      agentId: '509', // Correct agent ID for Kenan
      customerPhone: '+1234567890',
      contactName: 'Test Customer',
      campaignId: 'test-campaign',
      callDuration: 30,
      outcome: 'completed',
      disposition: 'sale',
      notes: 'Test call with correct agent ID and URL'
    };

    console.log('📤 Sending test data:', JSON.stringify(testCallData, null, 2));

    const response = await fetch('https://froniterai-production.up.railway.app/api/calls/save-call-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCallData)
    });

    console.log(`\n📊 Response Status: ${response.status} ${response.statusText}`);
    
    const result = await response.text();
    console.log('📥 Response Body:', result);

    if (response.ok) {
      console.log('✅ SUCCESS! Call data saved successfully!');
    } else {
      console.log('❌ Save call data failed');
    }

  } catch (error) {
    console.error('💥 Error testing save-call-data:', error);
  }
};

testSaveCallDataCorrectUrl();
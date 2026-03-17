const testSaveCallDataWithCorrectAgent = async () => {
  console.log('🧪 Testing save-call-data with correct agent ID (509)...');
  
  try {
    const testCallData = {
      callId: 'test-call-' + Date.now(),
      agentId: '509', // Use correct agent ID for Kenan
      customerPhone: '+1234567890',
      contactName: 'Test Customer',
      campaignId: 'test-campaign',
      callDuration: 30,
      outcome: 'completed',
      disposition: 'sale',
      notes: 'Test call with correct agent ID'
    };

    console.log('📤 Sending test data:', JSON.stringify(testCallData, null, 2));

    const response = await fetch('https://omnivox-backend-production.up.railway.app/api/calls/save-call-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCallData)
    });

    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    
    const result = await response.text();
    console.log('📥 Response Body:', result);

    if (response.ok) {
      console.log('✅ Save call data SUCCESS with correct agent ID!');
    } else {
      console.log('❌ Save call data FAILED with correct agent ID');
    }

  } catch (error) {
    console.error('💥 Error testing save-call-data:', error);
  }
};

testSaveCallDataWithCorrectAgent();
const testRealCallDataSave = async () => {
  console.log('🧪 Testing real call data save after agentId fixes...');
  
  try {
    // Test with realistic call data to see if it saves correctly
    const testCallData = {
      phoneNumber: '+447487723751', // Real UK number format
      customerInfo: {
        firstName: 'John',
        lastName: 'Smith',
        phoneNumber: '+447487723751',
        email: 'john.smith@example.com',
        company: 'Test Company Ltd'
      },
      disposition: {
        outcome: 'answered',
        notes: 'Customer interested in our services',
        followUpRequired: true
      },
      callDuration: 120, // 2 minutes
      agentId: '509', // Correct agent ID for Kenan
      campaignId: 'manual-dial'
    };

    console.log('📤 Sending realistic call data:', JSON.stringify(testCallData, null, 2));

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
      console.log('✅ SUCCESS! Real call data saved successfully!');
      
      // Parse the result to see what was actually saved
      try {
        const parsed = JSON.parse(result);
        if (parsed.data && parsed.data.callRecord) {
          const callRecord = parsed.data.callRecord;
          console.log('\n📋 Saved call record details:');
          console.log(`   📞 Phone: ${callRecord.phoneNumber} -> ${callRecord.dialedNumber}`);
          console.log(`   👤 Agent: ${callRecord.agentId}`);
          console.log(`   ⏱️ Duration: ${callRecord.duration} seconds`);
          console.log(`   📝 Outcome: ${callRecord.outcome}`);
          console.log(`   📅 Created: ${callRecord.createdAt}`);
        }
      } catch (parseError) {
        console.log('Could not parse response for details');
      }
      
    } else {
      console.log('❌ Real call data save failed');
    }

  } catch (error) {
    console.error('💥 Error testing real call data save:', error);
  }
};

// Wait for deployment then test
setTimeout(testRealCallDataSave, 30000);
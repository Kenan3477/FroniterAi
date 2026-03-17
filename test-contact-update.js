const testContactUpdate = async () => {
  console.log('🧪 Testing contact info update with save-call-data...');
  
  try {
    // Test updating the existing "Unknown Contact" with real customer info
    const testCallData = {
      phoneNumber: '+447487723751', // Same number as before
      customerInfo: {
        firstName: 'Sarah',
        lastName: 'Wilson',
        phoneNumber: '+447487723751',
        email: 'sarah.wilson@businesscorp.com',
        company: 'Business Corp Ltd'
      },
      disposition: {
        outcome: 'completed',
        notes: 'Customer provided updated contact details',
        followUpRequired: false
      },
      callDuration: 90,
      agentId: '509',
      campaignId: 'manual-dial'
    };

    console.log('📤 Sending call with customer info update:', JSON.stringify(testCallData, null, 2));

    const response = await fetch('https://froniterai-production.up.railway.app/api/calls/save-call-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCallData)
    });

    console.log(`\n📊 Response Status: ${response.status} ${response.statusText}`);
    
    const result = await response.text();
    console.log('📥 Response:', result.substring(0, 500) + '...');

    if (response.ok) {
      console.log('✅ Call saved! Now checking if contact was updated...');
      
      // Parse response to see contact details
      try {
        const parsed = JSON.parse(result);
        if (parsed.data && parsed.data.contact) {
          const contact = parsed.data.contact;
          console.log('\n📋 Contact details in response:');
          console.log(`   👤 Name: ${contact.firstName} ${contact.lastName}`);
          console.log(`   📧 Email: ${contact.email || 'Not provided'}`);
          console.log(`   📞 Phone: ${contact.phone}`);
          
          if (contact.firstName === 'Sarah' && contact.lastName === 'Wilson') {
            console.log('🎉 SUCCESS! Contact was updated with new customer info!');
          } else {
            console.log('⚠️ Contact was not updated - still showing old info');
          }
        }
      } catch (parseError) {
        console.log('Could not parse response for contact details');
      }
      
    } else {
      console.log('❌ Call save failed');
    }

  } catch (error) {
    console.error('💥 Error testing contact update:', error);
  }
};

testContactUpdate();
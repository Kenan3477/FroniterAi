// Direct test of the call-records API to see what data it returns

async function testCallRecordsAPI() {
  try {
    console.log('🧪 Testing /api/call-records endpoint directly...\n');

    const response = await fetch('https://froniterai-production.up.railway.app/api/call-records', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test', // This will fail but let's see the error
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('\n📊 Call Records API Response:');
      console.log('Success:', data.success);
      
      if (data.records && Array.isArray(data.records)) {
        console.log(`Found ${data.records.length} records:`);
        data.records.forEach((record, index) => {
          console.log(`\n${index + 1}. ${record.callId || record.id}`);
          console.log(`   Phone: ${record.phoneNumber}`);
          console.log(`   Agent: ${record.agentId}`);
          console.log(`   Contact: ${record.contactId}`);
          console.log(`   Created: ${record.createdAt || record.startTime}`);
        });
      } else {
        console.log('No records array found in response');
      }
    } else {
      console.log('❌ API call failed');
    }

  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

// Also test without auth to see if there's a different response
async function testCallRecordsAPINoAuth() {
  try {
    console.log('\n🧪 Testing /api/call-records endpoint without auth...\n');

    const response = await fetch('https://froniterai-production.up.railway.app/api/call-records', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status (no auth):', response.status);
    const responseText = await response.text();
    console.log('Response body (no auth):', responseText);

  } catch (error) {
    console.error('❌ Error testing API without auth:', error);
  }
}

testCallRecordsAPI();
testCallRecordsAPINoAuth();
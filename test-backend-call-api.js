// Test script to directly call the backend API and see if call records are created

async function testBackendCallAPI() {
  try {
    console.log('🧪 Testing backend call API...\n');

    // Step 1: Login to get auth token
    console.log('1. Logging in to get auth token...');
    const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'password' // You'll need to provide the actual admin password
      })
    });

    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginResponse.status, loginResponse.statusText);
      const loginError = await loginResponse.text();
      console.error('Login error details:', loginError);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    console.log('User:', loginData.user?.firstName, loginData.user?.lastName);
    
    if (!loginData.token) {
      console.error('❌ No token received from login');
      return;
    }

    const authToken = loginData.token;

    // Step 2: Make call API request
    console.log('\n2. Making call API request...');
    const callResponse = await fetch('https://froniterai-production.up.railway.app/api/calls/call-rest-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        to: '+44747723751', // Your test number
        contactId: null,
        contactName: 'Test Contact API',
        existingContact: false
      })
    });

    console.log('Response status:', callResponse.status, callResponse.statusText);
    
    if (!callResponse.ok) {
      console.error('❌ Call API failed');
      const errorText = await callResponse.text();
      console.error('Error details:', errorText);
      return;
    }

    const callData = await callResponse.json();
    console.log('✅ Call API response:', callData);

    // Step 3: Check if call record was created
    console.log('\n3. Checking if call record was created...');
    
    // Wait a moment for the record to be created
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const recordsResponse = await fetch('https://froniterai-production.up.railway.app/api/call-records', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!recordsResponse.ok) {
      console.error('❌ Failed to fetch call records:', recordsResponse.status);
      const errorText = await recordsResponse.text();
      console.error('Error details:', errorText);
      return;
    }

    const recordsData = await recordsResponse.json();
    console.log('Call records response:', recordsData);

    if (recordsData.success && recordsData.data) {
      console.log(`📊 Found ${recordsData.data.length} call records:`);
      recordsData.data.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.callId}: ${record.phoneNumber} (Agent: ${record.agentId})`);
      });
    } else {
      console.log('📊 No call records found or error in response');
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testBackendCallAPI();
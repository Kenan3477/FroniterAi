const fetch = require('node-fetch');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

// Test with authentication
async function testDialQueueNextWithAuth() {
  try {
    console.log('🧪 Testing dial queue next contact API with auth...');
    
    // First get an auth token
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin' // Using admin credentials
      })
    });

    if (!loginResponse.ok) {
      console.log(`❌ Login failed: ${loginResponse.status}`);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('🔐 Login successful, token obtained');
    
    // Now test dial queue with auth
    const response = await fetch(`${BACKEND_URL}/api/dial-queue/next`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify({
        campaignId: 'campaign_1766695393511',
        agentId: 'agent-1'
      })
    });

    console.log(`📡 Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Error response body: ${errorText}`);
      return;
    }

    const data = await response.json();
    console.log('✅ Success response with auth:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Test with auth failed:', error.message);
  }
}

testDialQueueNextWithAuth();
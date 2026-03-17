require('dotenv').config();

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function testDebugAuthWithFresh() {
  console.log('🔍 Testing debug auth endpoint with fresh admin...\n');

  try {
    // Login with fresh admin
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'freshadmin@omnivox.com',
        password: 'FreshAdmin123!'
      })
    });

    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.log('❌ Login failed:', loginData.message);
      return;
    }

    const token = loginData.data.token;
    console.log('✅ Login successful');
    
    // Test debug auth endpoint
    console.log('\n🔧 Testing debug auth endpoint...');
    const debugResponse = await fetch(`${BACKEND_URL}/api/users/debug-auth`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });

    const debugData = await debugResponse.json();
    console.log('🔧 Debug auth status:', debugResponse.status);
    console.log('🔧 Debug auth response:', JSON.stringify(debugData, null, 2));

  } catch (error) {
    console.error('❌ Error testing debug auth:', error.message);
  }
}

testDebugAuthWithFresh();
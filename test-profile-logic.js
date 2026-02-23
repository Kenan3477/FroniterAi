require('dotenv').config();

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function testProfileLogic() {
  console.log('🔍 Testing profile logic via debug endpoint...\n');

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
    
    // Test profile logic via debug endpoint
    console.log('\n🔧 Testing profile logic...');
    const debugResponse = await fetch(`${BACKEND_URL}/api/users/debug-auth?testProfile=true`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });

    const debugData = await debugResponse.json();
    console.log('🔧 Profile logic test status:', debugResponse.status);
    console.log('🔧 Profile logic test response:', JSON.stringify(debugData, null, 2));

  } catch (error) {
    console.error('❌ Error testing profile logic:', error.message);
  }
}

testProfileLogic();
/**
 * Quick test if migration endpoint is ready
 */

const fetch = require('node-fetch');

async function quickTest() {
  console.log('🔍 Quick test if migration endpoint is ready...\n');
  
  try {
    // Login
    const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ken@simpleemails.co.uk',
        password: 'Kenzo3477!'
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.data?.token || loginData.token;

    // Test endpoint
    const testResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/migrate-storage-types', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (testResponse.ok) {
      const result = await testResponse.json();
      console.log('🎉 ENDPOINT READY!');
      console.log('Migration result:', result);
      console.log('\n✅ Recording playback should now work!');
    } else {
      console.log(`❌ Endpoint not ready: ${testResponse.status}`);
      if (testResponse.status === 404) {
        console.log('   Still deploying...');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

quickTest();
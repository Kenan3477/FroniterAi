// Test the fixed import endpoint
const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function testImport() {
  try {
    // First try to login
    console.log('🔐 Logging in as admin...');
    
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'Ken3477!'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    
    const token = loginData.data.token;
    
    // Now test the import
    console.log('📥 Testing Twilio recordings import...');
    
    const importResponse = await fetch(`${BACKEND_URL}/api/call-records/import-twilio-recordings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        daysBack: 30,
        limit: 20
      })
    });
    
    if (!importResponse.ok) {
      const errorData = await importResponse.text();
      throw new Error(`Import failed: ${importResponse.status} ${importResponse.statusText}\n${errorData}`);
    }
    
    const importData = await importResponse.json();
    console.log('✅ Import successful!');
    console.log('📊 Results:', JSON.stringify(importData, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
testImport();
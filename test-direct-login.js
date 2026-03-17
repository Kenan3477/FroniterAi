const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('🔍 Testing direct backend login...');
    
    const response = await fetch('http://localhost:3004/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@omnivox.ai',
        password: 'admin123'
      }),
      timeout: 5000
    });

    console.log('📡 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Login successful!');
      console.log('👤 User:', data.data?.user?.email);
      console.log('🔑 Token:', data.data?.token ? 'Present' : 'Missing');
    } else {
      const error = await response.text();
      console.log('❌ Login failed:', error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLogin();
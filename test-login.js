const fetch = require('node-fetch');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

// Test various login attempts
async function testLogin() {
  // Try different endpoints and credentials
  const attempts = [
    {
      url: `${BACKEND_URL}/api/auth/login`,
      body: { username: 'admin', password: 'admin' }
    },
    {
      url: `${BACKEND_URL}/api/auth/login`, 
      body: { email: 'admin', password: 'admin' }
    },
    {
      url: `${BACKEND_URL}/api/login`,
      body: { username: 'admin', password: 'admin' }
    }
  ];

  for (const attempt of attempts) {
    try {
      console.log(`🧪 Testing login: ${attempt.url} with`, attempt.body);
      
      const response = await fetch(attempt.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attempt.body)
      });

      console.log(`📡 Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Login successful:', data);
        return data.token;
      } else {
        const errorText = await response.text();
        console.log(`❌ Error: ${errorText}`);
      }
      
    } catch (error) {
      console.error(`❌ Request failed:`, error.message);
    }
    
    console.log('---');
  }
  
  return null;
}

testLogin();
/**
 * Test script to check current authentication status and tokens
 */

console.log('🔍 Frontend Authentication Status Check\n');

// Check if running in browser environment
if (typeof localStorage !== 'undefined') {
  console.log('📦 Current localStorage tokens:');
  console.log('  authToken:', localStorage.getItem('authToken'));
  console.log('  omnivox_token:', localStorage.getItem('omnivox_token')); 
  console.log('  token:', localStorage.getItem('token'));
  
  const authToken = localStorage.getItem('authToken');
  const omnivoxToken = localStorage.getItem('omnivox_token');
  
  console.log('\n🔍 Token Analysis:');
  if (authToken) {
    console.log(`  authToken length: ${authToken.length}`);
    console.log(`  authToken starts with: ${authToken.substring(0, 20)}...`);
    if (authToken.startsWith('temp_local_token_')) {
      console.log('  ⚠️  FAKE TOKEN: This is a temporary local bypass token');
    } else if (authToken.includes('.')) {
      console.log('  ✅ Possible real JWT token (contains dots)');
    }
  } else {
    console.log('  ❌ No authToken found');
  }
  
  if (omnivoxToken && omnivoxToken !== authToken) {
    console.log(`  omnivox_token length: ${omnivoxToken.length}`);
    console.log(`  omnivox_token starts with: ${omnivoxToken.substring(0, 20)}...`);
  }
  
  console.log('\n📋 Session Data:');
  const sessionData = localStorage.getItem('sessionData');
  if (sessionData) {
    try {
      const parsed = JSON.parse(sessionData);
      console.log('  Session:', parsed);
    } catch (e) {
      console.log('  Session data exists but invalid JSON');
    }
  } else {
    console.log('  ❌ No session data found');
  }

} else {
  console.log('❌ localStorage not available (not in browser environment)');
}

// Test function to try a real backend login
async function testBackendLogin() {
  console.log('\n🧪 Testing Backend Authentication...');
  
  const backendUrl = 'https://froniterai-production.up.railway.app';
  const testCredentials = {
    email: 'ken@simpleemails.co.uk',
    password: 'OmnivoxAdmin2025!'  // From .env.local
  };
  
  try {
    console.log(`📡 Attempting login to: ${backendUrl}/api/auth/login`);
    console.log(`👤 Testing with: ${testCredentials.email}`);
    
    const response = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCredentials),
    });

    console.log(`📊 Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend login successful!');
      console.log('📦 Response data:', JSON.stringify(data, null, 2));
      
      if (data.success && data.data && data.data.token) {
        console.log('\n🎯 Real JWT Token Retrieved:');
        console.log(`  Token length: ${data.data.token.length}`);
        console.log(`  Token preview: ${data.data.token.substring(0, 50)}...`);
        console.log('  ✅ This is the token that should be stored in localStorage!');
        
        // Store the real token
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('authToken', data.data.token);
          localStorage.setItem('omnivox_token', data.data.token);
          console.log('💾 Real token stored in localStorage');
        }
        
        return data.data.token;
      }
    } else {
      const errorData = await response.text();
      console.log('❌ Backend login failed:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Error testing backend login:', error);
  }
  
  return null;
}

// If in browser, also test backend login
if (typeof fetch !== 'undefined') {
  testBackendLogin().then((token) => {
    if (token) {
      console.log('\n🎉 SUCCESS: Real JWT token obtained and stored!');
      console.log('✅ Frontend should now be able to authenticate with backend APIs');
      
      // Test the dispositions endpoint with the real token
      console.log('\n🧪 Testing dispositions endpoint with real token...');
      fetch('https://froniterai-production.up.railway.app/api/dispositions/configs', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }).then(response => {
        console.log(`📋 Dispositions endpoint status: ${response.status} ${response.statusText}`);
        if (response.ok) {
          return response.json();
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      }).then(data => {
        console.log('✅ Dispositions loaded successfully!');
        console.log(`📊 Found ${data.data?.length || 0} disposition configurations`);
        if (data.data && data.data.length > 0) {
          console.log('📋 Sample dispositions:');
          data.data.slice(0, 3).forEach(d => {
            console.log(`  - ${d.label || d.name} (ID: ${d.id})`);
          });
          console.log('\n🎯 DIAGNOSIS: Real disposition IDs are available!');
          console.log('   Frontend should now use these instead of fake IDs');
        }
      }).catch(error => {
        console.log('❌ Dispositions test failed:', error.message);
      });
      
    } else {
      console.log('\n❌ Could not obtain real JWT token');
      console.log('💡 Check backend credentials or connection');
    }
  });
}

export {}; // Make this a module
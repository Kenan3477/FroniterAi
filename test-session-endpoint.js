const fetch = require('node-fetch');

async function testSessionEndpoint() {
  console.log('🔐 Testing login and session data retrieval...');
  
  const BACKEND_URL = 'https://froniterai-production.up.railway.app';
  
  try {
    // Step 1: Login to get valid token
    console.log('1️⃣ Attempting login...');
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',  // From our session data check
        password: 'test123'  // Default test password
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginData);
      
      // Try with different credentials that might exist
      console.log('1️⃣ Trying kenan@couk login...');
      const loginResponse2 = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'kenan@couk',
          password: 'test123'
        })
      });
      
      const loginData2 = await loginResponse2.json();
      
      if (!loginResponse2.ok) {
        console.log('❌ Second login also failed:', loginData2);
        console.log('⚠️ Cannot test session endpoint without valid auth - checking endpoint directly...');
        
        // Try calling the endpoint with empty auth header to see structure
        const sessionResponse = await fetch(`${BACKEND_URL}/api/admin/user-sessions?limit=5`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer invalid'
          }
        });
        
        console.log('📋 Session endpoint response (no auth):', await sessionResponse.text());
        return;
      }
      
      const token = loginData2.token || loginData2.data?.token;
      console.log('✅ Login successful with kenan@couk');
      
      // Step 2: Test session endpoint
      console.log('2️⃣ Testing user-sessions endpoint...');
      const sessionResponse = await fetch(`${BACKEND_URL}/api/admin/user-sessions?limit=5`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const sessionData = await sessionResponse.json();
      
      if (sessionResponse.ok) {
        console.log('✅ User sessions retrieved successfully:');
        console.log('📊 Total sessions:', sessionData.data?.pagination?.total || 0);
        console.log('📋 Sessions data:', JSON.stringify(sessionData, null, 2));
      } else {
        console.log('❌ Session endpoint failed:', sessionData);
      }
      
      return;
    }
    
    const token = loginData.token || loginData.data?.token;
    console.log('✅ Login successful with test@example.com');
    
    // Step 2: Test session endpoint
    console.log('2️⃣ Testing user-sessions endpoint...');
    const sessionResponse = await fetch(`${BACKEND_URL}/api/admin/user-sessions?limit=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const sessionData = await sessionResponse.json();
    
    if (sessionResponse.ok) {
      console.log('✅ User sessions retrieved successfully:');
      console.log('📊 Total sessions:', sessionData.data?.pagination?.total || 0);
      console.log('📋 Sessions data:', JSON.stringify(sessionData, null, 2));
    } else {
      console.log('❌ Session endpoint failed:', sessionData);
    }
    
    // Step 3: Test audit logs endpoint
    console.log('3️⃣ Testing audit-logs endpoint...');
    const auditResponse = await fetch(`${BACKEND_URL}/api/admin/audit-logs?action=USER_LOGIN,USER_LOGOUT&limit=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const auditData = await auditResponse.json();
    
    if (auditResponse.ok) {
      console.log('✅ Audit logs retrieved successfully:');
      console.log('📊 Total audit logs:', auditData.data?.pagination?.total || 0);
      console.log('📋 Audit logs sample:', JSON.stringify(auditData.data?.logs?.slice(0, 2) || [], null, 2));
    } else {
      console.log('❌ Audit logs endpoint failed:', auditData);
    }
    
  } catch (error) {
    console.error('❌ Error testing session endpoint:', error);
  }
}

testSessionEndpoint();
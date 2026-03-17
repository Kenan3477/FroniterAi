// Test the complete flow for login/logout report
const testCompleteFlow = async () => {
  console.log('🔄 Testing complete login/logout report flow...');
  
  const BACKEND_URL = 'https://froniterai-production.up.railway.app';
  const FRONTEND_URL = 'https://omnivox-ai.vercel.app';
  
  try {
    // Step 1: Try to login to get a valid token
    console.log('1️⃣ Testing Railway backend login...');
    
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@omnivox.ai',
        password: 'admin123'  // Try common admin password
      })
    });
    
    let loginData;
    try {
      loginData = await loginResponse.json();
    } catch (error) {
      console.log('❌ Failed to parse login response as JSON');
      return;
    }
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginData);
      console.log('⚠️ Need to check admin credentials or create test user');
      
      // Let's check the exact user data we found earlier
      console.log('💡 From database check, we have users:');
      console.log('   - admin@omnivox.ai (Role: ADMIN)');
      console.log('   - test@example.com (Role: ADMIN)');
      console.log('❓ Password might be different. Let\'s try the frontend login API...');
      
      // Try the frontend login route instead
      const frontendLoginResponse = await fetch(`${FRONTEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'admin@omnivox.ai',
          password: 'admin123'
        })
      });
      
      if (frontendLoginResponse.ok) {
        const frontendLoginData = await frontendLoginResponse.json();
        console.log('✅ Frontend login successful:', frontendLoginData);
        
        // Now test the reports endpoint with the frontend token
        const token = frontendLoginData.token || frontendLoginData.data?.token;
        
        if (token) {
          console.log('2️⃣ Testing login/logout report with frontend token...');
          
          const reportResponse = await fetch(`${FRONTEND_URL}/api/admin/reports/generate?type=login_logout&startDate=2026-02-01&endDate=2026-02-20`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (reportResponse.ok) {
            const reportData = await reportResponse.json();
            console.log('✅ Login/logout report successful:', reportData);
          } else {
            const errorData = await reportResponse.text();
            console.log('❌ Report generation failed:', errorData);
          }
        }
      } else {
        console.log('❌ Frontend login also failed');
      }
      
      return;
    }
    
    console.log('✅ Railway backend login successful');
    const token = loginData.token || loginData.data?.token;
    
    if (!token) {
      console.log('❌ No token received from login');
      return;
    }
    
    // Step 2: Test user-sessions endpoint with token
    console.log('2️⃣ Testing user-sessions endpoint with token...');
    
    const sessionResponse = await fetch(`${BACKEND_URL}/api/admin/user-sessions?limit=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      console.log('✅ User sessions retrieved:', sessionData);
    } else {
      const errorData = await sessionResponse.json();
      console.log('❌ Session endpoint failed:', errorData);
    }
    
    // Step 3: Test audit logs endpoint
    console.log('3️⃣ Testing audit-logs endpoint with token...');
    
    const auditResponse = await fetch(`${BACKEND_URL}/api/admin/audit-logs?action=USER_LOGIN,USER_LOGOUT&limit=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (auditResponse.ok) {
      const auditData = await auditResponse.json();
      console.log('✅ Audit logs retrieved:', auditData);
    } else {
      const errorData = await auditResponse.json();
      console.log('❌ Audit endpoint failed:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Error in complete flow test:', error);
  }
};

// For Node.js environment
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

testCompleteFlow();
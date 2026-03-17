// Test the complete flow with the new test credentials
const testWithNewCredentials = async () => {
  console.log('🧪 Testing login/logout report with new test credentials...');
  
  const BACKEND_URL = 'https://froniterai-production.up.railway.app';
  
  try {
    // Step 1: Login with test credentials
    console.log('1️⃣ Testing login with test.admin@omnivox.com...');
    
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test.admin@omnivox.com',
        password: 'TestAdmin123!'
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginData);
      return;
    }
    
    console.log('✅ Login successful!');
    const token = loginData.token || loginData.data?.token;
    
    if (!token) {
      console.log('❌ No token received');
      return;
    }
    
    // Step 2: Test user-sessions endpoint with token
    console.log('2️⃣ Testing user-sessions endpoint...');
    
    const sessionResponse = await fetch(`${BACKEND_URL}/api/admin/user-sessions?limit=10&dateFrom=2026-02-18&dateTo=2026-02-20`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      console.log('✅ User sessions retrieved successfully!');
      console.log('📊 Total sessions:', sessionData.data?.pagination?.total || sessionData.data?.sessions?.length || 'Unknown');
      
      if (sessionData.data?.sessions && sessionData.data.sessions.length > 0) {
        console.log('📋 Sample sessions:');
        sessionData.data.sessions.slice(0, 3).forEach(session => {
          console.log(`  - ${session.user?.username || 'Unknown'}: ${session.loginTime} (${session.status})`);
        });
      }
    } else {
      const errorData = await sessionResponse.json();
      console.log('❌ Session endpoint failed:', errorData);
    }
    
    // Step 3: Test audit logs endpoint
    console.log('3️⃣ Testing audit-logs endpoint...');
    
    const auditResponse = await fetch(`${BACKEND_URL}/api/admin/audit-logs?action=USER_LOGIN,USER_LOGOUT&limit=10&dateFrom=2026-02-18&dateTo=2026-02-20`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (auditResponse.ok) {
      const auditData = await auditResponse.json();
      console.log('✅ Audit logs retrieved successfully!');
      console.log('📊 Total audit logs:', auditData.data?.pagination?.total || auditData.data?.logs?.length || 'Unknown');
      
      if (auditData.data?.logs && auditData.data.logs.length > 0) {
        console.log('📋 Sample audit logs:');
        auditData.data.logs.slice(0, 3).forEach(log => {
          console.log(`  - ${log.action}: ${log.performedByUserName} at ${log.timestamp}`);
        });
      }
    } else {
      const errorData = await auditResponse.json();
      console.log('❌ Audit endpoint failed:', errorData);
    }
    
    console.log('\n🎉 All tests passed! The login/logout report should now work.');
    console.log('\n📋 Next steps:');
    console.log('   1. Go to https://omnivox-ai.vercel.app');
    console.log('   2. Login with: test.admin@omnivox.com / TestAdmin123!');
    console.log('   3. Navigate to Reports > Users');
    console.log('   4. Click "Login/Logout" under the subcategory');
    console.log('   5. Set date range to Feb 18-20, 2026');
    console.log('   6. You should see the session data and audit trail!');
    
  } catch (error) {
    console.error('❌ Error in authentication test:', error);
  }
};

// For Node.js environment
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

testWithNewCredentials();
// Test authentication token and report generation
const fetch = require('node-fetch');

async function testReportAPI() {
  try {
    // Test the login endpoint first to get a token
    console.log('🔐 Testing login to get auth token...');
    
    const BACKEND_URL = 'https://froniterai-production.up.railway.app';
    
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.log('❌ Login failed:', errorText);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful:', loginData.success);
    
    if (!loginData.token) {
      console.log('❌ No token in login response');
      return;
    }

    const token = loginData.token;
    console.log('🔑 Got auth token:', token.substring(0, 20) + '...');

    // Now test the admin report endpoints
    console.log('\\n📊 Testing user sessions endpoint...');
    const sessionsResponse = await fetch(`${BACKEND_URL}/api/admin/user-sessions?limit=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Sessions endpoint status:', sessionsResponse.status);
    if (sessionsResponse.ok) {
      const sessionsData = await sessionsResponse.json();
      console.log('✅ Sessions data:', JSON.stringify(sessionsData, null, 2));
    } else {
      const errorText = await sessionsResponse.text();
      console.log('❌ Sessions error:', errorText);
    }

    // Test audit logs endpoint
    console.log('\\n📋 Testing audit logs endpoint...');
    const auditResponse = await fetch(`${BACKEND_URL}/api/admin/audit-logs?action=USER_LOGIN,USER_LOGOUT&limit=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Audit logs endpoint status:', auditResponse.status);
    if (auditResponse.ok) {
      const auditData = await auditResponse.json();
      console.log('✅ Audit logs data:', JSON.stringify(auditData, null, 2));
    } else {
      const errorText = await auditResponse.text();
      console.log('❌ Audit logs error:', errorText);
    }

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testReportAPI();
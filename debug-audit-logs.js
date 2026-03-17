// Debug audit logs endpoint specifically
const fetch = require('node-fetch');

async function debugAuditLogs() {
  console.log('🔍 Debugging audit logs endpoint...');
  
  const BACKEND_URL = 'https://froniterai-production.up.railway.app';
  const FRONTEND_URL = 'https://omnivox-ai.vercel.app';
  
  try {
    // Login to get token
    console.log('1️⃣ Getting auth token...');
    const loginResponse = await fetch(`${FRONTEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test.admin@omnivox.com',
        password: 'TestAdmin123!'
      })
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    if (!token) {
      console.log('❌ No token obtained');
      return;
    }
    
    console.log('✅ Token obtained');
    
    // Test direct Railway backend audit logs endpoint
    console.log('\n2️⃣ Testing direct Railway audit logs API...');
    
    const auditParams = new URLSearchParams({
      dateFrom: '2026-02-18',
      dateTo: '2026-02-20',
      action: 'USER_LOGIN,USER_LOGOUT',
      limit: '100'
    });
    
    const auditResponse = await fetch(
      `${BACKEND_URL}/api/admin/audit-logs?${auditParams.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('Audit logs response status:', auditResponse.status);
    const auditData = await auditResponse.json();
    console.log('Audit logs response:', JSON.stringify(auditData, null, 2));
    
    // Also test without action filter to see if there are any audit logs at all
    console.log('\n3️⃣ Testing audit logs without action filter...');
    
    const allAuditParams = new URLSearchParams({
      dateFrom: '2026-02-18',
      dateTo: '2026-02-20',
      limit: '10'
    });
    
    const allAuditResponse = await fetch(
      `${BACKEND_URL}/api/admin/audit-logs?${allAuditParams.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('All audit logs response status:', allAuditResponse.status);
    const allAuditData = await allAuditResponse.json();
    console.log('All audit logs response:', JSON.stringify(allAuditData, null, 2));
    
  } catch (error) {
    console.error('❌ Error debugging audit logs:', error);
  }
}

debugAuditLogs();
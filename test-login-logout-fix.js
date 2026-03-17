// Test the login/logout API after the fix deployment
const testLoginLogoutFix = async () => {
  console.log('🧪 Testing login/logout report after fix deployment...');
  
  const FRONTEND_URL = 'https://omnivox-ai.vercel.app';
  const BACKEND_URL = 'https://froniterai-production.up.railway.app';
  
  try {
    // Step 1: Login to get valid token
    console.log('1️⃣ Testing login with test credentials...');
    
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
    
    // Step 2: Test the separate action calls that we implemented
    console.log('2️⃣ Testing separate USER_LOGIN and USER_LOGOUT API calls...');
    
    const [loginAuditResponse, logoutAuditResponse] = await Promise.all([
      fetch(`${BACKEND_URL}/api/admin/audit-logs?action=USER_LOGIN&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      }),
      fetch(`${BACKEND_URL}/api/admin/audit-logs?action=USER_LOGOUT&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })
    ]);
    
    if (loginAuditResponse.ok && logoutAuditResponse.ok) {
      const [loginAuditData, logoutAuditData] = await Promise.all([
        loginAuditResponse.json(),
        logoutAuditResponse.json()
      ]);
      
      const loginLogs = loginAuditData.data?.logs || [];
      const logoutLogs = logoutAuditData.data?.logs || [];
      const totalAuditLogs = loginLogs.length + logoutLogs.length;
      
      console.log('✅ Separate audit API calls successful!');
      console.log(`📊 Login logs: ${loginLogs.length}`);
      console.log(`📊 Logout logs: ${logoutLogs.length}`);
      console.log(`📊 Total audit logs: ${totalAuditLogs}`);
      
      if (totalAuditLogs > 0) {
        console.log('🎉 This should fix the login/logout report!');
      }
    } else {
      console.log('❌ Separate audit calls failed');
    }
    
    // Step 3: Wait a moment for deployment and test frontend API
    console.log('\n3️⃣ Testing frontend API (after giving time for deployment)...');
    console.log('⏳ Waiting 30 seconds for Vercel deployment...');
    
    // Wait for deployment
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    const reportResponse = await fetch(`${FRONTEND_URL}/api/admin/reports/generate?type=login_logout&category=users&subcategory=login_logout&startDate=2026-02-18&endDate=2026-02-20`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (reportResponse.ok) {
      const reportData = await reportResponse.json();
      console.log('✅ Frontend login/logout report successful!');
      console.log('📊 Report data:', {
        totalSessions: reportData.data?.metrics?.totalSessions || 0,
        activeSessions: reportData.data?.metrics?.activeSessions || 0,
        totalAuditEvents: reportData.data?.metrics?.totalAuditEvents || 0,
        hasTableData: (reportData.data?.tableData || []).length > 0
      });
      
      if ((reportData.data?.metrics?.totalAuditEvents || 0) > 0) {
        console.log('🎉🎉🎉 SUCCESS! Login/logout audit reports are now working!');
        console.log('\n📋 Next steps:');
        console.log('   1. Refresh the browser page at: https://omnivox-ai.vercel.app');
        console.log('   2. Navigate to Reports > Users > Login/Logout');
        console.log('   3. Set date range to Feb 18-20, 2026');
        console.log('   4. You should now see actual audit data!');
      } else {
        console.log('⚠️ Report generated but still no audit events - may need more time for deployment');
      }
    } else {
      const errorText = await reportResponse.text();
      console.log('❌ Frontend report failed:', reportResponse.status, errorText);
    }
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  }
};

// For Node.js environment
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

testLoginLogoutFix();
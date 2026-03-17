// Test audit logs with today's date
const fetch = require('node-fetch');

async function testTodayAuditLogs() {
  console.log('🔍 Testing audit logs with today\'s date...');
  
  const BACKEND_URL = 'https://froniterai-production.up.railway.app';
  const FRONTEND_URL = 'https://omnivox-ai.vercel.app';
  
  try {
    // Login to get token
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
    
    // Test with today's date (2026-02-20)
    console.log('1️⃣ Testing with today\'s date (2026-02-20)...');
    
    const todayParams = new URLSearchParams({
      dateFrom: '2026-02-20',
      dateTo: '2026-02-20',
      action: 'USER_LOGIN,USER_LOGOUT',
      limit: '50'
    });
    
    const todayResponse = await fetch(
      `${BACKEND_URL}/api/admin/audit-logs?${todayParams.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('Today response status:', todayResponse.status);
    const todayData = await todayResponse.json();
    console.log('Today audit logs count:', todayData.data?.logs?.length || 0);
    console.log('Today audit logs:', JSON.stringify(todayData, null, 2));
    
    // Test with February 19th specifically
    console.log('\n2️⃣ Testing with Feb 19th specifically...');
    
    const feb19Params = new URLSearchParams({
      dateFrom: '2026-02-19',
      dateTo: '2026-02-19',
      action: 'USER_LOGIN,USER_LOGOUT',
      limit: '50'
    });
    
    const feb19Response = await fetch(
      `${BACKEND_URL}/api/admin/audit-logs?${feb19Params.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('Feb 19 response status:', feb19Response.status);
    const feb19Data = await feb19Response.json();
    console.log('Feb 19 audit logs count:', feb19Data.data?.logs?.length || 0);
    if (feb19Data.data?.logs?.length > 0) {
      console.log('First few Feb 19 logs:');
      feb19Data.data.logs.slice(0, 3).forEach(log => {
        console.log(`  - ${log.action}: ${log.performedByUserName} at ${log.timestamp}`);
      });
    }
    
    // Test frontend reports endpoint with today's date
    console.log('\n3️⃣ Testing frontend reports with today\'s date...');
    
    const reportResponse = await fetch(`${FRONTEND_URL}/api/admin/reports/generate?type=login_logout&startDate=2026-02-19&endDate=2026-02-20`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Report response status:', reportResponse.status);
    const reportData = await reportResponse.json();
    console.log('Report audit events count:', reportData.summary?.totalAuditEvents || 0);
    console.log('Report table data count:', reportData.data?.tableData?.length || 0);
    if (reportData.data?.tableData?.length > 0) {
      console.log('Sample report table data:');
      reportData.data.tableData.slice(0, 3).forEach(row => {
        console.log(`  - ${row.action}: ${row.user} at ${row.timestamp}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing today\'s audit logs:', error);
  }
}

testTodayAuditLogs();
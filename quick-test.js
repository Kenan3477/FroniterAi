// Quick test of the frontend API to see if deployment is ready
const quickTest = async () => {
  console.log('🔍 Quick test of frontend deployment status...');
  
  const BACKEND_URL = 'https://froniterai-production.up.railway.app';
  
  try {
    // Login
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test.admin@omnivox.com',
        password: 'TestAdmin123!'
      })
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.token || loginData.data?.token;
    
    if (!token) {
      console.log('❌ No token');
      return;
    }
    
    // Test the frontend API 
    const reportResponse = await fetch(`https://omnivox-ai.vercel.app/api/admin/reports/generate?type=login_logout&category=users&subcategory=login_logout&startDate=2026-02-18&endDate=2026-02-20`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (reportResponse.ok) {
      const reportData = await reportResponse.json();
      const auditEvents = reportData.data?.metrics?.totalAuditEvents || 0;
      const tableData = (reportData.data?.tableData || []).length;
      
      console.log(`📊 Current status: ${auditEvents} audit events, ${tableData} table rows`);
      
      if (auditEvents > 0) {
        console.log('🎉 SUCCESS! The fix is deployed and working!');
      } else {
        console.log('⏳ Still deploying or caching... try refreshing the browser in 1-2 minutes');
      }
    } else {
      console.log('❌ API call failed:', reportResponse.status);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
};

if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

quickTest();
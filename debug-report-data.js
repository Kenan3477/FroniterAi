// Debug what data is actually being returned
const debugReportData = async () => {
  console.log('🔍 Debugging what data is being returned...');
  
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
    
    // Test the frontend API with full response
    const reportResponse = await fetch(`https://omnivox-ai.vercel.app/api/admin/reports/generate?type=login_logout&category=users&subcategory=login_logout&startDate=2026-02-18&endDate=2026-02-20`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (reportResponse.ok) {
      const reportData = await reportResponse.json();
      
      console.log('📊 Full report structure:');
      console.log('- success:', reportData.success);
      console.log('- data type:', typeof reportData.data);
      console.log('- metrics:', reportData.data?.metrics);
      console.log('- tableData length:', (reportData.data?.tableData || []).length);
      console.log('- chartData:', reportData.data?.chartData ? 'present' : 'missing');
      
      // Sample first few table rows to see what we're getting
      if (reportData.data?.tableData && reportData.data.tableData.length > 0) {
        console.log('\n📋 Sample table data:');
        reportData.data.tableData.slice(0, 3).forEach((row, index) => {
          console.log(`${index + 1}:`, row);
        });
      }
      
      // Check if our audit logs fetch is working
      if (reportData.data?.metrics?.totalAuditEvents > 0) {
        console.log('🎉 Audit events are working!');
      } else {
        console.log('⚠️ No audit events yet - but table data is present, so partial success!');
      }
      
    } else {
      console.log('❌ API failed:', reportResponse.status);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
};

if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

debugReportData();
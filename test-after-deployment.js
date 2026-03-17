// Test the API after Vercel deployment completes
const fetch = require('node-fetch');

async function testAfterDeployment() {
  console.log('⏳ Waiting for Vercel deployment to complete...');
  console.log('🔄 Testing frontend API periodically until fix is deployed...');
  
  const FRONTEND_URL = 'https://omnivox-ai.vercel.app';
  let attempts = 0;
  const maxAttempts = 10;
  
  try {
    // Login to get token (reuse this for all tests)
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
    
    // Test periodically until we see the fix
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`\n🔄 Attempt ${attempts}/${maxAttempts} - Testing reports API...`);
      
      const reportResponse = await fetch(`${FRONTEND_URL}/api/admin/reports/generate?type=login_logout&startDate=2026-02-19&endDate=2026-02-20`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const reportData = await reportResponse.json();
      
      if (reportResponse.ok) {
        const auditEvents = reportData.summary?.totalAuditEvents || 0;
        const tableData = reportData.data?.tableData?.length || 0;
        
        console.log(`📊 Result: ${auditEvents} audit events, ${tableData} table entries`);
        
        if (auditEvents > 0 || tableData > 0) {
          console.log('✅ SUCCESS! Audit data is now being returned!');
          console.log('\n📋 Report Details:');
          console.log(`  - Total Sessions: ${reportData.summary?.totalSessions || 0}`);
          console.log(`  - Total Audit Events: ${auditEvents}`);
          console.log(`  - Table Data Entries: ${tableData}`);
          
          if (tableData > 0) {
            console.log('\n📋 Sample Table Data:');
            reportData.data.tableData.slice(0, 3).forEach(row => {
              console.log(`  - ${row.action}: ${row.user} at ${row.timestamp}`);
            });
          }
          
          console.log('\n🎉 The login/logout report should now work in the browser!');
          console.log('📱 Go to https://omnivox-ai.vercel.app and check the Reports > Users > Login/Logout page');
          return;
        }
      }
      
      // Wait before next attempt (increasing delay)
      const delay = Math.min(attempts * 30000, 60000); // Start at 30s, max 60s
      console.log(`⏳ No data yet, waiting ${delay/1000}s before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    console.log('❌ Reached maximum attempts. The deployment may not be complete yet.');
    console.log('💡 Please try manually refreshing the login/logout report page in a few minutes.');
    
  } catch (error) {
    console.error('❌ Error testing after deployment:', error);
  }
}

testAfterDeployment();
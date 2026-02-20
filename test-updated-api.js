// Test the updated frontend API with audit logs fix
const fetch = require('node-fetch');

async function testUpdatedFrontendAPI() {
  console.log('🔧 Testing updated frontend API with audit logs fix...');
  
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
    
    // Test the updated reports endpoint with today's date range
    console.log('\n2️⃣ Testing reports with Feb 19-20 date range...');
    
    const reportResponse = await fetch(`${FRONTEND_URL}/api/admin/reports/generate?type=login_logout&startDate=2026-02-19&endDate=2026-02-20`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Report response status:', reportResponse.status);
    const reportData = await reportResponse.json();
    
    if (reportResponse.ok) {
      console.log('✅ Report generated successfully!');
      console.log('\n📊 Report Summary:');
      console.log(`  - Total Sessions: ${reportData.summary?.totalSessions || 0}`);
      console.log(`  - Total Audit Events: ${reportData.summary?.totalAuditEvents || 0}`);
      console.log(`  - Table Data Entries: ${reportData.data?.tableData?.length || 0}`);
      
      if (reportData.data?.metrics) {
        console.log('\n📈 Metrics:');
        reportData.data.metrics.forEach(metric => {
          console.log(`  - ${metric.label}: ${metric.value}${metric.format === 'percentage' ? '%' : ''}`);
        });
      }
      
      if (reportData.data?.tableData?.length > 0) {
        console.log('\n📋 Sample Table Data (first 3 entries):');
        reportData.data.tableData.slice(0, 3).forEach(row => {
          console.log(`  - ${row.action}: ${row.user} at ${row.timestamp}`);
        });
      } else {
        console.log('\n⚠️ No table data in response');
      }
      
      // Test chart data
      const loginCounts = reportData.data?.chartData?.filter(d => d.logins > 0) || [];
      if (loginCounts.length > 0) {
        console.log('\n📈 Peak Login Hours:');
        loginCounts.forEach(hour => {
          console.log(`  - ${hour.time}: ${hour.logins} logins`);
        });
      } else {
        console.log('\n⚠️ No peak login hours found');
      }
      
    } else {
      console.log('❌ Report generation failed:', JSON.stringify(reportData, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error testing updated API:', error);
  }
}

testUpdatedFrontendAPI();
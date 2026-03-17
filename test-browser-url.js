// Test the exact URL that the browser is calling
const testBrowserURL = async () => {
  console.log('🔍 Testing the exact URL that the browser would call...');
  
  const BACKEND_URL = 'https://froniterai-production.up.railway.app';
  
  try {
    // Login first
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
      console.log('❌ No token received');
      return;
    }
    
    // Test the exact URL pattern from the screenshot
    // The browser URL shows: type=login_logout&category=users&subcategory=login_logout
    const browserURL = `https://omnivox-ai.vercel.app/api/admin/reports/generate?type=login_logout&category=users&subcategory=login_logout&startDate=2026-02-13&endDate=2026-02-20`;
    
    console.log('🌐 Testing browser URL:', browserURL);
    
    const reportResponse = await fetch(browserURL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    console.log('📊 Response status:', reportResponse.status);
    console.log('📊 Response headers:', Object.fromEntries(reportResponse.headers.entries()));
    
    if (reportResponse.ok) {
      const reportData = await reportResponse.json();
      
      console.log('✅ API Response Success!');
      console.log('📊 Metrics:');
      if (reportData.data?.metrics) {
        reportData.data.metrics.forEach(metric => {
          console.log(`   ${metric.label}: ${metric.value}`);
        });
      }
      
      console.log('📊 Table Data Count:', (reportData.data?.tableData || []).length);
      console.log('📊 Chart Data:', reportData.data?.chartData ? 'Present' : 'Missing');
      
      if ((reportData.data?.tableData || []).length > 0) {
        console.log('\n📋 First 2 table entries:');
        reportData.data.tableData.slice(0, 2).forEach((row, i) => {
          console.log(`${i+1}. ${row.user} - ${row.action} at ${row.timestamp}`);
        });
      }
      
      // Check if this matches what the browser should receive
      if ((reportData.data?.tableData || []).length > 0) {
        console.log('\n🎉 API is working! The issue might be:');
        console.log('   1. Browser caching');
        console.log('   2. Authentication token mismatch');
        console.log('   3. Frontend component not refreshing');
        console.log('   4. Date range filtering issue');
        console.log('\n💡 Try:');
        console.log('   - Hard refresh (Cmd+Shift+R)');
        console.log('   - Clear browser cache');
        console.log('   - Log out and log in again');
        console.log('   - Adjust the date range to Feb 13-20, 2026');
      }
      
    } else {
      const errorText = await reportResponse.text();
      console.log('❌ API Error:', reportResponse.status, errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

testBrowserURL();
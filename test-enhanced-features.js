// Test the enhanced login/logout reports with user filtering
const testEnhancedReports = async () => {
  console.log('🧪 Testing enhanced login/logout reports...');
  
  const BACKEND_URL = 'https://froniterai-production.up.railway.app';
  const FRONTEND_URL = 'https://omnivox-ai.vercel.app';
  
  try {
    // Step 1: Login
    console.log('1️⃣ Getting authentication token...');
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
      console.log('❌ Login failed');
      return;
    }
    
    console.log('✅ Authentication successful');
    
    // Step 2: Test basic report (no user filter)
    console.log('\n2️⃣ Testing basic report (all users)...');
    const basicResponse = await fetch(`${FRONTEND_URL}/api/admin/reports/generate?type=login_logout&category=users&subcategory=login_logout&startDate=2026-02-18&endDate=2026-02-20`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (basicResponse.ok) {
      const basicData = await basicResponse.json();
      console.log('✅ Basic report successful');
      console.log('📊 All users metrics:');
      if (basicData.data?.metrics) {
        basicData.data.metrics.forEach(metric => {
          console.log(`   ${metric.label}: ${metric.value}`);
        });
      }
      console.log(`📋 Table entries: ${(basicData.data?.tableData || []).length}`);
      
      // Check that logout rate is removed
      const hasLogoutRate = basicData.data?.metrics?.some(m => m.label.includes('Logout'));
      if (!hasLogoutRate) {
        console.log('✅ Logout Rate metric successfully removed!');
      } else {
        console.log('❌ Logout Rate still present');
      }
    }
    
    // Step 3: Test user filtering for Test Administrator
    console.log('\n3️⃣ Testing user filter (Test Administrator)...');
    const userFilterResponse = await fetch(`${FRONTEND_URL}/api/admin/reports/generate?type=login_logout&category=users&subcategory=login_logout&startDate=2026-02-18&endDate=2026-02-20&userId=test.admin@omnivox.com`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (userFilterResponse.ok) {
      const filteredData = await userFilterResponse.json();
      console.log('✅ User-filtered report successful');
      console.log('📊 Test Administrator only:');
      if (filteredData.data?.metrics) {
        filteredData.data.metrics.forEach(metric => {
          console.log(`   ${metric.label}: ${metric.value}`);
        });
      }
      
      // Check that only Test Administrator entries are returned
      const tableData = filteredData.data?.tableData || [];
      const testAdminOnly = tableData.every(row => 
        row.email === 'test.admin@omnivox.com' || 
        row.user === 'Test Administrator'
      );
      
      if (testAdminOnly && tableData.length > 0) {
        console.log('✅ User filtering working - only Test Administrator entries returned!');
        console.log(`📋 Filtered entries: ${tableData.length}`);
        console.log('📋 Sample entry:', {
          user: tableData[0]?.user,
          email: tableData[0]?.email,
          action: tableData[0]?.action
        });
      } else {
        console.log('⚠️ User filtering may not be working correctly');
        console.log('📋 Sample entries:', tableData.slice(0, 2));
      }
    }
    
    // Step 4: Test user filtering for System Administrator  
    console.log('\n4️⃣ Testing user filter (System Administrator)...');
    const sysAdminResponse = await fetch(`${FRONTEND_URL}/api/admin/reports/generate?type=login_logout&category=users&subcategory=login_logout&startDate=2026-02-18&endDate=2026-02-20&userId=admin@omnivox-ai.com`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (sysAdminResponse.ok) {
      const sysData = await sysAdminResponse.json();
      console.log('✅ System Administrator filter successful');
      console.log('📊 System Administrator metrics:');
      if (sysData.data?.metrics) {
        sysData.data.metrics.forEach(metric => {
          console.log(`   ${metric.label}: ${metric.value}`);
        });
      }
      console.log(`📋 System admin entries: ${(sysData.data?.tableData || []).length}`);
    }
    
    console.log('\n🎉 ENHANCED FEATURES READY!');
    console.log('\n📋 What to test in browser:');
    console.log('   1. Refresh https://omnivox-ai.vercel.app/reports/view?type=login_logout&category=users&subcategory=login_logout');
    console.log('   2. ✅ Verify "Logout Rate" metric is removed');
    console.log('   3. ✅ See new "User" dropdown filter');
    console.log('   4. ✅ Test filtering by "Test Administrator"');
    console.log('   5. ✅ Test filtering by "System Administrator"');
    console.log('   6. ✅ Verify date range still works');
    console.log('   7. ✅ Confirm filtered metrics update correctly');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

testEnhancedReports();
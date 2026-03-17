// Wait for deployment and test again
const waitAndTest = async () => {
  console.log('⏳ Waiting 60 seconds for deployment to complete...');
  await new Promise(resolve => setTimeout(resolve, 60000));
  
  console.log('🔄 Testing after deployment wait...');
  
  const BACKEND_URL = 'https://froniterai-production.up.railway.app';
  const FRONTEND_URL = 'https://omnivox-ai.vercel.app';
  
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
    
    // Test basic report to see if logout rate is removed
    const basicResponse = await fetch(`${FRONTEND_URL}/api/admin/reports/generate?type=login_logout&category=users&subcategory=login_logout&startDate=2026-02-18&endDate=2026-02-20`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (basicResponse.ok) {
      const basicData = await basicResponse.json();
      
      console.log('📊 Current metrics:');
      if (basicData.data?.metrics) {
        basicData.data.metrics.forEach(metric => {
          console.log(`   ${metric.label}: ${metric.value}`);
        });
        
        // Check if logout rate is removed
        const hasLogoutRate = basicData.data.metrics.some(m => m.label.includes('Logout'));
        if (!hasLogoutRate) {
          console.log('\n🎉 SUCCESS! Logout Rate has been removed!');
        } else {
          console.log('\n⏳ Logout Rate still present - deployment may need more time');
        }
        
        // Check number of metrics (should be 5 instead of 6)
        console.log(`\n📊 Total metrics: ${basicData.data.metrics.length} (should be 5 without Logout Rate)`);
      }
    }
    
  } catch (error) {
    console.log('❌ Test error:', error.message);
  }
};

if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

waitAndTest();
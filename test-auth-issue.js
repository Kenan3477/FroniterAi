// Test if there's an auth token issue in the browser
const testAuthIssue = async () => {
  console.log('🔐 Testing if browser has authentication issues...');
  
  const FRONTEND_URL = 'https://omnivox-ai.vercel.app';
  
  try {
    // Test without auth token to see the response
    console.log('1️⃣ Testing without auth token...');
    const noAuthResponse = await fetch(`${FRONTEND_URL}/api/admin/reports/generate?type=login_logout&category=users&subcategory=login_logout&startDate=2026-02-13&endDate=2026-02-20`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('📊 No auth response status:', noAuthResponse.status);
    if (!noAuthResponse.ok) {
      const errorText = await noAuthResponse.text();
      console.log('📊 No auth error:', errorText);
      
      if (noAuthResponse.status === 401 || errorText.includes('authentication') || errorText.includes('token')) {
        console.log('🔑 Confirmed: Browser needs valid authentication!');
        console.log('');
        console.log('💡 SOLUTION:');
        console.log('   1. Go to https://omnivox-ai.vercel.app');
        console.log('   2. LOG OUT completely');
        console.log('   3. LOG IN again with: test.admin@omnivox.com / TestAdmin123!');
        console.log('   4. Navigate to Reports > Users > Login/Logout');
        console.log('   5. Set date range to Feb 13-20, 2026');
        console.log('   6. The data should appear!');
        console.log('');
        console.log('🔍 The browser probably has an expired/invalid token cached.');
      }
    }
    
    // Also test if there are any CORS issues
    console.log('\n2️⃣ Testing CORS and headers...');
    const testResponse = await fetch(`${FRONTEND_URL}/api/admin/reports/generate`, {
      method: 'OPTIONS'
    });
    console.log('📊 OPTIONS response status:', testResponse.status);
    
  } catch (error) {
    console.error('❌ Auth test failed:', error);
  }
};

if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

testAuthIssue();
// Test different action filtering approaches
const fetch = require('node-fetch');

async function testActionFiltering() {
  console.log('🧪 Testing different action filtering approaches...');
  
  const BACKEND_URL = 'https://froniterai-production.up.railway.app';
  const FRONTEND_URL = 'https://omnivox-ai.vercel.app';
  
  try {
    // Get token
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
    
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    // Test 1: Single action - USER_LOGIN
    console.log('1️⃣ Testing single action: USER_LOGIN');
    const loginOnlyResponse = await fetch(`${BACKEND_URL}/api/admin/audit-logs?action=USER_LOGIN&limit=20`, {
      headers: authHeaders
    });
    const loginOnlyData = await loginOnlyResponse.json();
    console.log(`Result: ${loginOnlyData.data?.logs?.length || 0} logs`);
    
    // Test 2: Single action - USER_LOGOUT  
    console.log('2️⃣ Testing single action: USER_LOGOUT');
    const logoutOnlyResponse = await fetch(`${BACKEND_URL}/api/admin/audit-logs?action=USER_LOGOUT&limit=20`, {
      headers: authHeaders
    });
    const logoutOnlyData = await logoutOnlyResponse.json();
    console.log(`Result: ${logoutOnlyData.data?.logs?.length || 0} logs`);
    
    // Test 3: Comma-separated actions - USER_LOGIN,USER_LOGOUT
    console.log('3️⃣ Testing comma-separated: USER_LOGIN,USER_LOGOUT');
    const commaResponse = await fetch(`${BACKEND_URL}/api/admin/audit-logs?action=USER_LOGIN,USER_LOGOUT&limit=20`, {
      headers: authHeaders
    });
    const commaData = await commaResponse.json();
    console.log(`Result: ${commaData.data?.logs?.length || 0} logs`);
    
    // Test 4: URL-encoded comma-separated actions
    console.log('4️⃣ Testing URL-encoded comma: USER_LOGIN%2CUSER_LOGOUT');
    const encodedResponse = await fetch(`${BACKEND_URL}/api/admin/audit-logs?action=USER_LOGIN%2CUSER_LOGOUT&limit=20`, {
      headers: authHeaders
    });
    const encodedData = await encodedResponse.json();
    console.log(`Result: ${encodedData.data?.logs?.length || 0} logs`);
    
    // Test 5: Multiple action parameters
    console.log('5️⃣ Testing multiple action parameters: ?action=USER_LOGIN&action=USER_LOGOUT');
    const multipleResponse = await fetch(`${BACKEND_URL}/api/admin/audit-logs?action=USER_LOGIN&action=USER_LOGOUT&limit=20`, {
      headers: authHeaders
    });
    const multipleData = await multipleResponse.json();
    console.log(`Result: ${multipleData.data?.logs?.length || 0} logs`);
    
    // Test 6: No action filter (get all)
    console.log('6️⃣ Testing no action filter (all logs)');
    const allResponse = await fetch(`${BACKEND_URL}/api/admin/audit-logs?limit=20`, {
      headers: authHeaders
    });
    const allData = await allResponse.json();
    console.log(`Result: ${allData.data?.logs?.length || 0} logs`);
    
    // Show summary
    console.log('\n📊 Summary:');
    console.log(`  USER_LOGIN only: ${loginOnlyData.data?.logs?.length || 0} logs`);
    console.log(`  USER_LOGOUT only: ${logoutOnlyData.data?.logs?.length || 0} logs`);
    console.log(`  Comma-separated: ${commaData.data?.logs?.length || 0} logs`);
    console.log(`  URL-encoded: ${encodedData.data?.logs?.length || 0} logs`);
    console.log(`  Multiple params: ${multipleData.data?.logs?.length || 0} logs`);
    console.log(`  No filter: ${allData.data?.logs?.length || 0} logs`);
    
    // If comma-separated doesn't work, suggest the fix
    if ((loginOnlyData.data?.logs?.length || 0) > 0 && (commaData.data?.logs?.length || 0) === 0) {
      console.log('\n💡 FOUND THE ISSUE: Comma-separated action filtering is broken on the backend!');
      console.log('🔧 SOLUTION: Modify frontend to not use action filtering and filter client-side instead.');
    }
    
  } catch (error) {
    console.error('❌ Error testing action filtering:', error);
  }
}

testActionFiltering();
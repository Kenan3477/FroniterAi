#!/usr/bin/env node

async function testLoginLogoutFlow() {
  console.log('🧪 Testing Login/Logout Reports Flow\n');
  
  try {
    // Test 1: Frontend proxy route
    console.log('1. Testing frontend proxy route...');
    const frontendResponse = await fetch('http://localhost:3003/api/admin/user-sessions', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Frontend proxy status: ${frontendResponse.status}`);
    if (frontendResponse.ok) {
      const frontendData = await frontendResponse.json();
      console.log(`   Frontend response: ${JSON.stringify(frontendData).substring(0, 100)}...`);
    } else {
      const errorText = await frontendResponse.text();
      console.log(`   Frontend error: ${errorText.substring(0, 100)}...`);
    }
    
    console.log('');
    
    // Test 2: Direct backend endpoint
    console.log('2. Testing backend endpoint directly...');
    const backendResponse = await fetch('http://localhost:3004/api/admin/user-sessions', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Backend direct status: ${backendResponse.status}`);
    if (backendResponse.ok) {
      const backendData = await backendResponse.json();
      console.log(`   Backend response: ${JSON.stringify(backendData).substring(0, 100)}...`);
      console.log(`   Sessions found: ${backendData.data?.sessions?.length || 0}`);
    } else {
      const errorText = await backendResponse.text();
      console.log(`   Backend error: ${errorText.substring(0, 100)}...`);
    }
    
    console.log('\n✅ Testing complete');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
if (typeof fetch === 'undefined') {
  import('node-fetch').then(fetch => {
    global.fetch = fetch.default;
    testLoginLogoutFlow();
  });
} else {
  testLoginLogoutFlow();
}
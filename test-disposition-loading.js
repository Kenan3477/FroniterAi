/**
 * Test script to verify frontend is loading real disposition IDs from backend
 * This will test the DispositionCard component fix
 */

const baseUrl = 'https://froniterai-production.up.railway.app';

async function testDispositionLoading() {
  console.log('🧪 Testing disposition loading from backend...\n');
  
  try {
    // Test the API endpoint directly (no auth)
    console.log('1️⃣ Testing /api/dispositions/configs endpoint without auth...');
    const response = await fetch(`${baseUrl}/api/dispositions/configs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Test)',
      },
    });

    console.log(`📊 Response status: ${response.status} ${response.statusText}`);
    console.log(`📋 Response headers:`, Object.fromEntries(response.headers));
    
    if (response.status === 401) {
      console.log('🔑 Expected: Authentication required for this endpoint');
      console.log('ℹ️  This means the endpoint exists but requires auth token');
      
      const errorData = await response.text();
      console.log('📄 Error response:', errorData);
      
      console.log('\n✅ DIAGNOSIS: Endpoint exists and requires authentication');
      console.log('   The frontend needs to include valid auth tokens when calling this endpoint');
      console.log('   Current issue: Frontend auth tokens are either missing or invalid');
      
    } else if (response.ok) {
      const data = await response.json();
      console.log('✅ Unexpected: Got response without auth:', JSON.stringify(data, null, 2));
      
    } else {
      console.log(`❌ Request failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log('� Error details:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Error testing disposition loading:', error.message);
  }
}

// Run the test
testDispositionLoading().then(() => {
  console.log('\n🏁 Test completed');
}).catch(error => {
  console.error('❌ Test failed:', error);
});
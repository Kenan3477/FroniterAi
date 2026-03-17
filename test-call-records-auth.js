/**
 * Test call records API with proper authentication
 */

const fetch = require('node-fetch');

async function testCallRecordsAPI() {
  try {
    console.log('🔑 Testing call records with auth token...');
    
    // First, let's see if we can access the API with a token
    const response = await fetch('http://localhost:3000/api/call-records', {
      headers: {
        'Cookie': 'auth-token=kenan-test-token; access-token=kenan-test-token',
        'Authorization': 'Bearer kenan-test-token'
      }
    });
    
    console.log('📞 Response Status:', response.status);
    console.log('📞 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('📞 Response Data:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Error Response:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run the test
testCallRecordsAPI();
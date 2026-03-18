// Test script to check business settings API and organizations
const API_BASE = 'http://localhost:3004';

async function testBusinessSettingsAPI() {
  console.log('🚀 Testing Business Settings API...\n');

  // Test token - you might need to replace this with a valid admin token
  const token = 'test-token'; // We'll try without auth first

  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    // Test 1: Get organizations
    console.log('1. Testing Get Organizations...');
    const orgsResponse = await fetch(`${API_BASE}/api/admin/business-settings/organizations`, {
      headers
    });
    
    console.log('   Status:', orgsResponse.status);
    const orgsText = await orgsResponse.text();
    console.log('   Response:', orgsText);

    // Test 2: Get dashboard data
    console.log('\n2. Testing Get Dashboard Data...');
    const dashboardResponse = await fetch(`${API_BASE}/api/admin/business-settings/dashboard`, {
      headers
    });
    
    console.log('   Status:', dashboardResponse.status);
    const dashboardText = await dashboardResponse.text();
    console.log('   Response:', dashboardText);

    // Test 3: Check if any organizations exist in database
    console.log('\n3. Testing Database Direct Query...');
    
    // Let's also test creating a test organization
    console.log('\n4. Testing Create Organization...');
    const createOrgResponse = await fetch(`${API_BASE}/api/admin/business-settings/organizations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'test-org',
        displayName: 'Test Organization',
        description: 'Test organization for debugging',
        email: 'admin@test-org.com',
        industry: 'Technology',
        size: 'Small'
      })
    });
    
    console.log('   Status:', createOrgResponse.status);
    const createText = await createOrgResponse.text();
    console.log('   Response:', createText);

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testBusinessSettingsAPI();
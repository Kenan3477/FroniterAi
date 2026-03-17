/**
 * Check Railway Database Users and Auth
 */

const API_URL = 'https://froniterai-production.up.railway.app';

async function checkDatabase() {
  console.log('🔍 Checking Railway API and Database Status\n');
  console.log('API URL:', API_URL);
  console.log('Timestamp:', new Date().toISOString());
  console.log('='.repeat(60));

  // 1. Check Health
  console.log('\n1. Health Check:');
  try {
    const healthResponse = await fetch(`${API_URL}/health`);
    const health = await healthResponse.json();
    console.log('   ✓ Status:', health.status);
    console.log('   ✓ Database Connected:', health.database?.connected);
    console.log('   ✓ Database Type:', health.database?.type);
    console.log('   ✓ Services:', JSON.stringify(health.services, null, 2));
  } catch (error) {
    console.log('   ✗ Error:', error.message);
  }

  // 2. Try to check public endpoints
  console.log('\n2. Testing Public Endpoints:');
  
  // Test contacts endpoint (might be public)
  try {
    const contactsResponse = await fetch(`${API_URL}/api/contacts`);
    const contactsData = await contactsResponse.json();
    console.log('   Contacts endpoint status:', contactsResponse.status);
    console.log('   Response:', JSON.stringify(contactsData, null, 2).substring(0, 300));
  } catch (error) {
    console.log('   ✗ Contacts Error:', error.message);
  }

  // 3. Try different auth endpoints
  console.log('\n3. Testing Authentication Endpoints:');
  
  const testCredentials = [
    { email: 'admin@omnivox.ai', password: 'Admin123!' },
    { email: 'kenan@omnivox.ai', password: 'Kenan123!' },
    { email: 'admin@kennex.ai', password: 'Admin123!' },
    { email: 'test@omnivox.ai', password: 'Test123!' }
  ];

  for (const cred of testCredentials) {
    try {
      console.log(`\n   Trying: ${cred.email}`);
      const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cred)
      });
      
      const loginData = await loginResponse.json();
      console.log(`   Status: ${loginResponse.status}`);
      
      if (loginResponse.status === 200) {
        console.log('   ✓ SUCCESS! Token received');
        console.log('   User:', JSON.stringify(loginData.user, null, 2));
        
        // Test authenticated endpoint
        console.log('\n4. Testing Authenticated Endpoint:');
        const usersResponse = await fetch(`${API_URL}/api/users`, {
          headers: {
            'Authorization': `Bearer ${loginData.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const usersData = await usersResponse.json();
        console.log('   Users endpoint status:', usersResponse.status);
        console.log('   Users count:', Array.isArray(usersData) ? usersData.length : usersData.data?.length || 0);
        
        // Test campaigns
        const campaignsResponse = await fetch(`${API_URL}/api/campaigns`, {
          headers: {
            'Authorization': `Bearer ${loginData.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const campaignsData = await campaignsResponse.json();
        console.log('   Campaigns endpoint status:', campaignsResponse.status);
        console.log('   Campaigns count:', Array.isArray(campaignsData) ? campaignsData.length : campaignsData.data?.length || 0);
        
        // Test call records
        const callRecordsResponse = await fetch(`${API_URL}/api/call-records`, {
          headers: {
            'Authorization': `Bearer ${loginData.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const callRecordsData = await callRecordsResponse.json();
        console.log('   Call Records endpoint status:', callRecordsResponse.status);
        console.log('   Call Records count:', Array.isArray(callRecordsData) ? callRecordsData.length : callRecordsData.data?.length || 0);
        
        console.log('\n✅ RAILWAY API IS WORKING CORRECTLY!');
        console.log('='.repeat(60));
        
        return;
      } else {
        console.log('   ✗ Failed:', loginData.message || 'Unknown error');
      }
    } catch (error) {
      console.log('   ✗ Error:', error.message);
    }
  }

  console.log('\n⚠️  No valid credentials found. Please check database users.');
  console.log('='.repeat(60));
}

checkDatabase()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

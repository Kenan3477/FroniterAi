// Test the frontend API route directly
const frontendApiTest = async () => {
  console.log('🧪 Testing frontend API route for login/logout reports...');
  
  try {
    // Test the frontend API route
    const response = await fetch('http://localhost:3000/api/admin/reports/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Simulate being on the frontend with no auth token for now
      },
      body: JSON.stringify({
        reportType: 'login_logout',
        startDate: '2026-02-01',
        endDate: '2026-02-20',
        category: 'users',
        subcategory: 'login_logout'
      })
    });
    
    const data = await response.text();
    console.log('📋 Frontend API response status:', response.status);
    console.log('📋 Frontend API response:', data);
    
  } catch (error) {
    console.error('❌ Error testing frontend API:', error.message);
    console.log('💡 This is expected since the frontend is running on Vercel, not localhost');
  }
  
  // Let's test the Railway backend user-sessions endpoint directly with no auth
  console.log('\n📡 Testing Railway backend user-sessions endpoint structure...');
  
  try {
    const response = await fetch('https://froniterai-production.up.railway.app/api/admin/user-sessions?limit=5', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    console.log('🏭 Railway backend response status:', response.status);
    console.log('🏭 Railway backend response structure:');
    console.log(JSON.stringify(data, null, 2));
    
    // Test the audit logs endpoint too
    console.log('\n📡 Testing Railway backend audit-logs endpoint structure...');
    
    const auditResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/audit-logs?action=USER_LOGIN&limit=5', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const auditData = await auditResponse.json();
    console.log('🏭 Railway audit logs response status:', auditResponse.status);
    console.log('🏭 Railway audit logs response structure:');
    console.log(JSON.stringify(auditData, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing Railway backend:', error.message);
  }
};

// For Node.js environment, we'll need node-fetch
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

frontendApiTest();
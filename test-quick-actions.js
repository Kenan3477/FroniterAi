const fetch = require('node-fetch');

async function testQuickActions() {
  try {
    console.log('🔍 Testing Quick Actions API endpoints...');
    
    const baseURL = 'https://froniterai-production.up.railway.app';
    
    // Test the main personalized quick actions endpoint
    console.log('\n1. Testing personalized quick actions...');
    const response1 = await fetch(`${baseURL}/api/admin/quick-actions/personalized?timeRange=30d`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUwOSwidXNlcm5hbWUiOiJrZW4iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NDI0ODgxNDMsImV4cCI6MTc0MjU3NDU0M30.L3r5wCgzGIzAMBzDCGQPe3LZYp3JsJfDNzfqLCLXpGc',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', response1.status);
    if (response1.ok) {
      const data1 = await response1.json();
      console.log('Success:', data1);
    } else {
      const errorText = await response1.text();
      console.log('Error:', errorText);
    }
    
    // Test predictive actions
    console.log('\n2. Testing predictive actions...');
    const response2 = await fetch(`${baseURL}/api/admin/quick-actions/predictive?currentPage=/admin&timeOfDay=14`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUwOSwidXNlcm5hbWUiOiJrZW4iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NDI0ODgxNDMsImV4cCI6MTc0MjU3NDU0M30.L3r5wCgzGIzAMBzDCGQPe3LZYp3JsJfDNzfqLCLXpGc',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', response2.status);
    if (response2.ok) {
      const data2 = await response2.json();
      console.log('Success:', data2);
    } else {
      const errorText = await response2.text();
      console.log('Error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testQuickActions();
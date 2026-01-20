// Test to see what users exist in the system
const fetch = require('node-fetch');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function testUsersList() {
  try {
    console.log('🔍 Testing what data exists in the system...');
    
    // Try to get users list without auth to see if database has data
    const usersResponse = await fetch(`${BACKEND_URL}/api/admin/users`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('Users response status:', usersResponse.status);
    const usersData = await usersResponse.text(); // Get as text first in case it's HTML error
    console.log('Users response:', usersData);
    
    // Try to get campaigns without auth
    const campaignsResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('Campaigns response status:', campaignsResponse.status);
    const campaignsData = await campaignsResponse.text();
    console.log('Campaigns response (first 500 chars):', campaignsData.substring(0, 500));
    
    // Test if the backend is even running correctly
    const healthResponse = await fetch(`${BACKEND_URL}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('Health check:', JSON.stringify(healthData, null, 2));
    } else {
      console.log('No health endpoint or failed');
    }
    
  } catch (error) {
    console.error('Error testing system:', error);
  }
}

testUsersList();
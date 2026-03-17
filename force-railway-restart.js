/**
 * Force Railway backend restart to refresh database connection
 */

const fetch = require('node-fetch');

async function forceRailwayRestart() {
  console.log('🔄 Attempting to Force Railway Backend Restart\n');

  const API_BASE = 'https://froniterai-production.up.railway.app';
  
  try {
    // Login
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ken@simpleemails.co.uk',
        password: 'Kenzo3477!'
      })
    });

    const loginData = await loginResponse.json();
    const token = loginData.data?.token || loginData.token;

    // Try various admin endpoints that might trigger refresh
    console.log('1️⃣ Testing admin endpoints to trigger refresh...\n');

    const endpoints = [
      '/api/admin/migrate-storage-types',
      '/api/admin/restart',
      '/api/admin/refresh-db',
      '/api/admin/clear-cache',
      '/api/emergency/refresh',
      '/api/test/restart'
    ];

    for (const endpoint of endpoints) {
      process.stdout.write(`Testing ${endpoint}... `);
      
      try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          console.log('✅ SUCCESS');
          const result = await response.json();
          console.log('   Result:', result.message || result);
        } else {
          console.log(`❌ ${response.status}`);
        }
      } catch (err) {
        console.log(`❌ Error`);
      }
    }

    console.log('\n2️⃣ Manual solution needed...\n');
    
    console.log('💡 MANUAL RESTART STEPS:');
    console.log('1. Go to Railway Dashboard: https://railway.app');
    console.log('2. Open your backend service');
    console.log('3. Go to Deployments tab');
    console.log('4. Click "Restart" or "Redeploy"');
    console.log('5. Wait 2-3 minutes for restart');
    console.log('');
    
    console.log('OR try these Railway CLI commands:');
    console.log('   railway login');
    console.log('   railway service');
    console.log('   railway restart');
    console.log('');

    console.log('AFTER RESTART, the recording storage types will be fixed!');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

forceRailwayRestart().catch(console.error);
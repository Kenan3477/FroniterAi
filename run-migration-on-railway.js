/**
 * Run the migration script via Railway API call
 */

const fetch = require('node-fetch');

const API_BASE = 'https://froniterai-production.up.railway.app';

async function runMigrationViaAPI() {
  console.log('🚀 Running Recording Storage Type Migration on Railway\n');

  // Login first
  const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'ken@simpleemails.co.uk',
      password: 'Kenzo3477!'
    })
  });

  if (!loginResponse.ok) {
    console.log('❌ Login failed');
    return;
  }

  const loginData = await loginResponse.json();
  const token = loginData.data?.token || loginData.token;
  console.log('✅ Login successful\n');

  // Check if there's a migration endpoint
  console.log('🔍 Checking for migration endpoint...\n');
  
  const migrationResponse = await fetch(`${API_BASE}/api/admin/migrate-storage-types`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (migrationResponse.ok) {
    console.log('✅ Migration endpoint exists and executed');
    const result = await migrationResponse.json();
    console.log('Result:', result);
  } else {
    console.log(`❌ Migration endpoint not available (${migrationResponse.status})`);
    console.log('The migration script was pushed to Railway but needs to be run manually.\n');
    
    console.log('💡 MANUAL STEPS:');
    console.log('1. Go to Railway dashboard: https://railway.app');
    console.log('2. Open your backend service');
    console.log('3. Go to Shell tab');
    console.log('4. Run this command:');
    console.log('   node src/scripts/migrate-recording-storage-types.js\n');
    
    console.log('OR try this endpoint in 2-3 minutes after deployment:');
    console.log(`   POST ${API_BASE}/api/admin/run-migration`);
  }

  // Test a recording after potential migration
  setTimeout(async () => {
    console.log('\n🧪 Testing recording playback after potential migration...\n');
    
    const testResponse = await fetch(`${API_BASE}/api/recordings/cmm50qu23000u11nupdevjyvt/stream`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Recording Test: ${testResponse.status} ${testResponse.statusText}`);
    
    if (testResponse.ok) {
      console.log('🎉 SUCCESS! Recording streaming is now working!');
    } else if (testResponse.status === 501) {
      console.log('⚠️  Still getting 501 - migration not run yet');
      console.log('   Run the migration manually on Railway');
    } else {
      console.log('❓ Different error - check Railway logs');
    }
  }, 5000);
}

runMigrationViaAPI().catch(console.error);
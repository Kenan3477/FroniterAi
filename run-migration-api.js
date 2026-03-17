/**
 * Call the Railway migration API endpoint to fix recording storage types
 */

const fetch = require('node-fetch');

const API_BASE = 'https://froniterai-production.up.railway.app';

async function runMigrationViaAPI() {
  console.log('🚀 Running Recording Storage Migration via API\n');

  try {
    // Step 1: Login
    console.log('1️⃣ Logging in...');
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

    // Step 2: Wait for Railway deployment
    console.log('2️⃣ Waiting for Railway deployment (30 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Step 3: Run migration
    console.log('3️⃣ Running migration...\n');
    const migrationResponse = await fetch(`${API_BASE}/api/admin/migrate-storage-types`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Migration Status: ${migrationResponse.status} ${migrationResponse.statusText}`);

    if (migrationResponse.ok) {
      const result = await migrationResponse.json();
      console.log('\n🎉 MIGRATION SUCCESSFUL!');
      console.log('✅', result.message);
      console.log('✅', result.details);
    } else {
      const errorText = await migrationResponse.text();
      console.log('\n❌ Migration failed:');
      console.log('Status:', migrationResponse.status);
      console.log('Error:', errorText);
      
      if (migrationResponse.status === 404) {
        console.log('\n💡 The endpoint might not be deployed yet.');
        console.log('   Wait 1-2 minutes and try again.');
      }
    }

    // Step 4: Test recording playback
    console.log('\n4️⃣ Testing recording playback...\n');
    const testResponse = await fetch(`${API_BASE}/api/recordings/cmm50qu23000u11nupdevjyvt/stream`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Recording Test: ${testResponse.status} ${testResponse.statusText}`);

    if (testResponse.ok) {
      console.log('🎉 SUCCESS! Recording streaming now works!');
      console.log('✅ You can now play recordings in your frontend');
    } else if (testResponse.status === 501) {
      console.log('⚠️  Still getting 501 errors');
      console.log('   Migration may need to be run again');
    } else if (testResponse.status === 503) {
      console.log('⚠️  Getting 503 Service Unavailable');
      console.log('   Backend may still be deploying');
    } else {
      console.log('❓ Unexpected response - check Railway logs');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION ATTEMPT COMPLETE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run immediately (deployment should be done by now)
runMigrationViaAPI().catch(console.error);
/**
 * Debug Railway login by checking what's happening on the backend
 */

const fetch = require('node-fetch');
const bcrypt = require('bcryptjs');

const API_BASE = 'https://froniterai-production.up.railway.app';

async function debugRailwayLogin() {
  console.log('🔍 Debugging Railway Login Issue\n');

  const testCreds = {
    email: 'test@example.com',
    password: 'Admin123!'
  };

  console.log(`Testing login with: ${testCreds.email}`);
  console.log(`Password: ${testCreds.password}\n`);

  // Test 1: Check if user exists via health endpoint
  console.log('📡 Step 1: Check Railway health...');
  const healthResponse = await fetch(`${API_BASE}/api/health`);
  const healthData = await healthResponse.json();
  console.log(`✅ Health Status: ${healthData.status}`);
  console.log(`   Database: ${healthData.database}\n`);

  // Test 2: Attempt login
  console.log('📡 Step 2: Attempt login...');
  const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testCreds)
  });

  console.log(`   Response Status: ${loginResponse.status} ${loginResponse.statusText}`);
  
  const loginData = await loginResponse.json();
  console.log(`   Response Body:`, JSON.stringify(loginData, null, 2));

  if (!loginResponse.ok) {
    console.log('\n❌ Login failed on Railway');
    console.log('\n🔍 Possible causes:');
    console.log('   1. bcrypt version mismatch between local and Railway');
    console.log('   2. Different Node.js version on Railway');
    console.log('   3. Password hash not matching due to environment differences');
    console.log('   4. User not found in Railway database');
    
    console.log('\n💡 Testing local bcrypt hash...');
    const localHash = await bcrypt.hash(testCreds.password, 10);
    console.log(`   Local hash generated: ${localHash.substring(0, 30)}...`);
    
    const testCompare = await bcrypt.compare(testCreds.password, localHash);
    console.log(`   Local verification: ${testCompare ? '✅ PASS' : '❌ FAIL'}`);
    
    return;
  }

  console.log('\n✅ Login successful on Railway!');
  const token = loginData.data?.token || loginData.token;
  console.log(`   Token (first 30 chars): ${token?.substring(0, 30) || 'NOT FOUND'}...`);
}

debugRailwayLogin().catch(console.error);

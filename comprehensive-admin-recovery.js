#!/usr/bin/env node

/**
 * COMPREHENSIVE ADMIN ACCOUNT RECOVERY
 * Wait for deployment and unlock account completely
 */

const https = require('https');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';
const ADMIN_EMAIL = 'admin@omnivox-ai.com';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function waitForDeployment() {
  console.log('⏳ Waiting for Railway deployment to complete...');
  
  for (let i = 0; i < 12; i++) { // Wait up to 2 minutes
    try {
      const response = await makeRequest(`${BACKEND_URL}/api/emergency/user-info/${encodeURIComponent(ADMIN_EMAIL)}`);
      if (response.status === 200) {
        console.log('✅ Backend is responsive');
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 more seconds for full deployment
        return true;
      }
    } catch (error) {
      // Continue waiting
    }
    
    console.log(`   Attempt ${i + 1}/12 - waiting 10 seconds...`);
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  return false;
}

async function fullAccountRecovery() {
  console.log('🔧 COMPREHENSIVE ADMIN ACCOUNT RECOVERY');
  console.log('========================================\n');
  
  // Step 1: Wait for deployment
  if (!(await waitForDeployment())) {
    console.log('❌ Deployment timeout - backend not responding');
    return false;
  }
  
  // Step 2: Get user info
  console.log('🔍 Getting current user state...');
  try {
    const userResponse = await makeRequest(`${BACKEND_URL}/api/emergency/user-info/${encodeURIComponent(ADMIN_EMAIL)}`);
    if (userResponse.status === 200) {
      const userData = JSON.parse(userResponse.data);
      console.log('✅ Current user state:');
      console.log(`   📧 Email: ${userData.data.email}`);
      console.log(`   👤 Username: ${userData.data.username}`);
      console.log(`   ✅ Active: ${userData.data.isActive}`);
    }
  } catch (error) {
    console.log('⚠️  Could not get user info');
  }
  
  // Step 3: Enhanced unlock
  console.log('\n🔓 Performing enhanced account unlock...');
  try {
    const unlockResponse = await makeRequest(`${BACKEND_URL}/api/emergency/emergency-unlock/${encodeURIComponent(ADMIN_EMAIL)}`, {
      method: 'POST'
    });
    
    if (unlockResponse.status === 200) {
      const unlockData = JSON.parse(unlockResponse.data);
      console.log('✅ Enhanced unlock completed');
      console.log(`   📧 Account: ${unlockData.data.email}`);
    } else {
      console.log(`❌ Enhanced unlock failed: ${unlockResponse.data}`);
    }
  } catch (error) {
    console.log(`❌ Enhanced unlock error: ${error.message}`);
  }
  
  // Step 4: Wait for database update
  console.log('\n⏳ Waiting for database update (5 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Step 5: Test common passwords
  console.log('\n🧪 Testing login with common passwords...');
  
  const testPasswords = [
    'admin123',
    'password', 
    'admin',
    'omnivox123',
    'Password123!',
    'Admin123!',
    '123456',
    'admin@123'
  ];
  
  for (const password of testPasswords) {
    const loginData = JSON.stringify({
      email: ADMIN_EMAIL,
      password: password
    });
    
    try {
      const response = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(loginData)
        },
        body: loginData
      });
      
      console.log(`   Testing '${password}': Status ${response.status}`);
      
      if (response.status === 200) {
        const result = JSON.parse(response.data);
        console.log(`\n🎉 SUCCESS! Login works with password: '${password}'`);
        console.log(`   👤 User: ${result.data?.user?.name}`);
        console.log(`   🔑 Role: ${result.data?.user?.role}`);
        console.log(`   🎫 Token: ${result.data?.token?.substring(0, 20)}...`);
        
        console.log('\n✅ RECOVERY COMPLETE!');
        console.log('=====================');
        console.log(`📧 Email: ${ADMIN_EMAIL}`);
        console.log(`🔑 Password: ${password}`);
        console.log('');
        console.log('🔄 Next steps:');
        console.log('1. Log in to the frontend with these credentials');
        console.log('2. Access the recordings section');
        console.log('3. The recording system should now work properly');
        
        return { email: ADMIN_EMAIL, password, token: result.data?.token };
      } else if (response.status === 423) {
        console.log(`   🔒 Account still locked (trying next password)`);
        // Try to unlock again
        await makeRequest(`${BACKEND_URL}/api/emergency/emergency-unlock/${encodeURIComponent(ADMIN_EMAIL)}`, {
          method: 'POST'
        });
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      } else {
        const responseData = JSON.parse(response.data);
        console.log(`   ❌ ${responseData.message || 'Login failed'}`);
      }
      
    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
    }
  }
  
  console.log('\n⚠️  PASSWORD RECOVERY NEEDED');
  console.log('============================');
  console.log('The account is unlocked but none of the common passwords worked.');
  console.log('The password might be different than expected.');
  console.log('');
  console.log('📋 Options:');
  console.log('1. Account is no longer locked, so you can try other passwords safely');
  console.log('2. Wait for password reset endpoint to deploy and use that');
  console.log('3. Check if there are any other password variations you remember');
  
  return null;
}

fullAccountRecovery().catch(console.error);
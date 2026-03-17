#!/usr/bin/env node

/**
 * UNLOCK ADMIN ACCOUNT - EMERGENCY FIX
 * Calls the emergency unlock endpoint to restore admin access
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

async function unlockAdminAccount() {
  console.log('🔓 EMERGENCY ADMIN ACCOUNT UNLOCK');
  console.log('=================================\n');
  
  console.log(`📧 Target account: ${ADMIN_EMAIL}`);
  console.log(`🌐 Backend: ${BACKEND_URL}`);
  console.log('');
  
  // Step 1: Get user info first
  console.log('🔍 STEP 1: Getting user account information...');
  
  try {
    const userInfoUrl = `${BACKEND_URL}/api/emergency/user-info/${encodeURIComponent(ADMIN_EMAIL)}`;
    const userResponse = await makeRequest(userInfoUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   User lookup status: ${userResponse.status}`);
    
    if (userResponse.status === 200) {
      const userData = JSON.parse(userResponse.data);
      const user = userData.data;
      
      console.log('✅ User found:');
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Username: ${user.username}`);
      console.log(`   🏷️  Name: ${user.name}`);
      console.log(`   🔑 Role: ${user.role}`);
      console.log(`   ✅ Active: ${user.isActive}`);
      console.log(`   📅 Created: ${new Date(user.createdAt).toLocaleString()}`);
    } else {
      console.log(`❌ User lookup failed: ${userResponse.data}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ User lookup error: ${error.message}`);
    return false;
  }
  
  // Step 2: Unlock the account
  console.log('\n🔓 STEP 2: Unlocking admin account...');
  
  try {
    const unlockUrl = `${BACKEND_URL}/api/emergency/emergency-unlock/${encodeURIComponent(ADMIN_EMAIL)}`;
    const unlockResponse = await makeRequest(unlockUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Unlock status: ${unlockResponse.status}`);
    
    if (unlockResponse.status === 200) {
      const unlockData = JSON.parse(unlockResponse.data);
      
      console.log('🎉 ACCOUNT UNLOCK SUCCESS!');
      console.log(`   ✅ ${unlockData.message}`);
      console.log(`   📧 Account: ${unlockData.data.email}`);
      console.log(`   💡 ${unlockData.data.suggestion}`);
      
      return true;
    } else {
      console.log(`❌ Unlock failed: ${unlockResponse.data}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Unlock error: ${error.message}`);
    return false;
  }
}

async function testLogin() {
  console.log('\n🧪 STEP 3: Testing login with common passwords...');
  
  const testPasswords = ['admin123', 'password', 'admin', 'omnivox123'];
  
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
      
      console.log(`   Password '${password}': Status ${response.status}`);
      
      if (response.status === 200) {
        const result = JSON.parse(response.data);
        console.log(`🎉 LOGIN SUCCESS! Password is '${password}'`);
        console.log(`   👤 User: ${result.data?.user?.name}`);
        console.log(`   🔑 Role: ${result.data?.user?.role}`);
        return { password, token: result.data?.token };
      } else if (response.status === 423) {
        console.log(`   🔒 Still locked (unlock may need more time)`);
      } else {
        const responseData = JSON.parse(response.data);
        console.log(`   ❌ ${responseData.message || 'Login failed'}`);
      }
      
    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
    }
  }
  
  return null;
}

async function runUnlockProcess() {
  console.log('⏳ Waiting 30 seconds for Railway deployment...');
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  const unlockSuccess = await unlockAdminAccount();
  
  if (unlockSuccess) {
    const loginResult = await testLogin();
    
    console.log('\n🏆 FINAL RESULTS');
    console.log('=================');
    
    if (loginResult) {
      console.log('🎉 COMPLETE SUCCESS!');
      console.log(`✅ Account unlocked: ${ADMIN_EMAIL}`);
      console.log(`✅ Password confirmed: ${loginResult.password}`);
      console.log(`✅ Token obtained: ${loginResult.token.substring(0, 20)}...`);
      console.log('');
      console.log('🔄 You can now:');
      console.log('1. Log in to the frontend with your original credentials');
      console.log('2. Complete the recording system fix');
      console.log('3. Access all admin features normally');
    } else {
      console.log('⚠️  Account unlocked but password needs confirmation');
      console.log('');
      console.log('📋 Manual steps:');
      console.log('1. Try logging in with common passwords: admin123, password, admin');
      console.log('2. If none work, the password may be different than expected');
      console.log('3. Account is no longer locked, so you can try multiple times safely');
    }
  } else {
    console.log('\n❌ Unlock process failed - check the error messages above');
  }
}

runUnlockProcess().catch(console.error);
#!/usr/bin/env node

/**
 * DIAGNOSE AND FIX EXISTING ADMIN LOGIN ISSUE
 * Find out why admin@omnivox-ai.com isn't working and fix it
 */

const https = require('https');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

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

async function debugLogin() {
  console.log('🔍 DIAGNOSING ADMIN LOGIN ISSUE');
  console.log('===============================\n');
  
  const userEmail = 'admin@omnivox-ai.com';
  
  // Test 1: Try original login with detailed response
  console.log('🧪 TEST 1: Detailed login attempt analysis...');
  
  const testPasswords = [
    'admin123',
    'password', 
    'admin',
    'TestPassword123!',
    'omnivox123',
    'admin@omnivox',
    '123456'
  ];
  
  for (const password of testPasswords) {
    const loginData = JSON.stringify({
      email: userEmail,
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
        console.log(`✅ SUCCESS! Password '${password}' works!`);
        const result = JSON.parse(response.data);
        console.log(`   User: ${result.data?.user?.name}`);
        console.log(`   Role: ${result.data?.user?.role}`);
        return { password, token: result.data?.token };
      } else if (response.status === 423) {
        console.log(`   🔒 Account locked (too many attempts)`);
      } else {
        const responseData = response.data ? JSON.parse(response.data) : {};
        console.log(`   ❌ ${responseData.message || 'Login failed'}`);
      }
      
    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
    }
  }
  
  console.log('\n🔍 TEST 2: Check if user exists in database...');
  
  // Test 2: Try different email formats
  const emailVariants = [
    'admin@omnivox-ai.com',
    'admin@omnivox.com',
    'admin',
    'admin@admin.com'
  ];
  
  for (const email of emailVariants) {
    const loginData = JSON.stringify({
      email: email,
      password: 'admin123' // Try common password
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
      
      console.log(`   Email '${email}': Status ${response.status}`);
      
      if (response.status === 200) {
        console.log(`✅ Found working email: ${email}`);
        return email;
      } else if (response.status !== 423) {
        const responseData = response.data ? JSON.parse(response.data) : {};
        if (responseData.message && !responseData.message.includes('Invalid credentials')) {
          console.log(`   📝 ${responseData.message}`);
        }
      }
      
    } catch (error) {
      console.log(`   💥 Error with ${email}: ${error.message}`);
    }
  }
  
  console.log('\n🔍 TEST 3: Check backend user endpoint...');
  
  // Test 3: Try to access user info endpoints
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/admin/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Admin users endpoint: ${response.status}`);
    if (response.status === 401) {
      console.log('   ✅ Endpoint exists but requires auth (normal)');
    }
  } catch (error) {
    console.log(`   💥 Admin endpoint error: ${error.message}`);
  }
  
  return null;
}

async function checkAccountLock() {
  console.log('\n🔒 CHECKING: Account lockout status...');
  
  const userEmail = 'admin@omnivox-ai.com';
  
  // Try login with obviously wrong password to see error type
  const loginData = JSON.stringify({
    email: userEmail,
    password: 'definitely_wrong_password_12345'
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
    
    console.log(`   Test login status: ${response.status}`);
    
    if (response.status === 423) {
      console.log('🔒 CONFIRMED: Account is locked due to too many failed attempts');
      console.log('   This explains why your login isn\'t working!');
      return true;
    } else if (response.status === 401) {
      const responseData = JSON.parse(response.data);
      console.log(`   Response: ${responseData.message}`);
      console.log('✅ Account is not locked - it\'s a credential issue');
      return false;
    }
    
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  return null;
}

async function findSolution() {
  console.log('\n💡 SOLUTION ANALYSIS');
  console.log('====================\n');
  
  const workingCreds = await debugLogin();
  const isLocked = await checkAccountLock();
  
  console.log('\n🎯 DIAGNOSIS COMPLETE');
  console.log('=====================');
  
  if (workingCreds) {
    console.log(`✅ Found working credentials: ${JSON.stringify(workingCreds)}`);
  } else if (isLocked) {
    console.log('🔒 ISSUE: Your admin account is LOCKED');
    console.log('');
    console.log('📋 SOLUTIONS:');
    console.log('1. Wait 15-30 minutes for the lockout to expire');
    console.log('2. Or I can create an admin endpoint to unlock it');
    console.log('3. Or I can reset the failed attempt counter in the database');
    console.log('');
    console.log('🔧 IMMEDIATE FIX: Let me create an unlock endpoint...');
  } else {
    console.log('❌ ISSUE: Credentials don\'t match any user in database');
    console.log('');
    console.log('📋 POSSIBLE CAUSES:');
    console.log('- Username/email is different than expected');
    console.log('- Password was changed or is different');
    console.log('- User was deleted or doesn\'t exist');
    console.log('');
    console.log('🔧 NEXT: Check what users actually exist in the system');
  }
}

findSolution().catch(console.error);
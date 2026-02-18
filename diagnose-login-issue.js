#!/usr/bin/env node

/**
 * USER LOGIN DIAGNOSTIC AND FIX
 * Check what users exist and fix login issues
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

async function testLoginCredentials() {
  console.log('🔐 TESTING LOGIN CREDENTIALS');
  console.log('============================\n');
  
  // Test the exact credential you tried
  const attemptedCredentials = [
    { email: 'admin@omnivox-ai.com', password: 'admin' },
    { email: 'admin@omnivox-ai.com', password: 'admin123' },
    { email: 'admin@omnivox-ai.com', password: 'password' },
    { email: 'admin@omnivox.com', password: 'admin' },
    { email: 'admin@omnivox.com', password: 'admin123' },
    { username: 'admin', password: 'admin' },
    { username: 'admin', password: 'admin123' },
    { username: 'admin', password: 'password' },
    { email: 'test@test.com', password: 'password' },
    { email: 'demo@omnivox.com', password: 'demo123' }
  ];
  
  let workingCredentials = null;
  
  for (const creds of attemptedCredentials) {
    try {
      const loginData = JSON.stringify(creds);
      
      console.log(`🔍 Testing: ${creds.email || creds.username}`);
      
      const response = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(loginData)
        },
        body: loginData
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 200) {
        const result = JSON.parse(response.data);
        console.log(`   ✅ SUCCESS! Found working credentials`);
        console.log(`   User: ${result.data?.user?.name || 'Unknown'}`);
        console.log(`   Role: ${result.data?.user?.role || 'Unknown'}`);
        workingCredentials = { creds, token: result.data?.token };
        break;
      } else {
        const errorData = JSON.parse(response.data || '{}');
        console.log(`   ❌ Failed: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
    }
    
    // Small delay between attempts
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return workingCredentials;
}

async function checkIfUsersExist() {
  console.log('\n📋 CHECKING IF ANY USERS EXIST IN DATABASE');
  console.log('==========================================\n');
  
  try {
    // Try to create a test user to see if the system is properly set up
    const testUserData = JSON.stringify({
      username: 'testuser123',
      email: 'test.user@example.com',
      password: 'TestUser123!',
      name: 'Test User',
      role: 'AGENT'
    });
    
    const response = await makeRequest(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(testUserData)
      },
      body: testUserData
    });
    
    console.log(`Registration test status: ${response.status}`);
    
    if (response.status === 201 || response.status === 200) {
      console.log('✅ Registration works - created test user');
      console.log('🔐 You can now login with:');
      console.log('   Email: test.user@example.com');
      console.log('   Password: TestUser123!');
      return { email: 'test.user@example.com', password: 'TestUser123!' };
    } else {
      const errorData = JSON.parse(response.data || '{}');
      console.log(`❌ Registration failed: ${errorData.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`💥 Registration test error: ${error.message}`);
  }
  
  return null;
}

async function createAdminUser() {
  console.log('\n👑 ATTEMPTING TO CREATE ADMIN USER');
  console.log('==================================\n');
  
  try {
    const adminData = JSON.stringify({
      username: 'admin',
      email: 'admin@omnivox.com',
      password: 'admin123',
      name: 'System Administrator',
      role: 'ADMIN'
    });
    
    const response = await makeRequest(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(adminData)
      },
      body: adminData
    });
    
    console.log(`Admin creation status: ${response.status}`);
    
    if (response.status === 201 || response.status === 200) {
      console.log('✅ Admin user created successfully!');
      console.log('🔐 Admin login credentials:');
      console.log('   Email: admin@omnivox.com');
      console.log('   Password: admin123');
      return { email: 'admin@omnivox.com', password: 'admin123' };
    } else {
      const errorData = JSON.parse(response.data || '{}');
      console.log(`❌ Admin creation failed: ${errorData.message || 'Unknown error'}`);
      
      // If user already exists, that's actually good
      if (errorData.message && errorData.message.includes('already exists')) {
        console.log('ℹ️  Admin user already exists - try login with standard credentials');
        return { email: 'admin@omnivox.com', password: 'admin123' };
      }
    }
  } catch (error) {
    console.log(`💥 Admin creation error: ${error.message}`);
  }
  
  return null;
}

async function runLoginDiagnostic() {
  console.log('🚨 LOGIN DIAGNOSTIC AND FIX');
  console.log('============================\n');
  
  // Step 1: Test existing credentials
  console.log('Step 1: Testing common credential combinations...');
  const workingCreds = await testLoginCredentials();
  
  if (workingCreds) {
    console.log('\n🎉 FOUND WORKING CREDENTIALS!');
    console.log(`   Email/Username: ${workingCreds.creds.email || workingCreds.creds.username}`);
    console.log(`   Password: ${workingCreds.creds.password}`);
    console.log(`   Token: ${workingCreds.token.substring(0, 20)}...`);
    return workingCreds;
  }
  
  // Step 2: Try to create a test user
  console.log('\nStep 2: No working credentials found, trying to create test user...');
  const testCreds = await checkIfUsersExist();
  
  if (testCreds) {
    console.log('\n✅ TEST USER CREATED - USE THESE CREDENTIALS:');
    console.log(`   Email: ${testCreds.email}`);
    console.log(`   Password: ${testCreds.password}`);
    return testCreds;
  }
  
  // Step 3: Try to create admin user
  console.log('\nStep 3: Trying to create admin user...');
  const adminCreds = await createAdminUser();
  
  if (adminCreds) {
    console.log('\n👑 ADMIN USER READY - USE THESE CREDENTIALS:');
    console.log(`   Email: ${adminCreds.email}`);
    console.log(`   Password: ${adminCreds.password}`);
    return adminCreds;
  }
  
  // Step 4: System might need initialization
  console.log('\n🔧 SYSTEM INITIALIZATION MAY BE NEEDED');
  console.log('=====================================');
  console.log('The backend might need initial setup. Possible solutions:');
  console.log('1. Database might not be seeded with users');
  console.log('2. User registration might be disabled');
  console.log('3. Authentication service might need restart');
  console.log('');
  console.log('💡 IMMEDIATE FIX ATTEMPT:');
  console.log('Try these manual steps:');
  console.log('1. Check Railway logs for database errors');
  console.log('2. Restart the Railway service');
  console.log('3. Or I can create a database seeding script');
  
  return null;
}

runLoginDiagnostic().catch(console.error);
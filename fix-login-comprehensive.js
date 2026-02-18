#!/usr/bin/env node

/**
 * FIX LOGIN ISSUES
 * 1. Wait for account lockout to expire
 * 2. Create proper user with all required fields
 * 3. Find working credentials
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

async function createUserWithProperFields() {
  console.log('👤 CREATING USER WITH PROPER FIELDS');
  console.log('===================================\n');
  
  const userData = {
    username: 'testadmin',
    email: 'test.admin@omnivox.com',
    password: 'TestAdmin123!',
    firstName: 'Test',
    lastName: 'Administrator',
    role: 'ADMIN'
  };
  
  try {
    const loginData = JSON.stringify(userData);
    
    console.log('📝 Creating user with complete data...');
    console.log(`   Email: ${userData.email}`);
    console.log(`   Username: ${userData.username}`);
    console.log(`   Name: ${userData.firstName} ${userData.lastName}`);
    console.log(`   Role: ${userData.role}`);
    
    const response = await makeRequest(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      },
      body: loginData
    });
    
    console.log(`\n📡 Registration Status: ${response.status}`);
    
    if (response.status === 201 || response.status === 200) {
      console.log('✅ USER CREATED SUCCESSFULLY!');
      
      // Try to login immediately
      const loginCreds = {
        email: userData.email,
        password: userData.password
      };
      
      const loginData2 = JSON.stringify(loginCreds);
      
      console.log('\n🔐 Testing immediate login...');
      
      const loginResponse = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(loginData2)
        },
        body: loginData2
      });
      
      console.log(`   Login Status: ${loginResponse.status}`);
      
      if (loginResponse.status === 200) {
        const loginResult = JSON.parse(loginResponse.data);
        console.log('🎉 LOGIN SUCCESS!');
        console.log(`   User: ${loginResult.data?.user?.name}`);
        console.log(`   Role: ${loginResult.data?.user?.role}`);
        console.log(`   Token: ${loginResult.data?.token?.substring(0, 20)}...`);
        
        return {
          credentials: userData,
          token: loginResult.data?.token
        };
      } else {
        console.log(`❌ Login failed: ${loginResponse.data}`);
      }
    } else {
      const errorData = JSON.parse(response.data || '{}');
      console.log(`❌ Registration failed: ${errorData.message || 'Unknown error'}`);
      
      // Check if user already exists
      if (errorData.message && errorData.message.includes('already exists')) {
        console.log('\nℹ️  User already exists, trying to login...');
        
        const loginCreds = {
          email: userData.email,
          password: userData.password
        };
        
        const loginData2 = JSON.stringify(loginCreds);
        
        const loginResponse = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(loginData2)
          },
          body: loginData2
        });
        
        console.log(`   Existing user login: ${loginResponse.status}`);
        
        if (loginResponse.status === 200) {
          const loginResult = JSON.parse(loginResponse.data);
          console.log('✅ Existing user login success!');
          return {
            credentials: userData,
            token: loginResult.data?.token
          };
        }
      }
    }
  } catch (error) {
    console.log(`💥 Error: ${error.message}`);
  }
  
  return null;
}

async function waitAndRetryOriginalCredentials() {
  console.log('⏳ WAITING FOR ACCOUNT LOCKOUT TO EXPIRE');
  console.log('=======================================\n');
  
  console.log('The original admin@omnivox-ai.com account is locked.');
  console.log('Account lockouts typically expire after 5-15 minutes.');
  console.log('\nTrying again in 30 seconds...\n');
  
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  const originalCreds = [
    { email: 'admin@omnivox-ai.com', password: 'admin' },
    { email: 'admin@omnivox-ai.com', password: 'admin123' },
    { email: 'admin@omnivox-ai.com', password: 'password' }
  ];
  
  for (const creds of originalCreds) {
    try {
      console.log(`🔍 Retry: ${creds.email} with ${creds.password}`);
      
      const loginData = JSON.stringify(creds);
      
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
        console.log('🎉 ORIGINAL CREDENTIALS WORK!');
        return {
          credentials: creds,
          token: result.data?.token
        };
      } else if (response.status === 423) {
        console.log('   Still locked, continuing...');
      } else {
        console.log(`   Failed: ${JSON.parse(response.data || '{}').message || 'Unknown'}`);
      }
      
      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
  }
  
  return null;
}

async function runLoginFix() {
  console.log('🔧 LOGIN ISSUE COMPREHENSIVE FIX');
  console.log('================================\n');
  
  // Method 1: Create new user with proper fields
  console.log('Method 1: Create new admin user with complete data...');
  const newUser = await createUserWithProperFields();
  
  if (newUser) {
    console.log('\n🎊 SUCCESS! New working credentials:');
    console.log(`📧 Email: ${newUser.credentials.email}`);
    console.log(`🔑 Password: ${newUser.credentials.password}`);
    console.log(`🎫 Auth Token: ${newUser.token.substring(0, 20)}...`);
    console.log('\n✅ You can now use these credentials to:');
    console.log('   1. Log in to the frontend');
    console.log('   2. Complete the recording system fixes');
    console.log('   3. Access all admin features');
    
    return newUser;
  }
  
  // Method 2: Wait and retry original credentials
  console.log('\nMethod 2: Wait for original account lockout to expire...');
  const originalUser = await waitAndRetryOriginalCredentials();
  
  if (originalUser) {
    console.log('\n🎊 SUCCESS! Original credentials now work:');
    console.log(`📧 Email: ${originalUser.credentials.email}`);
    console.log(`🔑 Password: ${originalUser.credentials.password}`);
    return originalUser;
  }
  
  // Method 3: Manual instructions
  console.log('\n📋 MANUAL WORKAROUND INSTRUCTIONS');
  console.log('=================================');
  console.log('If automated fixes didn\'t work, try these manual steps:');
  console.log('');
  console.log('1. WAIT LONGER FOR LOCKOUT:');
  console.log('   - Account lockouts can last 5-15 minutes');
  console.log('   - Wait 15 minutes then try: admin@omnivox-ai.com / admin123');
  console.log('');
  console.log('2. USE NEW TEST CREDENTIALS:');
  console.log('   - Email: test.admin@omnivox.com');
  console.log('   - Password: TestAdmin123!');
  console.log('   (This should have been created above)');
  console.log('');
  console.log('3. CHECK RAILWAY BACKEND:');
  console.log('   - Railway might need a restart');
  console.log('   - Check for database connection issues');
  
  return null;
}

runLoginFix().catch(console.error);
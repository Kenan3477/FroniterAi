#!/usr/bin/env node
require('dotenv').config();

const https = require('https');
const http = require('http');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';
const ADMIN_EMAIL = 'newadmin@omnivox.com';
const ADMIN_PASSWORD = 'NewAdmin123!';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const requester = isHttps ? https : http;

    const req = requester.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: res.headers['content-type']?.includes('application/json') ? JSON.parse(data) : data
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function loginAsAdmin() {
  console.log('🔐 Logging in as admin...');
  
  const loginData = JSON.stringify({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
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
    
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Admin login successful');
      console.log(`   User: ${response.data.data.user.name} (${response.data.data.user.email})`);
      console.log(`   Role: ${response.data.data.user.role}`);
      return response.data.data.token;
    } else {
      console.log('❌ Admin login failed');
      console.log('   Response:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Admin login error:', error.message);
    return null;
  }
}

async function listExistingUsers(token) {
  console.log('\n📋 Fetching existing users...');
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/admin/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200) {
      const users = response.data.data || response.data;
      console.log(`✅ Found ${users.length} users:`);
      
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}`);
        if (user.username) {
          console.log(`      Username: ${user.username}`);
        }
        console.log(`      ID: ${user.id || user._id}`);
        console.log(`      Status: ${user.status || 'active'}`);
        console.log(`      Created: ${user.createdAt || 'unknown'}`);
        console.log('');
      });
      
      return users;
    } else {
      console.log('❌ Failed to fetch users');
      console.log('   Response:', response.data);
      return [];
    }
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    return [];
  }
}

async function testCreateUser(token, userData) {
  console.log(`\n🧪 Testing user creation: ${userData.email}...`);
  
  const createData = JSON.stringify(userData);
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(createData)
      },
      body: createData
    });
    
    console.log(`   Status: ${response.status}`);
    console.log('   Response:', response.data);
    
    if (response.status === 201 || (response.status === 200 && response.data.success)) {
      console.log('✅ User created successfully');
      return response.data.data || response.data;
    } else if (response.status === 409) {
      console.log('⚠️  User already exists (409 conflict)');
      return { conflict: true, message: response.data.message };
    } else {
      console.log('❌ User creation failed');
      return { error: true, status: response.status, message: response.data };
    }
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    return { error: true, message: error.message };
  }
}

async function testUserConflicts(token) {
  console.log('\n🔍 Testing user creation conflicts...');
  
  const testUsers = [
    {
      name: 'Test User 1',
      email: 'testuser1@test.com',
      password: 'TestPass123!',
      role: 'agent'
    },
    {
      name: 'Test User 2',
      email: 'testuser2@test.com',
      password: 'TestPass123!',
      role: 'agent',
      username: 'testuser2'
    },
    {
      name: 'Admin Test',
      email: 'admin@test.com',
      password: 'AdminPass123!',
      role: 'admin'
    }
  ];
  
  const results = [];
  
  for (const user of testUsers) {
    const result = await testUserConflicts.delay(1000); // Delay to avoid rate limiting
    const createResult = await testCreateUser(token, user);
    results.push({ user, result: createResult });
  }
  
  return results;
}

// Add delay function
testUserConflicts.delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('🚀 OMNIVOX USER MANAGEMENT DIAGNOSTIC');
  console.log('=====================================');
  
  // Step 1: Login as admin
  const token = await loginAsAdmin();
  if (!token) {
    console.log('❌ Cannot proceed without admin token');
    process.exit(1);
  }
  
  // Step 2: List existing users
  const existingUsers = await listExistingUsers(token);
  
  // Step 3: Test user creation conflicts
  const testResults = await testUserConflicts(token);
  
  console.log('\n📊 CONFLICT ANALYSIS');
  console.log('====================');
  
  testResults.forEach((test, index) => {
    console.log(`\nTest ${index + 1}: ${test.user.email}`);
    if (test.result.conflict) {
      console.log('   Result: ⚠️  CONFLICT - User already exists');
    } else if (test.result.error) {
      console.log('   Result: ❌ ERROR - Failed to create');
      console.log(`   Reason: ${test.result.message}`);
    } else {
      console.log('   Result: ✅ SUCCESS - User created');
    }
  });
  
  console.log('\n🔍 DIAGNOSIS SUMMARY');
  console.log('===================');
  console.log(`Total existing users: ${existingUsers.length}`);
  
  const conflictCount = testResults.filter(r => r.result.conflict).length;
  const successCount = testResults.filter(r => !r.result.error && !r.result.conflict).length;
  const errorCount = testResults.filter(r => r.result.error).length;
  
  console.log(`Test conflicts: ${conflictCount}`);
  console.log(`Test successes: ${successCount}`);
  console.log(`Test errors: ${errorCount}`);
  
  if (conflictCount > 0) {
    console.log('\n💡 RECOMMENDED ACTIONS:');
    console.log('• Check if test users already exist in database');
    console.log('• Verify user creation logic handles duplicates correctly');
    console.log('• Ensure frontend validates before submission');
    console.log('• Consider implementing user search before create');
  }
}

main().catch(console.error);
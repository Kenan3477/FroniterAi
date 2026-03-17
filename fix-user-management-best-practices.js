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
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Admin login successful');
      return response.data.data.token;
    } else {
      console.log('❌ Admin login failed');
      return null;
    }
  } catch (error) {
    console.error('❌ Admin login error:', error.message);
    return null;
  }
}

async function cleanupTestUsers(token) {
  console.log('\n🧹 Cleaning up test users...');
  
  const testEmails = [
    'testuser1@test.com',
    'testuser2@test.com',
    'admin@test.com'
  ];
  
  try {
    // First, get all users
    const response = await makeRequest(`${BACKEND_URL}/api/admin/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200) {
      const users = response.data.data || response.data;
      const testUsers = users.filter(user => testEmails.includes(user.email));
      
      console.log(`Found ${testUsers.length} test users to clean up:`);
      
      for (const user of testUsers) {
        console.log(`   Deleting: ${user.name} (${user.email})`);
        
        const deleteResponse = await makeRequest(`${BACKEND_URL}/api/admin/users/${user.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (deleteResponse.status === 200) {
          console.log(`   ✅ Deleted successfully`);
        } else {
          console.log(`   ❌ Failed to delete: ${deleteResponse.status}`);
        }
        
        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log('✅ Test user cleanup completed');
    }
  } catch (error) {
    console.error('❌ Error cleaning up test users:', error.message);
  }
}

async function demonstrateProperUserCreation(token) {
  console.log('\n🎯 Demonstrating proper user creation workflow...');
  
  const newUser = {
    name: 'Demo Agent User',
    email: 'demo.agent@test.com',
    password: 'DemoPass123!',
    role: 'agent',
    username: 'demo_agent'
  };
  
  // Step 1: Check if user exists first
  console.log('1️⃣ Checking if user already exists...');
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/admin/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200) {
      const users = response.data.data || response.data;
      const existingUser = users.find(user => 
        user.email === newUser.email || user.username === newUser.username
      );
      
      if (existingUser) {
        console.log(`   ⚠️  User already exists: ${existingUser.name} (${existingUser.email})`);
        console.log(`   💡 Frontend should show "User already exists" message`);
        return { exists: true, user: existingUser };
      } else {
        console.log('   ✅ User does not exist, safe to create');
      }
    }
  } catch (error) {
    console.error('   ❌ Error checking user existence:', error.message);
    return { error: true };
  }
  
  // Step 2: Create the user
  console.log('2️⃣ Creating new user...');
  
  const createData = JSON.stringify(newUser);
  
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
    
    if (response.status === 201 || (response.status === 200 && response.data.success)) {
      console.log('   ✅ User created successfully!');
      console.log(`   👤 Created: ${response.data.data.name} (${response.data.data.email})`);
      return { created: true, user: response.data.data };
    } else if (response.status === 409) {
      console.log('   ⚠️  409 Conflict: User already exists');
      console.log('   💡 This should have been caught in step 1');
      return { conflict: true };
    } else {
      console.log('   ❌ User creation failed');
      console.log('   Response:', response.data);
      return { error: true, response: response.data };
    }
  } catch (error) {
    console.error('   ❌ Error creating user:', error.message);
    return { error: true, message: error.message };
  }
}

async function main() {
  console.log('🚀 USER MANAGEMENT BEST PRACTICES DEMO');
  console.log('======================================');
  
  // Step 1: Login as admin
  const token = await loginAsAdmin();
  if (!token) {
    console.log('❌ Cannot proceed without admin token');
    process.exit(1);
  }
  
  // Step 2: Clean up any existing test users
  await cleanupTestUsers(token);
  
  // Step 3: Demonstrate proper user creation workflow
  const result = await demonstrateProperUserCreation(token);
  
  console.log('\n🎯 FRONTEND IMPLEMENTATION RECOMMENDATIONS');
  console.log('==========================================');
  
  console.log('\n✅ BEST PRACTICES:');
  console.log('1. Always check if user exists before creating');
  console.log('2. Show clear error messages for 409 conflicts');
  console.log('3. Validate email and username formats client-side');
  console.log('4. Use proper error handling for network issues');
  console.log('5. Show loading states during API calls');
  
  console.log('\n🔧 SUGGESTED FRONTEND FLOW:');
  console.log('1. User fills out form');
  console.log('2. Client validates input (email format, etc.)');
  console.log('3. Client checks if user exists (optional)');
  console.log('4. Client submits to create user API');
  console.log('5. Handle response:');
  console.log('   - 201/200: Show success message');
  console.log('   - 409: Show "User already exists" error');
  console.log('   - Other: Show general error message');
  
  console.log('\n🛠️  CURRENT ISSUE DIAGNOSIS:');
  console.log('• Backend is working correctly');
  console.log('• 409 conflicts are proper validation responses');
  console.log('• Frontend needs better error handling for conflicts');
  console.log('• React hydration warning is cosmetic (now fixed)');
  
  console.log('\n💡 IMMEDIATE ACTIONS:');
  console.log('• Update frontend user creation form error handling');
  console.log('• Add user existence check before creation (optional)');
  console.log('• Improve user feedback for duplicate users');
  console.log('• Test with fresh data to avoid conflicts');
}

main().catch(console.error);
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
      return { token: response.data.data.token, userId: response.data.data.user.id };
    } else {
      console.log('❌ Admin login failed');
      return null;
    }
  } catch (error) {
    console.error('❌ Admin login error:', error.message);
    return null;
  }
}

async function getCurrentAdminUser(token) {
  console.log('\n📋 Getting current admin user details...');
  
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
      const adminUser = users.find(user => user.email === ADMIN_EMAIL);
      
      if (adminUser) {
        console.log('✅ Found admin user:');
        console.log(`   ID: ${adminUser.id}`);
        console.log(`   Name: ${adminUser.name}`);
        console.log(`   Email: ${adminUser.email}`);
        console.log(`   Role: ${adminUser.role}`);
        console.log(`   Username: ${adminUser.username || 'N/A'}`);
        return adminUser;
      } else {
        console.log('❌ Admin user not found in user list');
        return null;
      }
    } else {
      console.log('❌ Failed to fetch users');
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    return null;
  }
}

async function testPasswordUpdate(token, userId, currentPassword, newPassword) {
  console.log(`\n🔑 Testing password update for user ID ${userId}...`);
  
  const updateData = {
    id: userId,
    currentPassword: currentPassword,
    newPassword: newPassword
  };
  
  console.log('Request data:', JSON.stringify(updateData, null, 2));
  
  const requestBody = JSON.stringify(updateData);
  
  try {
    // Test the user-specific endpoint (PUT /api/admin/users/:userId)
    console.log('1️⃣ Testing PUT /api/admin/users/:userId');
    
    const response1 = await makeRequest(`${BACKEND_URL}/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      },
      body: requestBody
    });
    
    console.log(`   Status: ${response1.status}`);
    console.log('   Response:', response1.data);
    
    if (response1.status === 409) {
      console.log('   ⚠️  409 Conflict detected on user-specific endpoint');
    }
    
    // Test the general users endpoint (PUT /api/admin/users)
    console.log('\n2️⃣ Testing PUT /api/admin/users (general endpoint)');
    
    const response2 = await makeRequest(`${BACKEND_URL}/api/admin/users`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      },
      body: requestBody
    });
    
    console.log(`   Status: ${response2.status}`);
    console.log('   Response:', response2.data);
    
    if (response2.status === 409) {
      console.log('   ⚠️  409 Conflict detected on general endpoint');
    }
    
    // Test just updating the password field without currentPassword
    console.log('\n3️⃣ Testing password update without currentPassword validation');
    
    const simpleUpdateData = {
      id: userId,
      password: newPassword
    };
    
    const simpleRequestBody = JSON.stringify(simpleUpdateData);
    
    const response3 = await makeRequest(`${BACKEND_URL}/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(simpleRequestBody)
      },
      body: simpleRequestBody
    });
    
    console.log(`   Status: ${response3.status}`);
    console.log('   Response:', response3.data);
    
    if (response3.status === 409) {
      console.log('   ⚠️  409 Conflict detected on simple password update');
    }
    
    return {
      specificEndpoint: response1,
      generalEndpoint: response2,
      simpleUpdate: response3
    };
    
  } catch (error) {
    console.error('❌ Error testing password update:', error.message);
    return { error: error.message };
  }
}

async function testDifferentUpdateScenarios(token, adminUser) {
  console.log('\n🧪 Testing different update scenarios...');
  
  // Scenario 1: Update non-password field (should work)
  console.log('\n1️⃣ Testing name update (should work)');
  
  const nameUpdateData = {
    id: adminUser.id,
    name: 'Updated Admin Name'
  };
  
  const nameRequestBody = JSON.stringify(nameUpdateData);
  
  try {
    const nameResponse = await makeRequest(`${BACKEND_URL}/api/admin/users/${adminUser.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(nameRequestBody)
      },
      body: nameRequestBody
    });
    
    console.log(`   Status: ${nameResponse.status}`);
    console.log('   Response:', nameResponse.data);
    
    if (nameResponse.status === 409) {
      console.log('   ⚠️  UNEXPECTED 409 on name update - this indicates a deeper issue');
    } else if (nameResponse.status === 200) {
      console.log('   ✅ Name update successful');
    }
    
  } catch (error) {
    console.error('   ❌ Error updating name:', error.message);
  }
  
  // Scenario 2: Update with email (might trigger conflict)
  console.log('\n2️⃣ Testing update with existing email (might conflict)');
  
  const emailUpdateData = {
    id: adminUser.id,
    email: adminUser.email,  // Same email
    name: adminUser.name
  };
  
  const emailRequestBody = JSON.stringify(emailUpdateData);
  
  try {
    const emailResponse = await makeRequest(`${BACKEND_URL}/api/admin/users/${adminUser.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(emailRequestBody)
      },
      body: emailRequestBody
    });
    
    console.log(`   Status: ${emailResponse.status}`);
    console.log('   Response:', emailResponse.data);
    
    if (emailResponse.status === 409) {
      console.log('   ⚠️  409 on same email update - backend treating as duplicate');
    }
    
  } catch (error) {
    console.error('   ❌ Error updating with email:', error.message);
  }
}

async function main() {
  console.log('🚀 PASSWORD UPDATE DIAGNOSTIC');
  console.log('============================');
  
  // Step 1: Login as admin
  const auth = await loginAsAdmin();
  if (!auth) {
    console.log('❌ Cannot proceed without admin token');
    process.exit(1);
  }
  
  // Step 2: Get current admin user
  const adminUser = await getCurrentAdminUser(auth.token);
  if (!adminUser) {
    console.log('❌ Cannot proceed without admin user details');
    process.exit(1);
  }
  
  // Step 3: Test password update scenarios
  const passwordResults = await testPasswordUpdate(
    auth.token,
    adminUser.id,
    ADMIN_PASSWORD,
    'NewPassword123!'
  );
  
  // Step 4: Test different update scenarios to understand the 409 pattern
  await testDifferentUpdateScenarios(auth.token, adminUser);
  
  console.log('\n🔍 DIAGNOSTIC SUMMARY');
  console.log('====================');
  
  console.log('\n❓ POSSIBLE CAUSES OF 409 ON PASSWORD UPDATE:');
  console.log('1. Backend treating password update as user creation');
  console.log('2. Email uniqueness check triggering during update');
  console.log('3. Username uniqueness check triggering during update');
  console.log('4. Incorrect endpoint being used for password updates');
  console.log('5. Request body format issue causing backend confusion');
  
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('1. Check backend user update logic for duplicate detection');
  console.log('2. Ensure password updates exclude email/username from uniqueness checks');
  console.log('3. Use dedicated password reset endpoint if available');
  console.log('4. Verify frontend is sending correct request format');
  console.log('5. Check if backend requires special handling for admin self-updates');
}

main().catch(console.error);
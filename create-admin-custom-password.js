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

async function createAdminWithCustomPassword() {
  console.log('🚀 Creating new admin with custom password...');
  
  // Login first to get token
  const loginData = JSON.stringify({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  
  const loginResponse = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    },
    body: loginData
  });
  
  if (loginResponse.status !== 200) {
    console.log('❌ Login failed');
    return;
  }
  
  const token = loginResponse.data.data.token;
  console.log('✅ Logged in successfully');
  
  // Create new admin with your preferred password
  const newAdminEmail = 'myadmin@omnivox.com';
  const myCustomPassword = 'MySecurePassword123!';
  
  const createData = JSON.stringify({
    name: 'My Admin Account',
    email: newAdminEmail,
    password: myCustomPassword,
    role: 'ADMIN',
    username: 'myadmin'
  });
  
  console.log(`\n👤 Creating admin: ${newAdminEmail}`);
  console.log(`🔑 Password: ${myCustomPassword}`);
  
  try {
    const createResponse = await makeRequest(`${BACKEND_URL}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(createData)
      },
      body: createData
    });
    
    console.log(`\n📊 Response Status: ${createResponse.status}`);
    
    if (createResponse.status === 201 || (createResponse.status === 200 && createResponse.data.success)) {
      console.log('🎉 SUCCESS! New admin created');
      console.log('🔐 Your new login credentials:');
      console.log(`   Email: ${newAdminEmail}`);
      console.log(`   Password: ${myCustomPassword}`);
      console.log('\n✅ You can now login with your custom password!');
    } else if (createResponse.status === 409) {
      console.log('⚠️  Admin already exists with that email');
      console.log('💡 Try logging in with existing credentials:');
      console.log(`   Email: ${newAdminEmail}`);
      console.log(`   Password: ${myCustomPassword}`);
    } else {
      console.log('❌ Failed to create admin');
      console.log('Response:', createResponse.data);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  console.log('🔧 QUICK FIX: CREATE ADMIN WITH CUSTOM PASSWORD');
  console.log('===============================================');
  
  await createAdminWithCustomPassword();
  
  console.log('\n💡 EXPLANATION:');
  console.log('Since the backend lacks user update endpoints,');
  console.log('the workaround is to create a new admin account');
  console.log('with your preferred password instead of updating the existing one.');
  
  console.log('\n🔮 FUTURE SOLUTION:');
  console.log('The backend needs these endpoints implemented:');
  console.log('• PUT /api/admin/users/:id - Update user');
  console.log('• POST /api/users/change-password - Change password');
  console.log('• PUT /api/users/profile - Update profile');
}

main().catch(console.error);
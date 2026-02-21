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

async function testEndpointAvailability(token) {
  console.log('\n🔍 Testing available endpoints...');
  
  const endpointsToTest = [
    // User management endpoints
    { method: 'GET', path: '/api/admin/users', description: 'Get all users' },
    { method: 'POST', path: '/api/admin/users', description: 'Create user' },
    { method: 'PUT', path: '/api/admin/users', description: 'Update user (general)' },
    { method: 'PUT', path: '/api/admin/users/495', description: 'Update specific user' },
    { method: 'PATCH', path: '/api/admin/users/495', description: 'Patch specific user' },
    
    // Alternative user management paths
    { method: 'PUT', path: '/api/users/495', description: 'Update user (users endpoint)' },
    { method: 'PATCH', path: '/api/users/495', description: 'Patch user (users endpoint)' },
    { method: 'POST', path: '/api/users/495/password', description: 'Change password' },
    { method: 'POST', path: '/api/admin/users/495/password', description: 'Admin change password' },
    { method: 'POST', path: '/api/admin/users/495/reset-password', description: 'Admin reset password' },
    
    // Profile management
    { method: 'GET', path: '/api/users/profile', description: 'Get profile' },
    { method: 'PUT', path: '/api/users/profile', description: 'Update profile' },
    { method: 'POST', path: '/api/users/change-password', description: 'Change own password' },
    
    // V1 API paths
    { method: 'PUT', path: '/api/v1/users/profile', description: 'Update profile (v1)' },
    { method: 'POST', path: '/api/v1/users/change-password', description: 'Change password (v1)' },
  ];
  
  const results = [];
  
  for (const endpoint of endpointsToTest) {
    try {
      console.log(`Testing ${endpoint.method} ${endpoint.path}...`);
      
      const requestOptions = {
        method: endpoint.method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      
      // For PUT/POST/PATCH, add a minimal body
      if (['PUT', 'POST', 'PATCH'].includes(endpoint.method)) {
        const body = JSON.stringify({ test: true });
        requestOptions.body = body;
        requestOptions.headers['Content-Length'] = Buffer.byteLength(body);
      }
      
      const response = await makeRequest(`${BACKEND_URL}${endpoint.path}`, requestOptions);
      
      const result = {
        ...endpoint,
        status: response.status,
        available: response.status !== 404
      };
      
      if (response.status === 200) {
        result.working = true;
        console.log(`   ✅ ${response.status} - Working`);
      } else if (response.status === 404) {
        result.working = false;
        console.log(`   ❌ ${response.status} - Not Found`);
      } else if (response.status === 400) {
        result.working = 'maybe';
        console.log(`   ⚠️  ${response.status} - Bad Request (endpoint exists but needs valid data)`);
      } else if (response.status === 405) {
        result.working = false;
        console.log(`   🚫 ${response.status} - Method Not Allowed`);
      } else {
        result.working = 'maybe';
        console.log(`   📝 ${response.status} - Other response`);
      }
      
      results.push(result);
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
      results.push({
        ...endpoint,
        status: 'error',
        error: error.message,
        available: false,
        working: false
      });
    }
  }
  
  return results;
}

async function findWorkingPasswordChangeEndpoint(token) {
  console.log('\n🔑 Looking for working password change endpoints...');
  
  const passwordEndpoints = [
    {
      method: 'POST',
      path: '/api/users/change-password',
      body: {
        currentPassword: ADMIN_PASSWORD,
        newPassword: 'TestNewPassword123!'
      }
    },
    {
      method: 'POST',
      path: '/api/admin/users/495/reset-password',
      body: {
        newPassword: 'TestNewPassword123!'
      }
    },
    {
      method: 'PUT',
      path: '/api/users/profile',
      body: {
        password: 'TestNewPassword123!'
      }
    },
    {
      method: 'PATCH',
      path: '/api/users/profile',
      body: {
        password: 'TestNewPassword123!'
      }
    }
  ];
  
  for (const endpoint of passwordEndpoints) {
    try {
      console.log(`Testing password change: ${endpoint.method} ${endpoint.path}...`);
      
      const requestBody = JSON.stringify(endpoint.body);
      
      const response = await makeRequest(`${BACKEND_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody)
        },
        body: requestBody
      });
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, response.data);
      
      if (response.status === 200 || response.status === 204) {
        console.log(`   🎉 FOUND WORKING PASSWORD CHANGE ENDPOINT!`);
        return endpoint;
      } else if (response.status !== 404) {
        console.log(`   📝 Endpoint exists but returned ${response.status}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
    }
  }
  
  return null;
}

async function main() {
  console.log('🚀 BACKEND ENDPOINT DISCOVERY');
  console.log('=============================');
  
  // Step 1: Login as admin
  const token = await loginAsAdmin();
  if (!token) {
    console.log('❌ Cannot proceed without admin token');
    process.exit(1);
  }
  
  // Step 2: Test endpoint availability
  const endpointResults = await testEndpointAvailability(token);
  
  // Step 3: Find working password change endpoints
  const workingPasswordEndpoint = await findWorkingPasswordChangeEndpoint(token);
  
  console.log('\n📊 ENDPOINT DISCOVERY SUMMARY');
  console.log('=============================');
  
  const workingEndpoints = endpointResults.filter(e => e.working === true);
  const maybeEndpoints = endpointResults.filter(e => e.working === 'maybe');
  const notFoundEndpoints = endpointResults.filter(e => e.status === 404);
  
  console.log(`\n✅ WORKING ENDPOINTS (${workingEndpoints.length}):`);
  workingEndpoints.forEach(e => {
    console.log(`   ${e.method} ${e.path} - ${e.description}`);
  });
  
  console.log(`\n⚠️  ENDPOINTS THAT EXIST BUT NEED VALID DATA (${maybeEndpoints.length}):`);
  maybeEndpoints.forEach(e => {
    console.log(`   ${e.method} ${e.path} - ${e.description} (Status: ${e.status})`);
  });
  
  console.log(`\n❌ NOT FOUND ENDPOINTS (${notFoundEndpoints.length}):`);
  notFoundEndpoints.forEach(e => {
    console.log(`   ${e.method} ${e.path} - ${e.description}`);
  });
  
  console.log('\n💡 DIAGNOSIS FOR 409 PASSWORD UPDATE ISSUE:');
  if (notFoundEndpoints.find(e => e.path.includes('users') && e.method === 'PUT')) {
    console.log('🎯 ROOT CAUSE FOUND: User update endpoints (PUT) are returning 404');
    console.log('   This means the backend lacks user update functionality');
    console.log('   When frontend tries to update user password, it gets 404');
    console.log('   Frontend likely falls back to POST (create user)');
    console.log('   POST with existing email returns 409 conflict');
  }
  
  if (workingPasswordEndpoint) {
    console.log(`\n✅ WORKING PASSWORD ENDPOINT: ${workingPasswordEndpoint.method} ${workingPasswordEndpoint.path}`);
  } else {
    console.log('\n❌ NO WORKING PASSWORD CHANGE ENDPOINTS FOUND');
  }
  
  console.log('\n🛠️  RECOMMENDED FIXES:');
  console.log('1. Implement missing PUT /api/admin/users/:id endpoint in backend');
  console.log('2. Or implement PUT /api/users/profile for self-updates');
  console.log('3. Or implement POST /api/users/change-password for password changes');
  console.log('4. Update frontend to use correct endpoint for password changes');
  console.log('5. Add proper error handling for 404 responses');
}

main().catch(console.error);
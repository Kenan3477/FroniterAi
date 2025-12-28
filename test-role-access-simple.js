const https = require('https');
const http = require('http');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const protocol = urlObj.protocol === 'https:' ? https : http;
    const req = protocol.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.data) {
      req.write(JSON.stringify(options.data));
    }
    
    req.end();
  });
}

async function testRoleBasedAccess() {
  console.log('🔐 Testing Role-Based Access Control');
  console.log('=====================================\n');

  try {
    // Test 1: Login as AGENT user (albert)
    console.log('1️⃣ Testing AGENT user login...');
    const agentLoginResponse = await makeRequest('http://localhost:3004/api/auth/login', {
      method: 'POST',
      data: {
        email: 'albert@test.co.uk',
        password: '3477'
      }
    });

    console.log('Agent login response status:', agentLoginResponse.status);
    if (agentLoginResponse.data.success) {
      console.log('✅ AGENT user logged in successfully');
      console.log(`   User: ${agentLoginResponse.data.user.email}`);
      console.log(`   Role: ${agentLoginResponse.data.user.role}`);
      
      const agentToken = agentLoginResponse.data.token;

      // Test AGENT access to admin endpoints
      console.log('\n🔍 Testing AGENT access to admin endpoints...');
      const adminAccessResponse = await makeRequest('http://localhost:3004/api/admin/users', {
        headers: { Authorization: `Bearer ${agentToken}` }
      });
      
      if (adminAccessResponse.status === 403) {
        console.log('✅ AGENT user correctly blocked from admin endpoints');
      } else {
        console.log('❌ SECURITY ISSUE: AGENT user can access admin endpoints');
        console.log('   Response status:', adminAccessResponse.status);
      }
      
    } else {
      console.log('❌ AGENT user login failed');
      console.log('Response:', agentLoginResponse.data);
    }

    console.log('\n2️⃣ Testing ADMIN user login...');
    
    // Test 2: Login as ADMIN user
    const adminLoginResponse = await makeRequest('http://localhost:3004/api/auth/login', {
      method: 'POST',
      data: {
        email: 'admin@omnivox.ai',
        password: 'admin123!'
      }
    });

    console.log('Admin login response status:', adminLoginResponse.status);
    if (adminLoginResponse.data.success) {
      console.log('✅ ADMIN user logged in successfully');
      console.log(`   User: ${adminLoginResponse.data.user.email}`);
      console.log(`   Role: ${adminLoginResponse.data.user.role}`);
      
      const adminToken = adminLoginResponse.data.token;

      // Test ADMIN access to admin endpoints
      console.log('\n🔍 Testing ADMIN access to admin endpoints...');
      const adminAccessResponse = await makeRequest('http://localhost:3004/api/admin/users', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      if (adminAccessResponse.status === 200) {
        console.log('✅ ADMIN user can access admin endpoints');
      } else {
        console.log('❌ ADMIN user blocked from admin endpoints');
        console.log('   Response status:', adminAccessResponse.status);
      }
      
    } else {
      console.log('❌ ADMIN user login failed');
      console.log('Response:', adminLoginResponse.data);
    }

    console.log('\n🔐 Backend API Test Complete');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

testRoleBasedAccess();
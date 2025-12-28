#!/usr/bin/env node

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

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ 
            status: res.statusCode, 
            data: parsed,
            headers: res.headers
          });
        } catch {
          resolve({ 
            status: res.statusCode, 
            data,
            headers: res.headers 
          });
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

async function testFrontendLogin() {
  console.log('🧪 Testing Frontend Login and Navigation');
  console.log('======================================\n');

  try {
    // Test frontend login
    console.log('1️⃣ Testing frontend login...');
    const loginResponse = await makeRequest('http://localhost:3001/api/auth/login', {
      method: 'POST',
      data: {
        email: 'admin@omnivox-ai.com',
        password: 'OmnivoxAdmin2025!'
      }
    });

    console.log('Login response status:', loginResponse.status);
    if (loginResponse.data.success) {
      console.log('✅ Frontend login successful!');
      console.log(`   User: ${loginResponse.data.user.name}`);
      console.log(`   Role: ${loginResponse.data.user.role}`);
      
      // Check if cookie was set
      const setCookieHeader = loginResponse.headers['set-cookie'];
      console.log('   Cookie set:', setCookieHeader ? '✅ YES' : '❌ NO');
      
      if (setCookieHeader) {
        console.log('   Cookie:', setCookieHeader[0]);
      }

    } else {
      console.log('❌ Frontend login failed');
      console.log('Response:', loginResponse.data);
    }

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

testFrontendLogin();
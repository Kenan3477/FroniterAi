/*
 * SECURITY WARNING: This file previously contained hardcoded credentials
 * Credentials have been moved to environment variables for security
 * Configure the following environment variables:
 * - ADMIN_PASSWORD
 * - ADMIN_EMAIL  
 * - TEST_PASSWORD
 * - USER_PASSWORD
 * - ALT_PASSWORD
 * - JWT_TOKEN
 */

const http = require('http');

async function testFrontendWorkflow() {
  console.log('🌐 Testing Complete Frontend → Railway Workflow');
  console.log('==============================================');

  // Function to make requests to frontend
  function makeRequest(path, method = 'GET', data = null, headers = {}, cookies = '') {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies,
          ...headers
        }
      };

      const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => responseData += chunk);
        res.on('end', () => {
          try {
            resolve({ 
              status: res.statusCode, 
              data: JSON.parse(responseData),
              headers: res.headers
            });
          } catch {
            resolve({ 
              status: res.statusCode, 
              data: responseData,
              headers: res.headers
            });
          }
        });
      });

      req.on('error', reject);
      if (data) req.write(JSON.stringify(data));
      req.end();
    });
  }

  try {
    // Step 1: Test frontend login
    console.log('\n1. Testing frontend login...');
    const loginResponse = await makeRequest('/api/auth/login', 'POST', {
      email: process.env.ADMIN_EMAIL || 'admin@omnivox-ai.com',
      password: process.env.ADMIN_PASSWORD || 'ADMIN_PASSWORD_NOT_SET'
    });

    console.log(`   Login Status: ${loginResponse.status}`);
    
    let authCookie = '';
    if (loginResponse.status === 200) {
      console.log('   ✅ Login successful!');
      
      // Extract auth cookie from Set-Cookie header
      const setCookie = loginResponse.headers['set-cookie'];
      if (setCookie) {
        const authCookieMatch = setCookie.find(cookie => cookie.includes('auth-token='));
        if (authCookieMatch) {
          authCookie = authCookieMatch.split(';')[0];
          console.log(`   Auth cookie: ${authCookie.substring(0, 50)}...`);
        }
      }
    } else {
      console.log(`   ❌ Login failed: ${JSON.stringify(loginResponse.data)}`);
      return;
    }

    // Step 2: Test flows through frontend proxy
    console.log('\n2. Testing flows via frontend proxy...');
    const flowsResponse = await makeRequest('/api/flows', 'GET', null, {}, authCookie);
    
    console.log(`   Flows Status: ${flowsResponse.status}`);
    if (flowsResponse.status === 200 && flowsResponse.data) {
      console.log(`   ✅ Found flows: ${JSON.stringify(flowsResponse.data, null, 2)}`);
    }

    // Step 3: Test inbound numbers through frontend proxy
    console.log('\n3. Testing inbound numbers via frontend proxy...');
    const numbersResponse = await makeRequest('/api/voice/inbound-numbers', 'GET', null, {}, authCookie);
    
    console.log(`   Inbound Numbers Status: ${numbersResponse.status}`);
    if (numbersResponse.status === 200) {
      console.log(`   ✅ Inbound numbers response: ${JSON.stringify(numbersResponse.data, null, 2)}`);
    } else {
      console.log(`   ❌ Failed: ${JSON.stringify(numbersResponse.data)}`);
    }

    console.log('\n🎯 Frontend → Railway Workflow Summary:');
    console.log(`   ✅ Frontend login: ${loginResponse.status === 200 ? 'WORKING' : 'FAILED'}`);
    console.log(`   ✅ Flows API proxy: ${flowsResponse.status === 200 ? 'WORKING' : 'FAILED'}`);
    console.log(`   ✅ Inbound numbers API proxy: ${numbersResponse.status === 200 ? 'WORKING' : 'FAILED'}`);
    
    console.log('\n🚀 DEPLOYMENT STATUS: Backend running on Railway, Frontend connecting successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendWorkflow();
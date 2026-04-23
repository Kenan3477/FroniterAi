#!/usr/bin/env node
/**
 * Omnivox Calling System Test
 * Tests if both frontend and backend are working for making calls
 */

const https = require('https');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';
const FRONTEND_URL = 'https://omnivox-i1xqb462z-kenans-projects-cbb7e50e.vercel.app';

// Test credentials (these should be configured in production)
const TEST_EMAIL = 'admin@omnivox.ai';
const TEST_PASSWORD = 'Admin123!'; // Change this to actual password

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testSystemStatus() {
  console.log('🔄 Testing Omnivox System Status...\n');

  // 1. Test Frontend Accessibility
  console.log('1️⃣ Testing Frontend...');
  try {
    const frontendTest = await makeRequest(FRONTEND_URL);
    console.log(`   Frontend Status: ${frontendTest.status}`);
    
    if (frontendTest.status === 401) {
      console.log('   ✅ Frontend: Loading (shows auth screen - GOOD)');
    } else if (frontendTest.status === 200) {
      console.log('   ✅ Frontend: Accessible');
    } else {
      console.log(`   ❌ Frontend: Error ${frontendTest.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Frontend: Connection Error - ${error.message}`);
  }

  // 2. Test Backend API
  console.log('\n2️⃣ Testing Backend API...');
  try {
    const backendTest = await makeRequest(`${BACKEND_URL}/api`);
    console.log(`   Backend Status: ${backendTest.status}`);
    
    if (backendTest.status === 200) {
      console.log('   ✅ Backend: API Responding');
      console.log(`   📋 Available Endpoints: ${Object.keys(backendTest.data.endpoints || {}).length}`);
    } else {
      console.log(`   ❌ Backend: Error ${backendTest.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Backend: Connection Error - ${error.message}`);
  }

  // 3. Test Authentication
  console.log('\n3️⃣ Testing Authentication...');
  try {
    const authTest = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: TEST_EMAIL, password: TEST_PASSWORD }
    });
    
    console.log(`   Auth Status: ${authTest.status}`);
    
    if (authTest.status === 200 && authTest.data.token) {
      console.log('   ✅ Authentication: Working');
      
      // 4. Test Dialer Token (for calling)
      console.log('\n4️⃣ Testing Dialer Token...');
      try {
        const dialerTest = await makeRequest(`${BACKEND_URL}/api/calls/token`, {
          headers: { 'Authorization': `Bearer ${authTest.data.token}` }
        });
        
        console.log(`   Dialer Token Status: ${dialerTest.status}`);
        
        if (dialerTest.status === 200) {
          console.log('   ✅ Dialer: Ready for calls');
          console.log('   🎯 SYSTEM READY TO MAKE CALLS! 🎯');
        } else {
          console.log(`   ❌ Dialer: Error ${dialerTest.status}`);
          console.log(`   Error: ${JSON.stringify(dialerTest.data)}`);
        }
      } catch (error) {
        console.log(`   ❌ Dialer: Error - ${error.message}`);
      }
      
    } else if (authTest.status === 401) {
      console.log('   ⚠️  Authentication: Invalid credentials (expected - change TEST_PASSWORD)');
    } else {
      console.log(`   ❌ Authentication: Error ${authTest.status}`);
      console.log(`   Response: ${JSON.stringify(authTest.data)}`);
    }
  } catch (error) {
    console.log(`   ❌ Authentication: Error - ${error.message}`);
  }

  // 5. Test Production Dialer Endpoints
  console.log('\n5️⃣ Testing Production Dialer...');
  try {
    const prodDialerTest = await makeRequest(`${BACKEND_URL}/api/dialer/status`);
    console.log(`   Production Dialer Status: ${prodDialerTest.status}`);
    
    if (prodDialerTest.status === 200) {
      console.log('   ✅ Production Dialer: Available');
    } else if (prodDialerTest.status === 404) {
      console.log('   ⚠️  Production Dialer: Endpoint not found (may need authentication)');
    } else {
      console.log(`   ❌ Production Dialer: Error ${prodDialerTest.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Production Dialer: Error - ${error.message}`);
  }
}

async function main() {
  await testSystemStatus();
  
  console.log('\n📊 SUMMARY:');
  console.log('Frontend URL:', FRONTEND_URL);
  console.log('Backend URL:', BACKEND_URL);
  console.log('\n💡 If authentication failed, update TEST_PASSWORD in this script');
  console.log('💡 If everything is working, Omnivox is ready to make calls!');
}

main().catch(console.error);
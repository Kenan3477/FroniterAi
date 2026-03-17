#!/usr/bin/env node

const http = require('http');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
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

async function testPauseEventsDirectly() {
  console.log('🧪 Testing Pause Events with Cookie Authentication');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Login to get cookie
    console.log('\n1️⃣  Testing Login...');
    const loginResponse = await makeRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@omnivox.ai',
        password: 'admin123'
      })
    });
    
    if (loginResponse.status !== 200 || !loginResponse.data.success) {
      throw new Error(`Login failed: ${JSON.stringify(loginResponse.data)}`);
    }
    
    console.log(`✅ Login successful! Token: ${loginResponse.data.token.substring(0, 20)}...`);
    
    // Extract cookie from response headers
    const setCookieHeader = loginResponse.headers['set-cookie'];
    console.log('🍪 Set-Cookie Header:', setCookieHeader);
    
    if (!setCookieHeader) {
      throw new Error('No set-cookie header found in login response');
    }
    
    const authCookie = setCookieHeader[0]; // Take the first cookie
    console.log('🍪 Auth Cookie:', authCookie.substring(0, 50) + '...');
    
    // Step 2: Test pause events with cookie
    console.log('\n2️⃣  Testing Pause Events with Cookies...');
    const pauseEventsResponse = await makeRequest('http://localhost:3000/api/pause-events?startDate=2026-02-24&endDate=2026-02-24', {
      method: 'GET',
      headers: {
        'Cookie': authCookie,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Pause Events Response Status:', pauseEventsResponse.status);
    console.log('📊 Pause Events Response:', JSON.stringify(pauseEventsResponse.data, null, 2));
    
    if (pauseEventsResponse.status !== 200) {
      throw new Error(`Pause events failed: ${pauseEventsResponse.status} - ${JSON.stringify(pauseEventsResponse.data)}`);
    }
    
    console.log('✅ Pause events working with cookies!');
    
    // Step 3: Test pause stats with cookie
    console.log('\n3️⃣  Testing Pause Stats with Cookies...');
    const pauseStatsResponse = await makeRequest('http://localhost:3000/api/pause-events/stats?startDate=2026-02-24&endDate=2026-02-24', {
      method: 'GET',
      headers: {
        'Cookie': authCookie,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📈 Pause Stats Response Status:', pauseStatsResponse.status);
    console.log('📈 Pause Stats Response:', JSON.stringify(pauseStatsResponse.data, null, 2));
    
    if (pauseStatsResponse.status !== 200) {
      throw new Error(`Pause stats failed: ${pauseStatsResponse.status} - ${JSON.stringify(pauseStatsResponse.data)}`);
    }
    
    console.log('✅ Pause stats working with cookies!');
    
    console.log('\n🎉 Cookie-based authentication test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testPauseEventsDirectly();
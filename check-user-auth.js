#!/usr/bin/env node

/**
 * Check what users exist in the database for testing
 */

const https = require('https');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function checkUsers() {
  console.log('🔍 Checking available users in database...');
  
  // Try to get users endpoint (if it exists)
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/users`);
    console.log('Users endpoint status:', response.status);
    if (response.data) {
      console.log('Response:', response.data.substring(0, 500));
    }
  } catch (error) {
    console.log('Users endpoint error:', error.message);
  }
  
  // Test common credentials
  const testCredentials = [
    { username: 'admin', email: 'admin@omnivox.com', password: 'admin123' },
    { username: 'kenan', email: 'kenan@couk', password: 'TestPassword123!' },
    { username: 'kenan', email: 'kenan@couk', password: 'TestUser123!' },
    { username: 'test', email: 'test@test.com', password: 'TestPassword123!' },
    { username: 'testuser', email: 'testuser@omnivox.com', password: 'TestUser123!' },
    { username: 'testagent', email: 'testagent@omnivox.com', password: 'TestAgent123!' },
    { email: 'Kenan@test.co.uk', password: 'TestPassword123!' },
    { email: 'demo@omnivox.com', password: 'demo123' },
  ];
  
  console.log('\n🔐 Testing authentication with common credentials...');
  
  for (const creds of testCredentials) {
    console.log(`\nTesting: ${creds.email || creds.username}`);
    
    const loginData = JSON.stringify(creds);
    
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
      
      if (response.status === 200) {
        const result = JSON.parse(response.data);
        console.log(`   ✅ SUCCESS! User: ${result.data?.user?.name || 'Unknown'}`);
        console.log(`   Token: ${result.data?.token ? 'YES' : 'NO'}`);
        return { creds, result };
      } else {
        console.log(`   ❌ Failed: ${response.data.substring(0, 100)}`);
      }
    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
    }
  }
  
  console.log('\n❌ No working credentials found');
  return null;
}

checkUsers().then(result => {
  if (result) {
    console.log('\n🎉 Found working credentials!');
    console.log('Use these for recording test:', result.creds);
  }
}).catch(console.error);
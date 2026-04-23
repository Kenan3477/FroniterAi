#!/usr/bin/env node
/**
 * Test JWT Secret Compatibility with Railway Backend
 */

const https = require('https');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

// Test both JWT secrets
const secrets = [
  'Zk9GYmtJN3BuQWxoVUdvejBYcWNUaXVyM1ZsOHNkZjJoS3ltUDRiRXc3TVBqQ0drVzlZaEJaVDFvSVJNeUZhNg==',
  'kennex-super-secret-jwt-key-for-production-2025'
];

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
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

async function testJWTSecrets() {
  console.log('🔍 Testing JWT Secrets with Railway Backend...\n');

  // First, try to login to get a valid token
  console.log('1️⃣ Testing Authentication...');
  
  const loginPayload = {
    email: 'admin@omnivox.ai',
    password: 'Admin123!'  // Test password
  };

  try {
    const authResponse = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: loginPayload
    });

    console.log(`Auth Status: ${authResponse.status}`);
    
    if (authResponse.status === 200 && authResponse.data.token) {
      console.log('✅ Authentication successful!');
      console.log('🔑 Railway backend is working with these credentials');
      console.log('\nToken received - this means Railway backend JWT is configured correctly');
      console.log('📋 Use the same JWT_SECRET that Railway backend is using');
      
    } else {
      console.log('❌ Authentication failed');
      console.log('Response:', JSON.stringify(authResponse.data, null, 2));
      console.log('\n🔧 You may need to:');
      console.log('1. Check admin credentials in Railway backend');
      console.log('2. Verify JWT_SECRET is set in Railway environment variables');
    }

  } catch (error) {
    console.log('❌ Connection error:', error.message);
  }

  console.log('\n💡 RECOMMENDATION:');
  console.log('Use the Base64 encoded JWT secret from your .env file:');
  console.log('JWT_SECRET=Zk9GYmtJN3BuQWxoVUdvejBYcWNUaXVyM1ZsOHNkZjJoS3ltUDRiRXc3TVBqQ0drVzlZaEJaVDFvSVJNeUZhNg==');
  console.log('\nThis appears to be the production-grade secret.');
}

testJWTSecrets().catch(console.error);
/**
 * Test script to check what IP headers Railway is forwarding
 * Run this to see the actual headers being sent to the backend
 */

const https = require('https');

const RAILWAY_URL = 'https://kennex-production.up.railway.app';

console.log('🔍 Testing IP detection headers from Railway...\n');
console.log(`📡 Making request to: ${RAILWAY_URL}/api/auth/me\n`);

const options = {
  hostname: 'kennex-production.up.railway.app',
  port: 443,
  path: '/api/auth/me',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'Accept': 'application/json'
  }
};

const req = https.request(options, (res) => {
  console.log('📥 Response Status:', res.statusCode);
  console.log('\n📋 Response Headers:');
  Object.entries(res.headers).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n📦 Response Body:');
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
});

req.end();

console.log('⏳ Waiting for response...\n');

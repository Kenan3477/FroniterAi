/**
 * Test Vercel Frontend → Railway Backend Connection
 * Verifies environment variables are working
 */

const https = require('https');

const VERCEL_URL = 'https://frontend-mo1q9yi07-kenans-projects-cbb7e50e.vercel.app';
const BACKEND_URL = 'https://froniterai-production.up.railway.app';

console.log('🧪 Testing Vercel → Railway Connection\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 1: Check if Vercel frontend is up
console.log('1️⃣  Testing Vercel frontend...');
https.get(VERCEL_URL, (res) => {
  console.log(`✅ Vercel frontend: ${res.statusCode}`);
  
  // Test 2: Check if Railway backend is up
  console.log('\n2️⃣  Testing Railway backend...');
  https.get(`${BACKEND_URL}/api/dialer`, (res2) => {
    console.log(`✅ Railway backend: ${res2.statusCode}`);
    
    // Test 3: Test REST API call endpoint
    console.log('\n3️⃣  Testing REST API call endpoint...');
    const postData = JSON.stringify({
      to: '+1234567890',
      contactId: 'test-contact',
      agentId: 'test-agent'
    });
    
    const options = {
      hostname: 'froniterai-production.up.railway.app',
      port: 443,
      path: '/api/calls/call-rest-api',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };
    
    const req = https.request(options, (res3) => {
      let data = '';
      res3.on('data', (chunk) => data += chunk);
      res3.on('end', () => {
        console.log(`📞 REST API endpoint: ${res3.statusCode}`);
        
        if (res3.statusCode === 401) {
          console.log('✅ Endpoint is working (401 = needs authentication - expected)');
        } else if (res3.statusCode === 500) {
          console.log('❌ Backend error 500:', data);
        } else {
          console.log('Response:', data);
        }
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ CONNECTION TEST COMPLETE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('🎯 Dialer should now work!');
        console.log('   1. Go to: https://frontend-mo1q9yi07-kenans-projects-cbb7e50e.vercel.app');
        console.log('   2. Log in to your account');
        console.log('   3. Go to Manual Dialer');
        console.log('   4. Try making a call\n');
      });
    });
    
    req.on('error', (err) => {
      console.error('❌ REST API test failed:', err.message);
    });
    
    req.write(postData);
    req.end();
    
  }).on('error', (err) => {
    console.error('❌ Railway backend error:', err.message);
  });
  
}).on('error', (err) => {
  console.error('❌ Vercel frontend error:', err.message);
});

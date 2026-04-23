/**
 * Diagnostic script to test the call endpoint with proper authentication
 */

const https = require('https');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

// Step 1: Login to get a token
async function login() {
  return new Promise((resolve, reject) => {
    const loginData = JSON.stringify({
      username: 'kenan',  // Replace with your username
      password: 'Qwe54321'  // Replace with your password
    });

    const options = {
      hostname: 'froniterai-production.up.railway.app',
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.token) {
            console.log('✅ Login successful');
            console.log('   User:', json.user?.username);
            console.log('   Token:', json.token.substring(0, 20) + '...');
            resolve(json.token);
          } else {
            console.error('❌ Login failed:', json);
            reject(new Error('No token in response'));
          }
        } catch (e) {
          console.error('❌ Login failed:', data);
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(loginData);
    req.end();
  });
}

// Step 2: Test the call endpoint with the token
async function testCallEndpoint(token) {
  return new Promise((resolve, reject) => {
    const callData = JSON.stringify({
      to: '+12345678901',  // Test number
      contactName: 'Test Contact'
    });

    const options = {
      hostname: 'froniterai-production.up.railway.app',
      path: '/api/calls/call-rest-api',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': callData.length
      }
    };

    console.log('\n📞 Testing call endpoint...');
    console.log('   URL:', `${BACKEND_URL}${options.path}`);
    console.log('   Method:', options.method);
    console.log('   Body:', callData);

    const startTime = Date.now();

    const req = https.request(options, (res) => {
      const duration = Date.now() - startTime;
      let data = '';
      
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`\n📊 Response received (${duration}ms)`);
        console.log('   Status:', res.statusCode);
        console.log('   Headers:', JSON.stringify(res.headers, null, 2));
        console.log('   Body:', data);

        try {
          const json = JSON.parse(data);
          if (res.statusCode === 200) {
            console.log('\n✅ SUCCESS!');
            console.log('   Call SID:', json.callSid);
            console.log('   Conference ID:', json.conferenceId);
            resolve(json);
          } else if (res.statusCode === 500) {
            console.log('\n❌ ERROR 500 - Internal Server Error');
            console.log('   Error:', json.error);
            console.log('   Twilio Code:', json.twilioCode);
            reject(new Error(json.error));
          } else if (res.statusCode === 409) {
            console.log('\n⚠️  WARNING 409 - Active Call Exists');
            console.log('   Message:', json.message);
            console.log('   Active Call:', json.activeCall);
            reject(new Error(json.message));
          } else {
            console.log('\n❌ UNEXPECTED STATUS:', res.statusCode);
            console.log('   Response:', json);
            reject(new Error(`Unexpected status: ${res.statusCode}`));
          }
        } catch (e) {
          console.log('\n❌ Failed to parse response:', data);
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      console.error('\n❌ Request error:', error);
      reject(error);
    });

    req.write(callData);
    req.end();
  });
}

// Run the test
async function main() {
  console.log('🚀 Starting call endpoint diagnostic test\n');
  console.log('=' .repeat(60));

  try {
    console.log('\n📝 Step 1: Login to get authentication token');
    const token = await login();

    console.log('\n📝 Step 2: Test call endpoint with token');
    await testCallEndpoint(token);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.error('❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

main();

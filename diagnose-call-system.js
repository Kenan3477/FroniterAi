/**
 * Comprehensive Call System Diagnostic
 * Tests all layers: Frontend → Next.js Proxy → Railway Backend → Twilio
 */

const https = require('https');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';
const TEST_NUMBER = '+441914839995'; // Test landline number
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUwOSwidXNlcm5hbWUiOiJLZW5hbiIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiS2VuYW5AdGVzdC5vbW5pdm94LmFpIiwiaWF0IjoxNzc3Mjg2NDcxLCJleHAiOjE3NzczNzI4NzF9.IBwS1qr19I6mDzCTQrl3e2kWI-x2X8rncqk1GAImOmQ';

console.log('🔍 OMNIVOX CALL SYSTEM DIAGNOSTIC');
console.log('='.repeat(60));
console.log('');

async function makeRequest(path, method, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    };

    if (data) {
      const body = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function runDiagnostic() {
  console.log('📍 Step 1: Testing Backend Health');
  console.log('-'.repeat(60));
  
  try {
    const healthCheck = await makeRequest('/health', 'GET');
    console.log('✅ Backend Status:', healthCheck.status);
    console.log('✅ Backend Response:', JSON.stringify(healthCheck.data, null, 2));
  } catch (error) {
    console.error('❌ Backend Health Check Failed:', error.message);
    return;
  }
  
  console.log('');
  console.log('📍 Step 2: Testing Authentication');
  console.log('-'.repeat(60));
  
  try {
    const authTest = await makeRequest('/api/auth/me', 'GET');
    console.log('✅ Auth Status:', authTest.status);
    console.log('✅ User Info:', JSON.stringify(authTest.data, null, 2));
  } catch (error) {
    console.error('❌ Auth Test Failed:', error.message);
  }
  
  console.log('');
  console.log('📍 Step 3: Testing Twilio Token Generation');
  console.log('-'.repeat(60));
  
  try {
    const tokenTest = await makeRequest('/api/calls/token', 'POST', {
      identity: 'test-agent-509'
    });
    console.log('✅ Token Status:', tokenTest.status);
    console.log('✅ Token Response:', tokenTest.data.success ? 'Token generated successfully' : tokenTest.data);
  } catch (error) {
    console.error('❌ Token Generation Failed:', error.message);
  }
  
  console.log('');
  console.log('📍 Step 4: Testing Call Initiation Endpoint');
  console.log('-'.repeat(60));
  
  try {
    const callTest = await makeRequest('/api/calls/call-rest-api', 'POST', {
      to: TEST_NUMBER,
      campaignId: 'DAC',
      campaignName: 'Diagnostic Test Campaign'
    });
    
    console.log('✅ Call Request Status:', callTest.status);
    console.log('✅ Call Response:', JSON.stringify(callTest.data, null, 2));
    
    if (callTest.data.success) {
      console.log('');
      console.log('🎉 CALL INITIATED SUCCESSFULLY!');
      console.log('   Call SID:', callTest.data.callSid);
      console.log('   Conference ID:', callTest.data.conferenceId);
      console.log('   Status:', callTest.data.status);
      
      // Wait 5 seconds and check call status
      console.log('');
      console.log('⏳ Waiting 5 seconds to check call status...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('');
      console.log('📍 Step 5: Checking Call Status');
      console.log('-'.repeat(60));
      
      const statusTest = await makeRequest(`/api/calls/status/${callTest.data.callSid}`, 'GET');
      console.log('✅ Status Check:', JSON.stringify(statusTest.data, null, 2));
      
    } else {
      console.log('');
      console.log('❌ CALL INITIATION FAILED');
      console.log('   Error:', callTest.data.error);
      console.log('   Details:', callTest.data.details || 'None');
    }
    
  } catch (error) {
    console.error('❌ Call Initiation Test Failed:', error.message);
    console.error('   Stack:', error.stack);
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('🏁 DIAGNOSTIC COMPLETE');
  console.log('='.repeat(60));
}

// Run diagnostic
runDiagnostic().catch(error => {
  console.error('💥 DIAGNOSTIC CRASHED:', error);
  process.exit(1);
});

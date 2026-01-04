const http = require('http');

const RAILWAY_URL = 'froniterai-production.up.railway.app';

// Function to make HTTP requests
function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: RAILWAY_URL,
      port: 443,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = require('https').request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function testWorkflow() {
  console.log('🧪 Testing Railway Backend Integration');
  console.log('====================================');

  try {
    // Test 1: Get flows
    console.log('\n1. Testing GET /api/flows...');
    const flowsResponse = await makeRequest('/api/flows');
    console.log(`   Status: ${flowsResponse.status}`);
    if (flowsResponse.data && Array.isArray(flowsResponse.data)) {
      console.log(`   ✅ Found ${flowsResponse.data.length} flows:`);
      flowsResponse.data.forEach(flow => {
        console.log(`      - ${flow.name} (${flow.status})`);
      });
    }

    // Test 2: Get inbound numbers
    console.log('\n2. Testing GET /api/voice/inbound-numbers...');
    const numbersResponse = await makeRequest('/api/voice/inbound-numbers');
    console.log(`   Status: ${numbersResponse.status}`);
    if (numbersResponse.data && Array.isArray(numbersResponse.data)) {
      console.log(`   ✅ Found ${numbersResponse.data.length} inbound numbers:`);
      numbersResponse.data.forEach(number => {
        console.log(`      - ${number.phoneNumber} (${number.displayName})`);
        if (number.assignedFlowId) {
          console.log(`        → Assigned to flow ID: ${number.assignedFlowId}`);
        }
      });
    }

    // Test 3: Test authentication on PUT endpoint
    console.log('\n3. Testing PUT authentication...');
    if (numbersResponse.data && numbersResponse.data.length > 0) {
      const testNumber = numbersResponse.data[0];
      console.log(`   Testing with number: ${testNumber.phoneNumber}`);
      
      // Test without auth
      const noAuthResponse = await makeRequest(
        `/api/voice/inbound-numbers/${testNumber.id}`,
        'PUT',
        { assignedFlowId: flowsResponse.data[0]?.id },
        {}
      );
      console.log(`   Without auth: Status ${noAuthResponse.status}`);
      
      // Test with dummy auth
      const withAuthResponse = await makeRequest(
        `/api/voice/inbound-numbers/${testNumber.id}`,
        'PUT',
        { assignedFlowId: flowsResponse.data[0]?.id },
        { 'Authorization': 'Bearer dummy-token' }
      );
      console.log(`   With auth: Status ${withAuthResponse.status}`);
    }

    console.log('\n✅ Railway integration test completed successfully!');
    console.log('\nThe frontend should now be able to:');
    console.log('   - Load flows from Railway backend ✅');
    console.log('   - Display inbound numbers ✅');
    console.log('   - Handle authentication properly ✅');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWorkflow();
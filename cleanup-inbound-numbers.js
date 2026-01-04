const https = require('https');

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

    const req = https.request(options, (res) => {
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

async function cleanupInboundNumbers() {
  console.log('🧹 Cleaning Up Inbound Numbers Database');
  console.log('=====================================');
  console.log('🎯 Goal: Keep only the real Twilio number +442046343130');
  console.log('❌ Remove: Test/placeholder numbers');
  console.log('');

  try {
    // Step 1: Authenticate
    console.log('1. Authenticating...');
    const authResponse = await makeRequest('/api/auth/login', 'POST', {
      email: 'admin@omnivox-ai.com',
      password: 'OmnivoxAdmin2025!'
    });
    
    if (authResponse.status !== 200 || !authResponse.data.success) {
      console.log('❌ Authentication failed');
      return;
    }
    
    const authToken = authResponse.data.data.token;
    console.log('✅ Authentication successful!');

    // Step 2: Get current inbound numbers
    console.log('\n2. Fetching current inbound numbers...');
    const numbersResponse = await makeRequest('/api/voice/inbound-numbers', 'GET', null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (numbersResponse.status !== 200) {
      console.log('❌ Failed to fetch inbound numbers');
      return;
    }

    const numbers = numbersResponse.data.data || numbersResponse.data;
    console.log(`📊 Found ${numbers.length} inbound numbers:`);
    
    // Keep track of the real Twilio number and numbers to delete
    let realTwilioNumber = null;
    const numbersToDelete = [];
    
    numbers.forEach((number, index) => {
      console.log(`   ${index + 1}. ${number.phoneNumber} (${number.displayName})`);
      
      if (number.phoneNumber === '+442046343130') {
        realTwilioNumber = number;
        console.log('       ✅ KEEPING - This is your real Twilio number');
      } else {
        numbersToDelete.push(number);
        console.log('       ❌ REMOVING - Test/placeholder number');
      }
    });

    if (!realTwilioNumber) {
      console.log('\n⚠️  WARNING: Real Twilio number +442046343130 not found in database!');
      return;
    }

    console.log(`\n📋 Summary:`);
    console.log(`   ✅ Keeping: ${realTwilioNumber.phoneNumber} (${realTwilioNumber.displayName})`);
    console.log(`   ❌ Removing: ${numbersToDelete.length} test numbers`);

    // Step 3: Delete test numbers (Note: This requires a DELETE endpoint)
    // Since we don't have a direct delete endpoint, let's check what endpoints are available
    console.log('\n3. Checking available cleanup methods...');
    
    // Let's try to understand the backend structure first
    console.log('📡 Backend is running on Railway - cleanup would need to be done via database');
    console.log('🔧 Creating database cleanup script instead...');

    // Step 4: Create a database cleanup script
    console.log('\n4. Database cleanup approach:');
    console.log('   We need to remove these test numbers from the Railway database:');
    numbersToDelete.forEach(number => {
      console.log(`   - ${number.phoneNumber} (ID: ${number.id})`);
    });
    
    console.log('\n✅ Analysis complete!');
    console.log('📋 Next steps:');
    console.log('   1. Create database cleanup script for Railway');
    console.log('   2. Remove test inbound numbers directly from database');
    console.log('   3. Keep only +442046343130 as the sole inbound number');

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

cleanupInboundNumbers();
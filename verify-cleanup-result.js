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

async function verifyCleanupResult() {
  console.log('✅ VERIFYING: Only Real Twilio Number Remains');
  console.log('============================================');

  try {
    // Authenticate
    const authResponse = await makeRequest('/api/auth/login', 'POST', {
      email: 'admin@omnivox-ai.com',
      password: 'OmnivoxAdmin2025!'
    });
    
    const authToken = authResponse.data.data.token;
    console.log('🔑 Authenticated successfully');

    // Get inbound numbers
    const numbersResponse = await makeRequest('/api/voice/inbound-numbers', 'GET', null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    console.log('\n📞 INBOUND NUMBERS VERIFICATION:');
    console.log('==============================');
    
    if (numbersResponse.status === 200) {
      const data = numbersResponse.data.data || numbersResponse.data;
      console.log(`📊 Total numbers in system: ${data.length}`);
      
      if (data.length === 1 && data[0].phoneNumber === '+442046343130') {
        console.log('✅ SUCCESS: Only your real Twilio number remains!');
        console.log('');
        console.log('📱 Your Twilio Number Details:');
        console.log(`   📞 Phone: ${data[0].phoneNumber}`);
        console.log(`   🏷️  Name: ${data[0].displayName}`);
        console.log(`   🌍 Country: ${data[0].country}`);
        console.log(`   📍 Region: ${data[0].region}`);
        console.log(`   📡 Provider: ${data[0].provider}`);
        console.log(`   ✅ Active: ${data[0].isActive}`);
        console.log(`   🏢 Type: ${data[0].numberType}`);
        
        const capabilities = Array.isArray(data[0].capabilities) ? data[0].capabilities.join(', ') : data[0].capabilities;
        console.log(`   🔧 Capabilities: ${capabilities}`);
        
        if (data[0].assignedFlowId) {
          console.log(`   🌊 Assigned Flow: ${data[0].assignedFlowId}`);
        } else {
          console.log(`   🌊 Assigned Flow: None (ready for assignment)`);
        }
        
        console.log('');
        console.log('🎯 CLEANUP VERIFICATION: COMPLETE ✅');
        console.log('✅ Test numbers removed');
        console.log('✅ Real Twilio number preserved');
        console.log('✅ Frontend will show only your number');
        
      } else {
        console.log('⚠️  ISSUE: Unexpected number configuration');
        data.forEach((number, index) => {
          console.log(`   ${index + 1}. ${number.phoneNumber} (${number.displayName})`);
        });
      }
    } else {
      console.log('❌ Failed to fetch inbound numbers');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

verifyCleanupResult();
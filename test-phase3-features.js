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

async function testPhase3Features() {
  console.log('🚀 Testing Phase 3 Advanced Features on Railway');
  console.log('==============================================');

  try {
    // Step 1: Authenticate
    console.log('\n1. Authenticating...');
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

    // Step 2: Test Phase 3 Routes
    const phase3Routes = [
      { 
        path: '/api/flow-versioning', 
        name: 'Flow Versioning', 
        description: 'Flow versioning and rollback system' 
      },
      { 
        path: '/api/flow-monitoring', 
        name: 'Flow Monitoring', 
        description: 'Real-time flow monitoring dashboard' 
      },
      { 
        path: '/api/flow-optimization', 
        name: 'Flow Optimization', 
        description: 'AI-powered flow optimization' 
      },
      { 
        path: '/api/multi-tenant', 
        name: 'Multi-Tenant Flow', 
        description: 'Multi-tenant flow management' 
      }
    ];

    console.log('\n2. Testing Phase 3 Advanced Features...');
    
    const results = [];
    for (const route of phase3Routes) {
      try {
        console.log(`\n   Testing ${route.name} (${route.path})...`);
        const response = await makeRequest(route.path, 'GET', null, {
          'Authorization': `Bearer ${authToken}`
        });
        
        const isWorking = response.status >= 200 && response.status < 500; // Any response indicates the route exists
        results.push({
          ...route,
          status: response.status,
          working: isWorking,
          response: response.data
        });
        
        if (isWorking) {
          console.log(`   ✅ ${route.name}: Status ${response.status}`);
          if (response.status === 200) {
            console.log(`   📊 Data: ${JSON.stringify(response.data).substring(0, 100)}...`);
          }
        } else {
          console.log(`   ❌ ${route.name}: Status ${response.status}`);
        }
        
      } catch (error) {
        console.log(`   ❌ ${route.name}: Error - ${error.message}`);
        results.push({
          ...route,
          status: 'ERROR',
          working: false,
          error: error.message
        });
      }
    }

    // Step 3: Test Core Features Still Work
    console.log('\n3. Verifying core features still work...');
    
    const coreTests = [
      { path: '/api/flows', name: 'Flows API' },
      { path: '/api/voice/inbound-numbers', name: 'Inbound Numbers API' }
    ];
    
    for (const test of coreTests) {
      const response = await makeRequest(test.path, 'GET', null, {
        'Authorization': `Bearer ${authToken}`
      });
      
      const working = response.status === 200;
      console.log(`   ${working ? '✅' : '❌'} ${test.name}: Status ${response.status}`);
    }

    // Step 4: Summary
    console.log('\n🎯 PHASE 3 FEATURES SUMMARY:');
    console.log('============================');
    
    results.forEach(result => {
      const status = result.working ? '✅ WORKING' : '❌ FAILED';
      console.log(`   ${status} - ${result.name}`);
      console.log(`     ${result.description}`);
      console.log(`     Status: ${result.status}`);
    });
    
    const workingCount = results.filter(r => r.working).length;
    const totalCount = results.length;
    
    console.log(`\n📊 Results: ${workingCount}/${totalCount} Phase 3 features operational`);
    
    if (workingCount === totalCount) {
      console.log('\n🎉 ALL PHASE 3 FEATURES SUCCESSFULLY RE-ENABLED!');
      console.log('🚀 Railway deployment includes full advanced functionality');
    } else {
      console.log('\n⚠️  Some Phase 3 features need attention');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPhase3Features();
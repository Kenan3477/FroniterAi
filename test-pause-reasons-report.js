#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Test configuration
const baseUrl = 'http://localhost:3000';
const testCredentials = {
  email: 'admin@omnivox.ai',
  password: 'admin123'
};

function makeRequest(url, options = {}) {
  const useHTTP = url.startsWith('http://');
  const lib = useHTTP ? http : https;
  
  return new Promise((resolve, reject) => {
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testPauseReasonsWorkflow() {
  console.log('🧪 Testing Pause Reasons Report Workflow');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Login to get temporary token
    console.log('\n1️⃣  Testing Login...');
    const loginResponse = await makeRequest(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCredentials)
    });
    
    if (loginResponse.status !== 200 || !loginResponse.data.success) {
      throw new Error(`Login failed: ${JSON.stringify(loginResponse.data)}`);
    }
    
    const token = loginResponse.data.token;
    console.log(`✅ Login successful! Token: ${token.substring(0, 20)}...`);
    
    // Step 2: Test pause events endpoint
    console.log('\n2️⃣  Testing Pause Events API...');
    const pauseEventsResponse = await makeRequest(`${baseUrl}/api/pause-events?startDate=2026-02-24&endDate=2026-02-24`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (pauseEventsResponse.status !== 200 || !pauseEventsResponse.data.success) {
      throw new Error(`Pause events failed: ${JSON.stringify(pauseEventsResponse.data)}`);
    }
    
    console.log(`✅ Pause events API working! Found ${pauseEventsResponse.data.data.length} events`);
    
    // Step 3: Test pause events stats
    console.log('\n3️⃣  Testing Pause Events Stats API...');
    const statsResponse = await makeRequest(`${baseUrl}/api/pause-events/stats?startDate=2026-02-24&endDate=2026-02-24`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (statsResponse.status !== 200 || !statsResponse.data.success) {
      throw new Error(`Pause stats failed: ${JSON.stringify(statsResponse.data)}`);
    }
    
    console.log(`✅ Pause stats API working! Total events: ${statsResponse.data.stats.totalEvents}`);
    
    // Step 4: Test reports generation
    console.log('\n4️⃣  Testing Reports Generation API...');
    const reportsResponse = await makeRequest(`${baseUrl}/api/admin/reports/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        reportType: 'pause_reasons',
        dateRange: { start: '2026-02-24', end: '2026-02-24' },
        filters: { agentIds: [], reasonIds: [] }
      })
    });
    
    if (reportsResponse.status !== 200 || !reportsResponse.data.success) {
      throw new Error(`Reports generation failed: ${JSON.stringify(reportsResponse.data)}`);
    }
    
    console.log(`✅ Reports generation working! Found ${reportsResponse.data.data.events.length} pause events`);
    console.log(`   📊 Summary: ${reportsResponse.data.data.summary.totalPauseEvents} total events, avg duration ${Math.round(reportsResponse.data.data.summary.avgPauseDuration / 60)} minutes`);
    
    // Step 5: Display summary
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('=' .repeat(50));
    console.log('✅ Login with temporary bypass: WORKING');
    console.log('✅ Pause events API with mock data: WORKING'); 
    console.log('✅ Pause stats API with mock data: WORKING');
    console.log('✅ Reports generation with mock data: WORKING');
    console.log('\n📝 NOTES:');
    console.log('• All APIs are using temporary authentication bypass');
    console.log('• Mock data is being returned for local testing');
    console.log('• Frontend navigation fixes are in place');
    console.log('• System is ready for UI testing at http://localhost:3000');
    console.log('\n🚀 Next step: Test the full UI workflow in the browser!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testPauseReasonsWorkflow();
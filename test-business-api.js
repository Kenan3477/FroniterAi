const http = require('http');

console.log('Testing Business Settings API...\n');

// Test health endpoint first
const healthOptions = {
  hostname: 'localhost',
  port: 3004,
  path: '/health',
  method: 'GET'
};

const healthReq = http.request(healthOptions, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Health Check Status:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('Health Data:', parsed);
      testBusinessSettings();
    } catch (e) {
      console.log('Health Raw:', data);
      testBusinessSettings();
    }
  });
});

healthReq.on('error', (err) => {
  console.log('Health Check Error:', err.message);
});

healthReq.end();

function testBusinessSettings() {
  console.log('\nTesting Business Settings Organizations...');
  
  const orgOptions = {
    hostname: 'localhost',
    port: 3004,
    path: '/api/admin/business-settings/organizations',
    method: 'GET'
  };

  const orgReq = http.request(orgOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Organizations Status:', res.statusCode);
      console.log('Organizations Data:', data);
      testDashboard();
    });
  });

  orgReq.on('error', (err) => {
    console.log('Organizations Error:', err.message);
    testDashboard();
  });

  orgReq.end();
}

function testDashboard() {
  console.log('\nTesting Business Settings Dashboard...');
  
  const dashOptions = {
    hostname: 'localhost',
    port: 3004,
    path: '/api/admin/business-settings/dashboard',
    method: 'GET'
  };

  const dashReq = http.request(dashOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Dashboard Status:', res.statusCode);
      console.log('Dashboard Data:', data);
      console.log('\n✅ API Tests Complete!');
    });
  });

  dashReq.on('error', (err) => {
    console.log('Dashboard Error:', err.message);
    console.log('\n✅ API Tests Complete!');
  });

  dashReq.end();
}
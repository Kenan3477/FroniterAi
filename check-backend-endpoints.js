#!/usr/bin/env node
require('dotenv').config();

const https = require('https');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: res.headers['content-type']?.includes('application/json') ? JSON.parse(data) : data
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
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

async function checkBackendStatus() {
  console.log('🔍 Checking backend status and available endpoints...');
  
  try {
    // Test health endpoint
    const healthResponse = await makeRequest(`${BACKEND_URL}/health`, {
      method: 'GET'
    });
    
    console.log('\n💚 Backend Health Check:');
    console.log(`   Status: ${healthResponse.status}`);
    console.log('   Response:', healthResponse.data);
    
    // Test existing endpoints that should work
    const existingEndpoints = [
      { method: 'GET', path: '/api/admin/users', description: 'Get all users (should work)' },
      { method: 'POST', path: '/api/admin/users', description: 'Create user (should work)' },
      { method: 'GET', path: '/api/auth/login', description: 'Login page (should work)' }
    ];
    
    console.log('\n🔗 Testing known working endpoints:');
    
    for (const endpoint of existingEndpoints) {
      try {
        const response = await makeRequest(`${BACKEND_URL}${endpoint.path}`, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`   ${endpoint.method} ${endpoint.path}: ${response.status}`);
        
        if (response.status === 405) {
          console.log(`     ✅ Endpoint exists but method not allowed (expected for ${endpoint.method})`);
        } else if (response.status === 401 || response.status === 403) {
          console.log(`     ✅ Endpoint exists but requires authentication`);
        } else if (response.status === 404) {
          console.log(`     ❌ Endpoint not found - route not registered`);
        } else {
          console.log(`     ✅ Endpoint responding with status ${response.status}`);
        }
        
      } catch (error) {
        console.log(`     💥 Error: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Test the new endpoints we just added
    console.log('\n🆕 Testing newly added endpoints:');
    
    const newEndpoints = [
      { method: 'PUT', path: '/api/admin/users/123', description: 'Admin update user' },
      { method: 'POST', path: '/api/users/change-password', description: 'Change password' },
      { method: 'PUT', path: '/api/users/profile', description: 'Update profile' }
    ];
    
    for (const endpoint of newEndpoints) {
      try {
        const response = await makeRequest(`${BACKEND_URL}${endpoint.path}`, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ test: true })
        });
        
        console.log(`   ${endpoint.method} ${endpoint.path}: ${response.status}`);
        
        if (response.status === 404) {
          console.log(`     ❌ NEW ENDPOINT NOT FOUND - Route not registered properly`);
        } else if (response.status === 401 || response.status === 403) {
          console.log(`     ✅ NEW ENDPOINT EXISTS - Requires authentication (good!)`);
        } else if (response.status === 400) {
          console.log(`     ✅ NEW ENDPOINT EXISTS - Bad request (expected with test data)`);
        } else {
          console.log(`     ✅ NEW ENDPOINT EXISTS - Status ${response.status}`);
        }
        
      } catch (error) {
        console.log(`     💥 Error: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
  } catch (error) {
    console.error('❌ Backend health check failed:', error.message);
  }
}

async function main() {
  console.log('🔧 BACKEND ENDPOINT DIAGNOSIS');
  console.log('=============================');
  
  await checkBackendStatus();
  
  console.log('\n🎯 DIAGNOSIS COMPLETE');
  console.log('\nIf new endpoints return 404:');
  console.log('1. Backend server needs restart to load new routes');
  console.log('2. Route registration may have syntax errors');
  console.log('3. Routes may not be properly exported');
  console.log('4. Railway deployment may need to be triggered');
}

main().catch(console.error);
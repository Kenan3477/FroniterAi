#!/usr/bin/env node

/**
 * Check actual admin password hash in database
 */

const https = require('https');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function checkPasswordHash() {
  console.log('🔍 Checking admin password hash...');
  
  // First unlock the account
  console.log('🔓 Unlocking account first...');
  await makeRequest(`${BACKEND_URL}/api/emergency/emergency-unlock/admin%40omnivox-ai.com`, {
    method: 'POST'
  });
  
  console.log('⏳ Waiting 3 seconds...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Get user info to see the password hash
  const userResponse = await makeRequest(`${BACKEND_URL}/api/emergency/user-info/admin%40omnivox-ai.com?includeHash=true`, {
    method: 'GET'
  });
  
  if (userResponse.status === 200) {
    const userData = JSON.parse(userResponse.data);
    console.log('User data:', JSON.stringify(userData, null, 2));
  } else {
    console.log('Failed to get user data:', userResponse.data);
  }
}

checkPasswordHash().catch(console.error);
/**
 * Check Railway database users
 */

const https = require('https');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'GET'
    };

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
            data: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function testLogin(username, password) {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/auth/login', BACKEND_URL);
    const data = JSON.stringify({ username, password });

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

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
            data: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🔍 Testing Railway backend authentication...');
  console.log('');
  
  const testAccounts = [
    { username: 'admin', password: 'SecureAdmin2025!@#$%^' },
    { username: 'ken', password: 'SecureAdmin2025!@#$%^' },
    { username: 'Kenan', password: 'SecureAdmin2025!@#$%^' },
    { username: 'demo', password: 'SecureDemo2025!@#' },
  ];
  
  for (const account of testAccounts) {
    console.log(`Testing ${account.username}...`);
    try {
      const result = await testLogin(account.username, account.password);
      if (result.status === 200 && result.data.success) {
        console.log(`✅ SUCCESS for ${account.username}!`);
        console.log(`   Token: ${result.data.token}`);
        console.log('');
        return result.data.token;
      } else {
        console.log(`❌ Failed for ${account.username}: ${result.data.message}`);
      }
    } catch (error) {
      console.log(`💥 Error for ${account.username}: ${error.message}`);
    }
  }
  
  console.log('');
  console.log('❌ No valid credentials found');
}

main();

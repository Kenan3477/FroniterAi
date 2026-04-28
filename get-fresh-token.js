/**
 * Get a fresh auth token from the backend
 */

const https = require('https');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function login() {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/auth/login', BACKEND_URL);
    const data = JSON.stringify({
      username: 'ken',
      password: 'SecureAdmin2025!@#$%^'
    });

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
  console.log('🔐 Logging in to get fresh token...');
  
  try {
    const response = await login();
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Login successful!');
      console.log('');
      console.log('👤 User:', response.data.user.username);
      console.log('🎫 Token:', response.data.token);
      console.log('');
      console.log('📋 Copy this token for testing:');
      console.log(response.data.token);
    } else {
      console.log('❌ Login failed:',response.status);
      console.log(JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.error('💥 Login error:', error.message);
  }
}

main();

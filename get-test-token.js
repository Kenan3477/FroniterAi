/**
 * Get test token from Railway backend
 */

const https = require('https');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function getTestToken() {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/test/get-token', BACKEND_URL);
    const data = JSON.stringify({
      userId: 509,
      username: 'Kenan',
      role: 'ADMIN'
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
  console.log('🎫 Getting test token from Railway...');
  console.log('');
  
  try {
    const response = await getTestToken();
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Token generated successfully!');
      console.log('');
      console.log('📋 Token:', response.data.token);
      console.log('');
      console.log('👤 Decoded:', JSON.stringify(response.data.decoded, null, 2));
      console.log('');
      console.log('⏰ Expires in:', response.data.expiresIn);
      console.log('');
      console.log('⚠️ ', response.data.warning);
      
      return response.data.token;
    } else {
      console.log('❌ Failed to get token:');
      console.log(JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

main();

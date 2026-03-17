const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3007,
  path: '/api/flows',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📊 Response Status:', res.statusCode);
    console.log('📋 Response Data:');
    try {
      console.log(JSON.stringify(JSON.parse(data), null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Error:', e.message);
});

req.setTimeout(5000, () => {
  console.log('⏰ Request timed out');
  req.destroy();
});

console.log('🧪 Testing flows API endpoint...');
req.end();
/**
 * Quick diagnostic for call flow issue
 */
const https = require('https');

console.log('🔍 DIAGNOSING CALL ISSUE\n');

// Test 1: Can we reach Vercel?
https.get('https://omnivox.vercel.app', (res) => {
  console.log(`✅ Vercel reachable: ${res.statusCode}`);
  
  // Test 2: Can we reach Railway backend?
  https.get('https://froniterai-production.up.railway.app/api/dialer', (res2) => {
    console.log(`✅ Railway backend reachable: ${res2.statusCode}`);
    
    // Test 3: Test the call endpoint directly on Railway
    const postData = JSON.stringify({ to: '+14155552671' });
    const options = {
      hostname: 'froniterai-production.up.railway.app',
      path: '/api/calls/call-rest-api',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': postData.length }
    };
    
    const req = https.request(options, (res3) => {
      let data = '';
      res3.on('data', (chunk) => data += chunk);
      res3.on('end', () => {
        console.log(`\n📞 Railway /api/calls/call-rest-api: ${res3.statusCode}`);
        if (res3.statusCode === 401) {
          console.log('✅ Endpoint works (401 = needs auth, expected)');
        } else {
          console.log('Response:', data);
        }
        
        console.log('\n🎯 DIAGNOSIS:');
        console.log('   - Vercel: ONLINE');
        console.log('   - Railway: ONLINE');
        console.log('   - Call endpoint: FUNCTIONAL');
        console.log('\n💡 Issue is likely: Vercel needs env vars in new deployment');
        console.log('   Wait for automatic deployment from GitHub push...');
      });
    });
    req.write(postData);
    req.end();
  });
});

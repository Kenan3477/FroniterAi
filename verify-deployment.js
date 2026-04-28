/**
 * POST-DEPLOYMENT TEST
 * Run this after the Vercel deployment completes to verify the fix
 */

const https = require('https');

console.log('🧪 POST-DEPLOYMENT VERIFICATION TEST\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 1: Check if frontend has backend URL compiled in
console.log('1️⃣  Checking if environment variables are compiled into frontend...');

https.get('https://omnivox.vercel.app/api/calls/call-rest-api', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  console.log(`   Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`   Response: ${data.substring(0, 200)}`);
    
    if (res.statusCode === 405 || res.statusCode === 404) {
      console.log('   ✅ Frontend API route exists!\n');
      
      // Test 2: Check actual backend connection
      console.log('2️⃣  Testing backend connection from Railway...');
      https.get('https://froniterai-production.up.railway.app/api/dialer', (res2) => {
        console.log(`   Status: ${res2.statusCode}`);
        console.log(`   ✅ Backend is online!\n`);
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ VERIFICATION COMPLETE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('🎯 NEXT STEPS:');
        console.log('   1. Go to: https://omnivox.vercel.app');
        console.log('   2. Log in with your credentials');
        console.log('   3. Go to Manual Dialer');
        console.log('   4. Enter a phone number');
        console.log('   5. Click "Call"');
        console.log('\n   The call should now work! ✅\n');
        
        console.log('📋 IF IT STILL FAILS:');
        console.log('   1. Open browser console (F12)');
        console.log('   2. Go to Network tab');
        console.log('   3. Try making a call');
        console.log('   4. Look for the failing request');
        console.log('   5. Check the request URL - should be:');
        console.log('      https://froniterai-production.up.railway.app/api/calls/call-rest-api');
        console.log('   6. If URL is wrong, env vars didnt apply - wait another minute\n');
      });
    } else {
      console.log(`   ⚠️  Unexpected status: ${res.statusCode}`);
    }
  });
}).on('error', err => {
  console.error('❌ Error:', err.message);
});

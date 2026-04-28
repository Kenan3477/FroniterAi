/**
 * Test what NEXT_PUBLIC_BACKEND_URL value the deployed frontend has
 */

const https = require('https');

console.log('🔍 CHECKING WHAT BACKEND_URL THE FRONTEND IS USING\n');

// Method 1: Check the _next/static build manifest
https.get('https://omnivox.vercel.app/_next/static/chunks/pages/_app.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Look for backend URL patterns in the compiled JS
    const backendUrlMatches = data.match(/(https?:\/\/[^"'\s]+railway[^"'\s]*)/gi);
    const apiUrlMatches = data.match(/NEXT_PUBLIC_BACKEND_URL|NEXT_PUBLIC_API_URL/gi);
    
    console.log('📦 Checking compiled frontend JavaScript...\n');
    
    if (backendUrlMatches && backendUrlMatches.length > 0) {
      console.log('✅ FOUND Backend URL in compiled code:');
      console.log('   ' + [...new Set(backendUrlMatches)].join('\n   '));
    } else {
      console.log('❌ NO Backend URL found in compiled code');
      console.log('   This means env vars are NOT being used!');
    }
    
    if (apiUrlMatches && apiUrlMatches.length > 0) {
      console.log('\n⚠️  Found environment variable names in code (should be compiled out):');
      console.log('   ' + [...new Set(apiUrlMatches)].join('\n   '));
    }
  });
}).on('error', err => {
  console.error('Error:', err.message);
  
  // Alternative method: Check the API route
  console.log('\n📡 Testing frontend API route directly...\n');
  
  https.get('https://omnivox.vercel.app/api/health', (res) => {
    console.log(`Status: ${res.statusCode}`);
  }).on('error', err2 => {
    console.error('Error:', err2.message);
  });
});

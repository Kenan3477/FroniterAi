#!/usr/bin/env node

async function debugFrontendAPI() {
  console.log('🔍 Debugging frontend API endpoints...\n');

  const endpoints = [
    'https://froniterai-production.up.railway.app/api/call-records',
    'https://froniterai-production.up.railway.app/api/calls-twiml/call-records', 
    'https://omnivox-ai.vercel.app/api/call-records'
  ];

  for (const endpoint of endpoints) {
    console.log(`\n🌐 Testing: ${endpoint}`);
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      console.log(`Status: ${response.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
      
      if (data.data && Array.isArray(data.data)) {
        console.log(`📊 Records found: ${data.data.length}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  // Also test if there are any caching headers or database connection issues
  console.log('\n🔍 Additional debugging...');
  console.log('The frontend might be:');
  console.log('1. Using cached data');
  console.log('2. Connected to a different database');
  console.log('3. Using local storage');
  console.log('4. Pulling from a different API endpoint');
  
  console.log('\n💡 Recommendations:');
  console.log('1. Clear browser cache/cookies');
  console.log('2. Hard refresh the frontend (Cmd+Shift+R)');
  console.log('3. Check if frontend has separate environment variables');
  console.log('4. Verify the frontend is pointing to Railway backend');
}

debugFrontendAPI().catch(console.error);
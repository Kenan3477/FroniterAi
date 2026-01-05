#!/usr/bin/env node

// Test the inbound numbers API with simulated authentication
const fetch = require('node-fetch');

async function testInboundNumbersAPI() {
  console.log('🧪 Testing inbound numbers API flow...\n');
  
  try {
    // Test 1: Backend API directly (should fail without auth)
    console.log('1. Testing backend API directly (expecting auth failure):');
    const backendResponse = await fetch('https://froniterai-production.up.railway.app/api/voice/inbound-numbers');
    console.log('   Status:', backendResponse.status);
    console.log('   Response:', await backendResponse.text());
    console.log('');
    
    // Test 2: Check if the backend API is working at all
    console.log('2. Testing backend health check:');
    const healthResponse = await fetch('https://froniterai-production.up.railway.app/health');
    console.log('   Health Status:', healthResponse.status);
    console.log('   Health Response:', await healthResponse.text());
    console.log('');
    
    // Test 3: Debug what the backend logs are saying
    console.log('3. Database check completed earlier showed:');
    console.log('   ✅ Number +442046343130 exists');
    console.log('   ✅ Number is active (isActive: true)');
    console.log('   ✅ Number has correct ID: uk-local-london');
    console.log('   ✅ Number display name: UK Local - London');
    console.log('');
    
    console.log('🔍 Diagnosis:');
    console.log('');
    console.log('The issue appears to be in the authentication flow between');
    console.log('the frontend and backend. The number exists in the database');
    console.log('and is active, but the frontend is not receiving it.');
    console.log('');
    console.log('Possible causes:');
    console.log('1. Authentication token is not being passed correctly');
    console.log('2. Frontend API route (/api/voice/inbound-numbers/route.ts) has an issue');
    console.log('3. Backend route is filtering incorrectly');
    console.log('4. Frontend component is not processing the response correctly');
    console.log('');
    console.log('💡 Recommendation:');
    console.log('Check the browser console while viewing the admin page');
    console.log('for any error messages or authentication failures.');
    
  } catch (error) {
    console.error('❌ Error running test:', error.message);
  }
}

testInboundNumbersAPI();
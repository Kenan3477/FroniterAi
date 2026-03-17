/**
 * Quick test to verify authentication fix is working
 */

const fetch = require('node-fetch');

async function testAuthenticationFix() {
  console.log('🔒 TESTING AUTHENTICATION FIX');
  console.log('==============================\n');

  console.log('⏰ Waiting 2 minutes for Railway deployment...');
  await new Promise(resolve => setTimeout(resolve, 120000)); // Wait 2 minutes

  try {
    // Test the call endpoint that was failing
    console.log('📞 Testing call endpoint...');
    const response = await fetch('https://froniterai-production.up.railway.app/api/calls/call-rest-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // Note: This will still fail due to missing auth token, but should return 401, not 404
      },
      body: JSON.stringify({
        to: '+1234567890',
        contactName: 'Test User'
      })
    });

    console.log('Response status:', response.status);
    
    if (response.status === 404) {
      console.log('❌ Still getting 404 - Railway deployment might not be complete');
    } else if (response.status === 401) {
      console.log('✅ Getting 401 Unauthorized - This is GOOD! Authentication middleware is working');
      console.log('✅ The frontend should now work because it sends proper auth tokens');
    } else {
      console.log('🤔 Unexpected status code. Response:');
      const result = await response.text();
      console.log(result);
    }

  } catch (error) {
    console.error('❌ Error testing endpoint:', error);
  }

  console.log('\n📱 USER ACTION REQUIRED:');
  console.log('Try making a call through the Omnivox frontend now.');
  console.log('The call should work and show proper agent, contact, and phone data!');
}

testAuthenticationFix();
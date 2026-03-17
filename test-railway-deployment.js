/**
 * Test the current dialer logic to see what's happening with new calls
 */

const fetch = require('node-fetch');

async function testNewCallFlow() {
  console.log('🧪 Testing New Call Flow on Railway...\n');

  try {
    // Test the dialer endpoint to see what happens with authentication
    const testCallData = {
      to: '+1234567890', // Test phone number
      contactName: 'Test User',
      campaignId: 'test-campaign'
    };

    console.log('📞 Testing call creation...');
    console.log('Call data:', testCallData);

    // This will likely fail due to authentication, but we'll see the error
    const response = await fetch('https://froniterai-production.up.railway.app/api/dialer/make-rest-api-call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // We'd need a proper JWT token here
      },
      body: JSON.stringify(testCallData)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.text();
    console.log('Response:', result);

  } catch (error) {
    console.error('❌ Error testing call flow:', error);
  }
}

async function testAdminEndpoint() {
  console.log('\n🔧 Testing Admin Fix Endpoint...\n');

  try {
    const response = await fetch('https://froniterai-production.up.railway.app/api/admin-setup/fix-call-records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    console.log('Admin fix response status:', response.status);
    
    if (response.status === 404) {
      console.log('❌ Admin endpoint not found - Railway might not have deployed the latest changes yet');
      console.log('⏰ It can take a few minutes for Railway to deploy new code');
    } else {
      const result = await response.text();
      console.log('Admin fix response:', result);
    }

  } catch (error) {
    console.error('❌ Error testing admin endpoint:', error);
  }
}

async function checkRailwayDeployment() {
  console.log('\n🚀 Checking Railway Deployment Status...\n');

  try {
    // Test basic API health
    const response = await fetch('https://froniterai-production.up.railway.app/health');
    console.log('Health check status:', response.status);
    
    if (response.ok) {
      const result = await response.text();
      console.log('Health check result:', result);
    }

  } catch (error) {
    console.error('❌ Error checking deployment:', error);
  }
}

async function runDiagnostic() {
  console.log('🔍 RAILWAY DEPLOYMENT DIAGNOSTIC');
  console.log('=================================\n');

  await checkRailwayDeployment();
  await testAdminEndpoint();
  await testNewCallFlow();

  console.log('\n📋 NEXT STEPS:');
  console.log('1. Wait 2-3 minutes for Railway to deploy the latest changes');
  console.log('2. Try the admin fix endpoint again');
  console.log('3. If that fails, the issue is likely that Railway database is not accessible externally');
  console.log('4. In that case, the fix needs to be deployed as part of the Railway application');

  console.log('\n💡 RECOMMENDED ACTION:');
  console.log('Make a test call through the Omnivox frontend to see if the new logic is working');
  console.log('The call recording should now show proper agent, contact, and phone data');
}

runDiagnostic();
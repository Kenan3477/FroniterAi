// Test if session data exists in the database
const fetch = require('node-fetch');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function testSessionData() {
  try {
    console.log('🔍 Testing session data availability...');
    
    // Test user-sessions endpoint
    const sessionResponse = await fetch(
      `${BACKEND_URL}/api/admin/user-sessions?limit=10`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // We'll need a valid token for this to work
        }
      }
    );

    console.log('Session endpoint status:', sessionResponse.status);
    
    if (!sessionResponse.ok) {
      console.log('❌ Session endpoint failed:', await sessionResponse.text());
      return;
    }

    const sessionData = await sessionResponse.json();
    console.log('✅ Session data response:', JSON.stringify(sessionData, null, 2));

  } catch (error) {
    console.error('❌ Error testing session data:', error.message);
  }
}

testSessionData();
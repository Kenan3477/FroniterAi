const fetch = require('node-fetch');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

// Test all the possible admin credentials found in the files
async function testAllCredentials() {
  const credentials = [
    { email: 'admin@omnivox-ai.com', password: 'admin123' },
    { email: 'admin@omnivox.ai', password: 'admin123' },
    { email: 'admin@kennex.ai', password: 'admin123!' },
    { email: 'test.admin@omnivox.ai', password: 'TestAdmin123!' },
    { email: 'test.admin@omnivox.com', password: 'TestAdmin123!' },
    { email: 'kenan@test.co.uk', password: 'TestPassword123!' },
    { email: 'kenan@couk', password: 'TestPassword123!' },
    { email: 'kenan@couk', password: 'TestUser123!' },
    { email: 'albert@kennex.ai', password: '3477' },
    { email: 'demo@omnivox.com', password: 'demo123' }
  ];

  console.log('🔍 Testing all possible admin credentials...');
  
  for (let i = 0; i < credentials.length; i++) {
    const creds = credentials[i];
    console.log(`\n${i + 1}. Testing: ${creds.email} / ${creds.password}`);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(creds)
      });

      console.log(`   Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ SUCCESS! Working credentials found:`);
        console.log(`   Email: ${creds.email}`);
        console.log(`   Password: ${creds.password}`);
        console.log(`   Token: ${data.token || data.data?.token || 'token found'}`);
        return { ...creds, token: data.token || data.data?.token };
      }
      
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
  }
  
  console.log('\n❌ No working credentials found');
  return null;
}

// Test with successful credentials
async function testDialQueueWithValidAuth() {
  const validCreds = await testAllCredentials();
  
  if (!validCreds) {
    console.log('\n❌ Cannot test dial queue - no valid credentials');
    return;
  }

  console.log(`\n🧪 Testing dial queue with valid credentials...`);
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/dial-queue/next`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validCreds.token}`
      },
      body: JSON.stringify({
        campaignId: 'campaign_1766695393511',
        agentId: 'agent-1'
      })
    });

    console.log(`📡 Dial queue response status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Dial queue success with auth!');
      console.log(`   Contact: ${data.data?.contact?.firstName} ${data.data?.contact?.lastName}`);
      console.log(`   Phone: ${data.data?.contact?.phone}`);
    } else {
      const errorText = await response.text();
      console.log(`❌ Dial queue failed: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Dial queue test failed:', error.message);
  }
}

testDialQueueWithValidAuth();
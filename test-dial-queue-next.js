const fetch = require('node-fetch');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function testDialQueueNext() {
  try {
    console.log('🧪 Testing dial queue next contact API...');
    
    const response = await fetch(`${BACKEND_URL}/api/dial-queue/next`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        campaignId: 'campaign_1766695393511',
        agentId: 'agent-1'
      })
    });

    console.log(`📡 Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Error response body: ${errorText}`);
      return;
    }

    const data = await response.json();
    console.log('✅ Success response:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Also test if the campaign queue has any entries
async function checkCampaignQueue() {
  try {
    console.log('🔍 Checking campaign dial queue entries...');
    
    const response = await fetch(`${BACKEND_URL}/api/dial-queue?campaignId=campaign_1766695393511`);
    
    console.log(`📡 Queue check status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('📋 Queue data:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Failed to check queue');
    }
    
  } catch (error) {
    console.error('❌ Queue check failed:', error.message);
  }
}

// Run tests
async function runTests() {
  await checkCampaignQueue();
  console.log('\n---\n');
  await testDialQueueNext();
}

runTests();
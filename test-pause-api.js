// Test script for Agent Pause Event API
const API_BASE = 'http://localhost:3004';

// Test agent ID (from seed data or existing agent)
const TEST_AGENT_ID = 'agent123'; // This should be updated with a real agent ID

async function testPauseEventAPI() {
  console.log('🧪 Testing Agent Pause Event API...\n');

  try {
    // Test 1: Create a pause event
    console.log('1️⃣ Testing pause event creation...');
    const createResponse = await fetch(`${API_BASE}/api/pause-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentId: TEST_AGENT_ID,
        eventType: 'break',
        pauseReason: 'Toilet Break',
        pauseCategory: 'personal',
        agentComment: 'Quick restroom break',
        metadata: {
          previousStatus: 'Available',
          timestamp: new Date().toISOString()
        }
      })
    });

    if (!createResponse.ok) {
      console.log('❌ Create failed:', await createResponse.text());
      return;
    }

    const createResult = await createResponse.json();
    console.log('✅ Pause event created:', createResult);

    const pauseEventId = createResult.data?.id;
    if (!pauseEventId) {
      console.log('❌ No pause event ID returned');
      return;
    }

    // Wait a few seconds to simulate pause duration
    console.log('\n⏳ Simulating 3-second pause...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 2: End the pause event
    console.log('\n2️⃣ Testing pause event ending...');
    const endResponse = await fetch(`${API_BASE}/api/pause-events/${pauseEventId}/end`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endComment: 'Back from restroom'
      })
    });

    if (!endResponse.ok) {
      console.log('❌ End failed:', await endResponse.text());
      return;
    }

    const endResult = await endResponse.json();
    console.log('✅ Pause event ended:', endResult);

    // Test 3: Get pause events for agent
    console.log('\n3️⃣ Testing pause event retrieval...');
    const getResponse = await fetch(`${API_BASE}/api/pause-events?agentId=${TEST_AGENT_ID}`);
    
    if (!getResponse.ok) {
      console.log('❌ Get failed:', await getResponse.text());
      return;
    }

    const getResult = await getResponse.json();
    console.log('✅ Pause events retrieved:', getResult);

    // Test 4: Get pause statistics
    console.log('\n4️⃣ Testing pause statistics...');
    const statsResponse = await fetch(`${API_BASE}/api/pause-events/stats?agentId=${TEST_AGENT_ID}`);
    
    if (!statsResponse.ok) {
      console.log('❌ Stats failed:', await statsResponse.text());
      return;
    }

    const statsResult = await statsResponse.json();
    console.log('✅ Pause statistics:', statsResult);

    console.log('\n🎉 All pause event API tests passed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testPauseEventAPI();
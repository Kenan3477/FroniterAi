const fetch = require('node-fetch');

async function createTestPauseEvent() {
  try {
    console.log('🧪 Creating test pause event via API...');
    
    // First, let's get a valid auth token by logging in
    const loginResponse = await fetch('http://localhost:3004/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'ken',
        password: 'password' // or whatever your password is
      }),
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed, trying with existing test data...');
      
      // Try creating pause event directly
      const pauseResponse = await fetch('http://localhost:3004/api/pause-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          agentId: '509', // Your user ID
          eventType: 'break',
          pauseReason: 'Toilet Break',
          pauseCategory: 'personal',
          agentComment: 'Manual test pause event'
        }),
      });
      
      const pauseResult = await pauseResponse.text();
      console.log('Pause event creation response:', pauseResult);
      
    } else {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful');
      
      const token = loginData.token;
      
      // Create pause event with valid token
      const pauseResponse = await fetch('http://localhost:3004/api/pause-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          agentId: '509', // Your user ID
          eventType: 'break',
          pauseReason: 'Toilet Break',
          pauseCategory: 'personal',
          agentComment: 'API test pause event'
        }),
      });
      
      const pauseResult = await pauseResponse.json();
      console.log('✅ Pause event result:', pauseResult);
      
      // End the pause event after a few seconds
      if (pauseResult.success && pauseResult.data) {
        console.log('⏹️ Ending pause event...');
        
        const endResponse = await fetch(`http://localhost:3004/api/pause-events/${pauseResult.data.id}/end`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });
        
        const endResult = await endResponse.json();
        console.log('✅ End pause result:', endResult);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTestPauseEvent();
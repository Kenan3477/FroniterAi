// Quick test to check if backend is accessible
async function testBackendConnection() {
  try {
    console.log('🧪 Testing backend connection...');
    
    // Test health endpoint
    const healthResponse = await fetch('http://localhost:3004/health');
    console.log('🩺 Health check status:', healthResponse.status);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.text();
      console.log('✅ Health check response:', healthData);
    }
    
    // Test agents endpoint
    console.log('🧪 Testing agents endpoint...');
    const agentsResponse = await fetch('http://localhost:3004/api/agents');
    console.log('👥 Agents endpoint status:', agentsResponse.status);
    
    if (agentsResponse.ok) {
      const agentsData = await agentsResponse.json();
      console.log('✅ Agents response:', agentsData);
    } else {
      const errorText = await agentsResponse.text();
      console.log('❌ Agents error:', errorText);
    }
    
    // Test pause-events endpoint
    console.log('🧪 Testing pause-events endpoint...');
    const pauseResponse = await fetch('http://localhost:3004/api/pause-events');
    console.log('⏸️ Pause events endpoint status:', pauseResponse.status);
    
    if (pauseResponse.ok) {
      const pauseData = await pauseResponse.json();
      console.log('✅ Pause events response:', pauseData);
    } else {
      const errorText = await pauseResponse.text();
      console.log('❌ Pause events error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
}

testBackendConnection();
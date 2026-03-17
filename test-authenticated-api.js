// Test interaction history API with authentication
async function testAuthenticatedAPI() {
  const token = localStorage.getItem('omnivox_token');
  console.log('🔑 Testing with token:', token ? 'Present' : 'Missing');
  
  try {
    const response = await fetch('https://froniterai-production.up.railway.app/api/interaction-history/categorized?agentId=current-agent&limit=20', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📞 Response status:', response.status);
    console.log('📋 Response headers:', Object.fromEntries(response.headers));
    
    const data = await response.text();
    console.log('📝 Raw response:', data);
    
    try {
      const jsonData = JSON.parse(data);
      console.log('📊 Parsed response:', jsonData);
    } catch (e) {
      console.error('❌ Failed to parse JSON:', e);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

// Run the test
testAuthenticatedAPI();
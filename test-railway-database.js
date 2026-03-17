// Test database connection status on Railway
const testDatabaseConnection = async () => {
  try {
    console.log('🔍 Testing database connection...');
    
    const response = await fetch('https://froniterai-production.up.railway.app/health');
    const health = await response.json();
    
    console.log('Health status:', health);
    
    if (health.database?.connected) {
      console.log('✅ Database appears connected');
      console.log('Database type:', health.database.type);
    } else {
      console.log('❌ Database not connected according to health check');
    }
    
    // Test actual database query
    console.log('\n🔍 Testing database query...');
    
    const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Ken3477!' })
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      const token = loginData.data.token;
      
      const recordsResponse = await fetch('https://froniterai-production.up.railway.app/api/call-records?limit=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (recordsResponse.ok) {
        const recordsData = await recordsResponse.json();
        console.log('✅ Database query successful');
        console.log('Records found:', recordsData.records?.length || 0);
      } else {
        console.log('❌ Database query failed:', recordsResponse.status, recordsResponse.statusText);
      }
    } else {
      console.log('❌ Authentication failed');
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
};

testDatabaseConnection();
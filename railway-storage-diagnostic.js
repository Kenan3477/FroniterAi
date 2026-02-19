// Comprehensive Railway storage diagnostic
const testAllStorageComponents = async () => {
  const baseUrl = 'https://froniterai-production.up.railway.app';
  
  console.log('🔍 RAILWAY STORAGE DIAGNOSTIC\n');
  
  // 1. Test basic connectivity
  console.log('1. Testing basic connectivity...');
  try {
    const response = await fetch(`${baseUrl}/health`);
    const health = await response.json();
    console.log('✅ Backend reachable');
    console.log(`   Database: ${health.database.connected ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`   Type: ${health.database.type}`);
  } catch (error) {
    console.log('❌ Backend unreachable:', error.message);
    return;
  }
  
  // 2. Test authentication (requires database)
  console.log('\n2. Testing authentication (database required)...');
  try {
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Ken3477!' })
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Authentication successful (database reads working)');
      var token = loginData.data.token;
    } else {
      console.log('❌ Authentication failed (database read issue)');
      return;
    }
  } catch (error) {
    console.log('❌ Authentication error:', error.message);
    return;
  }
  
  // 3. Test database reads
  console.log('\n3. Testing database reads...');
  try {
    const recordsResponse = await fetch(`${baseUrl}/api/call-records?limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (recordsResponse.ok) {
      const recordsData = await recordsResponse.json();
      console.log('✅ Database reads working');
      console.log(`   Records found: ${recordsData.records?.length || 0}`);
    } else {
      console.log('❌ Database read failed:', recordsResponse.status);
    }
  } catch (error) {
    console.log('❌ Database read error:', error.message);
  }
  
  // 4. Test Twilio recording storage access
  console.log('\n4. Testing Twilio recording storage...');
  try {
    const recordingsResponse = await fetch(`${baseUrl}/api/recordings?limit=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (recordingsResponse.ok) {
      const recordingsData = await recordingsResponse.json();
      console.log('✅ Recording metadata accessible');
      
      if (recordingsData.data?.length > 0) {
        const recordingId = recordingsData.data[0].id;
        console.log(`   Testing stream access for ID: ${recordingId}`);
        
        const streamResponse = await fetch(`${baseUrl}/api/recordings/${recordingId}/stream`, {
          method: 'HEAD',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (streamResponse.ok) {
          console.log('✅ Recording streaming working');
          console.log(`   Content-Length: ${streamResponse.headers.get('content-length')} bytes`);
        } else {
          console.log('❌ Recording streaming failed:', streamResponse.status);
        }
      } else {
        console.log('   No recordings found to test');
      }
    } else {
      console.log('❌ Recording metadata failed:', recordingsResponse.status);
    }
  } catch (error) {
    console.log('❌ Recording storage error:', error.message);
  }
  
  // 5. Test database writes (create test campaign)
  console.log('\n5. Testing database writes...');
  try {
    const testCampaign = {
      name: 'Storage Test Campaign',
      description: 'Testing Railway database write capability',
      type: 'manual'
    };
    
    const writeResponse = await fetch(`${baseUrl}/api/campaigns`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCampaign)
    });
    
    if (writeResponse.ok) {
      const writeData = await writeResponse.json();
      console.log('✅ Database writes working');
      console.log(`   Created campaign ID: ${writeData.data?.id || 'unknown'}`);
    } else {
      console.log('❌ Database write failed:', writeResponse.status);
      const errorData = await writeResponse.text();
      console.log(`   Error: ${errorData}`);
    }
  } catch (error) {
    console.log('❌ Database write error:', error.message);
  }
  
  console.log('\n📊 DIAGNOSTIC COMPLETE');
};

testAllStorageComponents();
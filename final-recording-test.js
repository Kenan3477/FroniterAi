const fetch = require('node-fetch');

async function testRecordingFix() {
  const baseUrl = 'https://froniterai-production.up.railway.app';
  
  try {
    console.log('🔧 Testing Recording Playback After Storage Type Fix');
    console.log('=' .repeat(60));
    
    console.log('1️⃣ Testing connectivity...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    console.log('   Health status:', healthResponse.status);
    
    console.log('2️⃣ Authenticating...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'ken@simpleemails.co.uk',
        password: 'Kenzo3477!'
      })
    });
    
    console.log('   Login status:', loginResponse.status);
    
    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.log('   Login error:', error);
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('   ✅ Authentication successful');
    
    console.log('3️⃣ Testing recording stream...');
    const recordingResponse = await fetch(`${baseUrl}/api/recordings/cmm56k0l6000dbxrw0b9k9xa5/stream`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('   Recording status:', recordingResponse.status);
    console.log('   Content-Type:', recordingResponse.headers.get('content-type'));
    
    if (recordingResponse.status === 200) {
      console.log('   🎉 SUCCESS! Recording streaming is working!');
      console.log('   📏 Content length:', recordingResponse.headers.get('content-length'));
    } else if (recordingResponse.status === 501) {
      console.log('   ❌ Still getting 501 - storage type may not be updated');
    } else {
      const errorText = await recordingResponse.text();
      console.log('   ❌ Unexpected error:', errorText);
    }
    
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testRecordingFix();
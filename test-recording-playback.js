const fetch = require('node-fetch');

async function testRecordingPlayback() {
  const baseUrl = 'https://froniterai-production.up.railway.app';
  
  console.log('🔐 Logging in to test recording playback...');
  
  // Login to get auth token
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'ken@simpleemails.co.uk',
      password: 'Kenzo3477!'
    })
  });
  
  if (!loginResponse.ok) {
    console.error('❌ Login failed:', loginResponse.status);
    process.exit(1);
  }
  
  const loginData = await loginResponse.json();
  const token = loginData.token;
  
  console.log('✅ Login successful');
  console.log('🎵 Testing recording playback...');
  
  // Test recording playback
  const recordingResponse = await fetch(`${baseUrl}/api/recordings/cmm56k0l6000dbxrw0b9k9xa5/stream`, {
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${token}`
    }
  });
  
  console.log('📊 Recording response status:', recordingResponse.status);
  
  if (recordingResponse.status === 200) {
    console.log('✅ SUCCESS: Recording streaming is now working!');
    console.log('🎯 Content-Type:', recordingResponse.headers.get('content-type'));
    console.log('📏 Content-Length:', recordingResponse.headers.get('content-length'));
  } else {
    console.log('❌ Recording streaming still failing');
    const error = await recordingResponse.text();
    console.log('📝 Error:', error);
  }
}

testRecordingPlayback().catch(console.error);
#!/usr/bin/env node

async function testRecordingAPI() {
  try {
    console.log('🧪 Testing recording streaming API...');
    
    const recordingId = 'cmlp67yhn000cmhih4hmhzm8r';
    const frontendStreamUrl = `https://omnivox.vercel.app/api/recordings/${recordingId}/stream`;
    const backendStreamUrl = `https://froniterai-production.up.railway.app/api/recordings/${recordingId}/stream`;
    
    console.log('\n1️⃣ Testing frontend recording proxy...');
    console.log('URL:', frontendStreamUrl);
    
    try {
      const frontendResponse = await fetch(frontendStreamUrl, {
        method: 'GET',
        headers: {
          'Accept': 'audio/*',
        }
      });
      
      console.log(`Frontend Response: ${frontendResponse.status} ${frontendResponse.statusText}`);
      console.log('Frontend Headers:', Object.fromEntries(frontendResponse.headers.entries()));
      
      if (!frontendResponse.ok) {
        const errorText = await frontendResponse.text();
        console.log('Frontend Error:', errorText);
      }
    } catch (frontendError) {
      console.error('Frontend Error:', frontendError.message);
    }
    
    console.log('\n2️⃣ Testing backend recording API directly...');
    console.log('URL:', backendStreamUrl);
    
    try {
      // We need a valid auth token, but let's see what happens without one first
      const backendResponse = await fetch(backendStreamUrl, {
        method: 'GET',
        headers: {
          'Accept': 'audio/*',
        }
      });
      
      console.log(`Backend Response: ${backendResponse.status} ${backendResponse.statusText}`);
      console.log('Backend Headers:', Object.fromEntries(backendResponse.headers.entries()));
      
      if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        console.log('Backend Error:', errorText);
      }
    } catch (backendError) {
      console.error('Backend Error:', backendError.message);
    }
    
    console.log('\n3️⃣ Testing call records API to verify data...');
    const callRecordsUrl = 'https://omnivox.vercel.app/api/call-records';
    
    try {
      const callRecordsResponse = await fetch(callRecordsUrl);
      console.log(`Call Records: ${callRecordsResponse.status} ${callRecordsResponse.statusText}`);
      
      if (callRecordsResponse.ok) {
        const data = await callRecordsResponse.json();
        console.log('Records found:', data.records?.length || 0);
        
        const recordsWithRecordings = data.records?.filter(r => r.recordingFile);
        console.log('Records with recordings:', recordsWithRecordings?.length || 0);
        
        if (recordsWithRecordings && recordsWithRecordings.length > 0) {
          const firstRecording = recordsWithRecordings[0];
          console.log('First recording file:', {
            id: firstRecording.recordingFile.id,
            fileName: firstRecording.recordingFile.fileName,
            filePath: firstRecording.recordingFile.filePath,
            uploadStatus: firstRecording.recordingFile.uploadStatus
          });
        }
      } else {
        const errorText = await callRecordsResponse.text();
        console.log('Call Records Error:', errorText);
      }
    } catch (callRecordsError) {
      console.error('Call Records Error:', callRecordsError.message);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testRecordingAPI();
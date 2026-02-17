/**
 * Debug the recording file that's causing 404 error
 */

async function debugRecordingFile() {
  try {
    console.log('🎵 Checking recording file from call records...');
    
    // Get the call records to see the actual data structure
    const response = await fetch('http://localhost:3000/api/call-records');
    
    if (!response.ok) {
      console.error('Failed to fetch call records:', response.status);
      return;
    }
    
    const data = await response.json();
    console.log('📞 Call Records Response:', data);
    
    if (data.success && data.records && data.records.length > 0) {
      const firstRecord = data.records[0];
      console.log('\n🔍 First Call Record Structure:');
      console.log(JSON.stringify(firstRecord, null, 2));
      
      if (firstRecord.recordingFile) {
        console.log('\n🎵 Recording File Details:');
        console.log('ID:', firstRecord.recordingFile.id);
        console.log('File Path:', firstRecord.recordingFile.filePath);
        console.log('File Name:', firstRecord.recordingFile.fileName);
        
        // Test the recording endpoint
        console.log('\n🔗 Testing recording endpoints...');
        
        const recordingStreamUrl = `http://localhost:3000/api/recordings/${firstRecord.recordingFile.id}/stream`;
        console.log('Stream URL:', recordingStreamUrl);
        
        try {
          const streamResponse = await fetch(recordingStreamUrl);
          console.log('Stream Response Status:', streamResponse.status);
          console.log('Stream Response Headers:', Object.fromEntries(streamResponse.headers.entries()));
          
          if (!streamResponse.ok) {
            const errorText = await streamResponse.text();
            console.log('Stream Error:', errorText);
          }
        } catch (streamError) {
          console.error('Stream fetch error:', streamError);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Run the debug
debugRecordingFile();
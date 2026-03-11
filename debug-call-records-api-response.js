/**
 * Debug Call Records API Response
 * Check what data is actually being returned
 */

const API_URL = 'https://froniterai-production.up.railway.app';

async function debugCallRecordsAPI() {
  console.log('🔍 Debugging Call Records API Response\n');

  try {
    // Step 1: Login to get token
    console.log('1. Logging in...');
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ken@simpleemails.co.uk',
        password: 'Kenzo3477!'
      })
    });

    const loginData = await loginResponse.json();
    
    const token = loginData.data?.token || loginData.token;
    
    if (!token) {
      console.log('❌ Login failed - no token:', loginData);
      return;
    }

    console.log('✅ Login successful');
    console.log(`   Token: ${token.substring(0, 30)}...`);

    // Step 2: Get call records
    console.log('\n2. Fetching call records...');
    const callRecordsResponse = await fetch(
      `${API_URL}/api/call-records?dateFrom=2026-01-31&dateTo=2026-03-02&page=1&limit=25&sortBy=startTime&sortOrder=desc`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const callRecordsData = await callRecordsResponse.json();

    console.log('✅ Call records fetched');
    console.log(`   Total records: ${callRecordsData.records?.length || 0}\n`);

    // Step 3: Analyze recordings in the response
    console.log('='.repeat(80));
    console.log('📊 Recording Analysis');
    console.log('='.repeat(80) + '\n');

    if (callRecordsData.records) {
      const withRecording = callRecordsData.records.filter(r => r.recordingFile);
      const withoutRecording = callRecordsData.records.filter(r => !r.recordingFile);

      console.log(`Records with recording: ${withRecording.length}`);
      console.log(`Records without recording: ${withoutRecording.length}\n`);

      // Show first 10 records
      console.log('First 10 records:');
      console.log('-'.repeat(80));

      callRecordsData.records.slice(0, 10).forEach((record, index) => {
        const contactName = record.contact 
          ? `${record.contact.firstName || ''} ${record.contact.lastName || ''}`.trim()
          : 'Unknown';
        
        console.log(`\n${index + 1}. ${record.phoneNumber} - ${contactName}`);
        console.log(`   Date: ${new Date(record.startTime).toLocaleString()}`);
        console.log(`   Duration: ${record.duration}s`);
        console.log(`   Outcome: ${record.outcome || 'N/A'}`);
        
        if (record.recordingFile) {
          console.log(`   ✅ Recording: ${record.recordingFile.id}`);
          console.log(`      File: ${record.recordingFile.fileName || 'N/A'}`);
          console.log(`      Status: ${record.recordingFile.uploadStatus}`);
        } else {
          console.log(`   ❌ NO RECORDING`);
        }
      });

      // Show records without recordings
      if (withoutRecording.length > 0) {
        console.log('\n' + '='.repeat(80));
        console.log('📋 Records WITHOUT Recordings:');
        console.log('='.repeat(80) + '\n');

        withoutRecording.forEach((record, index) => {
          const contactName = record.contact 
            ? `${record.contact.firstName || ''} ${record.contact.lastName || ''}`.trim()
            : 'Unknown';
          
          console.log(`${index + 1}. ${record.phoneNumber} - ${contactName}`);
          console.log(`   Call ID: ${record.callId}`);
          console.log(`   Internal ID: ${record.id}`);
          console.log(`   Date: ${new Date(record.startTime).toLocaleString()}`);
          console.log(`   Outcome: ${record.outcome || 'N/A'}\n`);
        });
      }
    }

    console.log('='.repeat(80));
    console.log('✅ Analysis Complete');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugCallRecordsAPI();

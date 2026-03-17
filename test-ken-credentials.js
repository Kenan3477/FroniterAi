/**
 * Test Railway login with ken@simpleemails.co.uk
 */

const fetch = require('node-fetch');

const API_BASE = 'https://froniterai-production.up.railway.app';

async function testLogin() {
  console.log('🔐 Testing Railway Login\n');

  const credentials = {
    email: 'ken@simpleemails.co.uk',
    password: 'Kenzo3477!'
  };

  console.log(`Email: ${credentials.email}`);
  console.log(`Password: ${credentials.password}\n`);

  try {
    console.log('📡 Attempting login...');
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    console.log(`Status: ${response.status} ${response.statusText}\n`);

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ LOGIN SUCCESSFUL!\n');
      
      const token = data.data?.token || data.token;
      const user = data.data?.user || data.user;
      
      console.log('👤 User Info:');
      console.log(`   Name: ${user?.firstName} ${user?.lastName}`);
      console.log(`   Email: ${user?.email}`);
      console.log(`   Role: ${user?.role}\n`);
      console.log(`🎫 Token: ${token?.substring(0, 50)}...\n`);

      // Now verify call records
      console.log('📡 Fetching call records from Railway API...\n');
      
      const callsResponse = await fetch(`${API_BASE}/api/call-records?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`Call Records Status: ${callsResponse.status}\n`);

      if (!callsResponse.ok) {
        const errorText = await callsResponse.text();
        console.log(`❌ Error: ${errorText}`);
        return;
      }

      const callsData = await callsResponse.json();
      const records = callsData.records || [];

      console.log('✅ RAILWAY API DATA VERIFICATION');
      console.log('='.repeat(70));
      console.log(`📊 Total records in database: ${callsData.pagination?.total || 0}`);
      console.log(`📊 Records returned: ${records.length}\n`);

      // Analyze recordings
      const withRecording = records.filter(r => r.recordingFile !== null && r.recordingFile !== undefined);
      const withoutRecording = records.filter(r => r.recordingFile === null || r.recordingFile === undefined);

      console.log('🎙️  RECORDING STATUS:');
      console.log(`   ✅ Records WITH recordings: ${withRecording.length}`);
      console.log(`   ❌ Records WITHOUT recordings: ${withoutRecording.length}\n`);

      if (withoutRecording.length > 0) {
        console.log('⚠️  BROKEN CALL RECORDS (NO RECORDINGS):');
        console.log('='.repeat(70) + '\n');
        
        withoutRecording.forEach((record, i) => {
          console.log(`${i + 1}. Record ID: ${record.id}`);
          console.log(`   Call ID: ${record.callId || 'N/A'}`);
          console.log(`   Phone: ${record.phoneNumber || 'N/A'}`);
          console.log(`   Direction: ${record.direction || 'N/A'}`);
          console.log(`   Outcome: ${record.outcome || 'N/A'}`);
          console.log(`   Duration: ${record.duration || 0}s`);
          console.log(`   Start Time: ${record.startTime || 'N/A'}`);
          console.log(`   Agent: ${record.agent ? `${record.agent.firstName} ${record.agent.lastName}` : 'N/A'}`);
          console.log('');
        });

        console.log('🔧 RECOMMENDED ACTIONS:');
        console.log('   1. Check if these calls should have recordings');
        console.log('   2. If recordings are missing, delete these records');
        console.log('   3. If recordings exist in Twilio, re-link them\n');
      } else {
        console.log('✅ ALL CALL RECORDS HAVE RECORDINGS! ✨\n');
      }

      // Data quality checks
      console.log('🔍 DATA QUALITY CHECKS:');
      const missingCallId = records.filter(r => !r.callId || r.callId.trim() === '');
      const missingOutcome = records.filter(r => !r.outcome);
      const zeroDuration = records.filter(r => !r.duration || r.duration === 0);
      const missingStartTime = records.filter(r => !r.startTime);

      console.log(`   ⚠️  Missing callId: ${missingCallId.length}`);
      console.log(`   ⚠️  Missing outcome: ${missingOutcome.length}`);
      console.log(`   ⚠️  Zero duration: ${zeroDuration.length}`);
      console.log(`   ⚠️  Missing startTime: ${missingStartTime.length}\n`);

      // Recording upload status
      if (withRecording.length > 0) {
        console.log('📊 RECORDING UPLOAD STATUS:');
        const statusCounts = {};
        withRecording.forEach(r => {
          const status = r.recordingFile?.uploadStatus || 'unknown';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        Object.entries(statusCounts).forEach(([status, count]) => {
          console.log(`   ${status}: ${count}`);
        });
        console.log('');
      }

      // Sample records with recordings
      if (withRecording.length > 0) {
        console.log('✅ SAMPLE RECORDS WITH RECORDINGS (first 3):');
        console.log('='.repeat(70) + '\n');
        withRecording.slice(0, 3).forEach((record, i) => {
          console.log(`${i + 1}. ${record.phoneNumber || 'N/A'} - ${record.outcome || 'N/A'}`);
          console.log(`   Recording File: ${record.recordingFile.fileName}`);
          console.log(`   Recording Duration: ${record.recordingFile.duration}s`);
          console.log(`   Upload Status: ${record.recordingFile.uploadStatus}`);
          console.log('');
        });
      }

      console.log('='.repeat(70));
      console.log('✅ VERIFICATION COMPLETE');
      console.log('='.repeat(70) + '\n');

      // Summary
      console.log('📋 SUMMARY:');
      if (withoutRecording.length === 0) {
        console.log('   ✅ All call records are healthy and have recordings');
        console.log('   ✅ No broken records found');
        console.log('   ✅ Railway API is returning correct data\n');
      } else {
        console.log(`   ⚠️  Found ${withoutRecording.length} broken records without recordings`);
        console.log('   ⚠️  These should be fixed or deleted\n');
      }

      console.log('💾 SAVE THESE CREDENTIALS:');
      console.log(`   Email: ${credentials.email}`);
      console.log(`   Password: ${credentials.password}`);

    } else {
      console.log('❌ LOGIN FAILED\n');
      console.log('Response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLogin().catch(console.error);

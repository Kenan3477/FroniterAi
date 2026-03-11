/**
 * Test Railway login with provided passwords
 */

const fetch = require('node-fetch');

const API_BASE = 'https://froniterai-production.up.railway.app';

const CREDENTIALS_TO_TEST = [
  { email: 'test@example.com', password: 'Albert3477!' },
  { email: 'test@example.com', password: 'OmnivoxAdmin2025!' },
  { email: 'admin@omnivox.ai', password: 'Albert3477!' },
  { email: 'admin@omnivox.ai', password: 'OmnivoxAdmin2025!' },
];

async function testLogin() {
  console.log('🔐 Testing Railway Login with Provided Passwords\n');

  for (const creds of CREDENTIALS_TO_TEST) {
    console.log(`Testing ${creds.email} with ${creds.password}...`);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ SUCCESS!\n');
        
        const token = data.data?.token || data.token;
        console.log('🎉 WORKING CREDENTIALS:');
        console.log(`   Email: ${creds.email}`);
        console.log(`   Password: ${creds.password}`);
        console.log(`   Token: ${token?.substring(0, 50)}...\n`);

        // Now verify call records
        console.log('📡 Fetching call records from Railway API...\n');
        
        const callsResponse = await fetch(`${API_BASE}/api/call-records?limit=100`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!callsResponse.ok) {
          console.log(`❌ Call records request failed: ${callsResponse.status}`);
          const errorText = await callsResponse.text();
          console.log('Error:', errorText);
          return;
        }

        const callsData = await callsResponse.json();
        const records = callsData.records || [];

        console.log('✅ RAILWAY API DATA VERIFICATION');
        console.log('='.repeat(60));
        console.log(`Total records in database: ${callsData.pagination?.total || 0}`);
        console.log(`Records returned: ${records.length}\n`);

        // Analyze recordings
        const withRecording = records.filter(r => r.recordingFile !== null && r.recordingFile !== undefined);
        const withoutRecording = records.filter(r => r.recordingFile === null || r.recordingFile === undefined);

        console.log('📊 RECORDING STATUS:');
        console.log(`   ✅ Records WITH recordings: ${withRecording.length}`);
        console.log(`   ❌ Records WITHOUT recordings: ${withoutRecording.length}`);

        if (withoutRecording.length > 0) {
          console.log('\n⚠️  BROKEN CALL RECORDS (NO RECORDINGS):\n');
          withoutRecording.forEach((record, i) => {
            console.log(`${i + 1}. ID: ${record.id}`);
            console.log(`   Call ID: ${record.callId || 'N/A'}`);
            console.log(`   Phone: ${record.phoneNumber || 'N/A'}`);
            console.log(`   Direction: ${record.direction || 'N/A'}`);
            console.log(`   Outcome: ${record.outcome || 'N/A'}`);
            console.log(`   Duration: ${record.duration || 0}s`);
            console.log(`   Start: ${record.startTime || 'N/A'}`);
            console.log('');
          });

          console.log('🔧 These records should be:');
          console.log('   1. Have recordings uploaded/linked');
          console.log('   2. Or deleted if recordings are genuinely missing\n');
        } else {
          console.log('\n✅ ALL CALL RECORDS HAVE RECORDINGS! ✨\n');
        }

        // Data quality checks
        console.log('🔍 DATA QUALITY CHECKS:');
        const missingCallId = records.filter(r => !r.callId || r.callId.trim() === '');
        const missingOutcome = records.filter(r => !r.outcome);
        const zeroDuration = records.filter(r => !r.duration || r.duration === 0);

        console.log(`   Missing callId: ${missingCallId.length}`);
        console.log(`   Missing outcome: ${missingOutcome.length}`);
        console.log(`   Zero duration: ${zeroDuration.length}`);

        // Recording upload status
        if (withRecording.length > 0) {
          console.log('\n📊 RECORDING UPLOAD STATUS:');
          const statusCounts = {};
          withRecording.forEach(r => {
            const status = r.recordingFile?.uploadStatus || 'unknown';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
          });
          Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`   ${status}: ${count}`);
          });
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ VERIFICATION COMPLETE');
        console.log('='.repeat(60));

        return { success: true, withoutRecording: withoutRecording.length };
      } else {
        console.log(`❌ Failed: ${data.message || 'Unknown error'}\n`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }
  }

  console.log('❌ None of the provided passwords worked.');
  console.log('The passwords may have been changed on Railway.');
}

testLogin().catch(console.error);

/**
 * Comprehensive Railway API Data Verification
 * Tests multiple credential combinations and analyzes call records data
 */

const fetch = require('node-fetch');

const API_BASE = 'https://froniterai-production.up.railway.app';

const CREDENTIALS_TO_TEST = [
  { email: 'test@example.com', password: 'Admin123!' },
  { email: 'admin@omnivox.ai', password: 'Admin123!' },
  { email: 'admin@omnivox.com', password: 'admin123' },
  { email: 'admin@kennex.ai', password: 'Admin123!' },
  { email: 'test.admin@omnivox.ai', password: 'TestAdmin123!' },
  { email: 'newadmin@omnivox.com', password: 'NewAdmin123!' },
];

async function testLogin(credentials) {
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      const token = data.data?.token || data.token || data.data?.accessToken;
      return { success: true, token, user: data.data?.user };
    }
    
    return { success: false, error: data.message };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function analyzeCallRecords(token) {
  console.log('\n📡 Fetching call records from Railway API...');
  
  const response = await fetch(`${API_BASE}/api/call-records?limit=100`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    console.log(`❌ Failed to fetch call records: ${response.status}`);
    const errorText = await response.text();
    console.log('Error:', errorText);
    return null;
  }

  const data = await response.json();
  const records = data.records || [];

  console.log(`✅ API Response received`);
  console.log(`📊 Total records returned: ${records.length}`);
  console.log(`📊 Pagination total: ${data.pagination?.total || 0}`);

  // Analyze recording status
  const withRecording = records.filter(r => r.recordingFile !== null && r.recordingFile !== undefined);
  const withoutRecording = records.filter(r => r.recordingFile === null || r.recordingFile === undefined);

  console.log(`\n📊 Recording Status Analysis:`);
  console.log(`✅ Records WITH recordings: ${withRecording.length}`);
  console.log(`❌ Records WITHOUT recordings: ${withoutRecording.length}`);

  // Show records without recordings in detail
  if (withoutRecording.length > 0) {
    console.log(`\n⚠️  RECORDS WITHOUT RECORDINGS:\n`);
    withoutRecording.forEach((record, i) => {
      console.log(`${i + 1}. ID: ${record.id}`);
      console.log(`   Call ID: ${record.callId || 'N/A'}`);
      console.log(`   Direction: ${record.direction || 'N/A'}`);
      console.log(`   Outcome: ${record.outcome || 'N/A'}`);
      console.log(`   Duration: ${record.duration || 0}s`);
      console.log(`   Start Time: ${record.startTime || 'N/A'}`);
      console.log(`   Phone: ${record.phoneNumber || 'N/A'}`);
      console.log(`   Agent: ${record.agent ? `${record.agent.firstName} ${record.agent.lastName}` : 'N/A'}`);
      console.log(`   Recording File: ${record.recordingFile}`);
      console.log('');
    });
  }

  // Show sample of records WITH recordings
  if (withRecording.length > 0) {
    console.log(`\n✅ SAMPLE RECORDS WITH RECORDINGS (first 5):\n`);
    withRecording.slice(0, 5).forEach((record, i) => {
      console.log(`${i + 1}. ID: ${record.id}`);
      console.log(`   Call ID: ${record.callId || 'N/A'}`);
      console.log(`   Recording ID: ${record.recordingFile?.id || 'N/A'}`);
      console.log(`   Recording File: ${record.recordingFile?.fileName || 'N/A'}`);
      console.log(`   Recording Duration: ${record.recordingFile?.duration || 0}s`);
      console.log(`   Upload Status: ${record.recordingFile?.uploadStatus || 'N/A'}`);
      console.log('');
    });
  }

  // Check for broken/incomplete data
  console.log(`\n🔍 Data Quality Check:`);
  const missingCallId = records.filter(r => !r.callId || r.callId.trim() === '');
  const missingOutcome = records.filter(r => !r.outcome);
  const zeroDuration = records.filter(r => !r.duration || r.duration === 0);
  const missingStartTime = records.filter(r => !r.startTime);

  console.log(`⚠️  Records with missing callId: ${missingCallId.length}`);
  console.log(`⚠️  Records with missing outcome: ${missingOutcome.length}`);
  console.log(`⚠️  Records with zero duration: ${zeroDuration.length}`);
  console.log(`⚠️  Records with missing startTime: ${missingStartTime.length}`);

  // Check recording file upload status
  const uploadStatusCounts = withRecording.reduce((acc, r) => {
    const status = r.recordingFile?.uploadStatus || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  console.log(`\n📊 Recording Upload Status:`);
  Object.entries(uploadStatusCounts).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });

  return {
    total: records.length,
    withRecording: withRecording.length,
    withoutRecording: withoutRecording.length,
    recordsWithoutRecording: withoutRecording,
    dataQuality: {
      missingCallId: missingCallId.length,
      missingOutcome: missingOutcome.length,
      zeroDuration: zeroDuration.length,
      missingStartTime: missingStartTime.length
    }
  };
}

async function verifyRailwayAPI() {
  console.log('🔍 RAILWAY API DATA VERIFICATION');
  console.log('='.repeat(60));
  console.log(`API Base: ${API_BASE}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // Test credentials
  console.log('🔐 Testing Login Credentials...\n');
  
  let workingToken = null;
  let workingCredentials = null;

  for (const creds of CREDENTIALS_TO_TEST) {
    process.stdout.write(`Testing ${creds.email}... `);
    const result = await testLogin(creds);
    
    if (result.success) {
      console.log('✅ SUCCESS');
      console.log(`   Role: ${result.user?.role || 'Unknown'}`);
      console.log(`   User ID: ${result.user?.userId || 'Unknown'}`);
      workingToken = result.token;
      workingCredentials = creds;
      break;
    } else {
      console.log(`❌ FAILED: ${result.error}`);
    }
  }

  if (!workingToken) {
    console.log('\n❌ CRITICAL: No working credentials found!');
    console.log('Cannot proceed with API verification.');
    console.log('\n💡 Action needed: Reset admin password or create new admin user.');
    return;
  }

  console.log(`\n✅ Authenticated with: ${workingCredentials.email}`);
  console.log(`🎫 Token (first 30 chars): ${workingToken.substring(0, 30)}...`);

  // Analyze call records
  const analysis = await analyzeCallRecords(workingToken);

  if (!analysis) {
    console.log('\n❌ Failed to analyze call records');
    return;
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Call Records: ${analysis.total}`);
  console.log(`Records with Recordings: ${analysis.withRecording} (${((analysis.withRecording/analysis.total)*100).toFixed(1)}%)`);
  console.log(`Records without Recordings: ${analysis.withoutRecording} (${((analysis.withoutRecording/analysis.total)*100).toFixed(1)}%)`);
  
  if (analysis.withoutRecording > 0) {
    console.log(`\n⚠️  ACTION REQUIRED:`);
    console.log(`   ${analysis.withoutRecording} call records have NO recordings.`);
    console.log(`   These records should either:`);
    console.log(`   1. Have their recordings uploaded/linked`);
    console.log(`   2. Be deleted if recordings are genuinely missing`);
    console.log(`\n   IDs of records without recordings:`);
    analysis.recordsWithoutRecording.forEach(r => {
      console.log(`   - ${r.id} (${r.callId})`);
    });
  } else {
    console.log(`\n✅ All call records have recordings!`);
  }

  if (Object.values(analysis.dataQuality).some(v => v > 0)) {
    console.log(`\n⚠️  DATA QUALITY ISSUES DETECTED:`);
    Object.entries(analysis.dataQuality).forEach(([issue, count]) => {
      if (count > 0) {
        console.log(`   - ${issue}: ${count} records`);
      }
    });
  } else {
    console.log(`\n✅ No data quality issues detected.`);
  }

  console.log('\n' + '='.repeat(60));
}

verifyRailwayAPI().catch(error => {
  console.error('\n❌ FATAL ERROR:', error);
  process.exit(1);
});

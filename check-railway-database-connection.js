/**
 * Check Railway backend database connection and get basic stats
 */

const fetch = require('node-fetch');

const API_BASE = 'https://froniterai-production.up.railway.app';

// Use the admin token from previous test
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDUiLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3MzkwNDc2MjEsImV4cCI6MTczOTA3NjQyMX0.iQpQiL4bwXwxZ_xE7EJLQO7kJ2ZUljP62lXqqWuvQhI';

async function checkRailwayDatabase() {
  console.log('🔍 Checking Railway backend database...\n');

  try {
    // Get call records from Railway API
    console.log('📡 Fetching call records from Railway API...');
    const response = await fetch(`${API_BASE}/api/call-records?limit=100`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log(`❌ API Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log('Error response:', errorText);
      return;
    }

    const data = await response.json();
    console.log(`✅ API Response received`);
    console.log(`📊 Total records: ${data.records?.length || 0}`);
    console.log(`📊 Pagination total: ${data.pagination?.total || 0}\n`);

    // Analyze the records
    const records = data.records || [];
    const withRecording = records.filter(r => r.recordingFile !== null);
    const withoutRecording = records.filter(r => r.recordingFile === null);

    console.log(`✅ Records WITH recording: ${withRecording.length}`);
    console.log(`❌ Records WITHOUT recording: ${withoutRecording.length}\n`);

    // Show IDs of records without recording
    if (withoutRecording.length > 0) {
      console.log('📋 Call Record IDs WITHOUT Recordings (from Railway API):');
      withoutRecording.forEach((record, i) => {
        console.log(`${i + 1}. ${record.id} - ${record.callId} - ${record.outcome || 'No Outcome'}`);
      });
      console.log('');
    }

    // Check if any of the 7 problem IDs are in the response
    const problemIds = [
      'cmm56k3d4000lbxrwfr9cvohy',
      'cmm50rdh4001311nuj1vpupkr',
      'cmm4nbteb000mzxo1z4yir43w',
      'cmm3vcwah000zho1r6i24vxnx',
      'cmm3odp85000br88qhp3lqe0h',
      'cmm3beu8d000jntct3d2oo6yt',
      'cmm3bcsr7000fntctfb9hda1l'
    ];

    console.log('🔍 Checking if the 7 problem IDs from previous test are in Railway response...');
    const foundIds = records.filter(r => problemIds.includes(r.id));
    console.log(`Found ${foundIds.length} of the 7 problem IDs in current Railway response\n`);

    if (foundIds.length > 0) {
      console.log('⚠️ CRITICAL: These IDs exist in Railway API but NOT in local database!');
      console.log('This means Railway is connected to a DIFFERENT database.');
      foundIds.forEach(r => {
        console.log(`  - ${r.id} - ${r.callId}`);
      });
    } else {
      console.log('✅ None of the 7 problem IDs are in current Railway response');
      console.log('This suggests Railway may have been redeployed with correct database.');
    }

    // Show all unique call record IDs from Railway
    console.log('\n📋 All Call Record IDs from Railway (first 20):');
    records.slice(0, 20).forEach((r, i) => {
      console.log(`${i + 1}. ${r.id} - ${r.callId} - ${r.recordingFile ? '✅' : '❌'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkRailwayDatabase().catch(console.error);

/**
 * Re-verify Railway API and delete via API endpoint if available
 */

const fetch = require('node-fetch');

const API_BASE = 'https://froniterai-production.up.railway.app';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDkiLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3MDk0MDUzNTAsImV4cCI6MTcwOTQzNDE1MH0.placeholder'; // Will get fresh token

async function loginAndDelete() {
  console.log('🔐 Logging in to Railway API...\n');

  // Fresh login
  const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'ken@simpleemails.co.uk',
      password: 'Kenzo3477!'
    })
  });

  if (!loginResponse.ok) {
    console.log('❌ Login failed');
    return;
  }

  const loginData = await loginResponse.json();
  const token = loginData.data?.token || loginData.token;
  console.log('✅ Login successful\n');

  // Get current call records
  console.log('📡 Fetching current call records from Railway API...\n');
  const callsResponse = await fetch(`${API_BASE}/api/call-records?limit=100`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!callsResponse.ok) {
    console.log('❌ Failed to fetch call records');
    return;
  }

  const callsData = await callsResponse.json();
  const records = callsData.records || [];
  const withoutRecording = records.filter(r => r.recordingFile === null || r.recordingFile === undefined);

  console.log(`📊 Total records: ${records.length}`);
  console.log(`❌ Records without recordings: ${withoutRecording.length}\n`);

  if (withoutRecording.length === 0) {
    console.log('✅ No broken records found! Railway API is now clean.\n');
    return;
  }

  console.log('⚠️  Found broken records:\n');
  withoutRecording.forEach((record, i) => {
    console.log(`${i + 1}. ${record.id} - ${record.callId} - ${record.phoneNumber}`);
  });
  console.log('');

  // Try to delete via API endpoint
  console.log('🗑️  Attempting to delete via Railway API...\n');
  
  const BROKEN_IDS = withoutRecording.map(r => r.id);
  
  for (const id of BROKEN_IDS) {
    process.stdout.write(`Deleting ${id}... `);
    
    try {
      const deleteResponse = await fetch(`${API_BASE}/api/call-records/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (deleteResponse.ok) {
        console.log('✅ Deleted');
      } else {
        const errorText = await deleteResponse.text();
        console.log(`❌ Failed: ${deleteResponse.status} - ${errorText}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  // Verify deletion
  console.log('\n🔍 Verifying deletion...\n');
  
  const verifyResponse = await fetch(`${API_BASE}/api/call-records?limit=100`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (verifyResponse.ok) {
    const verifyData = await verifyResponse.json();
    const remainingRecords = verifyData.records || [];
    const stillBroken = remainingRecords.filter(r => r.recordingFile === null);

    console.log(`📊 Total records: ${remainingRecords.length}`);
    console.log(`❌ Records still without recordings: ${stillBroken.length}\n`);

    if (stillBroken.length === 0) {
      console.log('🎉 SUCCESS! All broken records deleted!\n');
      console.log('✅ Railway API now returns only records with recordings.');
    } else {
      console.log('⚠️  Some records still remain. They may need manual deletion.\n');
      stillBroken.forEach(r => {
        console.log(`   - ${r.id} - ${r.callId}`);
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ CLEANUP ATTEMPT COMPLETE');
  console.log('='.repeat(60));
}

loginAndDelete().catch(console.error);

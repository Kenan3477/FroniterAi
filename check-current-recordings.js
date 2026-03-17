/**
 * Get current call records from Railway API and check their recording IDs
 */

const fetch = require('node-fetch');

const API_BASE = 'https://froniterai-production.up.railway.app';

async function checkCurrentRecordings() {
  console.log('🔍 Checking Current Call Records and Recording IDs\n');

  // Login
  const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'ken@simpleemails.co.uk',
      password: 'Kenzo3477!'
    })
  });

  const loginData = await loginResponse.json();
  const token = loginData.data?.token || loginData.token;
  console.log('✅ Logged in\n');

  // Get call records
  const callsResponse = await fetch(`${API_BASE}/api/call-records?limit=50`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const callsData = await callsResponse.json();
  const records = callsData.records || [];

  console.log(`📊 Total call records: ${records.length}\n`);

  // Analyze recording IDs
  console.log('🎙️  Call Records and Their Recording IDs:\n');
  
  records.forEach((record, i) => {
    console.log(`${i + 1}. Call Record: ${record.id}`);
    console.log(`   Phone: ${record.phoneNumber || 'N/A'}`);
    console.log(`   Outcome: ${record.outcome || 'N/A'}`);
    
    if (record.recordingFile) {
      console.log(`   ✅ Recording ID: ${record.recordingFile.id}`);
      console.log(`   📁 File Name: ${record.recordingFile.fileName}`);
    } else {
      console.log(`   ❌ No recording`);
    }
    console.log('');
  });

  // Check if the problematic ID exists
  const problematicId = 'cmm50qu23000u11nupdevjyvt';
  const found = records.find(r => r.recordingFile?.id === problematicId);

  console.log('─'.repeat(60));
  console.log(`\n🔍 Looking for problematic ID: ${problematicId}`);
  
  if (found) {
    console.log('⚠️  Found! This recording ID is being returned by the API.');
    console.log('Call Record:', found.id);
  } else {
    console.log('❌ Not found in API response.');
    console.log('The frontend may be using cached/stale data.');
  }

  // Test streaming one that DOES exist
  const workingRecord = records.find(r => r.recordingFile !== null);
  if (workingRecord) {
    console.log(`\n✅ Testing a working recording...`);
    console.log(`   Recording ID: ${workingRecord.recordingFile.id}`);
    
    const testStream = await fetch(`${API_BASE}/api/recordings/${workingRecord.recordingFile.id}/stream`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log(`   Stream Status: ${testStream.status} ${testStream.statusText}`);
    
    if (testStream.ok) {
      console.log(`   ✅ Streaming works!`);
    } else {
      const errorText = await testStream.text();
      console.log(`   ❌ Streaming failed:`, errorText);
    }
  }
}

checkCurrentRecordings().catch(console.error);

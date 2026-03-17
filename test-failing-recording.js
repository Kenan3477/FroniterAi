/**
 * Test the specific failing recording endpoint directly
 */

const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');

const API_BASE = 'https://froniterai-production.up.railway.app';
const prisma = new PrismaClient();

async function testFailingRecording() {
  console.log('🔍 Testing Failing Recording: cmm50qu23000u11nupdevjyvt\n');

  const recordingId = 'cmm50qu23000u11nupdevjyvt';

  try {
    // Step 1: Check if recording exists in local database
    console.log('1️⃣ Checking local database...\n');
    
    const localRecording = await prisma.recording.findUnique({
      where: { id: recordingId },
      include: {
        callRecord: true
      }
    });

    if (localRecording) {
      console.log('✅ Recording found in local database:');
      console.log(`   ID: ${localRecording.id}`);
      console.log(`   File: ${localRecording.fileName}`);
      console.log(`   Path: ${localRecording.filePath}`);
      console.log(`   Storage Type: ${localRecording.storageType}`);
      console.log(`   Duration: ${localRecording.duration}s`);
      console.log(`   Upload Status: ${localRecording.uploadStatus}`);
      console.log(`   Call Record ID: ${localRecording.callRecordId}`);
      console.log('');
    } else {
      console.log('❌ Recording NOT found in local database\n');
    }

    // Step 2: Login to Railway API
    console.log('2️⃣ Logging in to Railway API...\n');
    
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

    // Step 3: Test recording stream endpoint directly
    console.log('3️⃣ Testing Railway recording stream endpoint...\n');
    
    const streamResponse = await fetch(`${API_BASE}/api/recordings/${recordingId}/stream`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`   Status: ${streamResponse.status} ${streamResponse.statusText}`);
    console.log(`   Content-Type: ${streamResponse.headers.get('content-type')}`);
    console.log(`   Content-Length: ${streamResponse.headers.get('content-length')}`);

    if (!streamResponse.ok) {
      const errorText = await streamResponse.text();
      console.log(`   Error Body: ${errorText}\n`);
    } else {
      console.log('   ✅ Stream endpoint working!\n');
    }

    // Step 4: Check if call record exists in Railway API
    console.log('4️⃣ Checking call records via Railway API...\n');
    
    const callsResponse = await fetch(`${API_BASE}/api/call-records?limit=100`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (callsResponse.ok) {
      const callsData = await callsResponse.json();
      const records = callsData.records || [];
      
      const matchingRecord = records.find(r => 
        r.recordingFile?.id === recordingId || 
        r.id === localRecording?.callRecordId
      );

      if (matchingRecord) {
        console.log('✅ Found matching call record in Railway API:');
        console.log(`   Call Record ID: ${matchingRecord.id}`);
        console.log(`   Call ID: ${matchingRecord.callId}`);
        console.log(`   Phone: ${matchingRecord.phoneNumber}`);
        console.log(`   Recording File: ${matchingRecord.recordingFile ? 'Present' : 'Missing'}`);
        if (matchingRecord.recordingFile) {
          console.log(`   Recording ID: ${matchingRecord.recordingFile.id}`);
          console.log(`   Recording File Name: ${matchingRecord.recordingFile.fileName}`);
        }
        console.log('');
      } else {
        console.log('❌ No matching call record found in Railway API');
        console.log(`   Railway API returned ${records.length} total records`);
        console.log('');
      }
    }

    // Step 5: Diagnose the issue
    console.log('5️⃣ Diagnosis:\n');
    
    if (!localRecording) {
      console.log('🔍 Recording doesn\'t exist in local database connection');
      console.log('   This suggests Railway is using different database or cached data');
    } else if (streamResponse.status === 503) {
      console.log('🔍 Recording exists but stream returns 503 Service Unavailable');
      console.log('   This suggests Railway backend has different code or environment');
    } else if (streamResponse.status === 501) {
      console.log('🔍 Recording exists but stream returns 501 Not Implemented');
      console.log('   This means recording has incorrect storageType in Railway\'s database');
    } else if (streamResponse.ok) {
      console.log('🔍 Recording stream works fine');
      console.log('   The frontend error might be temporary or browser-related');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testFailingRecording().catch(console.error);
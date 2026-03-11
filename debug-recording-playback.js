/**
 * Debug the specific recording that's failing to play
 */

const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const API_BASE = 'https://froniterai-production.up.railway.app';

async function debugRecordingPlayback() {
  console.log('🔍 Debugging Recording Playback Issue\n');

  const recordingId = 'cmm50qu23000u11nupdevjyvt';
  console.log(`Target Recording ID: ${recordingId}\n`);

  try {
    // 1. Check if recording exists in database
    console.log('📊 Step 1: Check database...');
    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
      include: {
        callRecord: true
      }
    });

    if (!recording) {
      console.log('❌ Recording NOT found in database!\n');
      return;
    }

    console.log('✅ Recording found in database:');
    console.log(`   ID: ${recording.id}`);
    console.log(`   File Name: ${recording.fileName}`);
    console.log(`   File Path: ${recording.filePath}`);
    console.log(`   Storage Type: ${recording.storageType}`);
    console.log(`   Duration: ${recording.duration}s`);
    console.log(`   Upload Status: ${recording.uploadStatus}`);
    console.log(`   Call Record ID: ${recording.callRecordId}`);
    console.log('');

    // 2. Extract Twilio Recording SID
    console.log('🔍 Step 2: Extract Twilio Recording SID...');
    
    let recordingSid = '';
    
    // Try from fileName
    if (recording.fileName.includes('_')) {
      recordingSid = recording.fileName.split('_')[1]?.replace('.wav', '').replace('.mp3', '');
    }
    
    // Try from filePath
    if (!recordingSid && recording.filePath) {
      const pathParts = recording.filePath.split('/');
      recordingSid = pathParts[pathParts.length - 1];
    }

    if (recordingSid) {
      console.log(`✅ Extracted SID: ${recordingSid}`);
      console.log(`   Valid format: ${recordingSid.startsWith('RE') ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log('❌ Could not extract Recording SID!');
    }
    console.log('');

    // 3. Login and test the API endpoint
    console.log('🔐 Step 3: Login to Railway API...');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ken@simpleemails.co.uk',
        password: 'Kenzo3477!'
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed\n');
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.data?.token || loginData.token;
    console.log('✅ Login successful\n');

    // 4. Test the streaming endpoint
    console.log('📡 Step 4: Test streaming endpoint...');
    console.log(`   URL: ${API_BASE}/api/recordings/${recordingId}/stream\n`);

    const streamResponse = await fetch(`${API_BASE}/api/recordings/${recordingId}/stream`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Response Status: ${streamResponse.status} ${streamResponse.statusText}`);
    console.log(`Content-Type: ${streamResponse.headers.get('content-type')}`);
    console.log('');

    if (!streamResponse.ok) {
      const errorText = await streamResponse.text();
      console.log('❌ Streaming failed!');
      console.log('Error Response:', errorText);
      console.log('');

      // Try to parse as JSON
      try {
        const errorJson = JSON.parse(errorText);
        console.log('Error Details:');
        console.log(JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.log('Raw Error:', errorText);
      }
    } else {
      console.log('✅ Streaming endpoint working!');
      console.log(`   Content length: ${streamResponse.headers.get('content-length')} bytes`);
    }

    // 5. Check Twilio credentials
    console.log('\n🔧 Step 5: Check Twilio configuration...');
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    console.log(`   Account SID configured: ${accountSid ? '✅ YES' : '❌ NO'}`);
    console.log(`   Auth Token configured: ${authToken ? '✅ YES' : '❌ NO'}`);

    if (accountSid) {
      console.log(`   Account SID: ${accountSid.substring(0, 10)}...`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugRecordingPlayback().catch(console.error);

/**
 * Test migration endpoint and run it manually via direct database connection
 */

const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');

const API_BASE = 'https://froniterai-production.up.railway.app';
const prisma = new PrismaClient();

async function fixRecordingStorageDirectly() {
  console.log('🔧 FIXING RECORDING STORAGE TYPES DIRECTLY\n');
  
  // Step 1: Login to get token
  console.log('1️⃣ Logging in...');
  
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

  // Step 2: Check current recording with issue
  console.log('2️⃣ Checking problematic recording...\n');
  
  const problematicId = 'cmm56k0l6000dbxrw0b9k9xa5';
  const recording = await prisma.recording.findUnique({
    where: { id: problematicId }
  });

  if (recording) {
    console.log('Found problematic recording:');
    console.log(`   ID: ${recording.id}`);
    console.log(`   File: ${recording.fileName}`);
    console.log(`   Storage Type: ${recording.storageType}`);
    console.log(`   File Path: ${recording.filePath}`);
    console.log('');

    if (recording.storageType !== 'twilio') {
      console.log('❌ Storage type is incorrect, needs to be "twilio"');
    }
  } else {
    console.log('❌ Recording not found in local database connection');
  }

  // Step 3: Run migration directly
  console.log('3️⃣ Running migration on ALL recordings...\n');
  
  try {
    // Get current storage type distribution
    const allRecordings = await prisma.recording.findMany({
      select: { storageType: true }
    });

    const counts = {};
    allRecordings.forEach(r => {
      const type = r.storageType || 'NULL';
      counts[type] = (counts[type] || 0) + 1;
    });

    console.log('Current storage types:');
    Object.entries(counts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    console.log('');

    // Update ALL recordings to storageType = 'twilio'
    const updateResult = await prisma.recording.updateMany({
      data: {
        storageType: 'twilio'
      }
    });

    console.log(`✅ Updated ${updateResult.count} recordings to storageType = "twilio"\n`);

    // Verify
    const verifyRecordings = await prisma.recording.findMany({
      select: { storageType: true }
    });

    const verifyCounts = {};
    verifyRecordings.forEach(r => {
      const type = r.storageType || 'NULL';
      verifyCounts[type] = (verifyCounts[type] || 0) + 1;
    });

    console.log('Updated storage types:');
    Object.entries(verifyCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    console.log('');

    if (verifyCounts['twilio'] === verifyRecordings.length) {
      console.log('🎉 SUCCESS! All recordings now have storageType = "twilio"');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }

  // Step 4: Test recording stream
  console.log('4️⃣ Testing recording stream...\n');
  
  const testResponse = await fetch(`${API_BASE}/api/recordings/${problematicId}/stream`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  console.log(`Stream Test: ${testResponse.status} ${testResponse.statusText}`);

  if (testResponse.ok) {
    console.log('🎉 SUCCESS! Recording streaming now works!');
  } else if (testResponse.status === 501) {
    console.log('⚠️  Still getting 501 - Railway backend may not have refreshed yet');
    console.log('   Try restarting Railway service or wait 5 minutes');
  } else {
    console.log('❓ Different error - check logs');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ DIRECT MIGRATION COMPLETE');
  console.log('='.repeat(60));

  await prisma.$disconnect();
}

fixRecordingStorageDirectly().catch(console.error);
/**
 * Check if Railway backend and local Prisma connect to same database
 */

const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');

async function checkDatabaseConnection() {
  console.log('🔍 Checking Railway Backend vs Local Database Connection\n');
  console.log('='.repeat(70) + '\n');
  
  try {
    // Step 1: Login to Railway
    console.log('1. Logging into Railway API...');
    const loginRes = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ken@simpleemails.co.uk',
        password: 'Kenzo3477!'
      })
    });
    
    const loginData = await loginRes.json();
    const token = loginData.data?.token || loginData.token;
    
    if (!token) {
      console.log('❌ Failed to login');
      console.log('Response:', loginData);
      return;
    }
    
    console.log('✅ Logged in successfully\n');
    
    // Step 2: Get call records from Railway API
    console.log('2. Fetching call records from Railway API...');
    const callsRes = await fetch('https://froniterai-production.up.railway.app/api/call-records?limit=10', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const callsData = await callsRes.json();
    const records = callsData.records || [];
    
    console.log(`✅ Railway API returned ${records.length} records\n`);
    
    if (records.length === 0) {
      console.log('⚠️  No records found in Railway API');
      return;
    }
    
    // Step 3: Pick first recording
    const firstWithRecording = records.find(r => r.recordingFile);
    
    if (!firstWithRecording) {
      console.log('⚠️  No records with recordings found');
      return;
    }
    
    console.log('📋 Test Recording from Railway API:');
    console.log(`   Recording ID: ${firstWithRecording.recordingFile.id}`);
    console.log(`   Call Record ID: ${firstWithRecording.id}`);
    console.log(`   File Name: ${firstWithRecording.recordingFile.fileName}`);
    console.log('');
    
    // Step 4: Check local database
    console.log('3. Checking local database for this recording...');
    
    const prisma = new PrismaClient();
    
    const localRecording = await prisma.recording.findUnique({
      where: { id: firstWithRecording.recordingFile.id },
      include: { callRecord: true }
    });
    
    if (localRecording) {
      console.log('✅ Recording FOUND in local database!');
      console.log(`   ID: ${localRecording.id}`);
      console.log(`   File Name: ${localRecording.fileName}`);
      console.log(`   Storage Type: ${localRecording.storageType}`);
      console.log(`   Upload Status: ${localRecording.uploadStatus}`);
      console.log('');
      console.log('✅ CONCLUSION: Both Railway backend and local Prisma connect to SAME database.\n');
    } else {
      console.log('❌ Recording NOT FOUND in local database!\n');
      console.log('🚨 CRITICAL DATABASE MISMATCH DETECTED!\n');
      console.log('This means:');
      console.log('   - Railway backend connects to one database');
      console.log('   - Local Prisma connects to a different database');
      console.log('');
      console.log('💡 Solutions:');
      console.log('   1. Check Railway environment variables for DATABASE_URL');
      console.log('   2. Check local .env file for DATABASE_URL');
      console.log('   3. Ensure both point to same PostgreSQL instance\n');
    }
    
    // Step 5: Cross-check - query all recordings in local DB
    console.log('4. Checking local database recordings count...');
    const localRecordingsCount = await prisma.recording.count();
    console.log(`   Local database has ${localRecordingsCount} recordings\n`);
    
    if (localRecordingsCount === 0) {
      console.log('⚠️  WARNING: Local database has ZERO recordings!');
      console.log('   This strongly suggests you\'re connected to WRONG database.\n');
    }
    
    // Step 6: Check if local database has any call records
    console.log('5. Checking local database call records count...');
    const localCallRecordsCount = await prisma.callRecord.count();
    console.log(`   Local database has ${localCallRecordsCount} call records\n`);
    
    await prisma.$disconnect();
    
    // Final summary
    console.log('='.repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));
    console.log(`Railway API:      ${records.length} call records returned`);
    console.log(`Local Database:   ${localCallRecordsCount} call records`);
    console.log(`Local Recordings: ${localRecordingsCount} recordings`);
    console.log('');
    
    if (localCallRecordsCount === 0 && localRecordingsCount === 0) {
      console.log('🚨 CRITICAL: Local database is EMPTY!');
      console.log('   You are NOT connected to Railway production database.\n');
      console.log('📝 Check your DATABASE_URL in .env file:');
      console.log('   Current: ' + process.env.DATABASE_URL);
      console.log('');
      console.log('   It should be: postgresql://postgres:***@interchange.proxy.rlwy.net:42798/railway\n');
    } else if (localRecording) {
      console.log('✅ SUCCESS: Both connected to same database!');
      console.log('   The 503 error is NOT a database connection issue.\n');
    } else {
      console.log('❌ PARTIAL MATCH: Databases have different data.');
      console.log('   Possible reasons:');
      console.log('   - Railway recently deployed new database');
      console.log('   - Data was added to Railway but not synced locally');
      console.log('   - Multiple database instances exist\n');
    }
    
    console.log('='.repeat(70) + '\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

checkDatabaseConnection().catch(console.error);

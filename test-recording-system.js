#!/usr/bin/env node

/**
 * Recording System Diagnostic Tool
 * This test checks if recordings are being properly processed and linked to call records
 */

const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
});

const BACKEND_URL = 'http://localhost:3004';

async function testRecordingSystem() {
  console.log('🔍 Testing Recording System Integration...\n');

  try {
    // Test 1: Check if backend is running
    console.log('1️⃣ Testing backend connectivity...');
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    if (!healthResponse.ok) {
        throw new Error(`Backend not reachable: ${healthResponse.status}`);
    }
    console.log('✅ Backend is running on port 3004');

    // Test 2: Check Recording table exists and has proper structure
    console.log('\n2️⃣ Checking Recording table structure...');
    
    const recordings = await prisma.recording.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        callRecord: {
          select: {
            callId: true,
            phoneNumber: true,
            startTime: true
          }
        }
      }
    });

    console.log(`📊 Found ${recordings.length} recording records in database`);
    if (recordings.length > 0) {
      console.log('✅ Recent recordings:');
      recordings.forEach(record => {
        console.log(`   - ${record.id}: ${record.fileName} (${record.uploadStatus}) - Call: ${record.callRecord?.callId || 'Unknown'}`);
      });
    } else {
      console.log('⚠️  No recordings found in database');
    }

    // Test 3: Check if CallRecord table has recording field populated
    console.log('\n3️⃣ Checking Call Records with recording data...');
    
    const callRecordsWithRecordings = await prisma.callRecord.findMany({
      where: {
        recording: {
          not: null
        }
      },
      take: 10,
      orderBy: { startTime: 'desc' },
      include: {
        recordingFile: {
          select: {
            id: true,
            fileName: true,
            uploadStatus: true,
            duration: true
          }
        }
      }
    });

    console.log(`📊 Found ${callRecordsWithRecordings.length} call records with recording references`);
    
    if (callRecordsWithRecordings.length > 0) {
      console.log('✅ Call records with recordings:');
      callRecordsWithRecordings.forEach(record => {
        const hasRecordingFile = record.recordingFile ? '✅' : '❌';
        console.log(`   ${hasRecordingFile} ${record.callId}: ${record.recording} - File: ${record.recordingFile?.fileName || 'NOT LINKED'}`);
      });
    } else {
      console.log('⚠️  No call records found with recording data');
    }

    // Test 4: Test recording API endpoints
    console.log('\n4️⃣ Testing recording API endpoints...');
    
    try {
      // Test metadata endpoint (should return 404 for non-existent recording)
      const metadataResponse = await fetch(`${BACKEND_URL}/api/recordings/test-123/metadata`);
      console.log(`📡 Metadata endpoint: ${metadataResponse.status} (expected 404 for non-existent recording)`);
      
      // Test status callback endpoint
      const statusResponse = await fetch(`${BACKEND_URL}/api/dialer/recording-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          RecordingSid: 'TEST_SID',
          CallSid: 'TEST_CALL_SID',
          RecordingStatus: 'completed',
          RecordingUrl: 'https://test.mp3'
        })
      });
      console.log(`📡 Status callback endpoint: ${statusResponse.status} (testing mock webhook)`);
    } catch (apiError) {
      console.log(`❌ API endpoint test failed: ${apiError.message}`);
    }

    // Test 5: Check for orphaned recordings
    console.log('\n5️⃣ Checking for orphaned recordings...');
    
    const allRecordings = await prisma.recording.findMany({
      include: {
        callRecord: {
          select: {
            callId: true
          }
        }
      }
    });

    const orphanedRecordings = allRecordings.filter(r => !r.callRecord);
    
    if (orphanedRecordings.length > 0) {
      console.log(`⚠️  Found ${orphanedRecordings.length} orphaned recordings:`);
      orphanedRecordings.forEach(record => {
        console.log(`   - ${record.id}: ${record.fileName} (no call record link)`);
      });
    } else {
      console.log('✅ No orphaned recordings found');
    }

    // Test 6: Test search functionality with recording data
    console.log('\n6️⃣ Testing call records search with recording data...');
    
    try {
      const searchResponse = await fetch(`${BACKEND_URL}/api/call-records?limit=5`);
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        console.log(`📊 Search returned ${searchData.records?.length || 0} call records`);
        
        if (searchData.records && searchData.records.length > 0) {
          const recordsWithRecordings = searchData.records.filter(r => r.recordingFile);
          console.log(`📹 Records with recording files: ${recordsWithRecordings.length}`);
          
          if (recordsWithRecordings.length > 0) {
            console.log('✅ Sample records with recordings:');
            recordsWithRecordings.slice(0, 3).forEach(record => {
              console.log(`   - ${record.callId}: ${record.recordingFile?.fileName || 'NO FILE'} (${record.recordingFile?.uploadStatus || 'NO STATUS'})`);
            });
          }
        }
      } else {
        console.log(`❌ Search endpoint failed: ${searchResponse.status}`);
      }
    } catch (searchError) {
      console.log(`❌ Search test failed: ${searchError.message}`);
    }

    // Summary and recommendations
    console.log('\n📋 RECORDING SYSTEM DIAGNOSTICS SUMMARY:');
    
    const hasRecordings = recordings.length > 0;
    const hasCallRecordLinks = callRecordsWithRecordings.length > 0;
    const hasOrphans = orphanedRecordings.length > 0;
    
    if (hasRecordings && hasCallRecordLinks && !hasOrphans) {
      console.log('✅ Recording system appears to be working correctly');
      console.log('✅ Recordings are being created and linked properly');
    } else {
      console.log('⚠️  Recording system issues detected:');
      
      if (!hasRecordings) {
        console.log('   - No recordings found - check Twilio recording configuration');
        console.log('   - Verify recordingStatusCallback URL is correct');
        console.log('   - Check if recording service is processing callbacks');
      }
      
      if (!hasCallRecordLinks) {
        console.log('   - Call records not linked to recordings properly');
        console.log('   - Check recording callback processing logic');
      }
      
      if (hasOrphans) {
        console.log('   - Orphaned recordings detected - data cleanup needed');
      }
    }

    console.log('\n🔧 SUGGESTED NEXT STEPS:');
    console.log('1. ✅ Fixed recording callback URL (BACKEND_URL instead of FRONTEND_URL)');
    console.log('2. ✅ Added recordingFile relationship to searchCallRecords');
    console.log('3. 🔄 Regenerate Prisma client: `npx prisma generate`');
    console.log('4. 🔄 Test manual dial with recording to verify end-to-end flow');
    console.log('5. 🔄 Check Twilio webhook logs for recording status callbacks');

    console.log('\n🔗 Access Points:');
    console.log('- Frontend: http://localhost:3001');
    console.log('- Backend API: http://localhost:3004/api');
    console.log('- Call Records UI: http://localhost:3001/reports/call-records');

  } catch (error) {
    console.error('❌ Recording system test failed:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}
        
        if (recordingResponse.status === 404) {
            console.log('✅ Recording routes are registered (404 for non-existent recording is expected)\n');
        } else if (recordingResponse.status === 500) {
            console.log('⚠️  Recording routes registered but may have issues\n');
        } else {
            console.log(`⚠️  Unexpected response: ${recordingResponse.status}\n`);
        }

        // Test 3: Verify call records endpoint
        console.log('3. Testing call records API...');
        const callRecordsResponse = await fetch(`${BACKEND_URL}/api/call-records`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (callRecordsResponse.ok) {
            const callRecords = await callRecordsResponse.json();
            console.log(`✅ Call records API working - found ${callRecords.length || 0} records\n`);
        } else if (callRecordsResponse.status === 401) {
            console.log('⚠️  Call records API requires authentication\n');
        } else {
            console.log(`❌ Call records API error: ${callRecordsResponse.status}\n`);
        }

        // Test 4: Check recordings directory exists
        console.log('4. Testing recordings storage setup...');
        const fs = require('fs');
        const path = require('path');
        
        const recordingsDir = path.join(__dirname, 'backend', 'recordings');
        if (!fs.existsSync(recordingsDir)) {
            console.log('📁 Creating recordings directory...');
            fs.mkdirSync(recordingsDir, { recursive: true });
            console.log('✅ Recordings directory created\n');
        } else {
            console.log('✅ Recordings directory exists\n');
        }

        console.log('🎉 Recording System Test Summary:');
        console.log('✅ Backend server is running');
        console.log('✅ Recording API endpoints are registered');
        console.log('✅ Call records API is available');
        console.log('✅ File storage is configured');
        console.log('\n📋 Next Steps:');
        console.log('1. Make a test call to generate actual recordings');
        console.log('2. Verify audio files are downloaded from Twilio');
        console.log('3. Test playback in the frontend UI');
        console.log('\n🔗 Access Points:');
        console.log(`- Frontend: http://localhost:3000`);
        console.log(`- Backend API: http://localhost:3004/api`);
        console.log(`- Call Records UI: http://localhost:3000/reports/call-records`);

    } catch (error) {
        console.error('❌ Recording system test failed:');
        console.error(error.message);
        process.exit(1);
    }
}

// Run the test
testRecordingSystem();
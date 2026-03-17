#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugRecordingIssue() {
  try {
    console.log('🔍 DEBUGGING RECORDING PLAYBACK ISSUE...\n');

    // Check the specific call record that's showing in the UI
    console.log('1️⃣ Checking call records with phone +447496603827...');
    const callRecords = await prisma.callRecord.findMany({
      where: {
        phoneNumber: '+447496603827'
      },
      include: {
        recordingFile: true,
        contact: true,
        agent: true,
        campaign: true
      },
      orderBy: { startTime: 'desc' }
    });

    console.log(`📞 Found ${callRecords.length} matching call records:`);
    
    callRecords.forEach((record, index) => {
      console.log(`\n--- Call Record ${index + 1} ---`);
      console.log(`Call ID: ${record.callId}`);
      console.log(`Phone: ${record.phoneNumber}`);
      console.log(`Start Time: ${record.startTime}`);
      console.log(`Duration: ${record.duration}s`);
      console.log(`Outcome: ${record.outcome}`);
      console.log(`Recording field (legacy): ${record.recording || 'None'}`);
      console.log(`Recording File relation: ${record.recordingFile ? 'YES' : 'NO'}`);
      
      if (record.recordingFile) {
        console.log(`  Recording File ID: ${record.recordingFile.id}`);
        console.log(`  Recording File Name: ${record.recordingFile.fileName}`);
        console.log(`  Recording File Path: ${record.recordingFile.filePath}`);
        console.log(`  Recording Upload Status: ${record.recordingFile.uploadStatus}`);
        console.log(`  Recording Duration: ${record.recordingFile.duration}`);
      }
      
      if (record.contact) {
        console.log(`  Contact: ${record.contact.firstName} ${record.contact.lastName}`);
      }
      
      if (record.agent) {
        console.log(`  Agent: ${record.agent.firstName} ${record.agent.lastName}`);
      }
    });

    // Check all recordings in database
    console.log('\n2️⃣ Checking ALL recordings in database...');
    const allRecordings = await prisma.recording.findMany({
      include: {
        callRecord: {
          select: {
            callId: true,
            phoneNumber: true,
            startTime: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`📹 Found ${allRecordings.length} recording records:`);
    allRecordings.forEach((recording, index) => {
      console.log(`\n--- Recording ${index + 1} ---`);
      console.log(`Recording ID: ${recording.id}`);
      console.log(`File Name: ${recording.fileName}`);
      console.log(`File Path: ${recording.filePath}`);
      console.log(`Upload Status: ${recording.uploadStatus}`);
      console.log(`Duration: ${recording.duration}`);
      console.log(`Call ID: ${recording.callRecord?.callId || 'Unknown'}`);
      console.log(`Phone: ${recording.callRecord?.phoneNumber || 'Unknown'}`);
    });

    // Check if there are any call records with the legacy recording field populated
    console.log('\n3️⃣ Checking call records with legacy recording field...');
    const legacyRecordings = await prisma.callRecord.findMany({
      where: {
        recording: {
          not: null
        }
      },
      take: 5,
      orderBy: { startTime: 'desc' }
    });

    console.log(`📼 Found ${legacyRecordings.length} records with legacy recording field:`);
    legacyRecordings.forEach(record => {
      console.log(`- ${record.callId}: recording = "${record.recording}"`);
    });

  } catch (error) {
    console.error('❌ Error debugging recording issue:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugRecordingIssue();
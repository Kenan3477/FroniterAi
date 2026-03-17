const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCallRecords() {
  console.log('=== CHECKING ALL CALL RECORDS ===');
  
  const callRecords = await prisma.callRecord.findMany({
    include: {
      contact: true,
      campaign: true,
      recordingFile: true
    },
    orderBy: {
      startTime: 'desc'
    }
  });
  
  console.log(`\nFound ${callRecords.length} call records:`);
  
  callRecords.forEach((record, index) => {
    console.log(`\n--- Call Record ${index + 1} ---`);
    console.log(`Call ID: ${record.callId}`);
    console.log(`Phone: ${record.phoneNumber}`);
    console.log(`Type: ${record.callType}`);
    console.log(`Start: ${record.startTime}`);
    console.log(`End: ${record.endTime || 'Not ended'}`);
    console.log(`Recording field: ${record.recording || 'None'}`);
    console.log(`Contact: ${record.contact?.firstName} ${record.contact?.lastName}`);
    console.log(`Campaign: ${record.campaign?.name}`);
    console.log(`Recording file: ${record.recordingFile ? 'YES' : 'NO'}`);
    
    if (record.recordingFile) {
      console.log(`  Recording: ${record.recordingFile.fileName} - ${record.recordingFile.uploadStatus}`);
    }
  });
  
  console.log('\n=== CHECKING ALL RECORDINGS ===');
  
  const recordings = await prisma.recording.findMany({
    include: {
      callRecord: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  console.log(`\nFound ${recordings.length} recording records:`);
  
  recordings.forEach((rec, index) => {
    console.log(`\n--- Recording ${index + 1} ---`);
    console.log(`ID: ${rec.id}`);
    console.log(`File Name: ${rec.fileName}`);
    console.log(`File Path: ${rec.filePath}`);
    console.log(`Duration: ${rec.duration}`);
    console.log(`Upload Status: ${rec.uploadStatus}`);
    console.log(`Call Record ID: ${rec.callRecordId || 'None'}`);
    console.log(`Created: ${rec.createdAt}`);
  });
  
  await prisma.$disconnect();
}

checkCallRecords().catch(console.error);
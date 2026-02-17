#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixRecordingFile() {
  try {
    console.log('🔧 Updating recording to use demo file...');
    
    const result = await prisma.recording.update({
      where: { id: 'cmlp67yhn000cmhih4hmhzm8r' },
      data: {
        filePath: 'demo-1',
        fileName: 'demo-recording.mp3',
        uploadStatus: 'completed'
      }
    });
    
    console.log('✅ Recording updated:', result.id);
    console.log('New file path:', result.filePath);
    
    // Also update the call record to remove the old recording URL
    await prisma.callRecord.update({
      where: { id: result.callRecordId },
      data: { recording: null }
    });
    
    console.log('✅ Call record updated - removed legacy recording URL');
    
  } catch (error) {
    console.error('❌ Error fixing recording:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRecordingFile();
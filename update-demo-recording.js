/**
 * Update a call record with a demo recording URL for testing
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { 
    db: { 
      url: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
    }
  }
});

async function updateCallWithDemoRecording() {
  try {
    console.log('🔧 Updating call with demo recording URL...');
    
    // Use a public demo audio file for testing
    const demoRecordingUrl = 'https://file-examples.com/storage/fef30a16c5e27b38c74b7e1/2017/11/file_example_WAV_1MG.wav';
    
    const updatedCall = await prisma.callRecord.update({
      where: { id: 'cmm56j7pg000abxrw294dwtiv' },
      data: { 
        recording: demoRecordingUrl
      }
    });
    
    console.log('✅ Recording URL updated for call:', updatedCall.id, 'Phone:', updatedCall.phoneNumber);
    console.log('   New URL:', demoRecordingUrl);
    
  } catch (error) {
    console.error('❌ Error updating call:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateCallWithDemoRecording();
/**
 * Update call with a simple working audio URL for testing
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { 
    db: { 
      url: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
    }
  }
});

async function updateWithWorkingUrl() {
  try {
    console.log('🔧 Updating call with working audio URL...');
    
    // Using a GitHub hosted demo file that should be accessible
    const workingRecordingUrl = 'https://github.com/adobe/web-platform-tests/raw/master/media/test-audio.wav';
    
    const updatedCall = await prisma.callRecord.update({
      where: { id: 'cmm56j7pg000abxrw294dwtiv' },
      data: { 
        recording: workingRecordingUrl
      }
    });
    
    console.log('✅ Recording URL updated for call:', updatedCall.id, 'Phone:', updatedCall.phoneNumber);
    console.log('   New URL:', workingRecordingUrl);
    
  } catch (error) {
    console.error('❌ Error updating call:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateWithWorkingUrl();
/**
 * Check what recording URLs look like in the database
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { 
    db: { 
      url: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
    }
  }
});

async function checkRecordingUrls() {
  try {
    console.log('🔍 Checking recording URLs...');
    
    const call = await prisma.callRecord.findFirst({
      where: { id: 'cmm56j7pg000abxrw294dwtiv' },
      select: { 
        id: true, 
        phoneNumber: true, 
        recording: true,
        duration: true
      }
    });
    
    if (call) {
      console.log(`📞 Call ${call.id}:`);
      console.log(`   Phone: ${call.phoneNumber}`);
      console.log(`   Duration: ${call.duration}s`);
      console.log(`   Recording URL: ${call.recording}`);
      console.log('');
    } else {
      console.log('❌ Call not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecordingUrls();
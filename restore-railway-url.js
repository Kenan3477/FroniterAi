/**
 * Restore original Railway recording URL
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { 
    db: { 
      url: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
    }
  }
});

async function restoreRailwayUrl() {
  try {
    console.log('🔧 Restoring original Railway recording URL...');
    
    // Use the original Railway URL
    const railwayRecordingUrl = 'https://froniterai-production.up.railway.app/api/recordings/cmm56k0l6000dbxrw0b9k9xa5/download';
    
    const updatedCall = await prisma.callRecord.update({
      where: { id: 'cmm56j7pg000abxrw294dwtiv' },
      data: { 
        recording: railwayRecordingUrl
      }
    });
    
    console.log('✅ Recording URL restored for call:', updatedCall.id, 'Phone:', updatedCall.phoneNumber);
    console.log('   Railway URL:', railwayRecordingUrl);
    
  } catch (error) {
    console.error('❌ Error restoring URL:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

restoreRailwayUrl();
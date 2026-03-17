/**
 * Check what call IDs actually exist in the database
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { 
    db: { 
      url: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
    }
  }
});

async function checkCallIds() {
  try {
    console.log('🔍 Checking recent call IDs...');
    
    const calls = await prisma.callRecord.findMany({
      select: { 
        id: true, 
        phoneNumber: true, 
        recording: true,
        createdAt: true 
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`📞 Found ${calls.length} recent calls:`);
    calls.forEach((call, index) => {
      console.log(`  ${index + 1}. ID: ${call.id}`);
      console.log(`     Phone: ${call.phoneNumber || 'N/A'}`);
      console.log(`     Recording: ${call.recording ? '✅ Yes' : '❌ No'}`);
      console.log(`     Created: ${call.createdAt}`);
      console.log('');
    });
    
    if (calls.length === 0) {
      console.log('❌ No calls found in database');
    }
    
  } catch (error) {
    console.error('❌ Error checking calls:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCallIds();
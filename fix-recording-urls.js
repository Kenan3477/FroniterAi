const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
});

async function fixRecordingUrls() {
  try {
    console.log('🔧 Fixing recording URLs from localhost to Railway...');
    
    // Find all call records with localhost recording URLs
    const callsWithLocalhostRecordings = await prisma.callRecord.findMany({
      where: {
        recording: {
          contains: 'localhost:3004'
        }
      }
    });

    console.log(`📊 Found ${callsWithLocalhostRecordings.length} calls with localhost recording URLs`);

    // Update each call record
    for (const call of callsWithLocalhostRecordings) {
      const oldUrl = call.recording;
      const newUrl = oldUrl.replace('http://localhost:3004', 'https://froniterai-production.up.railway.app');
      
      await prisma.callRecord.update({
        where: { id: call.id },
        data: { recording: newUrl }
      });

      console.log(`✅ Updated call ${call.callId}:`);
      console.log(`   From: ${oldUrl}`);
      console.log(`   To: ${newUrl}`);
    }

    console.log(`\n🎯 Fixed ${callsWithLocalhostRecordings.length} recording URLs`);
    
    // Verify the fix
    const updatedCalls = await prisma.callRecord.findMany({
      where: {
        agentId: '509',
        recording: { not: null }
      },
      select: {
        callId: true,
        recording: true,
        duration: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`\n📋 Verified recording URLs:`);
    updatedCalls.forEach((call, index) => {
      console.log(`${index + 1}. ${call.callId} (${call.duration}s)`);
      console.log(`   Recording: ${call.recording}`);
    });

  } catch (error) {
    console.error('Error fixing recording URLs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRecordingUrls();
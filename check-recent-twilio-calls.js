const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
});

async function checkRecentTwilioCalls() {
  try {
    console.log('🔍 Looking for recent Twilio calls without recordings...');
    
    // Check all calls from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const recentCalls = await prisma.callRecord.findMany({
      where: {
        createdAt: {
          gte: today
        }
      },
      include: {
        agent: true,
        contact: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Found ${recentCalls.length} calls today:`);
    
    recentCalls.forEach((call, index) => {
      console.log(`\n${index + 1}. Call ID: ${call.callId}`);
      console.log(`   Agent: ${call.agent?.firstName || 'Unknown'} ${call.agent?.lastName || ''} (${call.agentId})`);
      console.log(`   Phone: ${call.phoneNumber}`);
      console.log(`   Duration: ${call.duration || 'N/A'} seconds`);
      console.log(`   Recording: ${call.recording ? 'HAS RECORDING' : 'NO RECORDING'}`);
      console.log(`   Created: ${call.createdAt}`);
      
      // Check if this is a real Twilio call
      if (call.callId && call.callId.startsWith('CA')) {
        console.log(`   🎯 REAL TWILIO CALL (CallSid format)`);
      } else if (call.callId && call.callId.startsWith('conf-')) {
        console.log(`   📞 CONFERENCE/REAL CALL (with recording: ${call.recording ? 'YES' : 'NO'})`);
      } else if (call.callId && call.callId.startsWith('call-')) {
        console.log(`   🧪 TEST/MANUAL CALL (via save-call-data)`);
      } else {
        console.log(`   ❓ UNKNOWN CALL TYPE`);
      }
    });

    // Also check for calls that might have Twilio CallSids but no recordings
    const twilioCallsNoRecordings = await prisma.callRecord.findMany({
      where: {
        OR: [
          { callId: { startsWith: 'CA' } }, // Twilio CallSid format
          { callId: { startsWith: 'conf-' } } // Conference calls
        ],
        recording: null,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    console.log(`\n⚠️ Twilio calls WITHOUT recordings in last 24h: ${twilioCallsNoRecordings.length}`);
    twilioCallsNoRecordings.forEach((call, index) => {
      console.log(`${index + 1}. ${call.callId} - Duration: ${call.duration}s - Created: ${call.createdAt}`);
    });

  } catch (error) {
    console.error('Error checking recent Twilio calls:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentTwilioCalls();
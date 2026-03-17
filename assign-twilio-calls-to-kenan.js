const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
});

async function assignTwilioCallsToKenan() {
  try {
    console.log('🔧 Assigning Twilio calls to Kenan (agent 509)...');
    
    // Find all Twilio calls (CA... format) without agent ID or with null agent
    const twilioCallsWithoutAgent = await prisma.callRecord.findMany({
      where: {
        AND: [
          {
            OR: [
              { callId: { startsWith: 'CA' } }, // Real Twilio CallSid format
              { callId: { contains: 'CA' } }    // Any CallSid containing CA
            ]
          },
          {
            OR: [
              { agentId: null },
              { agentId: '' },
              { agentId: 'unknown' }
            ]
          }
        ]
      },
      include: {
        agent: true
      }
    });

    console.log(`📊 Found ${twilioCallsWithoutAgent.length} Twilio calls without proper agent assignment:`);
    
    twilioCallsWithoutAgent.forEach((call, index) => {
      console.log(`${index + 1}. Call: ${call.callId}`);
      console.log(`   Current Agent: ${call.agentId || 'NULL'}`);
      console.log(`   Phone: ${call.phoneNumber}`);
      console.log(`   Duration: ${call.duration}s`);
      console.log(`   Has Recording: ${call.recording ? 'YES' : 'NO'}`);
      console.log(`   Created: ${call.createdAt}`);
    });

    if (twilioCallsWithoutAgent.length === 0) {
      console.log('✅ No Twilio calls need agent assignment');
      return;
    }

    // Update all these calls to use Kenan's agent ID (509)
    const updateResult = await prisma.callRecord.updateMany({
      where: {
        AND: [
          {
            OR: [
              { callId: { startsWith: 'CA' } },
              { callId: { contains: 'CA' } }
            ]
          },
          {
            OR: [
              { agentId: null },
              { agentId: '' },
              { agentId: 'unknown' }
            ]
          }
        ]
      },
      data: {
        agentId: '509' // Kenan's agent ID
      }
    });

    console.log(`\n✅ Updated ${updateResult.count} Twilio call records to use agent 509 (Kenan)`);

    // Verify the update
    const updatedCalls = await prisma.callRecord.findMany({
      where: {
        AND: [
          { agentId: '509' },
          {
            OR: [
              { callId: { startsWith: 'CA' } },
              { callId: { contains: 'CA' } }
            ]
          }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`\n📋 Verified: ${updatedCalls.length} Twilio calls now assigned to Kenan:`);
    updatedCalls.forEach((call, index) => {
      console.log(`${index + 1}. ${call.callId} - ${call.duration}s - Recording: ${call.recording ? 'YES' : 'NO'}`);
    });

  } catch (error) {
    console.error('Error assigning Twilio calls to Kenan:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignTwilioCallsToKenan();
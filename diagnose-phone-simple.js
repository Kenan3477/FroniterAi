const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnosePhoneNumberIssues() {
  try {
    console.log('🔍 Diagnosing phone number issues in call records...\n');

    // Get recent call records with basic data
    const recentCalls = await prisma.callRecord.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: {
        id: true,
        callId: true,
        phoneNumber: true,
        dialedNumber: true,
        agentId: true,
        contactId: true,
        recording: true,
        createdAt: true
      }
    });

    console.log('📊 Recent call records analysis:');
    console.log('=====================================');

    recentCalls.forEach((call, index) => {
      console.log(`${index + 1}. Call ID: ${call.callId}`);
      console.log(`   Phone Number: "${call.phoneNumber || 'NULL'}"`);
      console.log(`   Dialed Number: "${call.dialedNumber || 'NULL'}"`);
      console.log(`   Agent ID: "${call.agentId || 'NULL'}"`);
      console.log(`   Contact ID: "${call.contactId || 'NULL'}"`);
      console.log(`   Twilio SID: "${call.recording || 'NULL'}"`);
      console.log(`   Created: ${call.createdAt}`);
      console.log('   ---');
    });

    // Simple count of total calls
    const totalCalls = await prisma.callRecord.count();
    console.log(`\n📞 Total call records: ${totalCalls}`);

    // Check for empty/null phone numbers
    const callsWithNullPhone = await prisma.callRecord.findMany({
      where: {
        OR: [
          { phoneNumber: null },
          { phoneNumber: '' },
          { phoneNumber: 'Unknown' }
        ]
      },
      select: {
        callId: true,
        phoneNumber: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`\n🚨 Calls with missing/invalid phone numbers: ${callsWithNullPhone.length}`);
    callsWithNullPhone.forEach(call => {
      console.log(`   ${call.callId}: "${call.phoneNumber || 'NULL'}" (${call.createdAt})`);
    });

    // Check for calls from the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCallsLastHour = await prisma.callRecord.findMany({
      where: {
        createdAt: {
          gte: oneHourAgo
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n⏰ Calls created in the last hour: ${recentCallsLastHour.length}`);
    recentCallsLastHour.forEach(call => {
      console.log(`   ${call.callId}: "${call.phoneNumber}" at ${call.createdAt}`);
    });

  } catch (error) {
    console.error('❌ Error diagnosing phone number issues:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnosePhoneNumberIssues();
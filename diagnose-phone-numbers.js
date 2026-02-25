const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnosePhoneNumberIssues() {
  try {
    console.log('🔍 Diagnosing phone number issues in call records...\n');

    // Get recent call records with their phone number data
    const recentCalls = await prisma.callRecord.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        callId: true,
        phoneNumber: true,
        dialedNumber: true,
        agentId: true,
        contactId: true,
        recording: true,
        createdAt: true,
        startTime: true,
        agent: {
          select: {
            agentId: true,
            firstName: true,
            lastName: true
          }
        },
        contact: {
          select: {
            contactId: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        }
      }
    });

    console.log('📊 Recent call records analysis:');
    console.log('=====================================');

    recentCalls.forEach((call, index) => {
      console.log(`${index + 1}. Call ID: ${call.callId}`);
      console.log(`   Phone Number: ${call.phoneNumber || 'NULL'}`);
      console.log(`   Dialed Number: ${call.dialedNumber || 'NULL'}`);
      console.log(`   Agent: ${call.agent ? `${call.agent.firstName} ${call.agent.lastName} (${call.agent.agentId})` : 'NULL'}`);
      console.log(`   Contact: ${call.contact ? `${call.contact.firstName} ${call.contact.lastName} (${call.contact.phone})` : 'NULL'}`);
      console.log(`   Twilio SID: ${call.recording || 'NULL'}`);
      console.log(`   Created: ${call.createdAt}`);
      console.log('   ---');
    });

    // Check for calls with missing phone numbers
    const callsWithMissingNumbers = await prisma.callRecord.count({
      where: {
        OR: [
          { phoneNumber: null },
          { phoneNumber: '' },
          { phoneNumber: 'Unknown' },
          { dialedNumber: null },
          { dialedNumber: '' }
        ]
      }
    });

    console.log(`\n🚨 Calls with missing/invalid phone numbers: ${callsWithMissingNumbers}`);

    // Check for calls with missing agents
    const callsWithMissingAgents = await prisma.callRecord.count({
      where: {
        OR: [
          { agentId: null },
          { agentId: '' }
        ]
      }
    });

    console.log(`🚨 Calls with missing agents: ${callsWithMissingAgents}`);

    // Check for calls with missing contacts
    const callsWithMissingContacts = await prisma.callRecord.count({
      where: {
        OR: [
          { contactId: null },
          { contactId: '' }
        ]
      }
    });

    console.log(`🚨 Calls with missing contacts: ${callsWithMissingContacts}`);

    // Check for duplicate call records
    const duplicateCalls = await prisma.$queryRaw`
      SELECT "phoneNumber", COUNT(*) as count
      FROM "CallRecord"
      WHERE "phoneNumber" IS NOT NULL AND "phoneNumber" != ''
      GROUP BY "phoneNumber"
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10
    `;

    console.log('\n📞 Phone numbers with multiple call records:');
    duplicateCalls.forEach(dup => {
      console.log(`   ${dup.phoneNumber}: ${dup.count} calls`);
    });

    // Check recent call creation patterns
    const callsByDay = await prisma.$queryRaw`
      SELECT DATE("createdAt") as call_date, COUNT(*) as call_count,
             COUNT(CASE WHEN "phoneNumber" IS NULL OR "phoneNumber" = '' OR "phoneNumber" = 'Unknown' THEN 1 END) as missing_phone_count
      FROM "CallRecord"
      WHERE "createdAt" >= NOW() - INTERVAL '7 days'
      GROUP BY DATE("createdAt")
      ORDER BY call_date DESC
    `;

    console.log('\n📅 Call creation patterns (last 7 days):');
    callsByDay.forEach(day => {
      console.log(`   ${day.call_date}: ${day.call_count} calls, ${day.missing_phone_count} missing phone numbers`);
    });

  } catch (error) {
    console.error('❌ Error diagnosing phone number issues:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnosePhoneNumberIssues();
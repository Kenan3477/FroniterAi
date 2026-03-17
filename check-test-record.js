const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTestRecordStatus() {
  try {
    console.log('🔍 Checking if test record exists and call records status...\n');

    // Check if our test record exists
    const testRecord = await prisma.callRecord.findFirst({
      where: {
        callId: { contains: 'FRONTEND-TEST' }
      },
      include: {
        agent: true,
        contact: true
      }
    });

    if (testRecord) {
      console.log('✅ Frontend test record EXISTS in database:');
      console.log(`   Call ID: ${testRecord.callId}`);
      console.log(`   Phone: ${testRecord.phoneNumber}`);
      console.log(`   Contact: ${testRecord.contact?.firstName} ${testRecord.contact?.lastName}`);
      console.log('   → If this doesn\'t show in frontend, frontend is disconnected');
    } else {
      console.log('❌ Frontend test record NOT found in database');
    }

    // Check all call records
    const allRecords = await prisma.callRecord.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        agent: { select: { agentId: true, firstName: true, lastName: true } },
        contact: { select: { firstName: true, lastName: true } }
      }
    });

    console.log(`\n📊 Total call records in database: ${allRecords.length}`);
    allRecords.forEach((record, index) => {
      console.log(`${index + 1}. ${record.callId}: ${record.phoneNumber} (Agent: ${record.agent?.firstName || 'NULL'}, Contact: ${record.contact?.firstName || 'NULL'})`);
    });

    // Check most recent call records from last 30 minutes
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recentRecords = await prisma.callRecord.findMany({
      where: {
        createdAt: { gte: thirtyMinsAgo }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n⏰ Call records from last 30 minutes: ${recentRecords.length}`);
    recentRecords.forEach(record => {
      console.log(`   - ${record.callId}: ${record.phoneNumber} (${record.createdAt})`);
    });

    if (recentRecords.length === 0) {
      console.log('\n❌ NO RECENT CALL RECORDS - Your call did not create a record');
      console.log('   → This means the makeRestApiCall function is failing');
      console.log('   → Or the frontend is calling a different endpoint');
    }

  } catch (error) {
    console.error('❌ Error checking records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTestRecordStatus();
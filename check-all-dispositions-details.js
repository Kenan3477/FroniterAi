const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    // Get all dispositions
    const dispositions = await prisma.disposition.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { callRecords: true }
        }
      }
    });

    console.log('\n📋 ALL DISPOSITIONS:');
    console.log(JSON.stringify(dispositions, null, 2));

    // Get recent calls with dispositions
    const recentCalls = await prisma.callRecord.findMany({
      where: { dispositionId: { not: null } },
      select: {
        id: true,
        callId: true,
        phoneNumber: true,
        recording: true,
        duration: true,
        startTime: true,
        disposition: {
          select: { id: true, name: true }
        }
      },
      orderBy: { startTime: 'desc' },
      take: 10
    });

    console.log('\n📞 RECENT CALLS WITH DISPOSITIONS:');
    console.log(JSON.stringify(recentCalls, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSales() {
  try {
    // Find all calls with "sale" in disposition
    const saleCalls = await prisma.callRecord.findMany({
      where: {
        disposition: {
          name: { contains: 'sale', mode: 'insensitive' }
        }
      },
      select: {
        id: true,
        callId: true,
        phoneNumber: true,
        recording: true,
        duration: true,
        startTime: true,
        disposition: {
          select: { name: true }
        }
      },
      orderBy: { startTime: 'desc' }
    });

    console.log(`\n💰 Found ${saleCalls.length} Sale calls:`);
    console.log(JSON.stringify(saleCalls, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSales();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkFlows() {
  try {
    const flows = await prisma.flow.findMany();
    console.log('Existing flows:', JSON.stringify(flows, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkFlows();
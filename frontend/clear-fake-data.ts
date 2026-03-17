import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearFakeData() {
  console.log('🧹 Clearing fake analytics data to show real empty system...');

  try {
    // Delete fake call records
    const deletedCalls = await prisma.callRecord.deleteMany({});
    console.log(`Deleted ${deletedCalls.count} fake call records`);

    // Delete fake agents  
    const deletedAgents = await prisma.agent.deleteMany({});
    console.log(`Deleted ${deletedAgents.count} fake agents`);

    // Keep dispositions (these are system configuration)
    // Keep campaigns (these are system configuration) 
    // Keep contacts (these could be imported data)

    console.log('✅ Fake data cleared!');
    console.log('📊 Analytics will now show empty/real state');

  } catch (error) {
    console.error('❌ Error clearing fake data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearFakeData().catch(console.error);
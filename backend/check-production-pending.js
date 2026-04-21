require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Use production DATABASE_URL from .env
const prisma = new PrismaClient();

async function checkProductionPending() {
  try {
    console.log('🔍 Checking PRODUCTION pending interactions for agent 509...\n');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log(`📅 Date range: ${today.toISOString()} to ${tomorrow.toISOString()}\n`);

    const pendingCalls = await prisma.callRecord.count({
      where: {
        agentId: '509',
        createdAt: { gte: today, lt: tomorrow },
        OR: [
          { outcome: null },
          { outcome: '' },
          { outcome: 'pending' }
        ]
      }
    });

    console.log(`📊 Total pending interactions in PRODUCTION: ${pendingCalls}\n`);

    // Get sample records
    const sampleRecords = await prisma.callRecord.findMany({
      where: {
        agentId: '509',
        createdAt: { gte: today, lt: tomorrow },
        OR: [
          { outcome: null },
          { outcome: '' },
          { outcome: 'pending' }
        ]
      },
      select: {
        id: true,
        phoneNumber: true,
        callType: true,
        campaignId: true,
        outcome: true,
        disposition: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log('📋 Sample records:');
    sampleRecords.forEach((record, i) => {
      console.log(`\n${i+1}. Phone: ${record.phoneNumber || 'N/A'}, Campaign: ${record.campaignId || 'N/A'}`);
      console.log(`   Type: ${record.callType || 'N/A'}, Outcome: ${record.outcome || 'null'}`);
      console.log(`   Created: ${record.createdAt.toISOString()}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductionPending();

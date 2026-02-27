const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway"
});

async function checkCallRecords() {
  try {
    console.log('🔍 Checking call records for agent 509...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log('📅 Date range:', { today: today.toISOString(), tomorrow: tomorrow.toISOString() });
    
    const records = await prisma.callRecord.findMany({
      where: {
        agentId: '509'
      },
      include: {
        contact: {
          select: {
            contactId: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        campaign: {
          select: {
            campaignId: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`\n📊 Found ${records.length} call records for agent 509`);
    
    if (records.length > 0) {
      console.log('\n🎯 Sample records:');
      records.forEach((record, index) => {
        console.log(`\n--- Record ${index + 1} ---`);
        console.log(`ID: ${record.id}`);
        console.log(`Agent ID: ${record.agentId}`);
        console.log(`Contact ID: ${record.contactId}`);
        console.log(`Outcome: ${record.outcome}`);
        console.log(`Notes: ${record.notes}`);
        console.log(`Created: ${record.createdAt}`);
        console.log(`Contact:`, record.contact);
        console.log(`Campaign:`, record.campaign);
      });
      
      const outcomed = records.filter(r => r.outcome && r.outcome !== 'pending' && r.outcome !== '');
      console.log(`\n✅ Outcomed calls: ${outcomed.length}`);
      outcomed.forEach(record => {
        console.log(`- ${record.outcome}: ${record.contact?.firstName || 'Unknown'} ${record.contact?.lastName || ''}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking call records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCallRecords();
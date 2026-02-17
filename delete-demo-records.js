const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteDemoRecords() {
  try {
    console.log('🚨 ADMIN CLEANUP: Starting demo call records removal...');
    
    let totalDeleted = 0;

    // Define criteria for demo/test records to remove (based on the screenshot)
    // The screenshot shows "Demo Sales Campaign" records which we want to delete
    const demoPhoneNumbers = ['+1234567890', '+447700900123', '+14155552456', '+15551234567'];
    
    // Delete records with Demo Sales Campaign (based on screenshot)
    const demoByCampaign = await prisma.callRecord.deleteMany({
      where: {
        OR: [
          { campaignId: { contains: 'demo', mode: 'insensitive' } },
          { campaignId: 'Demo Sales Campaign' },
          { campaignId: 'demo-sales' },
          { campaignId: 'demo_sales' }
        ]
      }
    });
    
    console.log(`✅ Deleted ${demoByCampaign.count} demo campaign records`);
    totalDeleted += demoByCampaign.count;

    // Delete demo records by phone numbers  
    for (const phoneNumber of demoPhoneNumbers) {
      const deleted = await prisma.callRecord.deleteMany({
        where: { phoneNumber: phoneNumber }
      });
      console.log(`✅ Deleted ${deleted.count} records for phone ${phoneNumber}`);
      totalDeleted += deleted.count;
    }

    // Delete any records with 'demo' or 'test' in various fields (case insensitive)
    const demoByContent = await prisma.callRecord.deleteMany({
      where: {
        OR: [
          { notes: { contains: 'demo', mode: 'insensitive' } },
          { notes: { contains: 'test', mode: 'insensitive' } },
          { callId: { contains: 'demo', mode: 'insensitive' } },
          { callId: { contains: 'test', mode: 'insensitive' } },
          { outcome: { contains: 'demo', mode: 'insensitive' } }
        ]
      }
    });

    console.log(`✅ Deleted ${demoByContent.count} additional demo records by content`);
    totalDeleted += demoByContent.count;

    // Check remaining records
    const remainingRecords = await prisma.callRecord.findMany({
      include: {
        contact: { select: { firstName: true, lastName: true, phone: true } },
        campaign: { select: { name: true, campaignId: true } }
      },
      orderBy: { startTime: 'desc' }
    });

    console.log(`\n📊 CLEANUP COMPLETE:`);
    console.log(`   • Total demo records deleted: ${totalDeleted}`);
    console.log(`   • Remaining records: ${remainingRecords.length}`);
    
    if (remainingRecords.length > 0) {
      console.log(`\n📋 Remaining CallRecords:`);
      remainingRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.phoneNumber} - Campaign: ${record.campaign?.name || 'Unknown'} - ${record.startTime}`);
      });
    }

  } catch (error) {
    console.error('❌ Error during demo cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteDemoRecords();
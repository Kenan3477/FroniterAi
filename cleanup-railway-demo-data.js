const { PrismaClient } = require('@prisma/client');

// Use Railway database URL directly
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function cleanupDemoDataFromRailway() {
  try {
    console.log('🚨 RAILWAY DATABASE CLEANUP: Starting demo data removal...\n');
    
    let totalDeleted = 0;

    // 1. Delete records with fake phone number +1234567890 (seen in UI)
    console.log('🎯 Targeting +1234567890 records...');
    const fakePhoneRecords = await prisma.callRecord.deleteMany({
      where: {
        phoneNumber: '+1234567890'
      }
    });
    console.log(`✅ Deleted ${fakePhoneRecords.count} records with phone +1234567890`);
    totalDeleted += fakePhoneRecords.count;

    // 2. Delete Demo Sales Campaign records (seen in console logs)
    console.log('🎯 Targeting Demo Sales Campaign records...');
    const demoCampaignRecords = await prisma.callRecord.deleteMany({
      where: {
        campaign: {
          name: 'Demo Sales Campaign'
        }
      }
    });
    console.log(`✅ Deleted ${demoCampaignRecords.count} Demo Sales Campaign records`);
    totalDeleted += demoCampaignRecords.count;

    // 3. Delete records by campaign ID patterns
    console.log('🎯 Targeting demo campaign IDs...');
    const demoCampaignIds = await prisma.callRecord.deleteMany({
      where: {
        campaignId: {
          in: ['DEMO-SALES-2025', 'spring-demo-campaign', 'demo-sales', 'demo_sales']
        }
      }
    });
    console.log(`✅ Deleted ${demoCampaignIds.count} records by campaign ID`);
    totalDeleted += demoCampaignIds.count;

    // 4. Delete any records with 'demo' or 'test' in notes or call IDs
    console.log('🎯 Targeting demo/test content...');
    const demoContent = await prisma.callRecord.deleteMany({
      where: {
        OR: [
          { notes: { contains: 'demo', mode: 'insensitive' } },
          { notes: { contains: 'test', mode: 'insensitive' } },
          { callId: { contains: 'demo', mode: 'insensitive' } },
          { callId: { contains: 'test', mode: 'insensitive' } },
          { callId: { startsWith: 'DEMO-' } }
        ]
      }
    });
    console.log(`✅ Deleted ${demoContent.count} records with demo/test content`);
    totalDeleted += demoContent.count;

    // 5. Check what remains
    const remainingRecords = await prisma.callRecord.findMany({
      include: {
        contact: {
          select: { firstName: true, lastName: true, phone: true }
        },
        campaign: {
          select: { name: true, campaignId: true }
        }
      },
      orderBy: { startTime: 'desc' }
    });

    console.log(`\n📊 CLEANUP SUMMARY:`);
    console.log(`   • Total demo records deleted: ${totalDeleted}`);
    console.log(`   • Remaining records: ${remainingRecords.length}`);
    
    if (remainingRecords.length > 0) {
      console.log(`\n📋 Remaining CallRecords:`);
      remainingRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. Phone: ${record.phoneNumber}`);
        console.log(`      Campaign: ${record.campaign?.name || 'Unknown'}`);
        console.log(`      Contact: ${record.contact?.firstName} ${record.contact?.lastName}`);
        console.log(`      Call ID: ${record.callId}`);
        console.log(`      Start: ${record.startTime}`);
        console.log('');
      });
    } else {
      console.log('✅ No call records remaining - database is clean!');
    }

  } catch (error) {
    console.error('❌ Error during Railway database cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupDemoDataFromRailway()
  .then(() => {
    console.log('✅ Railway database cleanup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Railway database cleanup failed:', error);
    process.exit(1);
  });
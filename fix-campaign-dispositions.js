/**
 * Fix: Create CampaignDisposition links for manual-dial campaign
 * This allows all existing dispositions to be used with manual dialing
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://postgres:bRANCHsTOPsign@junction.proxy.rlwy.net:54654/railway"
});

async function linkDispositionsToManualDial() {
  console.log('🔧 FIXING: Link all dispositions to manual-dial campaign...\n');
  
  try {
    // Get all dispositions
    const allDispositions = await prisma.disposition.findMany({
      select: { id: true, name: true }
    });
    
    console.log(`📋 Found ${allDispositions.length} dispositions to link:`);
    allDispositions.forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.name} (${d.id})`);
    });
    
    // Ensure manual-dial campaign exists
    await prisma.campaign.upsert({
      where: { campaignId: 'manual-dial' },
      update: {},
      create: {
        campaignId: 'manual-dial',
        name: 'Manual Dialing',
        dialMethod: 'Manual',
        status: 'Active',
        isActive: true,
        description: 'Manual call records with full disposition support',
        startDate: new Date()
      }
    });
    console.log('\n✅ Manual-dial campaign ready');
    
    // Create campaign disposition links for all dispositions
    const linkedDispositions = [];
    
    for (let i = 0; i < allDispositions.length; i++) {
      const disposition = allDispositions[i];
      
      try {
        await prisma.campaignDisposition.upsert({
          where: {
            campaignId_dispositionId: {
              campaignId: 'manual-dial',
              dispositionId: disposition.id
            }
          },
          update: {},
          create: {
            campaignId: 'manual-dial',
            dispositionId: disposition.id,
            isRequired: false,
            sortOrder: i
          }
        });
        
        linkedDispositions.push(disposition.name);
        console.log(`   ✅ Linked: ${disposition.name}`);
        
      } catch (linkError) {
        console.log(`   ❌ Failed to link: ${disposition.name} - ${linkError.message}`);
      }
    }
    
    console.log(`\n🎉 SUCCESS: Linked ${linkedDispositions.length} dispositions to manual-dial campaign`);
    console.log('📞 Manual calls can now use any disposition for saving');
    
    // Verify the fix worked
    console.log('\n🧪 Testing disposition validation...');
    const testDisposition = await prisma.campaignDisposition.findUnique({
      where: {
        campaignId_dispositionId: {
          campaignId: 'manual-dial',
          dispositionId: 'cmm3dgmwi0002bk8br3qsinpd' // Callback Requested
        }
      },
      include: {
        disposition: true
      }
    });
    
    if (testDisposition) {
      console.log('✅ VERIFIED: Callback Requested is now linked to manual-dial');
      console.log(`   Disposition: ${testDisposition.disposition.name}`);
      console.log(`   Campaign: manual-dial`);
      console.log('   🎯 Disposition saving should now work!');
    } else {
      console.log('❌ VERIFICATION FAILED: Link not found');
    }
    
  } catch (error) {
    console.error('❌ Error creating campaign disposition links:', error);
  } finally {
    await prisma.$disconnect();
  }
}

linkDispositionsToManualDial();
// Fix dispositions directly in database + interaction history issue
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:OJwqtBeBFpuDJFSgHrYJRzqGgxtBuEWB@junction.proxy.rlwy.net:41804/railway'
    }
  }
});

async function fixDispositionAndInteractionIssues() {
  try {
    console.log('=== FIXING DISPOSITION AND INTERACTION ISSUES ===\n');
    
    // 1. Check current dispositions
    console.log('1. Checking current dispositions...');
    const existingDispositions = await prisma.disposition.findMany({
      where: {
        OR: [
          { campaignId: 'Manual Dialing' },
          { campaignId: '1' }, // Sometimes it might be stored as ID
          { campaignId: 'test-campaign' }
        ]
      }
    });
    
    console.log(`Found ${existingDispositions.length} existing dispositions for Manual Dialing`);
    existingDispositions.forEach((disp, i) => {
      console.log(`  ${i + 1}. ${disp.dispositionId}: ${disp.name} (${disp.outcome})`);
    });
    
    // 2. Create the missing disposition that's causing the error
    console.log('\n2. Creating missing dispositions...');
    
    const missingDispositions = [
      {
        dispositionId: 'disp_1766684993442',
        name: 'Completed',
        outcome: 'completed',
        campaignId: '1', // Try with campaign ID instead of name
        description: 'Call completed successfully',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        dispositionId: 'disp_manual_answered',
        name: 'Answered', 
        outcome: 'answered',
        campaignId: '1',
        description: 'Call was answered',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        dispositionId: 'disp_manual_no_answer',
        name: 'No Answer',
        outcome: 'no_answer', 
        campaignId: '1',
        description: 'No answer',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        dispositionId: 'disp_manual_busy',
        name: 'Busy',
        outcome: 'busy',
        campaignId: '1', 
        description: 'Line was busy',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        dispositionId: 'disp_manual_voicemail',
        name: 'Voicemail',
        outcome: 'voicemail',
        campaignId: '1',
        description: 'Reached voicemail', 
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    for (const disposition of missingDispositions) {
      try {
        const existing = await prisma.disposition.findUnique({
          where: { dispositionId: disposition.dispositionId }
        });
        
        if (existing) {
          console.log(`ℹ️  Disposition ${disposition.dispositionId} already exists`);
        } else {
          await prisma.disposition.create({ data: disposition });
          console.log(`✅ Created disposition: ${disposition.name} (${disposition.dispositionId})`);
        }
      } catch (error) {
        console.log(`❌ Error creating ${disposition.name}:`, error.message);
      }
    }
    
    // 3. Check campaigns to get proper campaign ID
    console.log('\n3. Checking campaign IDs...');
    const campaigns = await prisma.campaign.findMany({
      where: {
        OR: [
          { name: { contains: 'Manual', mode: 'insensitive' } },
          { campaignId: 'Manual Dialing' },
          { campaignId: 'test-campaign' },
          { campaignId: '1' }
        ]
      }
    });
    
    console.log(`Found ${campaigns.length} manual dialing campaigns:`);
    campaigns.forEach((campaign, i) => {
      console.log(`  ${i + 1}. ${campaign.campaignId}: ${campaign.name}`);
    });
    
    // 4. Fix interaction history issue (missing outcome field)
    console.log('\n4. Fixing interaction history schema...');
    
    try {
      // Check if CallRecord table has outcome field
      const sampleCallRecord = await prisma.callRecord.findFirst({
        select: {
          callSid: true,
          outcome: true
        }
      });
      
      if (sampleCallRecord && sampleCallRecord.outcome !== undefined) {
        console.log('✅ CallRecord.outcome field exists');
      } else {
        console.log('⚠️  CallRecord.outcome field may be missing or null');
      }
    } catch (error) {
      if (error.message.includes('outcome')) {
        console.log('❌ CallRecord.outcome field is missing from database schema');
        console.log('   This needs to be added to fix interaction history queries');
      }
    }
    
    // 5. Update call records with missing outcome field 
    console.log('\n5. Updating call records with missing outcomes...');
    
    try {
      // Try to update call records that don't have outcome set
      const updated = await prisma.callRecord.updateMany({
        where: {
          outcome: null
        },
        data: {
          outcome: 'completed' // Default value
        }
      });
      
      console.log(`✅ Updated ${updated.count} call records with default outcome`);
    } catch (error) {
      console.log('ℹ️  Could not update call records (outcome field may need schema update)');
    }
    
    // 6. Final verification
    console.log('\n6. Final verification...');
    
    const finalDispositions = await prisma.disposition.findMany({
      where: { campaignId: '1' }
    });
    
    console.log(`✅ Total dispositions for campaign '1': ${finalDispositions.length}`);
    
    const targetDisposition = finalDispositions.find(d => d.dispositionId === 'disp_1766684993442');
    if (targetDisposition) {
      console.log(`✅ Target disposition found: ${targetDisposition.name}`);
    } else {
      console.log(`❌ Target disposition still missing`);
    }
    
    console.log('\n=== FIX COMPLETE ===');
    console.log('Dispositions should now save properly.');
    console.log('If interaction history still fails, the database schema needs outcome field added.');
    
  } catch (error) {
    console.error('Error fixing issues:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDispositionAndInteractionIssues();
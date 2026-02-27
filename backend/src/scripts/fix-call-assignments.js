/**
 * Fix Call Campaign Assignment
 * Update all manual dial calls to use DAC campaign
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCallAssignments() {
  try {
    console.log('🔄 Fixing Call Campaign Assignments...\n');

    // 1. Verify DAC campaign exists
    const dacCampaign = await prisma.campaign.findFirst({
      where: { campaignId: 'DAC' }
    });

    if (!dacCampaign) {
      console.error('❌ DAC campaign with campaignId "DAC" not found!');
      return;
    }

    console.log(`✅ DAC Campaign found: ${dacCampaign.name} (campaignId: ${dacCampaign.campaignId})`);

    // 2. Find all calls with invalid campaign IDs
    const problemCalls = await prisma.callRecord.findMany({
      where: {
        campaignId: {
          in: ['Manual Dialing', 'manual-dial']
        }
      },
      select: {
        id: true,
        campaignId: true,
        phoneNumber: true,
        createdAt: true
      }
    });

    console.log(`Found ${problemCalls.length} calls with invalid campaign IDs`);

    if (problemCalls.length === 0) {
      console.log('✅ No calls need campaign assignment fixing');
      return;
    }

    // 3. Update calls one by one to DAC campaign
    let updatedCount = 0;
    for (const call of problemCalls) {
      try {
        await prisma.callRecord.update({
          where: { id: call.id },
          data: { campaignId: 'DAC' }
        });
        updatedCount++;
        
        if (updatedCount <= 5) { // Log first 5 updates
          console.log(`✅ Updated call ${call.id} (${call.phoneNumber}) from ${call.campaignId} to DAC`);
        } else if (updatedCount === 6) {
          console.log(`... updating remaining calls (${problemCalls.length - 5} more)`);
        }
      } catch (error) {
        console.error(`❌ Failed to update call ${call.id}:`, error.message);
      }
    }

    console.log(`\n✅ Successfully updated ${updatedCount}/${problemCalls.length} calls to DAC campaign`);

    // 4. Verify the fix
    const dacCallCount = await prisma.callRecord.count({
      where: { campaignId: 'DAC' }
    });

    const remainingBadCalls = await prisma.callRecord.count({
      where: {
        campaignId: {
          in: ['Manual Dialing', 'manual-dial']
        }
      }
    });

    console.log(`\n📊 Final Status:`);
    console.log(`- DAC campaign now has: ${dacCallCount} calls`);
    console.log(`- Remaining calls with invalid campaigns: ${remainingBadCalls}`);

    // 5. Check for calls without recordings
    const callsWithoutRecording = await prisma.callRecord.count({
      where: {
        recording: {
          in: [null, '']
        }
      }
    });

    console.log(`- Calls without recording URLs: ${callsWithoutRecording}`);

  } catch (error) {
    console.error('❌ Error fixing call assignments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCallAssignments();
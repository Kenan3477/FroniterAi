/**
 * Fix DAC Campaign and Call Recording Issues
 * 1. Ensure DAC campaign has correct campaignId
 * 2. Reassign calls to correct DAC campaign
 * 3. Update recording URLs where missing
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCampaignAndRecordingIssues() {
  try {
    console.log('🔧 Fixing DAC Campaign and Recording Issues...\n');

    // 1. Find and fix DAC campaign
    console.log('🎯 Step 1: Fixing DAC Campaign');
    
    // Look for existing DAC campaign by name
    let dacCampaign = await prisma.campaign.findFirst({
      where: {
        name: { contains: 'DAC', mode: 'insensitive' }
      }
    });

    if (dacCampaign) {
      console.log(`Found DAC campaign: ${dacCampaign.name} (ID: ${dacCampaign.id})`);
      console.log(`Current campaignId: ${dacCampaign.campaignId}`);
      
      // Update the campaignId if it's not set to 'DAC'
      if (dacCampaign.campaignId !== 'DAC') {
        console.log('Updating campaignId to "DAC"...');
        dacCampaign = await prisma.campaign.update({
          where: { id: dacCampaign.id },
          data: { 
            campaignId: 'DAC',
            name: 'DAC',
            status: 'Active',
            isActive: true,
            recordCalls: true
          }
        });
        console.log('✅ DAC campaign updated successfully');
      } else {
        console.log('✅ DAC campaign already has correct campaignId');
      }
    } else {
      // Create DAC campaign if it doesn't exist
      console.log('Creating new DAC campaign...');
      dacCampaign = await prisma.campaign.create({
        data: {
          campaignId: 'DAC',
          name: 'DAC',
          dialMethod: 'Manual',
          status: 'Active',
          isActive: true,
          description: 'Dial a Contact Campaign for individual calls',
          recordCalls: true,
          allowTransfers: false
        }
      });
      console.log('✅ DAC campaign created successfully');
    }

    // 2. Reassign incorrectly assigned calls to DAC campaign
    console.log('\n🔄 Step 2: Reassigning calls to DAC campaign');
    
    // Find calls assigned to manual dial campaigns that should be DAC
    const manualCalls = await prisma.callRecord.findMany({
      where: {
        OR: [
          { campaignId: 'Manual Dialing' },
          { campaignId: 'manual-dial' },
          { campaignId: { contains: 'manual', mode: 'insensitive' } }
        ]
      },
      include: {
        campaign: true
      }
    });

    console.log(`Found ${manualCalls.length} calls assigned to manual dial campaigns`);

    if (manualCalls.length > 0) {
      // Update these calls to use the DAC campaign
      const updateResult = await prisma.callRecord.updateMany({
        where: {
          OR: [
            { campaignId: 'Manual Dialing' },
            { campaignId: 'manual-dial' },
            { campaignId: { contains: 'manual', mode: 'insensitive' } }
          ]
        },
        data: {
          campaignId: dacCampaign.id // Use the actual ID, not the campaignId field
        }
      });
      
      console.log(`✅ Reassigned ${updateResult.count} calls to DAC campaign`);
    }

    // 3. Check and fix recording URLs
    console.log('\n🎵 Step 3: Checking recording issues');
    
    // Count calls without recordings
    const callsWithoutRecordings = await prisma.callRecord.count({
      where: {
        OR: [
          { recording: null },
          { recording: '' }
        ]
      }
    });

    console.log(`Found ${callsWithoutRecordings} calls without recording URLs`);

    // Get recent Twilio call records that might have recordings
    const recentTwilioRecords = await prisma.twilioCallRecord.findMany({
      where: {
        AND: [
          { recordingUrl: { not: null } },
          { recordingUrl: { not: '' } },
          { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } // Last 7 days
        ]
      },
      take: 20,
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${recentTwilioRecords.length} Twilio records with recordings`);

    // Try to match and update call records with Twilio recordings
    let recordingsUpdated = 0;
    for (const twilioRecord of recentTwilioRecords) {
      // Try to find matching call record by phone number and approximate time
      const matchingCall = await prisma.callRecord.findFirst({
        where: {
          AND: [
            { 
              OR: [
                { phoneNumber: twilioRecord.toNumber },
                { phoneNumber: twilioRecord.toNumber?.replace('+', '') },
                { dialedNumber: twilioRecord.toNumber }
              ]
            },
            { 
              startTime: {
                gte: new Date(twilioRecord.createdAt.getTime() - 5 * 60 * 1000), // 5 minutes before
                lte: new Date(twilioRecord.createdAt.getTime() + 5 * 60 * 1000)  // 5 minutes after
              }
            },
            {
              OR: [
                { recording: null },
                { recording: '' }
              ]
            }
          ]
        }
      });

      if (matchingCall && twilioRecord.recordingUrl) {
        await prisma.callRecord.update({
          where: { id: matchingCall.id },
          data: { recording: twilioRecord.recordingUrl }
        });
        recordingsUpdated++;
        console.log(`📼 Updated recording for call ${matchingCall.id}: ${twilioRecord.recordingUrl}`);
      }
    }

    console.log(`✅ Updated ${recordingsUpdated} calls with recording URLs`);

    // 4. Clean up deleted campaigns
    console.log('\n🧹 Step 4: Cleaning up deleted campaigns');
    
    // Remove or fix campaigns marked as DELETED
    const deletedCampaigns = await prisma.campaign.findMany({
      where: {
        name: { contains: '[DELETED]', mode: 'insensitive' }
      }
    });

    console.log(`Found ${deletedCampaigns.length} campaigns marked as DELETED`);

    for (const campaign of deletedCampaigns) {
      // Count calls still assigned to this campaign
      const callCount = await prisma.callRecord.count({
        where: { campaignId: campaign.id }
      });

      console.log(`Campaign ${campaign.name} has ${callCount} calls assigned`);

      if (callCount > 0) {
        // Reassign calls to DAC campaign before deleting
        await prisma.callRecord.updateMany({
          where: { campaignId: campaign.id },
          data: { campaignId: dacCampaign.id }
        });
        console.log(`Reassigned ${callCount} calls from ${campaign.name} to DAC`);
      }

      // Delete the campaign
      await prisma.campaign.delete({
        where: { id: campaign.id }
      });
      console.log(`✅ Deleted campaign: ${campaign.name}`);
    }

    // Final verification
    console.log('\n✅ Final Verification:');
    
    const dacCallCount = await prisma.callRecord.count({
      where: { campaignId: dacCampaign.id }
    });
    
    const totalCalls = await prisma.callRecord.count();
    const callsWithRecordings = await prisma.callRecord.count({
      where: {
        AND: [
          { recording: { not: null } },
          { recording: { not: '' } }
        ]
      }
    });

    console.log(`DAC Campaign (${dacCampaign.id}): ${dacCallCount} calls`);
    console.log(`Total calls: ${totalCalls}`);
    console.log(`Calls with recordings: ${callsWithRecordings}/${totalCalls}`);
    console.log(`Calls without recordings: ${totalCalls - callsWithRecordings}`);

  } catch (error) {
    console.error('❌ Error fixing campaign and recording issues:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCampaignAndRecordingIssues();
/**
 * Debug Call Records Script
 * Investigate call recording and campaign assignment issues
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugCallRecords() {
  try {
    console.log('🔍 Debugging Call Records Issues...\n');

    // Check recent call records
    console.log('📞 Recent Call Records:');
    const recentCalls = await prisma.callRecord.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: true,
        contact: true
      }
    });

    recentCalls.forEach(call => {
      console.log(`Call ${call.id}:`);
      console.log(`  Phone: ${call.phoneNumber}`);
      console.log(`  Campaign: ${call.campaign?.name || 'NULL'} (ID: ${call.campaignId})`);
      console.log(`  Recording URL: ${call.recordingUrl || 'NULL'}`);
      console.log(`  Created: ${call.createdAt}`);
      console.log(`  Updated: ${call.updatedAt}`);
      console.log('---');
    });

    // Check DAC campaign specifically
    console.log('\n🎯 DAC Campaign Check:');
    const dacCampaign = await prisma.campaign.findFirst({
      where: {
        OR: [
          { name: { contains: 'DAC', mode: 'insensitive' } },
          { name: { contains: 'dac', mode: 'insensitive' } }
        ]
      }
    });

    if (dacCampaign) {
      console.log(`DAC Campaign found: ${dacCampaign.name} (ID: ${dacCampaign.id})`);
      
      // Count calls for DAC campaign
      const dacCallCount = await prisma.callRecord.count({
        where: { campaignId: dacCampaign.id }
      });
      console.log(`Calls assigned to DAC: ${dacCallCount}`);
    } else {
      console.log('❌ No DAC campaign found!');
      
      // List all campaigns
      const allCampaigns = await prisma.campaign.findMany();
      console.log('Available campaigns:');
      allCampaigns.forEach(c => {
        console.log(`  - ${c.name} (ID: ${c.id})`);
      });
    }

    // Check calls without recordings
    console.log('\n🎵 Calls without recordings:');
    const callsWithoutRecordings = await prisma.callRecord.findMany({
      where: {
        OR: [
          { recordingUrl: null },
          { recordingUrl: '' }
        ]
      },
      take: 5,
      include: {
        campaign: true
      }
    });

    console.log(`Found ${callsWithoutRecordings.length} calls without recordings:`);
    callsWithoutRecordings.forEach(call => {
      console.log(`  Call ${call.id}: ${call.phoneNumber} - ${call.campaign?.name || 'No Campaign'}`);
    });

    // Check for orphaned calls (no campaign)
    console.log('\n🔗 Orphaned calls (no campaign):');
    const orphanedCalls = await prisma.callRecord.findMany({
      where: {
        OR: [
          { campaignId: null },
          { campaign: null }
        ]
      },
      take: 5
    });

    console.log(`Found ${orphanedCalls.length} orphaned calls:`);
    orphanedCalls.forEach(call => {
      console.log(`  Call ${call.id}: ${call.phoneNumber} - Campaign ID: ${call.campaignId}`);
    });

    // Check Twilio call records
    console.log('\n📱 Twilio Call Records:');
    const twilioRecords = await prisma.twilioCallRecord.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    twilioRecords.forEach(record => {
      console.log(`Twilio ${record.callSid}:`);
      console.log(`  Status: ${record.callStatus}`);
      console.log(`  Recording: ${record.recordingUrl || 'NULL'}`);
      console.log(`  Duration: ${record.callDuration}`);
    });

  } catch (error) {
    console.error('❌ Error debugging call records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCallRecords();
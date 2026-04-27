// Diagnose Campaign Data Inconsistency
// Run this script to understand why campaigns don't match between UI elements

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnoseCampaigns() {
  console.log('🔍 CAMPAIGN DATA DIAGNOSTIC');
  console.log('============================\n');

  try {
    // 1. Get ALL campaigns
    console.log('1️⃣ ALL CAMPAIGNS IN DATABASE:');
    const allCampaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`   Total campaigns: ${allCampaigns.length}\n`);
    allCampaigns.forEach((c, i) => {
      console.log(`   ${i + 1}. "${c.name}"`);
      console.log(`      - ID (database): ${c.id}`);
      console.log(`      - campaignId (business): ${c.campaignId}`);
      console.log(`      - Status: ${c.status}`);
      console.log(`      - Active: ${c.isActive}`);
      console.log(`      - Dial Method: ${c.dialMethod || 'N/A'}`);
      console.log(`      - Created: ${c.createdAt}`);
      console.log('');
    });

    // 2. Check call records and their campaigns
    console.log('\n2️⃣ CALL RECORDS CAMPAIGN DISTRIBUTION:');
    const callsByCampaign = await prisma.callRecord.groupBy({
      by: ['campaignId'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });
    
    console.log(`   Calls grouped by campaignId:\n`);
    for (const group of callsByCampaign) {
      const campaign = await prisma.campaign.findFirst({
        where: {
          OR: [
            { id: group.campaignId },
            { campaignId: group.campaignId }
          ]
        }
      });
      
      console.log(`   • campaignId="${group.campaignId}": ${group._count.id} calls`);
      if (campaign) {
        console.log(`     ✅ Campaign exists: "${campaign.name}"`);
      } else {
        console.log(`     ❌ Campaign NOT FOUND (orphaned calls!)`);
      }
      console.log('');
    }

    // 3. Check for orphaned campaigns (no calls)
    console.log('\n3️⃣ CAMPAIGNS WITHOUT CALLS:');
    const campaignsWithoutCalls = [];
    for (const campaign of allCampaigns) {
      const callCount = await prisma.callRecord.count({
        where: {
          OR: [
            { campaignId: campaign.id },
            { campaignId: campaign.campaignId }
          ]
        }
      });
      
      if (callCount === 0) {
        campaignsWithoutCalls.push(campaign);
      }
    }
    
    if (campaignsWithoutCalls.length > 0) {
      console.log(`   Found ${campaignsWithoutCalls.length} campaigns with no calls:\n`);
      campaignsWithoutCalls.forEach(c => {
        console.log(`   • "${c.name}" (ID: ${c.id}, campaignId: ${c.campaignId})`);
      });
    } else {
      console.log('   ✅ All campaigns have calls');
    }

    // 4. Check recent calls
    console.log('\n\n4️⃣ RECENT CALLS (Last 10):');
    const recentCalls = await prisma.callRecord.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        callId: true,
        phoneNumber: true,
        campaignId: true,
        recording: true,
        outcome: true,
        createdAt: true
      }
    });
    
    console.log('');
    for (const call of recentCalls) {
      console.log(`   📞 ${call.phoneNumber || 'Unknown'}`);
      console.log(`      Call ID: ${call.callId}`);
      console.log(`      Campaign: ${call.campaignId}`);
      console.log(`      Recording: ${call.recording ? 'Yes (' + call.recording.substring(0, 20) + '...)' : 'No'}`);
      console.log(`      Outcome: ${call.outcome}`);
      console.log(`      Created: ${call.createdAt}`);
      console.log('');
    }

    // 5. Identify the campaign ID mismatch issue
    console.log('\n5️⃣ CAMPAIGN ID CONSISTENCY CHECK:');
    console.log('   Checking if campaignId in calls matches actual campaign IDs...\n');
    
    for (const group of callsByCampaign) {
      const matchById = allCampaigns.find(c => c.id === group.campaignId);
      const matchByCampaignId = allCampaigns.find(c => c.campaignId === group.campaignId);
      
      console.log(`   CampaignId in calls: "${group.campaignId}"`);
      console.log(`      Match by database ID: ${matchById ? '✅ ' + matchById.name : '❌ No match'}`);
      console.log(`      Match by business ID: ${matchByCampaignId ? '✅ ' + matchByCampaignId.name : '❌ No match'}`);
      
      if (!matchById && !matchByCampaignId) {
        console.log(`      🚨 ORPHANED! No campaign found for this ID!`);
      } else if (!matchByCampaignId && matchById) {
        console.log(`      ⚠️  Calls are using database ID instead of business campaignId`);
      }
      console.log('');
    }

    console.log('\n\n✅ DIAGNOSTIC COMPLETE');
    console.log('========================\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseCampaigns();

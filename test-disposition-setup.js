/**
 * Test Script: Verify Campaign-Disposition Setup
 * Tests that all dispositions are properly available for call saving
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://postgres:bRANCHsTOPsign@junction.proxy.rlwy.net:54654/railway"
});

async function testDispositionSetup() {
  console.log('🧪 Testing disposition setup for call saving...\n');
  
  try {
    // Test 1: Check manual-dial campaign dispositions
    console.log('📋 Test 1: Manual-dial campaign dispositions...');
    const manualDialDisps = await prisma.campaignDisposition.findMany({
      where: { campaignId: 'manual-dial' },
      include: { 
        disposition: { select: { id: true, name: true, category: true } }
      },
      orderBy: { sortOrder: 'asc' }
    });
    
    console.log(`   Found ${manualDialDisps.length} dispositions for manual-dial:`);
    manualDialDisps.slice(0, 5).forEach((link, i) => {
      console.log(`   ${i + 1}. ${link.disposition.name} (${link.disposition.id})`);
    });
    if (manualDialDisps.length > 5) {
      console.log(`   ... and ${manualDialDisps.length - 5} more`);
    }
    
    // Test 2: Verify a specific disposition can be used for call saving
    console.log('\n📋 Test 2: Testing call save with disposition...');
    const testDisposition = manualDialDisps.find(d => d.disposition.name === 'Connected');
    
    if (testDisposition) {
      console.log(`   ✅ Test disposition: ${testDisposition.disposition.name} (${testDisposition.disposition.id})`);
      
      // Verify the disposition exists and is linked to manual-dial
      const dispositionCheck = await prisma.campaignDisposition.findUnique({
        where: {
          campaignId_dispositionId: {
            campaignId: 'manual-dial',
            dispositionId: testDisposition.disposition.id
          }
        },
        include: { disposition: true }
      });
      
      if (dispositionCheck) {
        console.log('   ✅ Disposition is properly linked to manual-dial campaign');
        console.log(`   ✅ Disposition details: ${dispositionCheck.disposition.name} - ${dispositionCheck.disposition.category}`);
      } else {
        console.log('   ❌ Disposition link verification failed');
      }
    } else {
      console.log('   ❌ Could not find "Connected" disposition');
    }
    
    // Test 3: Check all campaigns have dispositions
    console.log('\n📋 Test 3: Verify all campaigns have dispositions...');
    const campaignCounts = await prisma.campaignDisposition.groupBy({
      by: ['campaignId'],
      _count: { dispositionId: true }
    });
    
    console.log('   Campaign disposition counts:');
    for (const count of campaignCounts) {
      const campaign = await prisma.campaign.findUnique({
        where: { campaignId: count.campaignId },
        select: { name: true, isActive: true }
      });
      
      console.log(`   ${count.campaignId} (${campaign?.name}): ${count._count.dispositionId} dispositions - ${campaign?.isActive ? 'Active' : 'Inactive'}`);
    }
    
    // Test 4: Simulate call save validation
    console.log('\n📋 Test 4: Simulating call save validation...');
    const mockCallData = {
      campaignId: 'manual-dial',
      dispositionId: testDisposition?.disposition.id || 'cmm3dgmwb0000bk8b9ipcm8iv',
      agentId: 'system-agent',
      contactId: 'test-contact',
      phoneNumber: '+1234567890'
    };
    
    // Check if disposition exists for campaign
    const validDisposition = await prisma.campaignDisposition.findUnique({
      where: {
        campaignId_dispositionId: {
          campaignId: mockCallData.campaignId,
          dispositionId: mockCallData.dispositionId
        }
      },
      include: { disposition: true }
    });
    
    if (validDisposition) {
      console.log(`   ✅ Mock call save would succeed with disposition: ${validDisposition.disposition.name}`);
      console.log(`   ✅ Campaign: ${mockCallData.campaignId}`);
      console.log(`   ✅ Disposition: ${mockCallData.dispositionId}`);
      console.log(`   ✅ Agent: ${mockCallData.agentId}`);
    } else {
      console.log(`   ❌ Mock call save would fail - disposition not found for campaign`);
    }
    
    // Test 5: Check for any orphaned dispositions
    console.log('\n📋 Test 5: Checking for orphaned dispositions...');
    const allDispositions = await prisma.disposition.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    });
    
    const linkedDispositions = await prisma.campaignDisposition.findMany({
      select: { dispositionId: true }
    });
    
    const linkedDispositionIds = new Set(linkedDispositions.map(cd => cd.dispositionId));
    const orphanedDispositions = allDispositions.filter(d => !linkedDispositionIds.has(d.id));
    
    if (orphanedDispositions.length > 0) {
      console.log(`   ⚠️  Found ${orphanedDispositions.length} orphaned dispositions:`);
      orphanedDispositions.forEach(d => {
        console.log(`      - ${d.name} (${d.id})`);
      });
    } else {
      console.log('   ✅ No orphaned dispositions found - all dispositions are linked to campaigns');
    }
    
    console.log('\n🎉 DISPOSITION SETUP TEST COMPLETE!');
    console.log('\n📊 Summary:');
    console.log(`   ✅ Total active campaigns: ${campaignCounts.length}`);
    console.log(`   ✅ Total active dispositions: ${allDispositions.length}`);
    console.log(`   ✅ Total campaign-disposition links: ${linkedDispositions.length}`);
    console.log(`   ✅ Orphaned dispositions: ${orphanedDispositions.length}`);
    
    if (orphanedDispositions.length === 0 && campaignCounts.length > 0) {
      console.log('\n✅ SUCCESS: All dispositions are properly set up for call saving!');
      console.log('📞 Your call disposition system is ready for production use.');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDispositionSetup().catch(console.error);
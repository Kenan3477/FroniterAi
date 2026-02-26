/**
 * Debug Disposition Save Failure Script
 * Investigates the 500 error in call disposition saving
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://postgres:bRANCHsTOPsign@junction.proxy.rlwy.net:54654/railway"
});

async function debugDispositionSaveFailure() {
  console.log('🔍 Debugging disposition save 500 error...\n');
  
  try {
    // Check what campaign the frontend is using
    console.log('📋 Step 1: Check campaign that frontend is using...');
    console.log('   From console logs: Campaign "Manual Dialing" was auto-selected');
    
    // Find the campaign details
    const manualDialingCampaign = await prisma.campaign.findFirst({
      where: { name: 'Manual Dialing' }
    });
    
    if (manualDialingCampaign) {
      console.log('   ✅ Found campaign:', manualDialingCampaign.name);
      console.log('   📝 Campaign ID:', manualDialingCampaign.campaignId);
      console.log('   📝 Status:', manualDialingCampaign.status);
      console.log('   📝 Is Active:', manualDialingCampaign.isActive);
    } else {
      console.log('   ❌ Could not find "Manual Dialing" campaign');
    }
    
    // Check if this campaign has dispositions linked
    console.log('\n📋 Step 2: Check disposition links for this campaign...');
    const campaignDispositions = await prisma.campaignDisposition.findMany({
      where: { campaignId: manualDialingCampaign?.campaignId },
      include: { disposition: { select: { id: true, name: true, category: true } } }
    });
    
    console.log(`   Found ${campaignDispositions.length} dispositions for campaign ${manualDialingCampaign?.campaignId}:`);
    campaignDispositions.slice(0, 5).forEach((cd, i) => {
      console.log(`   ${i + 1}. ${cd.disposition.name} (${cd.disposition.id})`);
    });
    if (campaignDispositions.length > 5) {
      console.log(`   ... and ${campaignDispositions.length - 5} more`);
    }
    
    // Check the agent ID being used
    console.log('\n📋 Step 3: Check agent ID mapping...');
    console.log('   From console: User ID 509 is being used');
    
    // Check if agent 509 exists or if we need to use system-agent
    const agent509 = await prisma.agent.findFirst({
      where: { agentId: '509' }
    });
    
    const systemAgent = await prisma.agent.findFirst({
      where: { agentId: 'system-agent' }
    });
    
    console.log('   Agent 509 exists:', !!agent509);
    console.log('   System-agent exists:', !!systemAgent);
    
    if (!agent509 && !systemAgent) {
      console.log('   ⚠️ Neither agent exists - this could cause database errors');
    }
    
    // Check if the manual-contacts list exists
    console.log('\n📋 Step 4: Check data list dependencies...');
    const manualContactsList = await prisma.dataList.findFirst({
      where: { listId: 'manual-contacts' }
    });
    
    console.log('   Manual-contacts list exists:', !!manualContactsList);
    if (manualContactsList) {
      console.log('   List campaign:', manualContactsList.campaignId);
    }
    
    // Simulate the call save process with test data
    console.log('\n📋 Step 5: Simulate call save with test data...');
    
    const testCallData = {
      phoneNumber: '07487723751', // From console log
      agentId: '509',
      campaignId: manualDialingCampaign?.campaignId || 'unknown',
      callSid: 'CA123test456', // Test CallSid
      disposition: {
        id: campaignDispositions[0]?.disposition.id || 'unknown',
        name: campaignDispositions[0]?.disposition.name || 'Test',
        outcome: 'completed'
      },
      duration: 30
    };
    
    console.log('   Test call data:', JSON.stringify(testCallData, null, 2));
    
    // Try to identify what might fail in the database operation
    console.log('\n📋 Step 6: Check potential failure points...');
    
    // Check for recent call records that might conflict
    const recentCalls = await prisma.callRecord.findMany({
      where: {
        phoneNumber: testCallData.phoneNumber,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });
    
    console.log(`   Recent calls for ${testCallData.phoneNumber}: ${recentCalls.length}`);
    recentCalls.forEach((call, i) => {
      console.log(`   ${i + 1}. CallID: ${call.callId}, Agent: ${call.agentId}, Campaign: ${call.campaignId}`);
    });
    
    // Check for any constraints that might be violated
    console.log('\n📋 Step 7: Check database constraints...');
    
    try {
      // Test contact creation
      const testContactId = `contact-debug-${Date.now()}`;
      const testContact = await prisma.contact.create({
        data: {
          contactId: testContactId,
          listId: 'manual-contacts',
          firstName: 'Test',
          lastName: 'Debug',
          phone: '+447700900000', // Test number
          status: 'contacted'
        }
      });
      
      console.log('   ✅ Contact creation test passed');
      
      // Clean up test contact
      await prisma.contact.delete({
        where: { id: testContact.id }
      });
      
    } catch (contactError) {
      console.log('   ❌ Contact creation test failed:', contactError.message);
    }
    
    // Check if required tables exist
    console.log('\n📋 Step 8: Verify required database tables...');
    
    try {
      await prisma.$queryRaw`SELECT 1 FROM "campaigns" LIMIT 1`;
      console.log('   ✅ campaigns table accessible');
    } catch (e) {
      console.log('   ❌ campaigns table issue:', e.message);
    }
    
    try {
      await prisma.$queryRaw`SELECT 1 FROM "contacts" LIMIT 1`;
      console.log('   ✅ contacts table accessible');
    } catch (e) {
      console.log('   ❌ contacts table issue:', e.message);
    }
    
    try {
      await prisma.$queryRaw`SELECT 1 FROM "call_records" LIMIT 1`;
      console.log('   ✅ call_records table accessible');
    } catch (e) {
      console.log('   ❌ call_records table issue:', e.message);
    }
    
    try {
      await prisma.$queryRaw`SELECT 1 FROM "campaign_dispositions" LIMIT 1`;
      console.log('   ✅ campaign_dispositions table accessible');
    } catch (e) {
      console.log('   ❌ campaign_dispositions table issue:', e.message);
    }
    
    console.log('\n🎯 DIAGNOSIS COMPLETE');
    console.log('📋 Next steps: Check Railway backend logs for detailed error messages');
    
  } catch (error) {
    console.error('\n❌ Debug process failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugDispositionSaveFailure().catch(console.error);
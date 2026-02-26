const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: "postgresql://postgres:bRANCHsTOPsign@junction.proxy.rlwy.net:54654/railway"
});

async function checkTestCallRecord() {
  console.log('🔍 Checking test call record...\n');
  
  try {
    // Look for our final test call
    const testCall = await prisma.callRecord.findUnique({
      where: { callId: 'CA_final_test' },
      include: {
        disposition: true,
        agent: true,
        contact: true,
        campaign: true
      }
    });
    
    if (testCall) {
      console.log('✅ Test call found:');
      console.log(`   Call ID: ${testCall.callId}`);
      console.log(`   Agent ID: ${testCall.agentId}`);
      console.log(`   Disposition ID: ${testCall.dispositionId}`);
      console.log(`   Created At: ${testCall.createdAt}`);
      console.log(`   Duration: ${testCall.duration}`);
      console.log(`   Recording URL: ${testCall.recordingUrl}`);
      console.log(`   Agent Found: ${testCall.agent ? '✅' : '❌'}`);
      console.log(`   Disposition Found: ${testCall.disposition ? '✅' : '❌'}`);
      
      if (testCall.disposition) {
        console.log(`\n📋 Disposition Details:`);
        console.log(`   Name: ${testCall.disposition.name}`);
        console.log(`   ID: ${testCall.disposition.id}`);
      }
      
      console.log('\n🔍 Raw record:');
      console.log(JSON.stringify(testCall, null, 2));
      
    } else {
      console.log('❌ Test call not found');
    }
    
  } catch (error) {
    console.error('❌ Error checking test call:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTestCallRecord();
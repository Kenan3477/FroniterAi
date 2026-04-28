const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testInboundNumberUpdate() {
  try {
    console.log('🔍 Checking inbound numbers and flows...\n');
    
    // Get an inbound number
    const inboundNumbers = await prisma.inboundNumber.findMany({
      take: 3,
      select: {
        id: true,
        phoneNumber: true,
        displayName: true,
        assignedFlowId: true,
        assignedFlow: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    console.log(`📞 Found ${inboundNumbers.length} inbound numbers:`);
    inboundNumbers.forEach((num, idx) => {
      console.log(`${idx + 1}. ${num.phoneNumber}`);
      console.log(`   ID: ${num.id}`);
      console.log(`   Display Name: ${num.displayName || 'None'}`);
      console.log(`   Assigned Flow: ${num.assignedFlow?.name || 'None'} (ID: ${num.assignedFlowId || 'None'})`);
      console.log('');
    });
    
    // Get flows
    const flows = await prisma.flow.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        status: true
      }
    });
    
    console.log(`\n🔀 Found ${flows.length} flows:`);
    flows.forEach((flow, idx) => {
      console.log(`${idx + 1}. ${flow.name}`);
      console.log(`   ID: ${flow.id}`);
      console.log(`   Status: ${flow.status}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testInboundNumberUpdate();

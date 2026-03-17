const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCallRecordCreation() {
  try {
    console.log('🧪 Testing call record creation...\n');

    // Test 1: Check if required campaign exists
    console.log('1. Checking campaigns...');
    const campaigns = await prisma.campaign.findMany();
    console.log(`   Found ${campaigns.length} campaigns:`);
    campaigns.forEach(campaign => {
      console.log(`   - ${campaign.campaignId}: ${campaign.name}`);
    });

    // Test 2: Check if required agents exist  
    console.log('\n2. Checking agents...');
    const agents = await prisma.agent.findMany();
    console.log(`   Found ${agents.length} agents:`);
    agents.forEach(agent => {
      console.log(`   - ${agent.agentId}: ${agent.firstName} ${agent.lastName}`);
    });

    // Test 3: Check if contacts exist
    console.log('\n3. Checking contacts...');
    const contacts = await prisma.contact.findMany();
    console.log(`   Found ${contacts.length} contacts:`);
    contacts.forEach(contact => {
      console.log(`   - ${contact.contactId}: ${contact.firstName} ${contact.lastName} (${contact.phone})`);
    });

    // Test 4: Try to create a test call record
    console.log('\n4. Attempting to create test call record...');
    
    // Ensure we have required data
    let campaignId = 'MANUAL-DIAL';
    let testCampaign = await prisma.campaign.findUnique({
      where: { campaignId }
    });
    
    if (!testCampaign) {
      console.log('   Creating test campaign...');
      testCampaign = await prisma.campaign.create({
        data: {
          campaignId: 'MANUAL-DIAL',
          name: 'Manual Dial Test',
          description: 'Test campaign for manual dialing',
          status: 'Active',
          isActive: true
        }
      });
      console.log(`   ✅ Created campaign: ${testCampaign.campaignId}`);
    }

    // Ensure we have a data list
    let listId = 'MANUAL-DIAL-CONTACTS';
    let testList = await prisma.dataList.findUnique({
      where: { listId }
    });
    
    if (!testList) {
      console.log('   Creating test data list...');
      testList = await prisma.dataList.create({
        data: {
          listId: 'MANUAL-DIAL-CONTACTS',
          name: 'Manual Dial Test Contacts',
          campaignId: campaignId,
          active: true,
          totalContacts: 0
        }
      });
      console.log(`   ✅ Created data list: ${testList.listId}`);
    }

    // Create test contact
    let contactId = 'test-contact-' + Date.now();
    console.log('   Creating test contact...');
    const testContact = await prisma.contact.create({
      data: {
        contactId: contactId,
        listId: listId,
        firstName: 'Test',
        lastName: 'Contact',
        phone: '+44747723751',
        status: 'new'
      }
    });
    console.log(`   ✅ Created contact: ${testContact.contactId}`);

    // Get or create test agent
    let agentId = null;
    if (agents.length > 0) {
      agentId = agents[0].agentId;
      console.log(`   Using existing agent: ${agentId}`);
    } else {
      console.log('   Creating test agent...');
      const testAgent = await prisma.agent.create({
        data: {
          agentId: 'test-agent-' + Date.now(),
          firstName: 'Test',
          lastName: 'Agent',
          email: 'test@example.com',
          isActive: true
        }
      });
      agentId = testAgent.agentId;
      console.log(`   ✅ Created agent: ${agentId}`);
    }

    // Now create the call record
    console.log('   Creating call record...');
    const testCallRecord = await prisma.callRecord.create({
      data: {
        callId: 'test-call-' + Date.now(),
        campaignId: campaignId,
        contactId: contactId,
        agentId: agentId,
        phoneNumber: '+44747723751',
        dialedNumber: '+44747723751',
        callType: 'outbound',
        startTime: new Date()
      }
    });

    console.log(`   ✅ Successfully created call record:`);
    console.log(`      Call ID: ${testCallRecord.callId}`);
    console.log(`      Phone: ${testCallRecord.phoneNumber}`);
    console.log(`      Agent: ${testCallRecord.agentId}`);
    console.log(`      Contact: ${testCallRecord.contactId}`);

    // Test 5: Query the call records to confirm they exist
    console.log('\n5. Verifying call records table...');
    const allCalls = await prisma.callRecord.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        agent: true,
        contact: true,
        campaign: true
      }
    });

    console.log(`   Found ${allCalls.length} call records in database:`);
    allCalls.forEach(call => {
      console.log(`   - ${call.callId}: ${call.phoneNumber} (${call.agent?.firstName} ${call.agent?.lastName})`);
    });

  } catch (error) {
    console.error('❌ Error during test:', error);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    if (error.meta) {
      console.error('   Error meta:', error.meta);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testCallRecordCreation();
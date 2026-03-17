const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecentCallRecords() {
  try {
    console.log('🔍 Checking for recent call records after fixes...\n');

    // Get all call records ordered by creation date
    const allCallRecords = await prisma.callRecord.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        agent: {
          select: {
            agentId: true,
            firstName: true,
            lastName: true
          }
        },
        contact: {
          select: {
            contactId: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        campaign: {
          select: {
            campaignId: true,
            name: true
          }
        }
      }
    });

    console.log(`📊 Total call records in database: ${allCallRecords.length}\n`);

    if (allCallRecords.length === 0) {
      console.log('❌ NO CALL RECORDS FOUND - This confirms calls are not creating records');
      
      // Check if campaigns and agents exist
      const campaigns = await prisma.campaign.count();
      const agents = await prisma.agent.count();
      const contacts = await prisma.contact.count();
      
      console.log(`\n📈 Supporting data:`);
      console.log(`   Campaigns: ${campaigns}`);
      console.log(`   Agents: ${agents}`);
      console.log(`   Contacts: ${contacts}`);
      
    } else {
      console.log('📋 Call records found:');
      allCallRecords.forEach((record, index) => {
        console.log(`\n${index + 1}. Call ID: ${record.callId}`);
        console.log(`   Phone Number: "${record.phoneNumber}"`);
        console.log(`   Dialed Number: "${record.dialedNumber}"`);
        console.log(`   Agent: ${record.agent ? `${record.agent.firstName} ${record.agent.lastName} (${record.agent.agentId})` : 'NULL'}`);
        console.log(`   Contact: ${record.contact ? `${record.contact.firstName} ${record.contact.lastName} (${record.contact.phone})` : 'NULL'}`);
        console.log(`   Campaign: ${record.campaign ? `${record.campaign.name} (${record.campaign.campaignId})` : 'NULL'}`);
        console.log(`   Created: ${record.createdAt}`);
        console.log(`   Start Time: ${record.startTime}`);
        console.log(`   End Time: ${record.endTime || 'NULL'}`);
        console.log(`   Duration: ${record.duration || 'NULL'}`);
        console.log(`   Recording: ${record.recording || 'NULL'}`);
      });
    }

    // Check if there are any records created in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRecords = await prisma.callRecord.findMany({
      where: {
        createdAt: {
          gte: oneHourAgo
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n⏰ Call records created in the last hour: ${recentRecords.length}`);
    recentRecords.forEach(record => {
      console.log(`   - ${record.callId}: ${record.phoneNumber} (${record.createdAt})`);
    });

    // Check if the frontend might be reading from a different table
    console.log(`\n🔍 Checking other potential data sources:`);
    
    try {
      const interactions = await prisma.interaction.count();
      console.log(`   Interactions table: ${interactions} records`);
    } catch (e) {
      console.log(`   Interactions table: Error accessing`);
    }

  } catch (error) {
    console.error('❌ Error checking call records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentCallRecords();
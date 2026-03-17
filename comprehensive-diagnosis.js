const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function comprehensiveDiagnosis() {
  try {
    console.log('🔍 COMPREHENSIVE CALL RECORDS DIAGNOSIS\n');

    // 1. Check all call records
    console.log('1. ALL CALL RECORDS:');
    const allRecords = await prisma.callRecord.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        agent: { select: { agentId: true, firstName: true, lastName: true } },
        contact: { select: { contactId: true, firstName: true, lastName: true, phone: true } },
        campaign: { select: { campaignId: true, name: true } }
      }
    });

    console.log(`Found ${allRecords.length} total call records:`);
    allRecords.forEach((record, index) => {
      console.log(`\n${index + 1}. Call: ${record.callId}`);
      console.log(`   Phone: "${record.phoneNumber}"`);
      console.log(`   Agent: ${record.agent ? `${record.agent.firstName} ${record.agent.lastName} (${record.agent.agentId})` : 'NULL'}`);
      console.log(`   Contact: ${record.contact ? `${record.contact.firstName} ${record.contact.lastName}` : 'NULL'}`);
      console.log(`   Campaign: ${record.campaign ? record.campaign.name : 'NULL'}`);
      console.log(`   Created: ${record.createdAt}`);
      console.log(`   Duration: ${record.duration || 'NULL'}`);
      console.log(`   Recording: ${record.recording ? 'YES' : 'NO'}`);
    });

    // 2. Check for "Unknown" data
    console.log('\n\n2. RECORDS WITH "UNKNOWN" DATA:');
    const unknownRecords = await prisma.callRecord.findMany({
      where: {
        OR: [
          { phoneNumber: 'Unknown' },
          { phoneNumber: { equals: null } },
          { agentId: { equals: null } }
        ]
      }
    });
    console.log(`Found ${unknownRecords.length} records with "Unknown" or null data`);

    // 3. Check all campaigns
    console.log('\n\n3. ALL CAMPAIGNS:');
    const campaigns = await prisma.campaign.findMany();
    console.log(`Found ${campaigns.length} campaigns:`);
    campaigns.forEach(campaign => {
      console.log(`- ${campaign.campaignId}: ${campaign.name} (Active: ${campaign.isActive})`);
    });

    // 4. Check all agents
    console.log('\n\n4. ALL AGENTS:');
    const agents = await prisma.agent.findMany();
    console.log(`Found ${agents.length} agents:`);
    agents.forEach(agent => {
      console.log(`- ${agent.agentId}: ${agent.firstName} ${agent.lastName} (Active: ${agent.isActive})`);
    });

    // 5. Check all contacts
    console.log('\n\n5. ALL CONTACTS:');
    const contacts = await prisma.contact.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    console.log(`Found ${contacts.length} recent contacts:`);
    contacts.forEach(contact => {
      console.log(`- ${contact.contactId}: ${contact.firstName} ${contact.lastName} (${contact.phone})`);
    });

    // 6. Direct database counts
    console.log('\n\n6. DATABASE TOTALS:');
    const counts = await Promise.all([
      prisma.callRecord.count(),
      prisma.agent.count(),
      prisma.contact.count(),
      prisma.campaign.count(),
      prisma.user.count()
    ]);
    
    console.log(`- Call Records: ${counts[0]}`);
    console.log(`- Agents: ${counts[1]}`);
    console.log(`- Contacts: ${counts[2]}`);
    console.log(`- Campaigns: ${counts[3]}`);
    console.log(`- Users: ${counts[4]}`);

    // 7. Check for recent activity (last 24 hours)
    console.log('\n\n7. RECENT ACTIVITY (Last 24 hours):');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCalls = await prisma.callRecord.findMany({
      where: { createdAt: { gte: yesterday } },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`${recentCalls.length} call records created in last 24 hours:`);
    recentCalls.forEach(call => {
      console.log(`- ${call.callId}: ${call.phoneNumber} (${call.createdAt})`);
    });

  } catch (error) {
    console.error('❌ Error in diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

comprehensiveDiagnosis();
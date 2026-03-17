const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAllTables() {
  try {
    console.log('=== CHECKING DATABASE TABLES FOR CALL DATA ===\n');
    
    // Check if campaigns exist
    console.log('--- Campaigns ---');
    const campaigns = await prisma.campaign.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    console.log(`Found ${campaigns.length} campaigns`);
    campaigns.forEach(c => console.log(`  ${c.campaignId}: ${c.name}`));
    
    // Check if contacts exist
    console.log('\n--- Contacts ---');
    const contacts = await prisma.contact.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    console.log(`Found ${contacts.length} contacts`);
    contacts.forEach(c => console.log(`  ${c.contactId}: ${c.firstName} ${c.lastName} - ${c.phone}`));
    
    // Check if agents exist
    console.log('\n--- Agents ---');
    const agents = await prisma.agent.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    console.log(`Found ${agents.length} agents`);
    agents.forEach(a => console.log(`  ${a.agentId}: ${a.name} - ${a.status}`));
    
    // Check interactions (might have call data)
    console.log('\n--- Interactions ---');
    const interactions = await prisma.interaction.findMany({
      take: 5,
      orderBy: { startedAt: 'desc' }
    });
    console.log(`Found ${interactions.length} interactions`);
    interactions.forEach(i => console.log(`  ${i.id}: ${i.channel} - ${i.outcome} - ${i.startedAt}`));
    
    // Check queue entries
    console.log('\n--- Dial Queue Entries ---');
    const queueEntries = await prisma.dialQueueEntry.findMany({
      take: 5,
      orderBy: { queuedAt: 'desc' }
    });
    console.log(`Found ${queueEntries.length} queue entries`);
    queueEntries.forEach(q => console.log(`  ${q.queueId}: ${q.status} - ${q.queuedAt}`));
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllTables();
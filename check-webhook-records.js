const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWebhookCallRecords() {
  try {
    console.log('🔍 Checking for webhook-created call records...\n');

    // Look for call records with "Auto-Sync" contacts
    const webhookRecords = await prisma.callRecord.findMany({
      where: {
        OR: [
          { phoneNumber: 'Unknown' },
          { agentId: null },
          { contactId: { contains: 'auto-sync' } }
        ]
      },
      include: {
        contact: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Found ${webhookRecords.length} webhook-created call records:\n`);

    if (webhookRecords.length > 0) {
      webhookRecords.forEach((record, index) => {
        console.log(`${index + 1}. Call ID: ${record.callId}`);
        console.log(`   Phone: "${record.phoneNumber}"`);
        console.log(`   Agent: ${record.agentId || 'NULL'}`);
        console.log(`   Contact: ${record.contact?.firstName} ${record.contact?.lastName} (${record.contact?.contactId})`);
        console.log(`   Created: ${record.createdAt}`);
        console.log(`   Recording: ${record.recording ? 'YES' : 'NO'}`);
        console.log(`   Notes: ${record.notes || 'NONE'}`);
        console.log('');
      });
    } else {
      console.log('❌ No webhook records found - but they might exist');
    }

    // Check for "Auto-Sync" contacts
    const autoSyncContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { firstName: 'Auto-Sync' },
          { contactId: { contains: 'auto-sync' } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`🔄 Found ${autoSyncContacts.length} auto-sync contacts:`);
    autoSyncContacts.forEach((contact, index) => {
      console.log(`${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.contactId}) - ${contact.phone}`);
    });

    // Check for LIVE-CALLS campaign
    const liveCampaign = await prisma.campaign.findUnique({
      where: { campaignId: 'LIVE-CALLS' }
    });

    if (liveCampaign) {
      console.log(`\n📞 LIVE-CALLS campaign exists: ${liveCampaign.name}`);
      
      // Count call records in this campaign
      const liveCallsCount = await prisma.callRecord.count({
        where: { campaignId: 'LIVE-CALLS' }
      });
      console.log(`   Call records in LIVE-CALLS: ${liveCallsCount}`);
    } else {
      console.log(`\n📞 LIVE-CALLS campaign does not exist`);
    }

  } catch (error) {
    console.error('❌ Error checking webhook records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWebhookCallRecords();
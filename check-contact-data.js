const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway"
});

async function checkContactData() {
  try {
    console.log('🔍 Checking contact data for recent call records...');
    
    // Get recent call records with contact info
    const records = await prisma.callRecord.findMany({
      where: {
        agentId: '509'
      },
      include: {
        contact: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log(`\n📊 Found ${records.length} call records with contact data:`);
    
    records.forEach((record, index) => {
      console.log(`\n--- Record ${index + 1} ---`);
      console.log(`Call ID: ${record.id}`);
      console.log(`Contact ID: ${record.contactId}`);
      console.log(`Outcome: ${record.outcome}`);
      console.log(`Contact data:`, record.contact);
      
      if (record.contact) {
        console.log(`  - Name: ${record.contact.firstName} ${record.contact.lastName}`);
        console.log(`  - Phone: ${record.contact.phone}`);
      } else {
        console.log('  - No contact linked');
      }
    });

    // Also check if there are contacts with "Kenan Davies" name
    const kenanContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { firstName: { contains: 'Kenan', mode: 'insensitive' } },
          { lastName: { contains: 'Davies', mode: 'insensitive' } },
          { phone: { contains: '7487723751' } }
        ]
      }
    });
    
    console.log(`\n🔍 Found ${kenanContacts.length} contacts matching "Kenan Davies" or phone:`);
    kenanContacts.forEach(contact => {
      console.log(`- Contact ID: ${contact.contactId}`);
      console.log(`  Name: ${contact.firstName} ${contact.lastName}`);
      console.log(`  Phone: ${contact.phone}`);
      console.log(`  Campaign: ${contact.campaignId}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking contact data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkContactData();
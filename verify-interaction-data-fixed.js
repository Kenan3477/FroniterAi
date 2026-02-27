const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway"
});

async function verifyInteractionData() {
  try {
    console.log('🔍 Verifying interaction history data...');
    
    // Get a few recent call records to check the contact linking
    const recentCalls = await prisma.callRecord.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        contact: true
      }
    });
    
    console.log(`📞 Found ${recentCalls.length} recent call records:`);
    
    recentCalls.forEach((call, index) => {
      console.log(`\n${index + 1}. Call ${call.callId}`);
      console.log(`   Agent: ${call.agentId}`);
      console.log(`   Phone: ${call.phoneNumber}`);
      console.log(`   Contact: ${call.contact ? `${call.contact.fullName} (${call.contact.contactId})` : 'No contact'}`);
      console.log(`   Outcome: ${call.outcome || 'None'}`);
      console.log(`   Date: ${call.createdAt}`);
    });
    
    // Check total outcomed interactions (using correct field name)
    const outcomedCount = await prisma.callRecord.count({
      where: {
        outcome: {
          not: null
        }
      }
    });
    
    console.log(`\n📊 Total outcomed interactions: ${outcomedCount}`);
    
    // Check how many contacts we now have
    const totalContacts = await prisma.contact.count();
    console.log(`👥 Total contacts: ${totalContacts}`);
    
    // Check specifically for Kenan Davies contacts
    const kenanContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { firstName: 'Kenan' },
          { lastName: 'Davies' },
          { fullName: { contains: 'Kenan' } }
        ]
      }
    });
    
    console.log(`\n👤 Kenan Davies contacts found: ${kenanContacts.length}`);
    kenanContacts.forEach(contact => {
      console.log(`   ${contact.fullName} - ${contact.phone} (${contact.contactId})`);
    });
    
    // Count call records linked to Kenan Davies
    if (kenanContacts.length > 0) {
      for (const contact of kenanContacts) {
        const callCount = await prisma.callRecord.count({
          where: {
            contactId: contact.contactId
          }
        });
        console.log(`   📞 ${contact.fullName} has ${callCount} call records`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error verifying data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyInteractionData();
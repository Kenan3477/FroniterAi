const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || 'postgresql://postgres:HXnCRKtwwNBR@roundhouse.proxy.rlwy.net:58322/railway'
});

async function checkContacts() {
  try {
    console.log('🔍 Checking recent contacts...');
    
    // Get recent contacts
    const recentContacts = await prisma.contact.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        list: {
          select: { name: true, listId: true }
        }
      }
    });
    
    console.log(`📊 Found ${recentContacts.length} recent contacts:`);
    recentContacts.forEach(contact => {
      console.log(`- ${contact.firstName} ${contact.lastName} (${contact.phone}) in list "${contact.list?.name}"`);
    });
    
    // Get total contact count
    const totalContacts = await prisma.contact.count();
    console.log(`\n📈 Total contacts in database: ${totalContacts}`);
    
    // Get data list counts with more details
    const dataLists = await prisma.dataList.findMany({
      include: {
        _count: {
          select: { contacts: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    console.log(`\n📋 Data lists and their contact counts:`);
    dataLists.forEach(list => {
      console.log(`- "${list.name}" (ID: ${list.id}, ListID: ${list.listId}): ${list._count.contacts} contacts`);
    });
    
    // If we have data lists but no contacts, this suggests the upload failed
    if (dataLists.length > 0 && totalContacts === 0) {
      console.log(`\n⚠️  Warning: Found ${dataLists.length} data lists but 0 contacts - upload may have failed`);
      
      // Check recent data list updates
      const recentList = dataLists[0];
      console.log(`\nMost recent list: "${recentList.name}"`);
      console.log(`- Created: ${recentList.createdAt}`);
      console.log(`- Updated: ${recentList.updatedAt}`);
      console.log(`- Total Contacts: ${recentList.totalContacts}`);
      console.log(`- Active: ${recentList.active}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking contacts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkContacts();
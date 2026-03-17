const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:OJwqtBeBFpuDJFSgHrYJRzqGgxtBuEWB@junction.proxy.rlwy.net:41804/railway'
    }
  }
});

async function investigateContactSources() {
  try {
    console.log('=== CONTACT SOURCES INVESTIGATION ===\n');
    
    // Check all DataLists
    console.log('1. ALL DATA LISTS:');
    const dataLists = await prisma.dataList.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    dataLists.forEach((list, index) => {
      console.log(`${index + 1}. ${list.name} (${list.listId})`);
      console.log(`   Created: ${list.createdAt}`);
      console.log(`   Updated: ${list.updatedAt}`);
      console.log(`   Status: ${list.status || 'N/A'}`);
      console.log('');
    });
    
    // Count contacts per list
    console.log('2. CONTACTS PER DATA LIST:');
    for (const list of dataLists) {
      const contactCount = await prisma.contact.count({
        where: { listId: list.listId }
      });
      console.log(`${list.name}: ${contactCount} contacts`);
    }
    
    console.log('\n3. RECENT CONTACT CREATION ACTIVITY:');
    const recentContacts = await prisma.contact.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      select: {
        contactId: true,
        firstName: true,
        lastName: true,
        phone: true,
        listId: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`Found ${recentContacts.length} contacts created in last 24 hours:`);
    recentContacts.forEach((contact, index) => {
      console.log(`${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.phone})`);
      console.log(`   List: ${contact.listId}`);
      console.log(`   Created: ${contact.createdAt}`);
      console.log('');
    });
    
    // Check for any auto-sync related lists that might have been recreated
    console.log('4. CHECKING FOR AUTO-SYNC RELATED LISTS:');
    const autoSyncLists = await prisma.dataList.findMany({
      where: {
        OR: [
          { name: { contains: 'AUTO', mode: 'insensitive' } },
          { name: { contains: 'SYNC', mode: 'insensitive' } },
          { name: { contains: 'TEST', mode: 'insensitive' } },
          { listId: { contains: 'auto' } },
          { listId: { contains: 'sync' } },
          { listId: { contains: 'test' } }
        ]
      }
    });
    
    if (autoSyncLists.length > 0) {
      console.log('Found potentially problematic lists:');
      autoSyncLists.forEach((list, index) => {
        console.log(`${index + 1}. ${list.name} (${list.listId})`);
        console.log(`   Created: ${list.createdAt}`);
      });
    } else {
      console.log('No auto-sync related lists found.');
    }
    
    // Check total contact count
    console.log('\n5. TOTAL CONTACT COUNT:');
    const totalContacts = await prisma.contact.count();
    console.log(`Total contacts in database: ${totalContacts}`);
    
  } catch (error) {
    console.error('Error investigating contact sources:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigateContactSources();
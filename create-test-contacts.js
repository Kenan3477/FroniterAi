const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || 'postgresql://postgres:HXnCRKtwwNBR@roundhouse.proxy.rlwy.net:58322/railway'
});

async function createTestData() {
  try {
    console.log('🔧 Creating test data for contact view testing...');
    
    // Create a test data list
    const dataList = await prisma.dataList.create({
      data: {
        listId: `TEST_${Date.now()}`,
        name: 'Test Contact List',
        active: true,
        totalContacts: 0
      }
    });
    
    console.log(`✅ Created data list: "${dataList.name}" (ID: ${dataList.id}, ListID: ${dataList.listId})`);
    
    // Create some test contacts
    const testContacts = [
      {
        contactId: `CONTACT_1_${Date.now()}`,
        listId: dataList.listId,
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        email: 'john.doe@test.com'
      },
      {
        contactId: `CONTACT_2_${Date.now()}`,
        listId: dataList.listId,
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1234567891',
        email: 'jane.smith@test.com'
      },
      {
        contactId: `CONTACT_3_${Date.now()}`,
        listId: dataList.listId,
        firstName: 'Bob',
        lastName: 'Johnson',
        phone: '+1234567892',
        email: 'bob.johnson@test.com'
      }
    ];
    
    for (const contactData of testContacts) {
      const contact = await prisma.contact.create({
        data: contactData
      });
      console.log(`✅ Created contact: ${contact.firstName} ${contact.lastName}`);
    }
    
    // Update the data list total count
    await prisma.dataList.update({
      where: { id: dataList.id },
      data: { totalContacts: testContacts.length }
    });
    
    console.log(`\n🎉 Test data created successfully!`);
    console.log(`- Data List: "${dataList.name}"`);
    console.log(`- Contacts: ${testContacts.length}`);
    console.log(`\nYou can now test the "View Contacts" functionality on this data list.`);
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();
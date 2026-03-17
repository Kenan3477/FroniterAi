const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway"
});

async function fixKenanContactData() {
  try {
    console.log('🔧 Fixing Kenan Davies contact data...');
    
    // Find the contact that now has all the call records (should be the "Unknown Contact" one)
    const unknownContact = await prisma.contact.findFirst({
      where: {
        firstName: 'Unknown',
        lastName: 'Contact',
        phone: '+447487723751'
      }
    });
    
    if (!unknownContact) {
      console.log('❌ Could not find the Unknown Contact with +447487723751');
      return;
    }
    
    console.log('✅ Found Unknown Contact:', unknownContact.contactId);
    
    // Check how many call records it has
    const callRecordCount = await prisma.callRecord.count({
      where: {
        contactId: unknownContact.contactId
      }
    });
    
    console.log(`📞 This contact has ${callRecordCount} call records`);
    
    // Update the contact to have Kenan Davies details
    const updatedContact = await prisma.contact.update({
      where: {
        id: unknownContact.id
      },
      data: {
        firstName: 'Kenan',
        lastName: 'Davies',
        fullName: 'Kenan Davies',
        title: 'Mr',
        address: '8 Pavilion Court',
        city: 'Dorset',
        zipCode: 'BH2 5AU',
        residentialStatus: 'Yes'
      }
    });
    
    console.log('✅ Updated contact with Kenan Davies details');
    console.log(`📋 Contact ID: ${updatedContact.contactId}`);
    console.log(`📋 Name: ${updatedContact.fullName}`);
    console.log(`📋 Phone: ${updatedContact.phone}`);
    
    console.log('✅ Contact fix complete!');
    
  } catch (error) {
    console.error('❌ Error fixing contact:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixKenanContactData();
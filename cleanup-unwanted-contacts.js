/**
 * Clean Up Unwanted Auto-Created Contacts
 * Removes auto-sync, test, and unknown contacts that shouldn't exist
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://postgres:bRANCHsTOPsign@junction.proxy.rlwy.net:54654/railway"
});

async function cleanUpUnwantedContacts() {
  console.log('🧹 Cleaning up unwanted auto-created contacts...\n');
  
  try {
    // Step 1: Find and analyze unwanted contacts
    console.log('📋 Step 1: Identifying unwanted contacts...');
    
    // Find Auto-Sync contacts
    const autoSyncContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { firstName: 'Auto-Sync' },
          { lastName: 'Contact' },
          { firstName: 'AUTO SYNC' }
        ]
      }
    });
    
    console.log(`   Found ${autoSyncContacts.length} Auto-Sync contacts:`);
    autoSyncContacts.forEach((contact, i) => {
      console.log(`   ${i + 1}. ${contact.firstName} ${contact.lastName} - ${contact.phone} (ID: ${contact.contactId})`);
    });
    
    // Find Test contacts
    const testContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { firstName: 'Test' },
          { email: { contains: 'test@example' } },
          { email: { contains: 'test@' } },
          { firstName: { contains: 'Test' } }
        ]
      }
    });
    
    console.log(`\n   Found ${testContacts.length} Test contacts:`);
    testContacts.forEach((contact, i) => {
      console.log(`   ${i + 1}. ${contact.firstName} ${contact.lastName} - ${contact.phone} - ${contact.email || 'No email'} (ID: ${contact.contactId})`);
    });
    
    // Find Unknown contacts
    const unknownContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { firstName: 'Unknown' },
          { lastName: 'Contact' },
          { phone: 'Unknown' },
          { 
            AND: [
              { firstName: 'Unknown' },
              { lastName: 'Contact' }
            ]
          }
        ]
      }
    });
    
    console.log(`\n   Found ${unknownContacts.length} Unknown contacts:`);
    unknownContacts.forEach((contact, i) => {
      console.log(`   ${i + 1}. ${contact.firstName} ${contact.lastName} - ${contact.phone} (ID: ${contact.contactId})`);
    });
    
    // Step 2: Check for associated call records before deletion
    console.log('\n📋 Step 2: Checking for associated call records...');
    
    const allUnwantedContacts = [
      ...autoSyncContacts,
      ...testContacts,
      ...unknownContacts
    ];
    
    const uniqueUnwantedContacts = allUnwantedContacts.filter((contact, index, self) => 
      self.findIndex(c => c.id === contact.id) === index
    );
    
    console.log(`   Total unique unwanted contacts: ${uniqueUnwantedContacts.length}`);
    
    let contactsWithCalls = [];
    let contactsWithoutCalls = [];
    
    for (const contact of uniqueUnwantedContacts) {
      const callCount = await prisma.callRecord.count({
        where: { contactId: contact.contactId }
      });
      
      if (callCount > 0) {
        contactsWithCalls.push({ contact, callCount });
        console.log(`   ⚠️  ${contact.firstName} ${contact.lastName} has ${callCount} call records`);
      } else {
        contactsWithoutCalls.push(contact);
      }
    }
    
    console.log(`\n   Contacts with call records: ${contactsWithCalls.length}`);
    console.log(`   Contacts without call records: ${contactsWithoutCalls.length}`);
    
    // Step 3: Delete contacts without call records
    console.log('\n📋 Step 3: Deleting contacts without call records...');
    
    if (contactsWithoutCalls.length > 0) {
      const contactIdsToDelete = contactsWithoutCalls.map(c => c.id);
      
      const deletedCount = await prisma.contact.deleteMany({
        where: {
          id: { in: contactIdsToDelete }
        }
      });
      
      console.log(`   ✅ Deleted ${deletedCount.count} contacts without call records`);
      
      contactsWithoutCalls.forEach((contact, i) => {
        console.log(`   ${i + 1}. Deleted: ${contact.firstName} ${contact.lastName} - ${contact.phone}`);
      });
    } else {
      console.log('   ℹ️  No contacts to delete (all have call records)');
    }
    
    // Step 4: Handle contacts with call records
    console.log('\n📋 Step 4: Handling contacts with call records...');
    
    if (contactsWithCalls.length > 0) {
      console.log('   ⚠️  The following contacts have call records and should be reviewed:');
      contactsWithCalls.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.contact.firstName} ${item.contact.lastName} - ${item.contact.phone} (${item.callCount} calls)`);
      });
      
      console.log('\n   🔄 Options for contacts with call records:');
      console.log('   A) Keep them as-is (preserve call history)');
      console.log('   B) Rename them to proper names');
      console.log('   C) Delete them and their call records (CAUTION: Data loss!)');
      
      // For now, let's rename them to be more descriptive
      for (const item of contactsWithCalls) {
        const contact = item.contact;
        let newFirstName = contact.firstName;
        let newLastName = contact.lastName;
        
        if (contact.firstName === 'Unknown' && contact.lastName === 'Contact') {
          newFirstName = 'Manual Dial';
          newLastName = `Contact (${contact.phone})`;
        } else if (contact.firstName === 'Test') {
          newFirstName = 'Test Call';
          newLastName = `Record (${contact.phone})`;
        } else if (contact.firstName === 'Auto-Sync') {
          newFirstName = 'System';
          newLastName = `Contact (${contact.phone})`;
        }
        
        if (newFirstName !== contact.firstName || newLastName !== contact.lastName) {
          await prisma.contact.update({
            where: { id: contact.id },
            data: {
              firstName: newFirstName,
              lastName: newLastName
            }
          });
          
          console.log(`   🔄 Renamed: ${contact.firstName} ${contact.lastName} → ${newFirstName} ${newLastName}`);
        }
      }
    }
    
    // Step 5: Verify cleanup results
    console.log('\n📋 Step 5: Verification after cleanup...');
    
    const remainingAutoSync = await prisma.contact.count({
      where: { firstName: 'Auto-Sync' }
    });
    
    const remainingTest = await prisma.contact.count({
      where: { firstName: 'Test' }
    });
    
    const remainingUnknown = await prisma.contact.count({
      where: { 
        AND: [
          { firstName: 'Unknown' },
          { lastName: 'Contact' }
        ]
      }
    });
    
    console.log(`   Remaining Auto-Sync contacts: ${remainingAutoSync}`);
    console.log(`   Remaining Test contacts: ${remainingTest}`);
    console.log(`   Remaining Unknown contacts: ${remainingUnknown}`);
    
    // Show current contact list summary
    const allContacts = await prisma.contact.findMany({
      select: { firstName: true, lastName: true, phone: true, listId: true }
    });
    
    console.log(`\n📋 Current contact list summary (${allContacts.length} total):`);
    const contactSummary = {};
    allContacts.forEach(contact => {
      const key = `${contact.firstName} ${contact.lastName}`;
      contactSummary[key] = (contactSummary[key] || 0) + 1;
    });
    
    Object.entries(contactSummary).forEach(([name, count]) => {
      console.log(`   ${name}: ${count}`);
    });
    
    console.log('\n🎉 CLEANUP COMPLETE!');
    console.log('📋 Summary:');
    console.log(`   ✅ Deleted ${contactsWithoutCalls.length} contacts without call records`);
    console.log(`   🔄 Renamed ${contactsWithCalls.length} contacts with call records`);
    console.log(`   📞 Preserved call history for contacts with existing records`);
    
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanUpUnwantedContacts().catch(console.error);
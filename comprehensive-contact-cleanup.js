/**
 * Comprehensive Contact Cleanup Script
 * Finds and removes all unwanted auto-generated contacts
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://postgres:bRANCHsTOPsign@junction.proxy.rlwy.net:54654/railway"
});

async function comprehensiveContactCleanup() {
  console.log('🔍 Comprehensive contact cleanup - finding ALL unwanted contacts...\n');
  
  try {
    // Get ALL contacts to see what we're working with
    console.log('📋 Step 1: Analyzing ALL contacts in database...');
    
    const allContacts = await prisma.contact.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`   Total contacts in database: ${allContacts.length}\n`);
    
    // Categorize all contacts
    const validContacts = [];
    const unwantedContacts = [];
    
    allContacts.forEach((contact, i) => {
      console.log(`   ${i + 1}. ${contact.firstName} ${contact.lastName} - ${contact.phone} - List: ${contact.listId}`);
      
      // Identify unwanted patterns
      const isUnwanted = (
        contact.firstName === 'Auto-Sync' ||
        contact.firstName === 'AUTO SYNC' ||
        contact.lastName === 'Contact' ||
        contact.firstName === 'Unknown' ||
        contact.firstName === 'Test' ||
        contact.phone === 'Unknown' ||
        contact.phone === '+447700900000' ||
        contact.phone === '+447700900001' ||
        contact.phone === '+447700900002' ||
        (contact.firstName === 'Test' && contact.lastName === 'Contact') ||
        (contact.firstName === 'Unknown' && contact.lastName === 'Contact') ||
        contact.email === 'test@example.com' ||
        contact.contactId.includes('test-') ||
        contact.contactId.includes('debug-') ||
        contact.contactId.includes('contact-test-') ||
        contact.contactId.includes('contact-debug-') ||
        contact.contactId.includes('contact-fallback-') ||
        contact.listId === 'manual-contacts' && contact.firstName === 'Unknown'
      );
      
      if (isUnwanted) {
        unwantedContacts.push(contact);
        console.log(`      ❌ UNWANTED: ${contact.firstName} ${contact.lastName}`);
      } else {
        validContacts.push(contact);
        console.log(`      ✅ VALID: ${contact.firstName} ${contact.lastName}`);
      }
    });
    
    console.log(`\n📊 Analysis Results:`);
    console.log(`   Valid contacts: ${validContacts.length}`);
    console.log(`   Unwanted contacts: ${unwantedContacts.length}`);
    
    if (unwantedContacts.length === 0) {
      console.log('\n✅ No unwanted contacts found! Database is clean.');
      return;
    }
    
    // Step 2: Check for call records
    console.log(`\n📋 Step 2: Checking call records for unwanted contacts...`);
    
    const contactsWithCalls = [];
    const contactsWithoutCalls = [];
    
    for (const contact of unwantedContacts) {
      const callRecords = await prisma.callRecord.findMany({
        where: { contactId: contact.contactId },
        select: { id: true, callId: true, createdAt: true }
      });
      
      if (callRecords.length > 0) {
        contactsWithCalls.push({ contact, callRecords });
        console.log(`   📞 ${contact.firstName} ${contact.lastName} has ${callRecords.length} call records`);
      } else {
        contactsWithoutCalls.push(contact);
        console.log(`   📭 ${contact.firstName} ${contact.lastName} has no call records`);
      }
    }
    
    // Step 3: Delete contacts without call records
    if (contactsWithoutCalls.length > 0) {
      console.log(`\n📋 Step 3: Deleting ${contactsWithoutCalls.length} contacts without call records...`);
      
      for (const contact of contactsWithoutCalls) {
        try {
          await prisma.contact.delete({
            where: { id: contact.id }
          });
          console.log(`   ✅ Deleted: ${contact.firstName} ${contact.lastName} - ${contact.phone} (${contact.contactId})`);
        } catch (error) {
          console.log(`   ❌ Failed to delete ${contact.firstName} ${contact.lastName}: ${error.message}`);
        }
      }
    }
    
    // Step 4: Handle contacts with call records
    if (contactsWithCalls.length > 0) {
      console.log(`\n📋 Step 4: Handling ${contactsWithCalls.length} contacts with call records...`);
      console.log('   These contacts have call history, so we\'ll rename them instead of deleting:');
      
      for (const item of contactsWithCalls) {
        const contact = item.contact;
        const callRecords = item.callRecords;
        
        console.log(`   📞 ${contact.firstName} ${contact.lastName} - ${contact.phone}`);
        console.log(`      Call records: ${callRecords.length}`);
        
        // Propose new name based on phone number
        const newFirstName = 'Manual Dial';
        const newLastName = contact.phone !== 'Unknown' ? contact.phone : 'Contact';
        
        try {
          await prisma.contact.update({
            where: { id: contact.id },
            data: {
              firstName: newFirstName,
              lastName: newLastName
            }
          });
          
          console.log(`      🔄 Renamed to: ${newFirstName} ${newLastName}`);
        } catch (error) {
          console.log(`      ❌ Failed to rename: ${error.message}`);
        }
      }
    }
    
    // Step 5: Final verification
    console.log(`\n📋 Step 5: Final verification...`);
    
    const finalContactCount = await prisma.contact.count();
    const finalContacts = await prisma.contact.findMany({
      select: { firstName: true, lastName: true, phone: true, listId: true }
    });
    
    console.log(`   Final contact count: ${finalContactCount}`);
    console.log(`   Remaining contacts:`);
    
    finalContacts.forEach((contact, i) => {
      console.log(`   ${i + 1}. ${contact.firstName} ${contact.lastName} - ${contact.phone} (List: ${contact.listId})`);
    });
    
    console.log('\n🎉 COMPREHENSIVE CLEANUP COMPLETE!');
    console.log('📊 Summary:');
    console.log(`   ✅ Deleted: ${contactsWithoutCalls.length} contacts without call records`);
    console.log(`   🔄 Renamed: ${contactsWithCalls.length} contacts with call records`);
    console.log(`   📱 Valid contacts preserved: ${validContacts.length}`);
    console.log(`   📞 Call history preserved for all relevant contacts`);
    
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the comprehensive cleanup
comprehensiveContactCleanup().catch(console.error);
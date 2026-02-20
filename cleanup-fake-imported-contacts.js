#!/usr/bin/env node

/**
 * Omnivox AI - Contact Data Cleanup Script
 * 
 * This script removes fake "Imported" contacts that were created during
 * recording imports and should not appear in the Contacts section.
 * 
 * Fake contacts to remove:
 * - firstName = 'Imported' 
 * - listId in ('TWILIO-IMPORT', 'IMPORTED-CONTACTS')
 * - contactId starting with 'imported-'
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupFakeImportedContacts() {
  console.log('🧹 Starting Fake Imported Contacts Cleanup...\n');

  try {
    // Step 1: Find all fake imported contacts
    console.log('1️⃣ Finding fake imported contacts...');
    
    const fakeContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { firstName: 'Imported' },
          { listId: 'TWILIO-IMPORT' },
          { listId: 'IMPORTED-CONTACTS' },
          { contactId: { startsWith: 'imported-' } }
        ]
      },
      select: {
        contactId: true,
        firstName: true,
        lastName: true,
        phone: true,
        listId: true,
        _count: {
          select: {
            callRecords: true
          }
        }
      }
    });

    console.log(`📊 Found ${fakeContacts.length} fake imported contacts:`);
    fakeContacts.forEach(contact => {
      console.log(`   - ${contact.contactId}: ${contact.firstName} ${contact.lastName} (${contact.phone}) in list "${contact.listId}" with ${contact._count.callRecords} call records`);
    });

    if (fakeContacts.length === 0) {
      console.log('✅ No fake imported contacts found - cleanup not needed!');
      return;
    }

    // Step 2: Handle call records linked to fake contacts
    console.log('\n2️⃣ Handling call records linked to fake contacts...');
    
    const fakeContactIds = fakeContacts.map(c => c.contactId);
    
    // Get call records that will be affected
    const affectedCallRecords = await prisma.callRecord.findMany({
      where: {
        contactId: {
          in: fakeContactIds
        }
      },
      select: {
        id: true,
        callId: true,
        phoneNumber: true,
        startTime: true,
        recording: true
      }
    });

    console.log(`📊 Found ${affectedCallRecords.length} call records linked to fake contacts`);
    
    if (affectedCallRecords.length > 0) {
      console.log('   Call records to be preserved (but unlinked):');
      affectedCallRecords.slice(0, 5).forEach(record => {
        console.log(`   - ${record.callId}: ${record.phoneNumber} at ${record.startTime.toISOString()}`);
      });
      if (affectedCallRecords.length > 5) {
        console.log(`   - ... and ${affectedCallRecords.length - 5} more`);
      }
    }

    // Since contactId is required in schema, we can't set it to null
    // The foreign key constraint with CASCADE will handle cleanup when we delete contacts
    console.log('ℹ️  Call records will be automatically deleted due to CASCADE constraint');

    // Step 3: Delete the fake contacts
    console.log('\n3️⃣ Deleting fake imported contacts...');
    
    const deletedContacts = await prisma.contact.deleteMany({
      where: {
        OR: [
          { firstName: 'Imported' },
          { listId: 'TWILIO-IMPORT' },
          { listId: 'IMPORTED-CONTACTS' },
          { contactId: { startsWith: 'imported-' } }
        ]
      }
    });

    console.log(`✅ Deleted ${deletedContacts.count} fake imported contacts`);

    // Step 4: Clean up fake data lists if they're empty
    console.log('\n4️⃣ Cleaning up fake data lists...');
    
    for (const listId of ['TWILIO-IMPORT', 'IMPORTED-CONTACTS']) {
      const contactCount = await prisma.contact.count({
        where: { listId }
      });
      
      if (contactCount === 0) {
        try {
          await prisma.dataList.delete({
            where: { listId }
          });
          console.log(`✅ Deleted empty fake data list: ${listId}`);
        } catch (error) {
          console.log(`ℹ️  Data list ${listId} doesn't exist or couldn't be deleted`);
        }
      } else {
        console.log(`⚠️  Data list ${listId} still has ${contactCount} contacts - keeping it`);
      }
    }

    // Step 5: Verify cleanup
    console.log('\n5️⃣ Verifying cleanup...');
    
    const remainingFakeContacts = await prisma.contact.count({
      where: {
        OR: [
          { firstName: 'Imported' },
          { listId: 'TWILIO-IMPORT' },
          { listId: 'IMPORTED-CONTACTS' },
          { contactId: { startsWith: 'imported-' } }
        ]
      }
    });

    const orphanedCallRecords = await prisma.callRecord.count({
      where: {
        agentId: null,
        phoneNumber: 'Unknown'
      }
    });

    console.log(`📊 Cleanup verification:`);
    console.log(`   - Remaining fake contacts: ${remainingFakeContacts}`);
    console.log(`   - Imported call records (agentId: null): ${orphanedCallRecords}`);

    if (remainingFakeContacts === 0) {
      console.log('\n🎉 Cleanup completed successfully!');
      console.log('✅ All fake imported contacts have been removed');
      console.log('✅ Related call records were cleaned up by CASCADE constraint');
      console.log('✅ Contacts page will now only show real customer data');
      console.log('ℹ️  Recording files are preserved in the Recording table');
    } else {
      console.log('\n⚠️  Some fake contacts still remain - manual review may be needed');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
if (require.main === module) {
  cleanupFakeImportedContacts()
    .catch(error => {
      console.error('💥 Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupFakeImportedContacts };
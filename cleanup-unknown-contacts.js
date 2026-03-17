#!/usr/bin/env node

/**
 * Remove all unknown contacts from the Omnivox system
 * This will clean up duplicate "Unknown Contact" entries that were created before the phone matching fix
 */

const API_BASE = 'https://froniterai-production.up.railway.app';

async function cleanupUnknownContacts() {
  try {
    console.log('🧹 Starting unknown contacts cleanup...\n');

    // Get all contacts to identify unknowns
    console.log('1. 📋 Fetching all contacts...');
    const contactsResponse = await fetch(`${API_BASE}/api/contacts`, {
      headers: {
        'Authorization': 'Bearer dummy-test-token' // Use system token for cleanup
      }
    });

    if (!contactsResponse.ok) {
      throw new Error(`Failed to fetch contacts: ${contactsResponse.status}`);
    }

    const contactsData = await contactsResponse.json();
    console.log(`   Found ${contactsData.data?.length || 0} total contacts`);

    if (!contactsData.success || !contactsData.data) {
      console.log('❌ No contacts data returned');
      return;
    }

    // Filter unknown contacts
    const unknownContacts = contactsData.data.filter(contact => 
      contact.firstName === 'Unknown' || 
      contact.lastName === 'Contact' ||
      contact.firstName === 'Unknown Contact' ||
      (contact.firstName === 'Unknown' && contact.lastName === 'Contact')
    );

    console.log(`   🎯 Found ${unknownContacts.length} unknown contacts to remove`);

    if (unknownContacts.length === 0) {
      console.log('✅ No unknown contacts found - system is clean!');
      return;
    }

    // Show details of what will be removed
    console.log('\n2. 🔍 Unknown contacts to be removed:');
    unknownContacts.forEach((contact, index) => {
      console.log(`   ${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.phone || 'no phone'}) - ID: ${contact.contactId}`);
    });

    // Remove each unknown contact
    console.log(`\n3. 🗑️  Removing ${unknownContacts.length} unknown contacts...`);
    let removedCount = 0;
    let failedCount = 0;

    for (const contact of unknownContacts) {
      try {
        const deleteResponse = await fetch(`${API_BASE}/api/contacts/${contact.contactId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer dummy-test-token',
            'Content-Type': 'application/json'
          }
        });

        if (deleteResponse.ok) {
          console.log(`   ✅ Removed: ${contact.firstName} ${contact.lastName} (${contact.contactId})`);
          removedCount++;
        } else {
          console.log(`   ❌ Failed to remove: ${contact.firstName} ${contact.lastName} (${contact.contactId}) - Status: ${deleteResponse.status}`);
          failedCount++;
        }

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (deleteError) {
        console.log(`   ❌ Error removing: ${contact.firstName} ${contact.lastName} (${contact.contactId}) - ${deleteError.message}`);
        failedCount++;
      }
    }

    // Summary
    console.log(`\n📊 Cleanup Summary:`);
    console.log(`   ✅ Successfully removed: ${removedCount} contacts`);
    console.log(`   ❌ Failed to remove: ${failedCount} contacts`);
    console.log(`   📋 Total processed: ${unknownContacts.length} contacts`);

    if (removedCount > 0) {
      console.log(`\n🎉 Cleanup complete! Removed ${removedCount} unknown contacts from the system.`);
      console.log(`💡 Future calls will now properly link to existing contacts thanks to the phone matching fix.`);
    }

  } catch (error) {
    console.error('💥 Error during cleanup:', error);
    console.log('\nIf this fails, you may need to:');
    console.log('1. Check if the backend is running');
    console.log('2. Verify the API endpoint is accessible');
    console.log('3. Ensure authentication is working');
  }
}

// Run the cleanup
cleanupUnknownContacts();
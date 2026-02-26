// Clean up unwanted data lists and contacts
const axios = require('axios');

const BASE_URL = 'https://froniterai-production.up.railway.app';
const AUTH_HEADER = { Authorization: 'Bearer dummy-test-token' };

async function cleanupUnwantedLists() {
  try {
    console.log('=== UNWANTED DATA LISTS CLEANUP ===\n');
    
    // 1. Get current data lists
    console.log('1. Getting current data lists...');
    const listsResponse = await axios.get(`${BASE_URL}/api/admin/campaign-management/data-lists`, {
      headers: AUTH_HEADER
    });
    
    const dataLists = listsResponse.data.data.dataLists;
    console.log(`Found ${dataLists.length} data lists:\n`);
    
    dataLists.forEach((list, index) => {
      console.log(`${index + 1}. ${list.name} (${list.listId})`);
      console.log(`   Contacts: ${list.totalContacts}`);
      console.log(`   Campaign: ${list.campaignId || 'None'}`);
      console.log(`   Created: ${list.createdAt}`);
      console.log('');
    });
    
    // 2. Identify lists to delete
    const listsToDelete = [
      'AUTO-SYNC-CONTACTS',      // Should have been deleted
      'IMPORTED-CONTACTS',       // Shouldn't exist
      'list_1767031754967'       // DAC TEST with 7,149 contacts
    ];
    
    console.log('2. Lists marked for deletion:');
    listsToDelete.forEach((listId, index) => {
      const list = dataLists.find(l => l.listId === listId);
      if (list) {
        console.log(`${index + 1}. ${list.name} (${listId}) - ${list.totalContacts} contacts`);
      } else {
        console.log(`${index + 1}. ${listId} - NOT FOUND`);
      }
    });
    
    // 3. Delete contacts from unwanted lists
    console.log('\n3. Deleting contacts from unwanted lists...');
    
    for (const listId of listsToDelete) {
      try {
        console.log(`\nDeleting contacts from list: ${listId}`);
        
        // Delete all contacts from this list
        const deleteResponse = await axios.delete(`${BASE_URL}/api/contacts/list/${listId}`, {
          headers: AUTH_HEADER
        });
        
        if (deleteResponse.data.success) {
          console.log(`✅ Successfully deleted contacts from ${listId}`);
          console.log(`   Deleted: ${deleteResponse.data.data.deletedCount} contacts`);
        } else {
          console.log(`❌ Failed to delete contacts from ${listId}:`, deleteResponse.data.error);
        }
        
      } catch (error) {
        console.log(`❌ Error deleting contacts from ${listId}:`, error.response?.data || error.message);
      }
    }
    
    // 4. Verify final contact count
    console.log('\n4. Verifying cleanup...');
    
    try {
      const contactsResponse = await axios.get(`${BASE_URL}/api/contacts`, {
        headers: AUTH_HEADER
      });
      
      if (contactsResponse.data.success) {
        const totalContacts = contactsResponse.data.data.pagination.total;
        console.log(`\n✅ Final contact count: ${totalContacts}`);
        
        if (totalContacts <= 10) {
          console.log('🎉 SUCCESS: Contact count is now reasonable!');
        } else {
          console.log('⚠️  WARNING: Still too many contacts. Manual investigation needed.');
        }
      }
      
    } catch (error) {
      console.log('❌ Error verifying contact count:', error.response?.data || error.message);
    }
    
    // 5. Show remaining valid lists
    console.log('\n5. Remaining data lists should be:');
    console.log('   - Manual Dial List (manual-dial-list) - for manual dialing');
    console.log('   - Manual Contacts (manual-contacts) - for manual contacts');
    console.log('   - DAC Preview Test Contacts (if needed for testing)');
    console.log('\n   All other lists should be gone.');
    
  } catch (error) {
    console.error('Error cleaning up unwanted lists:', error.response?.data || error.message);
  }
}

cleanupUnwantedLists();
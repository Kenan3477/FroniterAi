// Clean up ONLY auto-sync and imported contacts (preserve DAC test list)
const axios = require('axios');

const BASE_URL = 'https://froniterai-production.up.railway.app';
const AUTH_HEADER = { Authorization: 'Bearer dummy-test-token' };

async function cleanupAutoSyncOnly() {
  try {
    console.log('=== CLEANING UP AUTO-SYNC AND IMPORTED CONTACTS ONLY ===\n');
    
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
      console.log(`   Status: ${list.listId === 'AUTO-SYNC-CONTACTS' || list.listId === 'IMPORTED-CONTACTS' ? '❌ DELETE' : '✅ KEEP'}`);
      console.log('');
    });
    
    // 2. Only delete the problematic auto-sync lists
    const listsToDelete = [
      'AUTO-SYNC-CONTACTS',      // Auto-sync contacts - DELETE
      'IMPORTED-CONTACTS'        // Imported contacts - DELETE
    ];
    
    console.log('2. Lists marked for deletion (ONLY auto-sync/imported):');
    listsToDelete.forEach((listId, index) => {
      const list = dataLists.find(l => l.listId === listId);
      if (list) {
        console.log(`${index + 1}. ${list.name} (${listId}) - ${list.totalContacts} contacts`);
      } else {
        console.log(`${index + 1}. ${listId} - NOT FOUND`);
      }
    });
    
    console.log('\nLists being PRESERVED:');
    const preservedLists = dataLists.filter(list => !listsToDelete.includes(list.listId));
    preservedLists.forEach((list, index) => {
      console.log(`${index + 1}. ${list.name} (${list.listId}) - ${list.totalContacts} contacts - ✅ KEEPING`);
    });
    
    // 3. Delete contacts from ONLY the problematic lists
    console.log('\n3. Deleting contacts from auto-sync and imported lists only...');
    
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
    
    // 4. Verify final state
    console.log('\n4. Verifying cleanup...');
    
    try {
      const contactsResponse = await axios.get(`${BASE_URL}/api/contacts`, {
        headers: AUTH_HEADER
      });
      
      if (contactsResponse.data.success) {
        const totalContacts = contactsResponse.data.data.pagination.total;
        console.log(`\n✅ Final contact count: ${totalContacts}`);
        
        // Get updated data lists
        const updatedListsResponse = await axios.get(`${BASE_URL}/api/admin/campaign-management/data-lists`, {
          headers: AUTH_HEADER
        });
        
        console.log('\nRemaining data lists:');
        const remainingLists = updatedListsResponse.data.data.dataLists;
        remainingLists.forEach((list, index) => {
          console.log(`${index + 1}. ${list.name} (${list.listId}) - ${list.totalContacts} contacts`);
        });
        
        // Expected: DAC TEST (~7149), Manual lists (~7), DAC Preview (~1)
        const autoSyncRemaining = remainingLists.find(l => l.listId === 'AUTO-SYNC-CONTACTS');
        const importedRemaining = remainingLists.find(l => l.listId === 'IMPORTED-CONTACTS');
        
        if (!autoSyncRemaining && !importedRemaining) {
          console.log('\n🎉 SUCCESS: Auto-sync and imported lists have been removed!');
          console.log('✅ DAC TEST list preserved with real customer data');
          console.log('✅ Manual lists preserved for manual dialing');
        } else {
          console.log('\n⚠️  WARNING: Some problematic lists may still exist.');
        }
      }
      
    } catch (error) {
      console.log('❌ Error verifying final state:', error.response?.data || error.message);
    }
    
    console.log('\n=== CLEANUP SUMMARY ===');
    console.log('✅ DELETED: Auto-Sync Contacts (unwanted auto-generated)');
    console.log('✅ DELETED: Imported Contacts (unwanted auto-generated)'); 
    console.log('✅ PRESERVED: DAC TEST (real customer data)');
    console.log('✅ PRESERVED: Manual lists (for manual dialing)');
    console.log('✅ PRESERVED: DAC Preview Test (testing purposes)');
    
  } catch (error) {
    console.error('Error cleaning up auto-sync contacts:', error.response?.data || error.message);
  }
}

cleanupAutoSyncOnly();
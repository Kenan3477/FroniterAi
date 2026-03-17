// Clean up remaining imported contacts
const axios = require('axios');

const BASE_URL = 'https://froniterai-production.up.railway.app';
const AUTH_HEADER = { Authorization: 'Bearer dummy-test-token' };

async function cleanupImportedContacts() {
  try {
    console.log('=== CLEANING UP REMAINING IMPORTED CONTACTS ===\n');
    
    // Get all contacts and filter for IMPORTED-CONTACTS
    const contactsResponse = await axios.get(`${BASE_URL}/api/contacts`, {
      headers: AUTH_HEADER,
      params: { limit: 50 }
    });
    
    if (!contactsResponse.data.success) {
      console.log('❌ Failed to get contacts:', contactsResponse.data.error);
      return;
    }
    
    const allContacts = contactsResponse.data.data.contacts;
    const importedContacts = allContacts.filter(contact => contact.listId === 'IMPORTED-CONTACTS');
    
    console.log(`Found ${importedContacts.length} contacts in IMPORTED-CONTACTS list:`);
    
    importedContacts.forEach((contact, index) => {
      console.log(`${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.phone})`);
    });
    
    if (importedContacts.length === 0) {
      console.log('✅ No imported contacts found to delete');
      return;
    }
    
    console.log(`\nDeleting ${importedContacts.length} imported contacts...`);
    
    let deleted = 0;
    for (const contact of importedContacts) {
      try {
        console.log(`Deleting: ${contact.firstName} ${contact.lastName}`);
        
        const deleteResponse = await axios.delete(`${BASE_URL}/api/contacts/${contact.contactId}`, {
          headers: AUTH_HEADER
        });
        
        if (deleteResponse.data.success) {
          deleted++;
          console.log(`  ✅ Deleted successfully`);
        } else {
          console.log(`  ❌ Failed:`, deleteResponse.data.error);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`  ❌ Error:`, error.response?.data || error.message);
      }
    }
    
    console.log(`\n✅ Deleted ${deleted} imported contacts`);
    
    // Final verification
    const finalResponse = await axios.get(`${BASE_URL}/api/admin/campaign-management/data-lists`, {
      headers: AUTH_HEADER
    });
    
    console.log('\nFinal data list status:');
    const lists = finalResponse.data.data.dataLists;
    lists.forEach(list => {
      const status = (list.listId === 'AUTO-SYNC-CONTACTS' || list.listId === 'IMPORTED-CONTACTS') 
        ? (list.totalContacts === 0 ? '✅ CLEAN' : '❌ STILL HAS CONTACTS') 
        : '✅ PRESERVED';
      
      console.log(`${list.name}: ${list.totalContacts} contacts - ${status}`);
    });
    
    const autoSyncList = lists.find(l => l.listId === 'AUTO-SYNC-CONTACTS');
    const importedList = lists.find(l => l.listId === 'IMPORTED-CONTACTS');
    
    if (autoSyncList?.totalContacts === 0 && importedList?.totalContacts === 0) {
      console.log('\n🎉 SUCCESS: All unwanted auto-generated contacts have been removed!');
      console.log('✅ Real customer data in DAC TEST list preserved');
      console.log('✅ Manual contact lists preserved');
    }
    
  } catch (error) {
    console.error('Error cleaning imported contacts:', error.response?.data || error.message);
  }
}

cleanupImportedContacts();
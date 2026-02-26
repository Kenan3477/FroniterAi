// Delete individual contacts from auto-sync and imported lists
const axios = require('axios');

const BASE_URL = 'https://froniterai-production.up.railway.app';
const AUTH_HEADER = { Authorization: 'Bearer dummy-test-token' };

async function deleteAutoSyncContacts() {
  try {
    console.log('=== DELETING AUTO-SYNC AND IMPORTED CONTACTS ===\n');
    
    const problematicLists = ['AUTO-SYNC-CONTACTS', 'IMPORTED-CONTACTS'];
    let totalDeleted = 0;
    
    for (const listId of problematicLists) {
      console.log(`\n🔍 Processing list: ${listId}`);
      
      try {
        // Get contacts from this specific list
        const contactsResponse = await axios.get(`${BASE_URL}/api/contacts`, {
          headers: AUTH_HEADER,
          params: { listId: listId, limit: 100 }  // Get contacts filtered by listId
        });
        
        if (contactsResponse.data.success) {
          const contacts = contactsResponse.data.data.contacts;
          
          // Filter contacts that belong to this specific list
          const listContacts = contacts.filter(contact => contact.listId === listId);
          
          console.log(`Found ${listContacts.length} contacts in ${listId}`);
          
          if (listContacts.length === 0) {
            console.log(`✅ No contacts found in ${listId}`);
            continue;
          }
          
          // Delete each contact individually
          let deletedFromList = 0;
          for (const contact of listContacts) {
            try {
              console.log(`Deleting: ${contact.firstName} ${contact.lastName} (${contact.phone})`);
              
              const deleteResponse = await axios.delete(`${BASE_URL}/api/contacts/${contact.contactId}`, {
                headers: AUTH_HEADER
              });
              
              if (deleteResponse.data.success) {
                deletedFromList++;
                totalDeleted++;
                console.log(`  ✅ Deleted successfully`);
              } else {
                console.log(`  ❌ Failed to delete:`, deleteResponse.data.error);
              }
              
              // Small delay to avoid overwhelming the API
              await new Promise(resolve => setTimeout(resolve, 100));
              
            } catch (error) {
              console.log(`  ❌ Error deleting contact ${contact.contactId}:`, error.response?.data || error.message);
            }
          }
          
          console.log(`✅ Deleted ${deletedFromList} contacts from ${listId}`);
          
        } else {
          console.log(`❌ Failed to get contacts from ${listId}:`, contactsResponse.data.error);
        }
        
      } catch (error) {
        console.log(`❌ Error processing ${listId}:`, error.response?.data || error.message);
      }
    }
    
    console.log(`\n🎉 CLEANUP COMPLETE`);
    console.log(`Total contacts deleted: ${totalDeleted}`);
    
    // Verify final contact count
    console.log('\n🔍 Verifying final state...');
    
    try {
      const finalResponse = await axios.get(`${BASE_URL}/api/contacts`, {
        headers: AUTH_HEADER
      });
      
      if (finalResponse.data.success) {
        const finalTotal = finalResponse.data.data.pagination.total;
        console.log(`Final contact count: ${finalTotal}`);
        
        // Check if auto-sync contacts are gone
        const remainingAutoSync = finalResponse.data.data.contacts.filter(c => 
          c.listId === 'AUTO-SYNC-CONTACTS' || c.listId === 'IMPORTED-CONTACTS'
        );
        
        if (remainingAutoSync.length === 0) {
          console.log('✅ SUCCESS: All auto-sync and imported contacts removed!');
        } else {
          console.log(`⚠️  WARNING: ${remainingAutoSync.length} problematic contacts still remain`);
        }
        
        // Show breakdown by list
        const listCounts = {};
        finalResponse.data.data.contacts.forEach(contact => {
          listCounts[contact.listId] = (listCounts[contact.listId] || 0) + 1;
        });
        
        console.log('\nRemaining contacts by list:');
        Object.entries(listCounts).forEach(([listId, count]) => {
          console.log(`  ${listId}: ${count} contacts`);
        });
        
      }
      
    } catch (error) {
      console.log('❌ Error verifying final state:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('Error in cleanup process:', error.response?.data || error.message);
  }
}

deleteAutoSyncContacts();
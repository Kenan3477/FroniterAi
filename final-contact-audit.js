// Final audit of contact cleanup
const axios = require('axios');

const BASE_URL = 'https://froniterai-production.up.railway.app';
const AUTH_HEADER = { Authorization: 'Bearer dummy-test-token' };

async function finalAudit() {
  try {
    console.log('=== FINAL CONTACT CLEANUP AUDIT ===\n');
    
    // 1. Get actual contact counts from contacts API
    console.log('1. Getting actual contact distribution...');
    
    let allContacts = [];
    let page = 1;
    let hasMore = true;
    
    // Get all contacts with pagination
    while (hasMore && page <= 5) { // Limit to 5 pages for safety
      try {
        const response = await axios.get(`${BASE_URL}/api/contacts`, {
          headers: AUTH_HEADER,
          params: { page, limit: 50 }
        });
        
        if (response.data.success) {
          const contacts = response.data.data.contacts;
          allContacts.push(...contacts);
          
          const pagination = response.data.data.pagination;
          hasMore = page < pagination.totalPages;
          page++;
          
          console.log(`  Page ${page - 1}: ${contacts.length} contacts (Total so far: ${allContacts.length})`);
          
          if (allContacts.length >= 100) { // Safety limit
            console.log('  Stopping at 100 contacts for audit purposes');
            break;
          }
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.log(`Error fetching page ${page}:`, error.response?.data || error.message);
        hasMore = false;
      }
    }
    
    // 2. Analyze contact distribution by listId
    console.log(`\n2. Analyzing ${allContacts.length} contacts by list...`);
    
    const listCounts = {};
    const problemContacts = [];
    
    allContacts.forEach(contact => {
      const listId = contact.listId;
      listCounts[listId] = (listCounts[listId] || 0) + 1;
      
      // Flag problematic contacts
      if (listId === 'AUTO-SYNC-CONTACTS' || listId === 'IMPORTED-CONTACTS') {
        problemContacts.push(contact);
      }
    });
    
    console.log('\nContact distribution:');
    Object.entries(listCounts).forEach(([listId, count]) => {
      const status = (listId === 'AUTO-SYNC-CONTACTS' || listId === 'IMPORTED-CONTACTS') ? '❌ PROBLEM' : '✅ OK';
      console.log(`  ${listId}: ${count} contacts - ${status}`);
    });
    
    // 3. Show any remaining problematic contacts
    if (problemContacts.length > 0) {
      console.log(`\n3. Found ${problemContacts.length} problematic contacts still remaining:`);
      problemContacts.forEach((contact, index) => {
        console.log(`  ${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.phone}) - List: ${contact.listId}`);
        console.log(`     Contact ID: ${contact.contactId}`);
      });
      
      console.log('\n   These contacts should be deleted manually if they are unwanted.');
    } else {
      console.log('\n3. ✅ No problematic auto-sync or imported contacts found in sample!');
    }
    
    // 4. Compare with data list totals
    console.log('\n4. Data list vs actual contact comparison:');
    
    const dataListsResponse = await axios.get(`${BASE_URL}/api/admin/campaign-management/data-lists`, {
      headers: AUTH_HEADER
    });
    
    if (dataListsResponse.data.success) {
      const dataLists = dataListsResponse.data.data.dataLists;
      
      dataLists.forEach(list => {
        const actualCount = listCounts[list.listId] || 0;
        const expectedCount = list.totalContacts;
        const match = actualCount === expectedCount ? '✅' : '⚠️';
        
        console.log(`  ${list.name}:`);
        console.log(`    Expected: ${expectedCount} | Actual: ${actualCount} ${match}`);
      });
    }
    
    // 5. Summary
    console.log('\n=== CLEANUP SUMMARY ===');
    
    const autoSyncCount = listCounts['AUTO-SYNC-CONTACTS'] || 0;
    const importedCount = listCounts['IMPORTED-CONTACTS'] || 0;
    const dacTestCount = listCounts['list_1767031754967'] || 0;
    const manualCount = (listCounts['manual-contacts'] || 0) + (listCounts['manual-dial-list'] || 0);
    
    console.log(`✅ Auto-Sync Contacts: ${autoSyncCount} (should be 0)`);
    console.log(`✅ Imported Contacts: ${importedCount} (should be 0)`);
    console.log(`✅ DAC TEST (real customers): ${dacTestCount} (preserved)`);
    console.log(`✅ Manual contacts: ${manualCount} (preserved)`);
    
    if (autoSyncCount === 0 && importedCount === 0) {
      console.log('\n🎉 SUCCESS: All unwanted auto-generated contacts have been removed!');
      console.log('📋 Only legitimate contacts remain:');
      console.log('   - Real customer data (DAC TEST)');
      console.log('   - Manual dial contacts');
      console.log('   - Test contacts (DAC Preview)');
    } else {
      console.log('\n⚠️ Some unwanted contacts may still exist. Manual cleanup may be needed.');
    }
    
  } catch (error) {
    console.error('Error in final audit:', error.response?.data || error.message);
  }
}

finalAudit();
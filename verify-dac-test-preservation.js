// Verify all DAC TEST contacts are preserved
const axios = require('axios');

const BASE_URL = 'https://froniterai-production.up.railway.app';
const AUTH_HEADER = { Authorization: 'Bearer dummy-test-token' };

async function verifyDacTestContacts() {
  try {
    console.log('=== VERIFYING DAC TEST CONTACTS PRESERVATION ===\n');
    
    // 1. Check data list summary first
    console.log('1. Checking data list summary...');
    const dataListsResponse = await axios.get(`${BASE_URL}/api/admin/campaign-management/data-lists`, {
      headers: AUTH_HEADER
    });
    
    if (dataListsResponse.data.success) {
      const dacTestList = dataListsResponse.data.data.dataLists.find(l => l.listId === 'list_1767031754967');
      if (dacTestList) {
        console.log(`DAC TEST list shows: ${dacTestList.totalContacts} contacts`);
      } else {
        console.log('❌ DAC TEST list not found!');
        return;
      }
    }
    
    // 2. Get total contact count from contacts API
    console.log('\n2. Getting total contact count...');
    const totalResponse = await axios.get(`${BASE_URL}/api/contacts?limit=1`, {
      headers: AUTH_HEADER
    });
    
    if (totalResponse.data.success) {
      const totalContacts = totalResponse.data.data.pagination.total;
      console.log(`Total contacts in system: ${totalContacts}`);
    }
    
    // 3. Count DAC TEST contacts specifically
    console.log('\n3. Counting DAC TEST contacts specifically...');
    
    let dacTestContactCount = 0;
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      try {
        const response = await axios.get(`${BASE_URL}/api/contacts`, {
          headers: AUTH_HEADER,
          params: { page, limit: 50 }
        });
        
        if (response.data.success) {
          const contacts = response.data.data.contacts;
          const dacTestContactsOnPage = contacts.filter(c => c.listId === 'list_1767031754967');
          dacTestContactCount += dacTestContactsOnPage.length;
          
          const pagination = response.data.data.pagination;
          console.log(`  Page ${page}: ${dacTestContactsOnPage.length} DAC TEST contacts (Running total: ${dacTestContactCount})`);
          
          hasMore = page < pagination.totalPages;
          page++;
          
          // Safety break to avoid infinite loop
          if (page > 150) {
            console.log('  Stopping at page 150 for safety');
            break;
          }
        } else {
          console.log(`Error on page ${page}:`, response.data.error);
          hasMore = false;
        }
      } catch (error) {
        console.log(`Error fetching page ${page}:`, error.response?.data || error.message);
        hasMore = false;
      }
    }
    
    console.log(`\n📊 VERIFICATION RESULTS:`);
    console.log(`DAC TEST contacts found via API scan: ${dacTestContactCount}`);
    console.log(`DAC TEST contacts expected: 7,149`);
    
    if (dacTestContactCount === 7149) {
      console.log('✅ SUCCESS: All 7,149 DAC TEST contacts are preserved!');
    } else if (dacTestContactCount > 7000) {
      console.log('✅ MOSTLY PRESERVED: Most DAC TEST contacts are still there');
      console.log(`   Difference: ${7149 - dacTestContactCount} contacts`);
    } else {
      console.log('❌ PROBLEM: Significant number of DAC TEST contacts missing!');
      console.log(`   Missing: ${7149 - dacTestContactCount} contacts`);
    }
    
    // 4. Sample some DAC TEST contacts to verify they're real
    console.log('\n4. Sampling DAC TEST contacts to verify they contain real data...');
    
    const sampleResponse = await axios.get(`${BASE_URL}/api/contacts?limit=5`, {
      headers: AUTH_HEADER
    });
    
    if (sampleResponse.data.success) {
      const dacTestSample = sampleResponse.data.data.contacts.filter(c => c.listId === 'list_1767031754967').slice(0, 3);
      
      if (dacTestSample.length > 0) {
        console.log('Sample DAC TEST contacts:');
        dacTestSample.forEach((contact, index) => {
          console.log(`  ${index + 1}. ${contact.firstName} ${contact.lastName} - ${contact.phone}`);
          console.log(`     Address: ${contact.customFields?.address || 'N/A'}`);
        });
      } else {
        console.log('No DAC TEST contacts found in sample');
      }
    }
    
    // 5. Check if any auto-sync contacts still exist
    console.log('\n5. Double-checking for any remaining auto-sync contacts...');
    
    let autoSyncFound = 0;
    let importedFound = 0;
    let unknownFound = 0;
    
    // Check first few pages for problematic contacts
    for (let p = 1; p <= 10; p++) {
      try {
        const response = await axios.get(`${BASE_URL}/api/contacts`, {
          headers: AUTH_HEADER,
          params: { page: p, limit: 50 }
        });
        
        if (response.data.success) {
          const contacts = response.data.data.contacts;
          
          contacts.forEach(contact => {
            if (contact.listId === 'AUTO-SYNC-CONTACTS') autoSyncFound++;
            if (contact.listId === 'IMPORTED-CONTACTS') importedFound++;
            if (contact.firstName === 'Auto-Sync Contact' || 
                contact.firstName === 'Unknown Contact' ||
                contact.firstName === 'Test Customer') unknownFound++;
          });
        }
      } catch (error) {
        break;
      }
    }
    
    console.log(`Auto-sync contacts found: ${autoSyncFound}`);
    console.log(`Imported contacts found: ${importedFound}`);
    console.log(`Unknown/Test contacts found: ${unknownFound}`);
    
    if (autoSyncFound === 0 && importedFound === 0 && unknownFound === 0) {
      console.log('✅ No unwanted auto-generated contacts found');
    } else {
      console.log('❌ Some unwanted contacts still exist');
    }
    
  } catch (error) {
    console.error('Error verifying DAC TEST contacts:', error.response?.data || error.message);
  }
}

verifyDacTestContacts();
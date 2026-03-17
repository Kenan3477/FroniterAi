#!/usr/bin/env node

/**
 * Debug contacts API to understand the response format
 */

const API_BASE = 'https://froniterai-production.up.railway.app';

async function debugContactsAPI() {
  try {
    console.log('🔍 Debugging contacts API...\n');

    // Try different authentication methods
    const authMethods = [
      { name: 'No auth', headers: {} },
      { name: 'Bearer dummy-test-token', headers: { 'Authorization': 'Bearer dummy-test-token' } },
      { name: 'dummy-test-token', headers: { 'Authorization': 'dummy-test-token' } }
    ];

    for (const method of authMethods) {
      console.log(`Testing with: ${method.name}`);
      
      try {
        const response = await fetch(`${API_BASE}/api/contacts`, {
          headers: {
            'Content-Type': 'application/json',
            ...method.headers
          }
        });

        console.log(`   Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('   Response structure:', {
            hasSuccess: 'success' in data,
            hasData: 'data' in data,
            dataType: typeof data.data,
            dataLength: Array.isArray(data.data) ? data.data.length : 'not array',
            sampleKeys: Object.keys(data).slice(0, 5)
          });
          
          if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            console.log('   Sample contact:', JSON.stringify(data.data[0], null, 2));
            
            // Count unknown contacts
            const unknownCount = data.data.filter(contact => 
              contact.firstName === 'Unknown' || 
              contact.lastName === 'Contact' ||
              contact.firstName === 'Unknown Contact' ||
              (contact.firstName === 'Unknown' && contact.lastName === 'Contact')
            ).length;
            
            console.log(`   🎯 Found ${unknownCount} unknown contacts`);
            
            // We found a working method, break out of the loop
            return { method: method.name, data: data.data, unknownCount };
          }
        } else {
          console.log(`   Error: ${response.statusText}`);
        }
      } catch (error) {
        console.log(`   Exception: ${error.message}`);
      }
      
      console.log('');
    }
    
    return null;

  } catch (error) {
    console.error('💥 Error during debug:', error);
  }
}

// Run the debug
debugContactsAPI().then(result => {
  if (result) {
    console.log(`\n✅ Working method found: ${result.method}`);
    console.log(`📊 Total contacts: ${result.data.length}`);
    console.log(`🎯 Unknown contacts: ${result.unknownCount}`);
  } else {
    console.log('\n❌ No working authentication method found');
  }
});
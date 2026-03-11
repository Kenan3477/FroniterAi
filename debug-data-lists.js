const fetch = require('node-fetch');

async function debugDataLists() {
  try {
    console.log('🔍 Debugging Data Lists API');
    console.log('===========================');
    
    const BACKEND_URL = 'https://froniterai-production.up.railway.app';
    
    // 1. Check data lists endpoint
    console.log('\n1️⃣ Checking data lists endpoint...');
    const dataListsResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/data-lists`);
    console.log('📊 Response status:', dataListsResponse.status);
    
    const dataListsData = await dataListsResponse.json();
    console.log('📊 Response data:', JSON.stringify(dataListsData, null, 2));
    
    // 2. Check contacts for DAC campaign directly
    console.log('\n2️⃣ Checking contacts for DAC...');
    const contactsResponse = await fetch(`${BACKEND_URL}/api/contacts?campaignId=DAC&limit=5`);
    console.log('📊 Contacts response status:', contactsResponse.status);
    
    const contactsData = await contactsResponse.json();
    console.log('📊 Contacts sample:', JSON.stringify(contactsData, null, 2));
    
    if (contactsData.success && contactsData.data?.contacts?.length > 0) {
      const sampleContact = contactsData.data.contacts[0];
      console.log('\n📋 Sample contact structure:');
      console.log('   - listId:', sampleContact.listId);
      console.log('   - contactId:', sampleContact.contactId);
      console.log('   - name:', `${sampleContact.firstName} ${sampleContact.lastName}`);
      console.log('   - phone:', sampleContact.phone);
      
      // 3. Try creating queue entries manually if needed
      console.log('\n3️⃣ Attempting direct queue entry creation...');
      
      // Get DAC campaign ID
      const campaignsResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns`);
      const campaignsData = await campaignsResponse.json();
      const dacCampaign = campaignsData.data?.find(c => c.name?.includes('DAC'));
      
      if (dacCampaign) {
        console.log('🎯 DAC Campaign ID:', dacCampaign.campaignId);
        
        // Try the alternative approach - create queue entries from contacts
        const createQueueResponse = await fetch(`${BACKEND_URL}/api/dial-queue/create-from-contacts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: dacCampaign.campaignId,
            contactIds: [sampleContact.contactId],
            agentId: 'agent-1'
          })
        });
        
        console.log('🔄 Direct queue creation status:', createQueueResponse.status);
        if (createQueueResponse.ok) {
          const createQueueData = await createQueueResponse.json();
          console.log('✅ Queue creation result:', createQueueData);
        } else {
          const error = await createQueueResponse.text();
          console.log('❌ Queue creation error:', error);
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Debug error:', error.message);
  }
}

debugDataLists();
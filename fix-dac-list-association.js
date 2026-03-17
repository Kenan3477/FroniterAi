const fetch = require('node-fetch');

async function fixDACListAssociation() {
  try {
    console.log('🔧 Fixing DAC List Association');
    console.log('==============================');
    
    const BACKEND_URL = 'https://froniterai-production.up.railway.app';
    
    // 1. Get the DAC TEST list details (with database ID)
    console.log('\n1️⃣ Getting DAC TEST list details...');
    const dataListsResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/data-lists`);
    const dataListsData = await dataListsResponse.json();
    
    const dacTestList = dataListsData.data?.dataLists?.find(list => 
      list.name === 'DAC TEST' || list.listId === 'list_1767031754967'
    );
    
    if (!dacTestList) {
      console.log('❌ DAC TEST list not found');
      return;
    }
    
    console.log('📋 DAC TEST List:', {
      databaseId: dacTestList.id,
      listId: dacTestList.listId,
      name: dacTestList.name,
      currentCampaignId: dacTestList.campaignId,
      totalContacts: dacTestList.totalContacts,
      active: dacTestList.active
    });
    
    // 2. Get current DAC campaign
    const campaignsResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns`);
    const campaignsData = await campaignsResponse.json();
    const currentDAC = campaignsData.data?.find(c => c.name?.includes('DAC'));
    
    console.log('🎯 Current DAC Campaign ID:', currentDAC.campaignId);
    
    // 3. Update the list using the correct database ID
    console.log('\n2️⃣ Updating list association using database ID...');
    const updateResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/data-lists/${dacTestList.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: dacTestList.name,
        campaignId: currentDAC.campaignId, // Link to current DAC
        active: true,
        blendWeight: dacTestList.blendWeight || 75
      })
    });
    
    console.log('🔄 Update response status:', updateResponse.status);
    
    if (updateResponse.ok) {
      const updateData = await updateResponse.json();
      console.log('✅ Successfully linked DAC TEST list to current DAC campaign!');
      
      // 4. Generate queue
      console.log('\n3️⃣ Generating queue...');
      const generateResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${currentDAC.id}/generate-queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxRecords: 100 })
      });
      
      const generateData = await generateResponse.json();
      console.log('⚡ Queue generation:', generateResponse.status);
      
      if (generateResponse.ok && generateData.success) {
        console.log(`🎉 SUCCESS! Generated ${generateData.data?.generated || 0} queue entries!`);
        
        // 5. Test preview fetch
        console.log('\n4️⃣ Testing preview contact...');
        const previewResponse = await fetch(`${BACKEND_URL}/api/dial-queue/next`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: currentDAC.campaignId,
            agentId: 'agent-1'
          })
        });
        
        const previewData = await previewResponse.json();
        
        if (previewResponse.ok && previewData.success && previewData.data?.contact) {
          const contact = previewData.data.contact;
          console.log('🎉 PREVIEW CONTACT READY!');
          console.log('👤 Sample Contact:');
          console.log(`   Name: ${contact.firstName} ${contact.lastName}`);
          console.log(`   Phone: ${contact.phone}`);
          console.log(`   Status: ${contact.status}`);
          
          console.log('\n✅ SOLUTION COMPLETE!');
          console.log('======================');
          console.log('🔗 DAC TEST list (7,148 contacts) linked to DAC campaign');
          console.log('⚡ Dial queue populated with contacts');
          console.log('📱 Preview cards will now appear when you set status to Available!');
          
        } else {
          console.log('📭 Preview contact not available:', previewData.message || 'Unknown reason');
        }
      } else {
        console.log('❌ Queue generation failed:', generateData.message || generateData.error);
      }
    } else {
      const errorData = await updateResponse.json();
      console.log('❌ Update failed:', errorData);
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

fixDACListAssociation();
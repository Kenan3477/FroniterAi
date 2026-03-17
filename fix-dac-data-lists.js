const fetch = require('node-fetch');

async function fixDACDataLists() {
  try {
    console.log('📋 Fixing DAC Campaign Data Lists');
    console.log('=================================');
    
    const BACKEND_URL = 'https://froniterai-production.up.railway.app';
    
    // 1. Check what data lists exist
    console.log('\n1️⃣ Checking existing data lists...');
    const dataListsResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/data-lists`);
    const dataListsData = await dataListsResponse.json();
    
    if (dataListsData.success) {
      const lists = dataListsData.data || [];
      console.log(`📊 Found ${lists.length} data lists:`);
      
      lists.forEach((list, idx) => {
        console.log(`   ${idx + 1}. ${list.name} (${list.listId}) - Campaign: ${list.campaignId || 'None'} - Active: ${list.active}`);
      });
      
      // Look for DAC-related lists
      const dacLists = lists.filter(list => 
        list.name?.toLowerCase().includes('dac') || 
        list.campaignId === 'DAC' || 
        list.campaignId === 'cmjlwtm260006a49neir3ui93'
      );
      
      if (dacLists.length > 0) {
        console.log(`\n✅ Found ${dacLists.length} DAC-related data list(s)`);
        
        // Check if any are active
        const activeDACLists = dacLists.filter(list => list.active);
        if (activeDACLists.length === 0) {
          console.log('⚠️ DAC lists exist but are not active. Activating them...');
          
          // Activate the first DAC list
          const listToActivate = dacLists[0];
          console.log(`\n🔄 Activating list: ${listToActivate.name}`);
          
          const updateResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/data-lists/${listToActivate.listId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...listToActivate,
              active: true,
              campaignId: 'DAC'  // Ensure it's properly linked to DAC
            })
          });
          
          const updateData = await updateResponse.json();
          if (updateResponse.ok && updateData.success) {
            console.log('✅ Successfully activated DAC data list!');
          } else {
            console.log('❌ Failed to activate list:', updateData);
          }
        } else {
          console.log(`✅ Found ${activeDACLists.length} active DAC list(s)`);
        }
      } else {
        console.log('\n❌ No DAC-related data lists found!');
        console.log('💡 Need to create a data list for DAC campaign');
        
        // Create a data list for DAC
        console.log('\n📝 Creating data list for DAC campaign...');
        const createListResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/data-lists`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'DAC Campaign Contacts',
            description: 'Main contact list for DAC manual preview campaign',
            campaignId: 'DAC',
            active: true,
            contacts: [] // Will import contacts separately
          })
        });
        
        const createListData = await createListResponse.json();
        if (createListResponse.ok && createListData.success) {
          console.log('✅ Created new DAC data list:', createListData.data.listId);
        } else {
          console.log('❌ Failed to create list:', createListData);
        }
      }
    }
    
    // 2. Try generating queue again
    console.log('\n2️⃣ Attempting queue generation again...');
    const dacCampaignsResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns`);
    const dacCampaignsData = await dacCampaignsResponse.json();
    const dacCampaign = dacCampaignsData.data?.find(c => c.name?.includes('DAC'));
    
    if (dacCampaign) {
      const generateResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${dacCampaign.id}/generate-queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxRecords: 20 })
      });
      
      const generateData = await generateResponse.json();
      console.log('⚡ Queue generation status:', generateResponse.status);
      
      if (generateResponse.ok && generateData.success) {
        console.log(`✅ Generated ${generateData.data?.generated || 0} queue entries!`);
        console.log('🎉 Preview dialing should now work!');
      } else {
        console.log('❌ Queue generation still failed:', generateData.message || generateData.error);
      }
    }
    
  } catch (error) {
    console.error('💥 Error fixing data lists:', error.message);
  }
}

fixDACDataLists();
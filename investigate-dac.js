const fetch = require('node-fetch');

async function investigateDAC() {
  try {
    console.log('🕵️ Investigating DAC Campaign Issue');
    console.log('=====================================');
    
    const BACKEND_URL = 'https://froniterai-production.up.railway.app';
    
    // 1. Get campaign with actual campaign ID
    console.log('\n1️⃣ Getting campaigns with full details...');
    const campaignsResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns`);
    const campaignsData = await campaignsResponse.json();
    
    const dacCampaign = campaignsData.data?.find(c => c.name?.includes('DAC'));
    
    if (!dacCampaign) {
      console.log('❌ No DAC campaign found');
      return;
    }
    
    console.log('🎯 DAC Campaign Details:', {
      name: dacCampaign.name,
      id: dacCampaign.id,
      campaignId: dacCampaign.campaignId,
      dialMethod: dacCampaign.dialMethod,
      status: dacCampaign.status
    });
    
    // Use the correct campaignId for API calls
    const correctCampaignId = dacCampaign.campaignId;
    
    // 2. Check contacts associated with DAC
    console.log('\n2️⃣ Checking contacts for DAC campaign...');
    try {
      const contactsResponse = await fetch(`${BACKEND_URL}/api/contacts?campaignId=${correctCampaignId}`);
      const contactsData = await contactsResponse.json();
      
      if (contactsData.success) {
        const totalContacts = contactsData.data?.pagination?.total || 0;
        console.log(`📋 Total contacts in DAC campaign: ${totalContacts}`);
        
        if (totalContacts === 0) {
          console.log('❌ No contacts found for DAC campaign!');
          console.log('💡 This is why preview dialing isn\'t working');
        } else {
          console.log('✅ Contacts found, checking if they\'re in dial queue...');
        }
      }
    } catch (error) {
      console.log('❌ Error checking contacts:', error.message);
    }
    
    // 3. Try to generate queue with correct ID
    console.log('\n3️⃣ Generating queue with correct campaign ID...');
    try {
      const generateResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${correctCampaignId}/generate-queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxRecords: 10 })
      });
      
      const generateData = await generateResponse.json();
      console.log('⚡ Queue generation response:', generateResponse.status);
      console.log('📊 Response data:', generateData);
      
      if (generateResponse.ok && generateData.success) {
        console.log(`✅ Successfully generated ${generateData.data?.generated || 0} queue entries`);
        
        // 4. Test preview fetch again
        console.log('\n4️⃣ Testing preview fetch after queue generation...');
        const previewResponse = await fetch(`${BACKEND_URL}/api/dial-queue/next`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: correctCampaignId,
            agentId: 'agent-1'
          })
        });
        
        const previewData = await previewResponse.json();
        if (previewResponse.ok && previewData.success && previewData.data?.contact) {
          console.log('🎉 SUCCESS: Preview contact is now available!');
          console.log('👤 Contact:', {
            name: `${previewData.data.contact.firstName} ${previewData.data.contact.lastName}`,
            phone: previewData.data.contact.phone,
            email: previewData.data.contact.email
          });
          console.log('✅ Preview cards should now appear in the frontend!');
        } else {
          console.log('📭 Still no preview contact available:', previewData);
        }
      } else {
        console.log('❌ Queue generation failed:', generateData);
      }
    } catch (error) {
      console.log('❌ Error generating queue:', error.message);
    }
    
  } catch (error) {
    console.error('💥 Investigation failed:', error.message);
  }
}

investigateDAC();
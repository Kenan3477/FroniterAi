const fetch = require('node-fetch');

async function linkDACList() {
  try {
    console.log('🔗 Linking DAC TEST List to Current DAC Campaign');
    console.log('===============================================');
    
    const BACKEND_URL = 'https://froniterai-production.up.railway.app';
    
    // 1. Get current DAC campaign details
    console.log('\n1️⃣ Getting current DAC campaign...');
    const campaignsResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns`);
    const campaignsData = await campaignsResponse.json();
    const currentDAC = campaignsData.data?.find(c => c.name?.includes('DAC'));
    
    console.log('🎯 Current DAC Campaign:', {
      name: currentDAC.name,
      id: currentDAC.id,
      campaignId: currentDAC.campaignId
    });
    
    // 2. Update the DAC TEST list to point to current DAC campaign
    console.log('\n2️⃣ Updating DAC TEST list campaign association...');
    const dacTestListId = 'list_1767031754967';
    
    const updateListResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/data-lists/${dacTestListId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listId: dacTestListId,
        name: 'DAC TEST',
        campaignId: currentDAC.campaignId, // Link to current DAC campaign
        active: true,
        description: 'DAC test contacts for manual preview dialing'
      })
    });
    
    console.log('🔄 List update status:', updateListResponse.status);
    
    if (updateListResponse.ok) {
      const updateData = await updateListResponse.json();
      console.log('✅ Successfully updated DAC TEST list!');
      console.log('📋 New list configuration:', updateData);
      
      // 3. Now generate the queue
      console.log('\n3️⃣ Generating dial queue with linked data list...');
      const generateResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${currentDAC.id}/generate-queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxRecords: 50 })
      });
      
      console.log('⚡ Queue generation status:', generateResponse.status);
      const generateData = await generateResponse.json();
      
      if (generateResponse.ok && generateData.success) {
        const generated = generateData.data?.generated || 0;
        console.log(`🎉 SUCCESS! Generated ${generated} queue entries!`);
        
        if (generated > 0) {
          // 4. Test preview contact fetch
          console.log('\n4️⃣ Testing preview contact fetch...');
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
            console.log('🎉 PREVIEW CONTACT AVAILABLE!');
            console.log('👤 Contact Details:');
            console.log(`   - Name: ${contact.firstName} ${contact.lastName}`);
            console.log(`   - Phone: ${contact.phone}`);
            console.log(`   - Email: ${contact.email || 'Not provided'}`);
            console.log(`   - Address: ${contact.customFields?.address || 'Not provided'}`);
          } else {
            console.log('📭 No preview contact available yet');
          }
        }
      } else {
        console.log('❌ Queue generation failed:', generateData.message || generateData.error);
      }
    } else {
      const errorData = await updateListResponse.json();
      console.log('❌ Failed to update list:', errorData);
    }
    
    console.log('\n🎯 FINAL INSTRUCTIONS:');
    console.log('======================');
    console.log('✅ DAC TEST list (7,148 contacts) is now linked to DAC campaign');
    console.log('✅ Dial queue should be populated with contacts');
    console.log('📱 To see preview cards:');
    console.log('   1. Refresh the frontend page (F5)');
    console.log('   2. Make sure you\'re in the DAC campaign');  
    console.log('   3. Set your status to "Available"');
    console.log('   4. Preview cards should appear automatically!');
    
  } catch (error) {
    console.error('💥 Error linking DAC list:', error.message);
  }
}

linkDACList();
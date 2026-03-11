const fetch = require('node-fetch');

async function debugPreviewDialing() {
  try {
    console.log('🔍 Debugging Preview Dialing System');
    console.log('=====================================');
    
    const BACKEND_URL = 'https://froniterai-production.up.railway.app';
    
    // 1. Check DAC campaign configuration
    console.log('\n1️⃣ Checking DAC campaign configuration...');
    const campaignsResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns`);
    const campaignsData = await campaignsResponse.json();
    
    const dacCampaign = campaignsData.data?.find(c => c.name?.includes('DAC'));
    
    if (!dacCampaign) {
      console.log('❌ DAC campaign not found!');
      return;
    }
    
    console.log('✅ DAC Campaign found:', {
      id: dacCampaign.campaignId,
      name: dacCampaign.name,
      dialMethod: dacCampaign.dialMethod,
      status: dacCampaign.status
    });
    
    if (dacCampaign.dialMethod !== 'MANUAL_PREVIEW') {
      console.log('❌ DAC is not set to MANUAL_PREVIEW mode!');
      console.log('🔧 Current dial method:', dacCampaign.dialMethod);
      return;
    }
    
    // 2. Check if there are contacts in the dial queue for DAC
    console.log('\n2️⃣ Checking dial queue for DAC campaign...');
    try {
      const queueResponse = await fetch(`${BACKEND_URL}/api/dial-queue/queue/${dacCampaign.campaignId}`);
      const queueData = await queueResponse.json();
      
      console.log('📊 Queue response:', queueData.success ? '✅ Success' : '❌ Failed');
      
      if (queueData.success) {
        const queueEntries = queueData.data?.entries || [];
        console.log(`📋 Found ${queueEntries.length} entries in dial queue`);
        
        if (queueEntries.length === 0) {
          console.log('❌ No entries in dial queue! This is why preview cards aren\'t showing.');
          console.log('💡 Solution: Generate queue entries for the DAC campaign');
        } else {
          console.log('✅ Queue entries found:');
          queueEntries.slice(0, 3).forEach((entry, idx) => {
            console.log(`   ${idx + 1}. Contact: ${entry.contactId}, Status: ${entry.status}`);
          });
        }
      } else {
        console.log('❌ Failed to fetch queue data:', queueData.error);
      }
    } catch (error) {
      console.log('❌ Error checking queue:', error.message);
    }
    
    // 3. Test the preview contact fetch endpoint
    console.log('\n3️⃣ Testing preview contact fetch...');
    try {
      const nextContactResponse = await fetch(`${BACKEND_URL}/api/dial-queue/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: dacCampaign.campaignId,
          agentId: 'agent-1'  // This matches what the frontend is sending
        })
      });
      
      const nextContactData = await nextContactResponse.json();
      console.log('📞 Next contact response:', nextContactResponse.status);
      
      if (nextContactResponse.ok && nextContactData.success) {
        if (nextContactData.data?.contact) {
          console.log('✅ Preview contact available:', {
            firstName: nextContactData.data.contact.firstName,
            lastName: nextContactData.data.contact.lastName,
            phone: nextContactData.data.contact.phone
          });
        } else {
          console.log('📭 No preview contact available');
        }
      } else {
        console.log('❌ Preview contact fetch failed:', nextContactData.error || nextContactData.message);
      }
    } catch (error) {
      console.log('❌ Error testing preview fetch:', error.message);
    }
    
    // 4. Check if queue needs to be generated
    console.log('\n4️⃣ Checking if queue generation is needed...');
    try {
      const generateResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${dacCampaign.campaignId}/generate-queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxRecords: 10 })
      });
      
      const generateData = await generateResponse.json();
      console.log('⚡ Queue generation response:', generateResponse.status);
      
      if (generateResponse.ok && generateData.success) {
        console.log(`✅ Generated ${generateData.data.generated} queue entries`);
        console.log('🎯 Preview dialing should now work!');
      } else {
        console.log('❌ Queue generation failed:', generateData.error || generateData.message);
      }
    } catch (error) {
      console.log('❌ Error generating queue:', error.message);
    }
    
  } catch (error) {
    console.error('💥 Error debugging preview dialing:', error.message);
  }
}

debugPreviewDialing();
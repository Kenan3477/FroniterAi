// BROWSER CONSOLE TEST SCRIPT
// Run this in your browser console while logged into the Omnivox frontend
// This will test the queue generation and show detailed logs

console.log('🧪 Starting DAC Campaign Queue Generation Test...');

// Function to test queue generation
async function testQueueGeneration() {
  try {
    // Get all campaigns first to find the DAC campaign
    console.log('1. 📋 Fetching campaigns...');
    const campaignsResponse = await fetch('/api/admin/campaign-management/campaigns');
    const campaignsData = await campaignsResponse.json();
    
    console.log('📊 Campaigns data:', campaignsData);
    
    if (!campaignsData.success || !campaignsData.data) {
      throw new Error('Failed to fetch campaigns');
    }
    
    // Find the DAC campaign
    const dacCampaign = campaignsData.data.find(c => 
      c.name === 'DAC' || c.name.includes('DAC')
    );
    
    if (!dacCampaign) {
      console.error('❌ DAC campaign not found in campaigns list');
      console.log('Available campaigns:', campaignsData.data.map(c => ({ id: c.id, name: c.name })));
      return;
    }
    
    console.log('🎯 Found DAC campaign:', {
      id: dacCampaign.id,
      name: dacCampaign.name,
      status: dacCampaign.status
    });
    
    // 2. Generate queue for DAC campaign
    console.log('2. 🔄 Generating queue for DAC campaign...');
    const queueResponse = await fetch(`/api/admin/campaign-management/campaigns/${dacCampaign.id}/generate-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxRecords: 50 })
    });
    
    console.log('📡 Queue generation response status:', queueResponse.status);
    console.log('📡 Queue generation response ok:', queueResponse.ok);
    
    if (!queueResponse.ok) {
      const errorText = await queueResponse.text();
      throw new Error(`Queue generation failed: ${queueResponse.status} - ${errorText}`);
    }
    
    const queueData = await queueResponse.json();
    console.log('✅ Queue generation response:', queueData);
    
    if (queueData.success) {
      console.log(`🎉 SUCCESS: Generated ${queueData.data.generated} queue entries!`);
      
      // 3. Fetch the queue to verify
      console.log('3. 📋 Fetching queue to verify...');
      const queueFetchResponse = await fetch(`/api/admin/campaign-management/campaigns/${dacCampaign.id}/queue`);
      const queueFetchData = await queueFetchResponse.json();
      
      console.log('📊 Queue fetch response:', queueFetchData);
      
      if (queueFetchData.success && queueFetchData.data) {
        const queueEntries = queueFetchData.data.queueEntries || [];
        console.log(`✅ Queue now contains ${queueEntries.length} entries`);
        console.log('Queue stats:', queueFetchData.data.stats);
        
        if (queueEntries.length > 0) {
          console.log('Sample queue entry:', queueEntries[0]);
        }
      } else {
        console.warn('⚠️ Could not fetch queue after generation');
      }
    } else {
      console.error('❌ Queue generation returned error:', queueData.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testQueueGeneration().then(() => {
  console.log('🏁 Test completed');
}).catch(error => {
  console.error('🚨 Test crashed:', error);
});
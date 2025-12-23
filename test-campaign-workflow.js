const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testCampaignWorkflow() {
  const baseUrl = 'http://localhost:3002/api/admin/campaign-management';
  
  console.log('🧪 Testing Campaign Management Workflow\n');

  try {
    // 1. Test getting campaigns
    console.log('1. Fetching campaigns...');
    const campaignsResponse = await fetch(`${baseUrl}/campaigns`);
    const campaignsData = await campaignsResponse.json();
    console.log('✅ Campaigns API response:', JSON.stringify(campaignsData, null, 2));

    // 2. If there are campaigns, test the queue functionality
    if (campaignsData.success && campaignsData.data && campaignsData.data.length > 0) {
      const testCampaign = campaignsData.data[0];
      console.log(`\n2. Testing queue generation for campaign: ${testCampaign.name}`);
      
      // Test queue generation
      const queueResponse = await fetch(`${baseUrl}/campaigns/${testCampaign.id}/generate-queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxRecords: 5 })
      });
      
      const queueData = await queueResponse.json();
      console.log('✅ Queue generation response:', JSON.stringify(queueData, null, 2));

      // Test getting campaign contacts
      console.log(`\n3. Testing contacts for campaign: ${testCampaign.name}`);
      const contactsResponse = await fetch(`${baseUrl}/campaigns/${testCampaign.id}/contacts`);
      const contactsData = await contactsResponse.json();
      console.log('✅ Contacts response:', JSON.stringify(contactsData, null, 2));

    } else {
      console.log('ℹ️ No campaigns found, creating a test campaign...');
      
      // Create a test campaign
      const newCampaignResponse = await fetch(`${baseUrl}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Campaign for Queue Testing',
          description: 'Created by automated test to verify campaign management functionality',
          dialMethod: 'Progressive',
          dialSpeed: 2.0
        })
      });
      
      const newCampaignData = await newCampaignResponse.json();
      console.log('✅ New campaign created:', JSON.stringify(newCampaignData, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCampaignWorkflow();
const fetch = require('node-fetch');

async function testCampaignAPI() {
  try {
    console.log('🔍 Testing campaign API endpoint...');
    
    const response = await fetch('https://froniterai-production.up.railway.app/api/admin/campaign-management/campaigns', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUwOSwidXNlcm5hbWUiOiJrZW4iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NDI0ODcyOTcsImV4cCI6MTc0MjU3MzY5N30.yOx_-sGPTL4bh5rZ8hBzCL-LO-PSQgAMzwgGDVfadoQ',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 API Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('📊 Campaign data structure:');
      console.log('Data type:', typeof data);
      console.log('Is array:', Array.isArray(data));
      
      if (Array.isArray(data) && data.length > 0) {
        console.log(`\n📋 Found ${data.length} campaigns:`);
        data.forEach((campaign, index) => {
          console.log(`\nCampaign ${index + 1}:`);
          console.log('  id:', campaign.id);
          console.log('  campaignId:', campaign.campaignId);
          console.log('  name:', campaign.name);
          console.log('  status:', campaign.status);
          console.log('  isActive:', campaign.isActive);
        });
      } else if (data.success && data.data) {
        console.log('📊 Wrapped response format detected');
        console.log('Success:', data.success);
        console.log('Data:', data.data);
      } else {
        console.log('📊 Raw data:', JSON.stringify(data, null, 2));
      }
    } else {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testCampaignAPI();
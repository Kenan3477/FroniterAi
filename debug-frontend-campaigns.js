#!/usr/bin/env node

// Debug frontend campaigns endpoint
const fetch = require('node-fetch');

async function debugFrontendCampaigns() {
  try {
    console.log('🔍 Debugging frontend campaigns endpoint...');
    
    const frontendResponse = await fetch('https://omnivox-ai.vercel.app/api/campaigns/user-campaigns');
    
    console.log('Status:', frontendResponse.status);
    
    if (frontendResponse.ok) {
      const frontendData = await frontendResponse.json();
      console.log('Full frontend response:', JSON.stringify(frontendData, null, 2));
      
      if (frontendData.data) {
        console.log('Campaign count:', frontendData.data.length);
        frontendData.data.forEach((campaign, index) => {
          console.log(`Campaign ${index + 1}:`, {
            name: campaign.name,
            campaignId: campaign.campaignId,
            dialMethod: campaign.dialMethod,
            status: campaign.status
          });
        });
      }
    } else {
      const errorText = await frontendResponse.text();
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Error debugging frontend campaigns:', error);
  }
}

debugFrontendCampaigns();